"""
Cloudflare R2 storage provider (S3-compatible API).
Used in production environments.
"""

from app.core.config import settings
from app.storage.base import StorageProvider


class R2StorageProvider(StorageProvider):
    """
    Cloudflare R2 object storage provider.
    Interacts with R2 using the S3-compatible API endpoint.
    """

    def __init__(self) -> None:
        self.account_id = settings.R2_ACCOUNT_ID
        self.access_key = settings.R2_ACCESS_KEY_ID
        self.secret_key = settings.R2_SECRET_ACCESS_KEY
        self.bucket = settings.R2_BUCKET_NAME
        self.public_url_base = settings.R2_PUBLIC_URL.rstrip("/")
        self.endpoint_url = (
            f"https://{self.account_id}.r2.cloudflarestorage.com"
            if self.account_id
            else ""
        )

    def _get_client(self):
        """Lazy boto3 s3 client initialization."""
        try:
            import boto3
            return boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name="auto",
            )
        except ImportError:
            raise RuntimeError(
                "boto3 is required for R2StorageProvider. Run 'pip install boto3'."
            )

    async def upload(
        self, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> str:
        clean_key = key.lstrip("/\\").replace("\\", "/")
        client = self._get_client()
        client.put_object(
            Bucket=self.bucket,
            Key=clean_key,
            Body=data,
            ContentType=content_type,
        )
        return self.get_public_url(clean_key)

    async def delete(self, key: str) -> bool:
        clean_key = key.lstrip("/\\").replace("\\", "/")
        client = self._get_client()
        try:
            client.delete_object(Bucket=self.bucket, Key=clean_key)
            return True
        except Exception:
            return False

    async def exists(self, key: str) -> bool:
        clean_key = key.lstrip("/\\").replace("\\", "/")
        client = self._get_client()
        try:
            client.head_object(Bucket=self.bucket, Key=clean_key)
            return True
        except Exception:
            return False

    async def read(self, key: str) -> bytes | None:
        clean_key = key.lstrip("/\\").replace("\\", "/")
        client = self._get_client()
        try:
            resp = client.get_object(Bucket=self.bucket, Key=clean_key)
            return resp["Body"].read()
        except Exception:
            return None

    def get_public_url(self, key: str) -> str:
        clean_key = key.lstrip("/\\").replace("\\", "/")
        if self.public_url_base:
            return f"{self.public_url_base}/{clean_key}"
        return f"{self.endpoint_url}/{self.bucket}/{clean_key}"
