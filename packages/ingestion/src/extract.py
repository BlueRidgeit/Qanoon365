"""Dual PDF extraction with quality scoring (PyMuPDF + Azure Document Intelligence)."""

import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Data classes
# ------------------------------------------------------------------


@dataclass
class PageExtraction:
    page_number: int
    text: str
    confidence: float
    source: str  # 'pymupdf' or 'docintel'
    has_tables: bool


@dataclass
class ExtractionResult:
    text: str
    pages: list[PageExtraction] = field(default_factory=list)


# ------------------------------------------------------------------
# Confidence estimation
# ------------------------------------------------------------------


def estimate_confidence(text: str) -> float:
    """
    Estimate extraction quality based on heuristics.

    Checks for:
    - Character diversity (garbled text has low diversity)
    - Whitespace ratio (bad scans produce excessive whitespace)
    - Arabic unicode validity
    - Presence of actual word-like tokens
    """
    if not text.strip():
        return 0.0

    length = len(text)

    # Character diversity: more unique characters relative to length = better
    unique_ratio = len(set(text)) / max(length, 1)

    # Whitespace ratio: too much whitespace indicates poor extraction
    ws_count = sum(1 for c in text if c in (" ", "\t", "\n", "\r"))
    ws_ratio = ws_count / max(length, 1)

    # Arabic unicode character count (U+0600 to U+06FF)
    arabic_chars = sum(1 for c in text if "\u0600" <= c <= "\u06FF")
    latin_chars = sum(1 for c in text if "A" <= c <= "z")
    alpha_ratio = (arabic_chars + latin_chars) / max(length, 1)

    # Word-like tokens (sequences of 2+ non-whitespace chars)
    tokens = text.split()
    meaningful_tokens = sum(1 for t in tokens if len(t) >= 2)
    token_ratio = meaningful_tokens / max(len(tokens), 1)

    # Composite score
    diversity_score = min(1.0, unique_ratio * 3)
    ws_penalty = 1.0 - max(0.0, ws_ratio - 0.3)
    alpha_bonus = min(1.0, alpha_ratio * 1.5)
    token_bonus = min(1.0, token_ratio)

    score = diversity_score * ws_penalty * 0.4 + alpha_bonus * 0.3 + token_bonus * 0.3
    return round(min(1.0, max(0.0, score)), 3)


# ------------------------------------------------------------------
# PyMuPDF extraction
# ------------------------------------------------------------------


def extract_with_pymupdf(doc_bytes: bytes) -> list[PageExtraction]:
    """Extract text from each page of a PDF using PyMuPDF."""
    import pymupdf

    pages: list[PageExtraction] = []
    try:
        doc = pymupdf.open(stream=doc_bytes, filetype="pdf")
    except Exception:
        logger.exception("PyMuPDF failed to open document")
        return pages

    for i, page in enumerate(doc):
        try:
            text = page.get_text("text")
            has_tables = False
            try:
                tables = page.find_tables()
                has_tables = bool(tables and len(tables.tables) > 0)
            except Exception:
                # find_tables can fail on some pages
                pass

            pages.append(
                PageExtraction(
                    page_number=i + 1,
                    text=text,
                    confidence=estimate_confidence(text),
                    source="pymupdf",
                    has_tables=has_tables,
                )
            )
        except Exception:
            logger.warning("PyMuPDF extraction failed on page %d", i + 1)
            pages.append(
                PageExtraction(
                    page_number=i + 1,
                    text="",
                    confidence=0.0,
                    source="pymupdf",
                    has_tables=False,
                )
            )

    doc.close()
    logger.info("PyMuPDF extracted %d pages", len(pages))
    return pages


# ------------------------------------------------------------------
# Azure Document Intelligence extraction
# ------------------------------------------------------------------


def extract_with_docintel(
    doc_bytes: bytes, endpoint: str, key: str
) -> list[PageExtraction]:
    """Extract text from each page using Azure Document Intelligence."""
    from azure.ai.documentintelligence import DocumentIntelligenceClient
    from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
    from azure.core.credentials import AzureKeyCredential

    pages: list[PageExtraction] = []

    try:
        client = DocumentIntelligenceClient(endpoint, AzureKeyCredential(key))
        poller = client.begin_analyze_document(
            "prebuilt-read",
            AnalyzeDocumentRequest(bytes_source=doc_bytes),
            content_type="application/json",
        )
        result = poller.result()
    except Exception:
        logger.exception("Document Intelligence analysis failed")
        return pages

    if not result.pages:
        logger.warning("Document Intelligence returned no pages")
        return pages

    # Build a page-number to text mapping from paragraphs/content
    page_texts: dict[int, list[str]] = {}
    page_has_tables: dict[int, bool] = {}

    # Initialise every page
    for pg in result.pages:
        page_texts.setdefault(pg.page_number, [])
        page_has_tables.setdefault(pg.page_number, False)

    # Collect text from paragraphs
    if result.paragraphs:
        for para in result.paragraphs:
            if para.bounding_regions:
                for region in para.bounding_regions:
                    pn = region.page_number
                    page_texts.setdefault(pn, []).append(para.content)
            else:
                # No region info -- assign to page 1
                page_texts.setdefault(1, []).append(para.content)

    # If no paragraphs, fall back to page-level lines/words
    if not result.paragraphs:
        for pg in result.pages:
            if pg.lines:
                for line in pg.lines:
                    page_texts.setdefault(pg.page_number, []).append(line.content)
            elif pg.words:
                for word in pg.words:
                    page_texts.setdefault(pg.page_number, []).append(word.content)

    # Mark pages that contain tables
    if result.tables:
        for table in result.tables:
            if table.bounding_regions:
                for region in table.bounding_regions:
                    page_has_tables[region.page_number] = True

    # Build PageExtraction list
    for pg in result.pages:
        pn = pg.page_number
        text = "\n".join(page_texts.get(pn, []))
        pages.append(
            PageExtraction(
                page_number=pn,
                text=text,
                confidence=estimate_confidence(text),
                source="docintel",
                has_tables=page_has_tables.get(pn, False),
            )
        )

    logger.info("Document Intelligence extracted %d pages", len(pages))
    return pages


# ------------------------------------------------------------------
# Quality-based best-pick merging
# ------------------------------------------------------------------


def quality_pick(
    pymupdf_pages: list[PageExtraction],
    docintel_pages: list[PageExtraction],
) -> list[PageExtraction]:
    """
    For each page, pick the better extraction based on:
      1. Higher confidence score
      2. More text content (character count)
      3. Document Intelligence wins for pages with tables
    """
    pymupdf_map: dict[int, PageExtraction] = {p.page_number: p for p in pymupdf_pages}
    docintel_map: dict[int, PageExtraction] = {p.page_number: p for p in docintel_pages}

    all_page_numbers = sorted(set(pymupdf_map.keys()) | set(docintel_map.keys()))
    picked: list[PageExtraction] = []

    for pn in all_page_numbers:
        py_page = pymupdf_map.get(pn)
        di_page = docintel_map.get(pn)

        # Only one source available
        if py_page and not di_page:
            picked.append(py_page)
            continue
        if di_page and not py_page:
            picked.append(di_page)
            continue

        # Both available -- compare quality
        assert py_page is not None and di_page is not None

        # Rule 1: If either page has tables, prefer Document Intelligence
        if di_page.has_tables or py_page.has_tables:
            if di_page.confidence > 0.1:
                logger.debug(
                    "Page %d: table detected, picking docintel (%.3f vs %.3f)",
                    pn,
                    di_page.confidence,
                    py_page.confidence,
                )
                picked.append(di_page)
                continue

        # Rule 2: Compare confidence scores
        conf_diff = py_page.confidence - di_page.confidence
        if abs(conf_diff) > 0.15:
            winner = py_page if conf_diff > 0 else di_page
            logger.debug(
                "Page %d: confidence pick %s (%.3f vs %.3f)",
                pn,
                winner.source,
                py_page.confidence,
                di_page.confidence,
            )
            picked.append(winner)
            continue

        # Rule 3: Similar confidence -- pick the one with more text
        py_len = len(py_page.text.strip())
        di_len = len(di_page.text.strip())
        if di_len > py_len * 1.1:
            picked.append(di_page)
        elif py_len > di_len * 1.1:
            picked.append(py_page)
        else:
            # Tie-breaker: prefer pymupdf (faster, no API cost)
            picked.append(py_page)

        logger.debug(
            "Page %d: picked %s (len %d vs %d)",
            pn,
            picked[-1].source,
            py_len,
            di_len,
        )

    logger.info(
        "Quality pick: %d pages, pymupdf=%d docintel=%d",
        len(picked),
        sum(1 for p in picked if p.source == "pymupdf"),
        sum(1 for p in picked if p.source == "docintel"),
    )
    return picked


# ------------------------------------------------------------------
# Convenience: full extraction pipeline
# ------------------------------------------------------------------


def extract_document(
    doc_bytes: bytes,
    docintel_endpoint: str | None = None,
    docintel_key: str | None = None,
) -> ExtractionResult:
    """
    Run dual extraction (PyMuPDF + optional Document Intelligence),
    merge with quality_pick, and return an ExtractionResult.
    """
    pymupdf_pages = extract_with_pymupdf(doc_bytes)

    if docintel_endpoint and docintel_key:
        docintel_pages = extract_with_docintel(
            doc_bytes, docintel_endpoint, docintel_key
        )
        final_pages = quality_pick(pymupdf_pages, docintel_pages)
    else:
        logger.info("No Document Intelligence credentials; using PyMuPDF only")
        final_pages = pymupdf_pages

    full_text = "\n\n".join(p.text for p in final_pages if p.text.strip())
    return ExtractionResult(text=full_text, pages=final_pages)
