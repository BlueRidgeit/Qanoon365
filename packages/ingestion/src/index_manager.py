"""Azure AI Search index management: create, upsert, delete, and hybrid search."""

import logging
from itertools import islice
from typing import Iterator

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SimpleField,
    VectorSearch,
    VectorSearchProfile,
)
from azure.search.documents.models import VectorizedQuery

logger = logging.getLogger(__name__)

# text-embedding-3-large produces 3072-dimensional vectors
VECTOR_DIMENSIONS = 3072

UPLOAD_BATCH_SIZE = 1000


def _batched(iterable: list, n: int) -> Iterator[list]:
    """Yield successive n-sized chunks from *iterable*."""
    it = iter(iterable)
    while True:
        batch = list(islice(it, n))
        if not batch:
            break
        yield batch


# ------------------------------------------------------------------
# Index creation / update
# ------------------------------------------------------------------


def create_or_update_index(endpoint: str, key: str, index_name: str) -> None:
    """Create the search index with vector fields if it doesn't exist, or update it."""
    client = SearchIndexClient(endpoint, AzureKeyCredential(key))

    fields = [
        SimpleField(
            name="id",
            type=SearchFieldDataType.String,
            key=True,
            filterable=True,
        ),
        SearchableField(
            name="content",
            type=SearchFieldDataType.String,
            analyzer_name="standard.lucene",
        ),
        SearchField(
            name="contentVector",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=VECTOR_DIMENSIONS,
            vector_search_profile_name="default-vector-profile",
        ),
        SimpleField(
            name="fileName",
            type=SearchFieldDataType.String,
            filterable=True,
            sortable=True,
        ),
        SimpleField(
            name="pageNumber",
            type=SearchFieldDataType.Int32,
            filterable=True,
            sortable=True,
        ),
        SimpleField(
            name="tenantId",
            type=SearchFieldDataType.String,
            filterable=True,
        ),
        SimpleField(
            name="matterId",
            type=SearchFieldDataType.String,
            filterable=True,
        ),
        SimpleField(
            name="documentId",
            type=SearchFieldDataType.String,
            filterable=True,
        ),
        SimpleField(
            name="language",
            type=SearchFieldDataType.String,
            filterable=True,
        ),
    ]

    vector_search = VectorSearch(
        algorithms=[
            HnswAlgorithmConfiguration(name="default-hnsw"),
        ],
        profiles=[
            VectorSearchProfile(
                name="default-vector-profile",
                algorithm_configuration_name="default-hnsw",
            ),
        ],
    )

    index = SearchIndex(
        name=index_name,
        fields=fields,
        vector_search=vector_search,
    )

    try:
        client.create_or_update_index(index)
        logger.info("Index '%s' created or updated successfully", index_name)
    except Exception:
        logger.exception("Failed to create or update index '%s'", index_name)
        raise


# ------------------------------------------------------------------
# Upsert
# ------------------------------------------------------------------


def upsert_chunks(
    endpoint: str, key: str, index_name: str, chunks: list[dict]
) -> int:
    """
    Upsert chunks into the search index.

    Each chunk dict must have at minimum: id, content, contentVector.
    Returns the number of successfully upserted documents.
    """
    if not chunks:
        logger.info("No chunks to upsert")
        return 0

    client = SearchClient(endpoint, index_name, AzureKeyCredential(key))
    total_success = 0
    total_failed = 0

    for batch_idx, batch in enumerate(_batched(chunks, UPLOAD_BATCH_SIZE)):
        # Build documents for upload -- flatten metadata into top-level fields
        documents = []
        for chunk in batch:
            doc = {
                "id": chunk["id"],
                "content": chunk["content"],
                "contentVector": chunk.get("contentVector", []),
                "fileName": chunk.get("fileName", ""),
                "documentId": chunk.get("documentId", ""),
                "tenantId": chunk.get("tenantId", ""),
                "matterId": chunk.get("matterId", ""),
                "language": chunk.get("language", ""),
            }
            # pageNumber: use the first page if multiple
            page_numbers = chunk.get("pageNumbers", [])
            doc["pageNumber"] = page_numbers[0] if page_numbers else 0
            documents.append(doc)

        try:
            result = client.upload_documents(documents=documents)
            succeeded = sum(1 for r in result if r.succeeded)
            failed = len(result) - succeeded
            total_success += succeeded
            total_failed += failed
            if failed:
                failed_keys = [r.key for r in result if not r.succeeded]
                logger.warning(
                    "Batch %d: %d/%d failed (keys: %s)",
                    batch_idx,
                    failed,
                    len(batch),
                    failed_keys[:5],
                )
            else:
                logger.debug("Batch %d: %d uploaded", batch_idx, succeeded)
        except Exception:
            logger.exception("Failed to upload batch %d", batch_idx)
            total_failed += len(batch)

    logger.info(
        "Upsert complete: %d succeeded, %d failed", total_success, total_failed
    )
    return total_success


# ------------------------------------------------------------------
# Delete
# ------------------------------------------------------------------


def delete_document_chunks(
    endpoint: str, key: str, index_name: str, document_id: str
) -> int:
    """
    Delete all chunks for a given document by querying on documentId filter
    and then deleting by id.

    Returns the number of deleted documents.
    """
    client = SearchClient(endpoint, index_name, AzureKeyCredential(key))

    # Find all chunk ids belonging to this document
    chunk_ids: list[str] = []
    try:
        results = client.search(
            search_text="*",
            filter=f"documentId eq '{document_id}'",
            select=["id"],
            top=10000,
        )
        for result in results:
            chunk_ids.append(result["id"])
    except Exception:
        logger.exception(
            "Failed to query chunks for document %s", document_id
        )
        return 0

    if not chunk_ids:
        logger.info("No chunks found for document %s", document_id)
        return 0

    # Delete in batches
    deleted = 0
    for batch in _batched(chunk_ids, UPLOAD_BATCH_SIZE):
        docs_to_delete = [{"id": cid} for cid in batch]
        try:
            result = client.delete_documents(documents=docs_to_delete)
            succeeded = sum(1 for r in result if r.succeeded)
            deleted += succeeded
        except Exception:
            logger.exception("Failed to delete batch of chunks for document %s", document_id)

    logger.info(
        "Deleted %d/%d chunks for document %s",
        deleted,
        len(chunk_ids),
        document_id,
    )
    return deleted


# ------------------------------------------------------------------
# Hybrid search (keyword + vector)
# ------------------------------------------------------------------


def search(
    endpoint: str,
    key: str,
    index_name: str,
    query: str,
    query_vector: list[float] | None = None,
    filter_expr: str | None = None,
    top_k: int = 5,
) -> list[dict]:
    """
    Hybrid search combining keyword (BM25) and vector similarity.

    If *query_vector* is provided, performs hybrid search.
    Otherwise, performs keyword-only search.
    """
    client = SearchClient(endpoint, index_name, AzureKeyCredential(key))

    vector_queries = None
    if query_vector:
        vector_queries = [
            VectorizedQuery(
                vector=query_vector,
                k_nearest_neighbors=top_k,
                fields="contentVector",
            )
        ]

    try:
        results = client.search(
            search_text=query,
            vector_queries=vector_queries,
            filter=filter_expr,
            top=top_k,
            select=[
                "id",
                "content",
                "fileName",
                "pageNumber",
                "tenantId",
                "matterId",
                "documentId",
                "language",
            ],
        )

        hits: list[dict] = []
        for result in results:
            hit = {
                "id": result["id"],
                "content": result["content"],
                "fileName": result.get("fileName", ""),
                "pageNumber": result.get("pageNumber", 0),
                "tenantId": result.get("tenantId", ""),
                "matterId": result.get("matterId", ""),
                "documentId": result.get("documentId", ""),
                "language": result.get("language", ""),
                "score": result.get("@search.score", 0.0),
            }
            hits.append(hit)

        logger.info("Search returned %d results for query: %s", len(hits), query[:80])
        return hits

    except Exception:
        logger.exception("Search failed for query: %s", query[:80])
        return []
