"""Azure OpenAI embedding generation for document chunks."""

import logging
from itertools import islice
from typing import Iterator

import openai

logger = logging.getLogger(__name__)

BATCH_SIZE = 16  # Azure OpenAI batch limit for embeddings


def _batched(iterable: list, n: int) -> Iterator[list]:
    """Yield successive n-sized chunks from *iterable*."""
    it = iter(iterable)
    while True:
        batch = list(islice(it, n))
        if not batch:
            break
        yield batch


def embed_chunks(
    chunks: list[dict],
    endpoint: str,
    key: str,
    deployment: str,
) -> list[dict]:
    """
    Add a 'contentVector' field to each chunk using Azure OpenAI embeddings.

    Processes in batches of 16 (Azure OpenAI limit). Chunks whose content is
    empty are assigned a zero vector.
    """
    if not chunks:
        logger.info("No chunks to embed")
        return chunks

    client = openai.AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=key,
        api_version="2024-12-01-preview",
    )

    total_embedded = 0
    total_failed = 0

    for batch_idx, batch in enumerate(_batched(chunks, BATCH_SIZE)):
        texts = [c["content"] for c in batch]

        # Skip empty texts
        non_empty_indices = [i for i, t in enumerate(texts) if t.strip()]
        if not non_empty_indices:
            for c in batch:
                c["contentVector"] = []
            logger.debug("Batch %d: all empty, skipped", batch_idx)
            continue

        non_empty_texts = [texts[i] for i in non_empty_indices]

        try:
            response = client.embeddings.create(
                input=non_empty_texts,
                model=deployment,
            )

            # Map embeddings back to their chunks
            embedding_map: dict[int, list[float]] = {}
            for idx_in_nonempty, emb_data in enumerate(response.data):
                original_idx = non_empty_indices[idx_in_nonempty]
                embedding_map[original_idx] = emb_data.embedding

            for i, chunk in enumerate(batch):
                if i in embedding_map:
                    chunk["contentVector"] = embedding_map[i]
                    total_embedded += 1
                else:
                    chunk["contentVector"] = []

            logger.debug(
                "Batch %d: embedded %d/%d chunks",
                batch_idx,
                len(non_empty_indices),
                len(batch),
            )

        except openai.APIError as exc:
            logger.error(
                "Azure OpenAI API error on batch %d: %s", batch_idx, exc
            )
            total_failed += len(batch)
            for c in batch:
                c["contentVector"] = []

        except Exception:
            logger.exception("Unexpected error embedding batch %d", batch_idx)
            total_failed += len(batch)
            for c in batch:
                c["contentVector"] = []

    logger.info(
        "Embedding complete: %d succeeded, %d failed out of %d chunks",
        total_embedded,
        total_failed,
        len(chunks),
    )
    return chunks
