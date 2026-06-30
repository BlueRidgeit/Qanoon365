"""Legal-aware document chunker with tiktoken-based token counting."""

import hashlib
import logging
import re
from typing import Any

import tiktoken

from src.extract import PageExtraction

logger = logging.getLogger(__name__)

# Reuse a single encoding instance across calls
_encoding: tiktoken.Encoding | None = None


def _get_encoding() -> tiktoken.Encoding:
    global _encoding
    if _encoding is None:
        _encoding = tiktoken.get_encoding("cl100k_base")
    return _encoding


def _token_count(text: str) -> int:
    """Return the number of tokens in *text* using the cl100k_base encoding."""
    return len(_get_encoding().encode(text))


# ------------------------------------------------------------------
# Text splitting helpers
# ------------------------------------------------------------------

_PARAGRAPH_RE = re.compile(r"\n\s*\n")
_SENTENCE_RE = re.compile(r"(?<=[.!?;])\s+")


def _split_paragraphs(text: str) -> list[str]:
    """Split text on double-newlines (paragraph boundaries)."""
    parts = _PARAGRAPH_RE.split(text)
    return [p.strip() for p in parts if p.strip()]


def _split_sentences(text: str) -> list[str]:
    """Split text on sentence-ending punctuation followed by whitespace."""
    parts = _SENTENCE_RE.split(text)
    return [s.strip() for s in parts if s.strip()]


def _merge_segments(
    segments: list[str], chunk_size: int, chunk_overlap: int
) -> list[str]:
    """
    Greedily merge *segments* into chunks whose token count does not exceed
    *chunk_size*, with an approximate *chunk_overlap* token overlap between
    consecutive chunks.
    """
    if not segments:
        return []

    chunks: list[str] = []
    current_segments: list[str] = []
    current_tokens = 0

    for seg in segments:
        seg_tokens = _token_count(seg)

        # If a single segment exceeds the chunk size, force-split it
        if seg_tokens > chunk_size:
            # Flush current buffer first
            if current_segments:
                chunks.append("\n\n".join(current_segments))
                current_segments = []
                current_tokens = 0

            # Force-split long segment by sentences, then by raw token windows
            sentences = _split_sentences(seg)
            if len(sentences) > 1:
                sub_chunks = _merge_segments(sentences, chunk_size, chunk_overlap)
                chunks.extend(sub_chunks)
            else:
                # Last resort: hard split by token windows
                enc = _get_encoding()
                tokens = enc.encode(seg)
                for start in range(0, len(tokens), chunk_size - chunk_overlap):
                    window = tokens[start : start + chunk_size]
                    chunks.append(enc.decode(window))
            continue

        # Would adding this segment exceed the limit?
        if current_tokens + seg_tokens > chunk_size and current_segments:
            chunks.append("\n\n".join(current_segments))

            # Overlap: keep trailing segments that fit within overlap budget
            overlap_segments: list[str] = []
            overlap_tokens = 0
            for prev_seg in reversed(current_segments):
                prev_tokens = _token_count(prev_seg)
                if overlap_tokens + prev_tokens > chunk_overlap:
                    break
                overlap_segments.insert(0, prev_seg)
                overlap_tokens += prev_tokens

            current_segments = overlap_segments
            current_tokens = overlap_tokens

        current_segments.append(seg)
        current_tokens += seg_tokens

    # Flush remainder
    if current_segments:
        chunks.append("\n\n".join(current_segments))

    return chunks


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------


def chunk_document(
    pages: list[PageExtraction],
    chunk_size: int = 1024,
    chunk_overlap: int = 256,
    metadata: dict[str, Any] | None = None,
) -> list[dict]:
    """
    Split extracted pages into overlapping chunks with metadata.

    Returns a list of dicts with keys:
        id, content, metadata (documentId, fileName, pageNumbers, tenantId,
        matterId, language)
    """
    if metadata is None:
        metadata = {}

    document_id: str = metadata.get("documentId", "unknown")
    file_name: str = metadata.get("fileName", "unknown")
    tenant_id: str = metadata.get("tenantId", "")
    matter_id: str = metadata.get("matterId", "")
    language: str = metadata.get("language", "")

    # Group consecutive pages into paragraph segments, tracking page numbers
    all_segments: list[tuple[str, list[int]]] = []  # (text, page_numbers)
    for page in pages:
        paragraphs = _split_paragraphs(page.text)
        if not paragraphs and page.text.strip():
            paragraphs = [page.text.strip()]
        for para in paragraphs:
            all_segments.append((para, [page.page_number]))

    if not all_segments:
        logger.warning("No text segments to chunk for document %s", document_id)
        return []

    # Build chunks greedily while tracking which pages contributed
    chunks: list[dict] = []
    current_texts: list[str] = []
    current_pages: list[int] = []
    current_tokens = 0

    def _flush(overlap: bool = True) -> tuple[list[str], list[int], int]:
        """Emit the current buffer as a chunk and compute overlap carry-over."""
        text = "\n\n".join(current_texts)
        page_nums = sorted(set(current_pages))

        chunk_id = hashlib.sha256(
            f"{document_id}:{page_nums}:{len(chunks)}".encode()
        ).hexdigest()[:24]

        chunks.append(
            {
                "id": chunk_id,
                "content": text,
                "documentId": document_id,
                "fileName": file_name,
                "pageNumbers": page_nums,
                "tenantId": tenant_id,
                "matterId": matter_id,
                "language": language,
            }
        )

        if not overlap:
            return [], [], 0

        # Compute overlap carry-over
        overlap_texts: list[str] = []
        overlap_pages: list[int] = []
        overlap_tok = 0
        for txt, pgs in zip(reversed(current_texts), reversed(current_pages)):
            t = _token_count(txt)
            if overlap_tok + t > chunk_overlap:
                break
            overlap_texts.insert(0, txt)
            overlap_pages.insert(0, pgs)
            overlap_tok += t

        return overlap_texts, overlap_pages, overlap_tok

    for seg_text, seg_pages in all_segments:
        seg_tokens = _token_count(seg_text)

        # Handle oversized single segments
        if seg_tokens > chunk_size:
            if current_texts:
                carry_texts, carry_pages, carry_tok = _flush(overlap=True)
                current_texts = carry_texts
                current_pages = carry_pages
                current_tokens = carry_tok

            # Force-split the oversized segment
            sub_texts = _split_sentences(seg_text)
            if len(sub_texts) <= 1:
                # Hard token split
                enc = _get_encoding()
                tokens = enc.encode(seg_text)
                for start in range(0, len(tokens), chunk_size - chunk_overlap):
                    window_text = enc.decode(tokens[start : start + chunk_size])
                    current_texts = [window_text]
                    current_pages = list(seg_pages)
                    current_tokens = min(chunk_size, len(tokens) - start)
                    carry_texts, carry_pages, carry_tok = _flush(overlap=True)
                    current_texts = carry_texts
                    current_pages = carry_pages
                    current_tokens = carry_tok
            else:
                for sub in sub_texts:
                    st = _token_count(sub)
                    if current_tokens + st > chunk_size and current_texts:
                        carry_texts, carry_pages, carry_tok = _flush(overlap=True)
                        current_texts = carry_texts
                        current_pages = carry_pages
                        current_tokens = carry_tok
                    current_texts.append(sub)
                    current_pages.extend(seg_pages)
                    current_tokens += st
            continue

        if current_tokens + seg_tokens > chunk_size and current_texts:
            carry_texts, carry_pages, carry_tok = _flush(overlap=True)
            current_texts = carry_texts
            current_pages = carry_pages
            current_tokens = carry_tok

        current_texts.append(seg_text)
        current_pages.extend(seg_pages)
        current_tokens += seg_tokens

    # Flush remaining
    if current_texts:
        _flush(overlap=False)

    logger.info(
        "Chunked document %s (%s) into %d chunks",
        document_id,
        file_name,
        len(chunks),
    )
    return chunks
