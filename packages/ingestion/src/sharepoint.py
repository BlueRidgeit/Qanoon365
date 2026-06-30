"""SharePoint document listing and download via Microsoft Graph API."""

import logging
from datetime import datetime

import httpx
from azure.identity import ClientSecretCredential

logger = logging.getLogger(__name__)


class SharePointClient:
    """Authenticate with client credentials and interact with SharePoint document libraries."""

    GRAPH_BASE = "https://graph.microsoft.com/v1.0"

    def __init__(self, tenant_id: str, client_id: str, client_secret: str):
        self._credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
        self._http = httpx.Client(timeout=60.0)
        self._token: str | None = None
        self._token_expires: datetime | None = None

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    def _get_token(self) -> str:
        """Acquire or reuse an access token for Microsoft Graph."""
        now = datetime.utcnow()
        if self._token and self._token_expires and now < self._token_expires:
            return self._token

        logger.debug("Acquiring new Graph API token")
        token = self._credential.get_token("https://graph.microsoft.com/.default")
        self._token = token.token
        self._token_expires = datetime.utcfromtimestamp(token.expires_on)
        return self._token

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._get_token()}"}

    # ------------------------------------------------------------------
    # Document listing
    # ------------------------------------------------------------------

    def list_documents(
        self, site_id: str, library_id: str
    ) -> list[dict]:
        """
        List all documents in a SharePoint document library.

        Returns a list of dicts with keys:
            id, name, lastModified, downloadUrl, size
        """
        documents: list[dict] = []
        url = (
            f"{self.GRAPH_BASE}/sites/{site_id}/drives/{library_id}"
            f"/root/children?$select=id,name,lastModifiedDateTime,size,"
            f"@microsoft.graph.downloadUrl,file&$top=200"
        )

        while url:
            try:
                resp = self._http.get(url, headers=self._headers())
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError as exc:
                logger.error(
                    "Graph API error listing library %s: %s %s",
                    library_id,
                    exc.response.status_code,
                    exc.response.text[:300],
                )
                raise
            except Exception:
                logger.exception("Unexpected error listing library %s", library_id)
                raise

            for item in data.get("value", []):
                # Skip folders (only items with a 'file' facet are files)
                if "file" not in item:
                    continue
                documents.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "lastModified": item["lastModifiedDateTime"],
                        "downloadUrl": item.get("@microsoft.graph.downloadUrl", ""),
                        "size": item.get("size", 0),
                    }
                )

            url = data.get("@odata.nextLink")

        # Recurse into subfolders
        self._list_recursive(site_id, library_id, "/root/children", documents)

        logger.info(
            "Found %d documents in library %s", len(documents), library_id
        )
        return documents

    def _list_recursive(
        self,
        site_id: str,
        library_id: str,
        parent_path: str,
        documents: list[dict],
    ) -> None:
        """Walk sub-folders and collect files."""
        url = (
            f"{self.GRAPH_BASE}/sites/{site_id}/drives/{library_id}"
            f"{parent_path}?$select=id,name,lastModifiedDateTime,size,"
            f"@microsoft.graph.downloadUrl,file,folder&$top=200"
        )

        while url:
            try:
                resp = self._http.get(url, headers=self._headers())
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError:
                logger.warning("Could not recurse into %s", parent_path)
                return
            except Exception:
                logger.warning("Unexpected error recursing %s", parent_path)
                return

            for item in data.get("value", []):
                if "folder" in item:
                    child_path = f"/items/{item['id']}/children"
                    self._list_recursive(
                        site_id, library_id, child_path, documents
                    )
                elif "file" in item:
                    doc_entry = {
                        "id": item["id"],
                        "name": item["name"],
                        "lastModified": item["lastModifiedDateTime"],
                        "downloadUrl": item.get(
                            "@microsoft.graph.downloadUrl", ""
                        ),
                        "size": item.get("size", 0),
                    }
                    # Avoid duplicates (root listing may have already captured these)
                    if not any(d["id"] == doc_entry["id"] for d in documents):
                        documents.append(doc_entry)

            url = data.get("@odata.nextLink")

    # ------------------------------------------------------------------
    # Download
    # ------------------------------------------------------------------

    def download_document(self, download_url: str) -> bytes:
        """Download a document's raw bytes from its pre-authenticated URL."""
        try:
            logger.debug("Downloading document from %s", download_url[:80])
            resp = self._http.get(download_url, follow_redirects=True)
            resp.raise_for_status()
            logger.info("Downloaded %d bytes", len(resp.content))
            return resp.content
        except httpx.HTTPStatusError as exc:
            logger.error(
                "Download failed: %s %s",
                exc.response.status_code,
                exc.response.text[:300],
            )
            raise
        except Exception:
            logger.exception("Unexpected error downloading document")
            raise

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def close(self) -> None:
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
