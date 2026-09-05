"""
Local filesystem storage provider.
Writes files to local disk and serves them through FastAPI's static file mount.
"""

from pathlib import Path

import aiofiles
import aiofiles.os

from app.core.config import settings
from app.storage.base import StorageProvider


class LocalStorageProvider(StorageProvider):
    """Stores files on the local filesystem."""

    def __init__(
        self,
        base_dir: str | Path | None = None,
        base_url: str | None = None,
    ) -> None:
        self.base_dir = Path(base_dir or settings.LOCAL_STORAGE_PATH).resolve()
        self.base_url = (base_url or settings.LOCAL_STORAGE_BASE_URL).rstrip("/")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, key: str) -> Path:
        """Sanitize key and resolve within base_dir (prevents directory traversal)."""
        clean_key = key.lstrip("/\\")
        dest_path = (self.base_dir / clean_key).resolve()
        if not str(dest_path).startswith(str(self.base_dir)):
            raise ValueError(f"Invalid storage key path traversal: {key}")
        return dest_path

    async def upload(
        self, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> str:
        dest_path = self._resolve_path(key)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(dest_path, "wb") as f:
            await f.write(data)

        return self.get_public_url(key)

    async def delete(self, key: str) -> bool:
        dest_path = self._resolve_path(key)
        if await aiofiles.os.path.exists(dest_path):
            await aiofiles.os.remove(dest_path)
            return True
        return False

    async def exists(self, key: str) -> bool:
        dest_path = self._resolve_path(key)
        return await aiofiles.os.path.exists(dest_path)

    async def read(self, key: str) -> bytes | None:
        dest_path = self._resolve_path(key)
        if not await aiofiles.os.path.exists(dest_path):
            return None
        async with aiofiles.open(dest_path, "rb") as f:
            return await f.read()

    def get_public_url(self, key: str) -> str:
        clean_key = key.lstrip("/\\").replace("\\", "/")
        return f"{self.base_url}/{clean_key}"
