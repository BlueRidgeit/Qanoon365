"""Configuration loaded from environment variables."""

import os
import logging

logger = logging.getLogger(__name__)


class Config:
    """Reads all ingestion pipeline settings from environment variables."""

    def __init__(self):
        # SharePoint / Microsoft Graph
        self.sharepoint_tenant_id: str = os.environ.get("SHAREPOINT_TENANT_ID", "")
        self.sharepoint_client_id: str = os.environ.get("SHAREPOINT_CLIENT_ID", "")
        self.sharepoint_client_secret: str = os.environ.get("SHAREPOINT_CLIENT_SECRET", "")
        self.sharepoint_site_id: str = os.environ.get("SHAREPOINT_SITE_ID", "")
        self.sharepoint_library_ids: list[str] = [
            lid.strip()
            for lid in os.environ.get("SHAREPOINT_LIBRARY_IDS", "").split(",")
            if lid.strip()
        ]

        # Azure AI Search
        self.azure_search_endpoint: str = os.environ.get("AZURE_SEARCH_ENDPOINT", "")
        self.azure_search_key: str = os.environ.get("AZURE_SEARCH_KEY", "")
        self.azure_search_index: str = os.environ.get("AZURE_SEARCH_INDEX", "qanoon365-docs")

        # Azure Document Intelligence
        self.azure_docintel_endpoint: str = os.environ.get("AZURE_DOCINTEL_ENDPOINT", "")
        self.azure_docintel_key: str = os.environ.get("AZURE_DOCINTEL_KEY", "")

        # Azure OpenAI
        self.azure_openai_endpoint: str = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
        self.azure_openai_key: str = os.environ.get("AZURE_OPENAI_KEY", "")
        self.azure_openai_embedding_deployment: str = os.environ.get(
            "AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-large"
        )

        # Chunking
        self.chunk_size: int = int(os.environ.get("CHUNK_SIZE", "1024"))
        self.chunk_overlap: int = int(os.environ.get("CHUNK_OVERLAP", "256"))

        # Database
        self.database_url: str = os.environ.get("DATABASE_URL", "")

        # Azure Blob Storage
        self.blob_connection_string: str = os.environ.get("BLOB_CONNECTION_STRING", "")
        self.blob_container: str = os.environ.get("BLOB_CONTAINER", "qanoon365-docs")

    def validate(self, require_sharepoint: bool = True, require_search: bool = True) -> list[str]:
        """Return a list of missing required configuration fields."""
        missing: list[str] = []

        if require_sharepoint:
            if not self.sharepoint_tenant_id:
                missing.append("SHAREPOINT_TENANT_ID")
            if not self.sharepoint_client_id:
                missing.append("SHAREPOINT_CLIENT_ID")
            if not self.sharepoint_client_secret:
                missing.append("SHAREPOINT_CLIENT_SECRET")
            if not self.sharepoint_site_id:
                missing.append("SHAREPOINT_SITE_ID")
            if not self.sharepoint_library_ids:
                missing.append("SHAREPOINT_LIBRARY_IDS")

        if require_search:
            if not self.azure_search_endpoint:
                missing.append("AZURE_SEARCH_ENDPOINT")
            if not self.azure_search_key:
                missing.append("AZURE_SEARCH_KEY")

        if not self.azure_openai_endpoint:
            missing.append("AZURE_OPENAI_ENDPOINT")
        if not self.azure_openai_key:
            missing.append("AZURE_OPENAI_KEY")

        if missing:
            logger.warning("Missing configuration: %s", ", ".join(missing))

        return missing
