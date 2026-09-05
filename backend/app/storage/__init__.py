"""
Storage provider registry and factory.
"""

from app.core.config import settings
from app.storage.base import StorageProvider
from app.storage.local import LocalStorageProvider

_storage_instance: StorageProvider | None = None


def get_storage() -> StorageProvider:
    """
    Return the configured storage provider instance.
    Defaults to LocalStorageProvider in development.
    Switches to R2StorageProvider if STORAGE_BACKEND=r2.
    """
    global _storage_instance
    if _storage_instance is None:
        if settings.STORAGE_BACKEND.lower() == "r2":
            from app.storage.r2 import R2StorageProvider
            _storage_instance = R2StorageProvider()
        else:
            _storage_instance = LocalStorageProvider()
    return _storage_instance


__all__ = [
    "StorageProvider",
    "LocalStorageProvider",
    "get_storage",
]
