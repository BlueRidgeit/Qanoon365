"""Qanoon365 Ingestion Pipeline CLI."""

import argparse
import logging
import sys

from src.config import Config
from src.extract import extract_document
from src.index_manager import create_or_update_index
from src.sync import run_sync

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ingestion")


def _handle_sync(config: Config) -> None:
    """Run the full sync pipeline."""
    logger.info("Starting full sync pipeline")
    summary = run_sync(config)
    logger.info(
        "Sync finished -- libraries=%d  found=%d  new/updated=%d  deleted=%d  "
        "chunks_indexed=%d  errors=%d",
        summary["libraries_scanned"],
        summary["documents_found"],
        summary["new_or_updated"],
        summary["deleted"],
        summary["chunks_indexed"],
        summary["errors"],
    )
    if summary["errors"] > 0:
        sys.exit(1)


def _handle_create_index(config: Config) -> None:
    """Create or update the Azure AI Search index."""
    missing = config.validate(require_sharepoint=False, require_search=True)
    if missing:
        logger.error("Missing config for index creation: %s", ", ".join(missing))
        sys.exit(1)

    logger.info("Creating/updating index: %s", config.azure_search_index)
    try:
        create_or_update_index(
            config.azure_search_endpoint,
            config.azure_search_key,
            config.azure_search_index,
        )
        logger.info("Index '%s' is ready", config.azure_search_index)
    except Exception:
        logger.exception("Failed to create/update index")
        sys.exit(1)


def _handle_test_extract(pdf_path: str, config: Config) -> None:
    """Test extraction on a local PDF file without needing SharePoint/Azure."""
    import os

    if not os.path.isfile(pdf_path):
        logger.error("File not found: %s", pdf_path)
        sys.exit(1)

    logger.info("Testing extraction on: %s", pdf_path)

    with open(pdf_path, "rb") as f:
        doc_bytes = f.read()

    logger.info("Read %d bytes from %s", len(doc_bytes), pdf_path)

    # Use Document Intelligence only if credentials are available
    docintel_endpoint = config.azure_docintel_endpoint or None
    docintel_key = config.azure_docintel_key or None
    if docintel_endpoint and docintel_key:
        logger.info("Document Intelligence credentials found -- dual extraction mode")
    else:
        logger.info("No Document Intelligence credentials -- PyMuPDF only mode")

    result = extract_document(
        doc_bytes,
        docintel_endpoint=docintel_endpoint,
        docintel_key=docintel_key,
    )

    logger.info("Extraction complete: %d pages", len(result.pages))
    print("\n" + "=" * 60)
    print(f"FILE: {pdf_path}")
    print(f"PAGES: {len(result.pages)}")
    print(f"TOTAL TEXT LENGTH: {len(result.text)} characters")
    print("=" * 60)

    for page in result.pages:
        print(
            f"\n--- Page {page.page_number} "
            f"[{page.source}] "
            f"confidence={page.confidence:.3f} "
            f"tables={'yes' if page.has_tables else 'no'} "
            f"chars={len(page.text)} ---"
        )
        preview = page.text[:500]
        if len(page.text) > 500:
            preview += "\n... (truncated)"
        print(preview)

    # Also test chunking if extraction produced text
    if result.text.strip():
        from src.chunk import chunk_document

        chunks = chunk_document(
            result.pages,
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap,
            metadata={
                "documentId": "test-local",
                "fileName": os.path.basename(pdf_path),
                "tenantId": "",
                "matterId": "",
                "language": "",
            },
        )
        print(f"\n{'=' * 60}")
        print(f"CHUNKS: {len(chunks)} (size={config.chunk_size}, overlap={config.chunk_overlap})")
        print("=" * 60)
        for i, chunk in enumerate(chunks):
            content_preview = chunk["content"][:200]
            if len(chunk["content"]) > 200:
                content_preview += "..."
            print(
                f"\nChunk {i + 1}/{len(chunks)} | "
                f"pages={chunk['pageNumbers']} | "
                f"chars={len(chunk['content'])}"
            )
            print(content_preview)


def main():
    parser = argparse.ArgumentParser(
        description="Qanoon365 Document Ingestion Pipeline"
    )
    parser.add_argument(
        "--sync",
        action="store_true",
        help="Run full sync: SharePoint -> extract -> chunk -> embed -> index",
    )
    parser.add_argument(
        "--create-index",
        action="store_true",
        help="Create or update the Azure AI Search index schema",
    )
    parser.add_argument(
        "--test-extract",
        type=str,
        metavar="PDF_PATH",
        help="Test extraction on a local PDF file (no Azure required)",
    )
    args = parser.parse_args()

    config = Config()

    if args.sync:
        _handle_sync(config)
    elif args.create_index:
        _handle_create_index(config)
    elif args.test_extract:
        _handle_test_extract(args.test_extract, config)
    else:
        parser.print_help()
        sys.exit(0)


if __name__ == "__main__":
    main()
