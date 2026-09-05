"""
Abstract storage provider interface.
Defines common operations for local disk and cloud object storage (Cloudflare R2).
"""

from abc import ABC, abstractmethod


class StorageProvider(ABC):
    """Abstract base class for file storage providers."""

    @abstractmethod
    async def upload(
        self, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> str:
        """
        Store data at key and return the public URL.
        :param key: Storage path/key (e.g. 'shows/{uuid}/poster.jpg').
        :param data: Binary contents to write.
        :param content_type: MIME type of the file.
        :return: Publicly accessible URL.
        """
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """
        Delete file at key.
        :param key: Storage key to delete.
        :return: True if deleted, False if not found.
        """
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if file exists at key."""
        pass

    @abstractmethod
    async def read(self, key: str) -> bytes | None:
        """Read file contents at key. Returns None if not found."""
        pass

    @abstractmethod
    def get_public_url(self, key: str) -> str:
        """Return public URL for key without performing network call."""
        pass
