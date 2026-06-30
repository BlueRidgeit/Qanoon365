"""Main sync orchestrator: SharePoint -> extract -> chunk -> embed -> Azure AI Search."""

import json
import logging
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras

from src.chunk import chunk_document
from src.config import Config
from src.embed import embed_chunks
from src.extract import extract_document
from src.index_manager import (
    create_or_update_index,
    delete_document_chunks,
    upsert_chunks,
)
from src.sharepoint import SharePointClient

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Sync log helpers (psycopg2, public.daleel_sync_log)
# ------------------------------------------------------------------

_CREATE_SYNC_TABLE = """
CREATE TABLE IF NOT EXISTS public.daleel_sync_log (
    id              SERIAL PRIMARY KEY,
    document_id     TEXT NOT NULL,
    library_id      TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    last_modified   TIMESTAMPTZ NOT NULL,
    file_size       BIGINT NOT NULL DEFAULT 0,
    chunk_count     INT NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'synced',
    error_message   TEXT,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id)
);
"""


def _ensure_sync_table(conn) -> None:
    """Create the sync log table if it does not exist."""
    try:
        with conn.cursor() as cur:
            cur.execute(_CREATE_SYNC_TABLE)
        conn.commit()
        logger.info("Sync log table ensured")
    except Exception:
        conn.rollback()
        logger.exception("Failed to create sync log table")
        raise


def _get_sync_log(conn) -> dict[str, dict]:
    """Return a map of document_id -> {last_modified, status, ...}."""
    log: dict[str, dict] = {}
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT document_id, library_id, file_name, last_modified, "
                "file_size, chunk_count, status, error_message, synced_at "
                "FROM public.daleel_sync_log"
            )
            for row in cur.fetchall():
                log[row["document_id"]] = dict(row)
    except Exception:
        logger.exception("Failed to read sync log")
    return log


def _upsert_sync_entry(
    conn,
    document_id: str,
    library_id: str,
    file_name: str,
    last_modified: str,
    file_size: int,
    chunk_count: int,
    status: str = "synced",
    error_message: str | None = None,
) -> None:
    """Insert or update a sync log entry."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO public.daleel_sync_log
                    (document_id, library_id, file_name, last_modified,
                     file_size, chunk_count, status, error_message, synced_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (document_id) DO UPDATE SET
                    library_id    = EXCLUDED.library_id,
                    file_name     = EXCLUDED.file_name,
                    last_modified = EXCLUDED.last_modified,
                    file_size     = EXCLUDED.file_size,
                    chunk_count   = EXCLUDED.chunk_count,
                    status        = EXCLUDED.status,
                    error_message = EXCLUDED.error_message,
                    synced_at     = NOW()
                """,
                (
                    document_id,
                    library_id,
                    file_name,
                    last_modified,
                    file_size,
                    chunk_count,
                    status,
                    error_message,
                ),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        logger.exception("Failed to upsert sync entry for %s", document_id)


def _delete_sync_entry(conn, document_id: str) -> None:
    """Remove a document from the sync log."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM public.daleel_sync_log WHERE document_id = %s",
                (document_id,),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        logger.exception("Failed to delete sync entry for %s", document_id)


# ------------------------------------------------------------------
# Core sync
# ------------------------------------------------------------------


def run_sync(config: Config) -> dict:
    """
    Full sync pipeline:
      1. List documents from SharePoint
      2. Compare against sync log (check last_modified dates)
      3. For new/modified docs: download, extract (dual), quality pick, chunk, embed, index
      4. For deleted docs: remove chunks from index
      5. Update sync log

    Returns a summary dict with counts.
    """
    summary = {
        "libraries_scanned": 0,
        "documents_found": 0,
        "new_or_updated": 0,
        "deleted": 0,
        "chunks_indexed": 0,
        "errors": 0,
    }

    # Validate config
    missing = config.validate(require_sharepoint=True, require_search=True)
    if missing:
        logger.error("Cannot run sync -- missing config: %s", ", ".join(missing))
        return summary

    # Database connection
    conn = None
    if config.database_url:
        try:
            conn = psycopg2.connect(config.database_url)
            _ensure_sync_table(conn)
        except Exception:
            logger.exception("Failed to connect to database")
            conn = None

    sync_log = _get_sync_log(conn) if conn else {}

    # Ensure search index exists
    try:
        create_or_update_index(
            config.azure_search_endpoint,
            config.azure_search_key,
            config.azure_search_index,
        )
    except Exception:
        logger.exception("Failed to create/update search index")
        summary["errors"] += 1
        if conn:
            conn.close()
        return summary

    # SharePoint client
    sp = SharePointClient(
        config.sharepoint_tenant_id,
        config.sharepoint_client_id,
        config.sharepoint_client_secret,
    )

    all_current_doc_ids: set[str] = set()

    try:
        for library_id in config.sharepoint_library_ids:
            summary["libraries_scanned"] += 1
            logger.info("Scanning library %s", library_id)

            try:
                documents = sp.list_documents(config.sharepoint_site_id, library_id)
            except Exception:
                logger.exception("Failed to list documents in library %s", library_id)
                summary["errors"] += 1
                continue

            summary["documents_found"] += len(documents)

            for doc in documents:
                doc_id = doc["id"]
                all_current_doc_ids.add(doc_id)

                # Check if document needs processing
                existing = sync_log.get(doc_id)
                if existing and existing.get("status") == "synced":
                    existing_modified = existing["last_modified"]
                    if isinstance(existing_modified, str):
                        pass  # compare as strings
                    elif isinstance(existing_modified, datetime):
                        existing_modified = existing_modified.isoformat()
                    if existing_modified >= doc["lastModified"]:
                        logger.debug("Skipping unchanged document %s", doc["name"])
                        continue

                logger.info(
                    "Processing document: %s (%d bytes)",
                    doc["name"],
                    doc["size"],
                )
                summary["new_or_updated"] += 1

                # Download
                try:
                    doc_bytes = sp.download_document(doc["downloadUrl"])
                except Exception:
                    logger.exception("Failed to download %s", doc["name"])
                    summary["errors"] += 1
                    if conn:
                        _upsert_sync_entry(
                            conn,
                            doc_id,
                            library_id,
                            doc["name"],
                            doc["lastModified"],
                            doc["size"],
                            0,
                            status="error",
                            error_message="Download failed",
                        )
                    continue

                # Extract (dual: PyMuPDF + optional Document Intelligence)
                try:
                    extraction = extract_document(
                        doc_bytes,
                        docintel_endpoint=config.azure_docintel_endpoint or None,
                        docintel_key=config.azure_docintel_key or None,
                    )
                except Exception:
                    logger.exception("Extraction failed for %s", doc["name"])
                    summary["errors"] += 1
                    if conn:
                        _upsert_sync_entry(
                            conn,
                            doc_id,
                            library_id,
                            doc["name"],
                            doc["lastModified"],
                            doc["size"],
                            0,
                            status="error",
                            error_message="Extraction failed",
                        )
                    continue

                if not extraction.text.strip():
                    logger.warning("No text extracted from %s", doc["name"])
                    if conn:
                        _upsert_sync_entry(
                            conn,
                            doc_id,
                            library_id,
                            doc["name"],
                            doc["lastModified"],
                            doc["size"],
                            0,
                            status="empty",
                            error_message="No text extracted",
                        )
                    continue

                # Chunk
                try:
                    chunks = chunk_document(
                        extraction.pages,
                        chunk_size=config.chunk_size,
                        chunk_overlap=config.chunk_overlap,
                        metadata={
                            "documentId": doc_id,
                            "fileName": doc["name"],
                            "tenantId": "",
                            "matterId": "",
                            "language": "",
                        },
                    )
                except Exception:
                    logger.exception("Chunking failed for %s", doc["name"])
                    summary["errors"] += 1
                    if conn:
                        _upsert_sync_entry(
                            conn,
                            doc_id,
                            library_id,
                            doc["name"],
                            doc["lastModified"],
                            doc["size"],
                            0,
                            status="error",
                            error_message="Chunking failed",
                        )
                    continue

                if not chunks:
                    logger.warning("No chunks produced for %s", doc["name"])
                    continue

                # Embed
                try:
                    chunks = embed_chunks(
                        chunks,
                        config.azure_openai_endpoint,
                        config.azure_openai_key,
                        config.azure_openai_embedding_deployment,
                    )
                except Exception:
                    logger.exception("Embedding failed for %s", doc["name"])
                    summary["errors"] += 1
                    if conn:
                        _upsert_sync_entry(
                            conn,
                            doc_id,
                            library_id,
                            doc["name"],
                            doc["lastModified"],
                            doc["size"],
                            0,
                            status="error",
                            error_message="Embedding failed",
                        )
                    continue

                # Delete old chunks for this document before upserting new ones
                try:
                    delete_document_chunks(
                        config.azure_search_endpoint,
                        config.azure_search_key,
                        config.azure_search_index,
                        doc_id,
                    )
                except Exception:
                    logger.warning(
                        "Could not delete old chunks for %s (may not exist)",
                        doc["name"],
                    )

                # Upsert new chunks
                try:
                    upserted = upsert_chunks(
                        config.azure_search_endpoint,
                        config.azure_search_key,
                        config.azure_search_index,
                        chunks,
                    )
                    summary["chunks_indexed"] += upserted
                except Exception:
                    logger.exception("Index upsert failed for %s", doc["name"])
                    summary["errors"] += 1
                    if conn:
                        _upsert_sync_entry(
                            conn,
                            doc_id,
                            library_id,
                            doc["name"],
                            doc["lastModified"],
                            doc["size"],
                            0,
                            status="error",
                            error_message="Index upsert failed",
                        )
                    continue

                # Update sync log
                if conn:
                    _upsert_sync_entry(
                        conn,
                        doc_id,
                        library_id,
                        doc["name"],
                        doc["lastModified"],
                        doc["size"],
                        len(chunks),
                        status="synced",
                    )

                logger.info(
                    "Synced %s: %d pages, %d chunks indexed",
                    doc["name"],
                    len(extraction.pages),
                    len(chunks),
                )

        # Handle deletions: documents in sync log but no longer in SharePoint
        for doc_id, entry in sync_log.items():
            if doc_id not in all_current_doc_ids:
                logger.info(
                    "Document %s (%s) removed from SharePoint, deleting chunks",
                    entry.get("file_name", "unknown"),
                    doc_id,
                )
                try:
                    delete_document_chunks(
                        config.azure_search_endpoint,
                        config.azure_search_key,
                        config.azure_search_index,
                        doc_id,
                    )
                    summary["deleted"] += 1
                except Exception:
                    logger.exception(
                        "Failed to delete chunks for removed document %s", doc_id
                    )
                    summary["errors"] += 1

                if conn:
                    _delete_sync_entry(conn, doc_id)

    finally:
        sp.close()
        if conn:
            conn.close()

    logger.info("Sync complete: %s", json.dumps(summary, indent=2))
    return summary
