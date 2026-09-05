"""
Unit and API integration tests for Phase 5: Artwork Pipeline & Storage Abstraction.
Tests validation of aspect ratio, dimensions, 200KB ceiling, storage abstraction, and upload API.
"""

from datetime import datetime, timezone
import io
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
import uuid

from PIL import Image
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_db, require_editor
from app.core.security import create_access_token
from app.main import app
from app.models.artwork import Artwork
from app.models.enums import ArtworkEntityType, ArtworkType, UserRole
from app.models.show import Show
from app.models.user import User
from app.services.artwork_service import ArtworkService
from app.services.artwork_validator import (
    ArtworkValidationError,
    ArtworkValidator,
)
from app.storage.local import LocalStorageProvider

ROOT_DIR = Path(__file__).resolve().parents[2]


# ── Helpers ───────────────────────────────────────────────────────────────────

def create_in_memory_image(
    width: int, height: int, fmt: str = "JPEG", size_pad_bytes: int = 0
) -> bytes:
    """Helper to generate in-memory synthetic images for testing."""
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    data = buf.getvalue()
    if size_pad_bytes > 0:
        data += b"0" * size_pad_bytes
    return data


@pytest.fixture
def editor_user():
    return User(
        id=uuid.uuid4(),
        username="art_editor",
        hashed_password="...",
        role=UserRole.EDITOR,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def editor_token(editor_user):
    return create_access_token(subject=editor_user.username)


# ── Image Validator Unit Tests ────────────────────────────────────────────────

class TestArtworkValidator:
    def test_valid_poster(self):
        img_bytes = create_in_memory_image(600, 900)
        w, h, fmt = ArtworkValidator.validate_image(img_bytes, ArtworkType.POSTER)
        assert w == 600
        assert h == 900
        assert fmt == "jpeg"

    def test_valid_banner(self):
        img_bytes = create_in_memory_image(1280, 720)
        w, h, fmt = ArtworkValidator.validate_image(img_bytes, ArtworkType.BANNER)
        assert w == 1280
        assert h == 720

    def test_valid_thumbnail(self):
        img_bytes = create_in_memory_image(640, 360)
        w, h, fmt = ArtworkValidator.validate_image(img_bytes, ArtworkType.THUMBNAIL)
        assert w == 640
        assert h == 360

    def test_file_size_exceeding_200kb_rejected(self):
        """Rule: Enforce the 200 KB ceiling."""
        # 210 KB image
        oversized = create_in_memory_image(600, 900, size_pad_bytes=210 * 1024)
        with pytest.raises(ArtworkValidationError) as exc:
            ArtworkValidator.validate_image(oversized, ArtworkType.POSTER)
        assert "exceeds the 200 KB limit" in str(exc.value)

    def test_wrong_aspect_ratio_rejected(self):
        """Rule: Square image (1:1) rejected for poster (2:3) or banner (16:9)."""
        square_img = create_in_memory_image(800, 800)
        with pytest.raises(ArtworkValidationError) as exc:
            ArtworkValidator.validate_image(square_img, ArtworkType.POSTER)
        assert "Incorrect aspect ratio" in str(exc.value)

    def test_invalid_non_image_bytes_rejected(self):
        corrupt_data = b"This is not a real image header"
        with pytest.raises(ArtworkValidationError) as exc:
            ArtworkValidator.validate_image(corrupt_data, ArtworkType.BANNER)
        assert "not a valid image" in str(exc.value)

    def test_sample_banner_too_big_rejected(self):
        """Verify bundled sample 'banner_too_big.png' (2560x1440) is rejected."""
        sample_path = ROOT_DIR / "banner_too_big.png"
        if sample_path.exists():
            data = sample_path.read_bytes()
            with pytest.raises(ArtworkValidationError) as exc:
                ArtworkValidator.validate_image(data, ArtworkType.BANNER)
            assert "dimensions are too large" in str(exc.value)

    def test_sample_thumb_tiny_rejected(self):
        """Verify bundled sample 'thumb_tiny.jpg' (160x90) is rejected for low res."""
        sample_path = ROOT_DIR / "thumb_tiny.jpg"
        if sample_path.exists():
            data = sample_path.read_bytes()
            with pytest.raises(ArtworkValidationError) as exc:
                ArtworkValidator.validate_image(data, ArtworkType.THUMBNAIL)
            assert "resolution is too low" in str(exc.value)


# ── Storage Abstraction Unit Tests ────────────────────────────────────────────

class TestLocalStorageProvider:
    @pytest.mark.asyncio
    async def test_upload_read_exists_and_delete(self, tmp_path: Path):
        provider = LocalStorageProvider(base_dir=tmp_path, base_url="http://cdn.test")
        key = "shows/abc-123/poster.jpg"
        payload = b"FAKE_IMAGE_DATA_12345"

        # Upload
        url = await provider.upload(key, payload, "image/jpeg")
        assert url == "http://cdn.test/shows/abc-123/poster.jpg"

        # Exists
        assert await provider.exists(key) is True

        # Read
        read_back = await provider.read(key)
        assert read_back == payload

        # Delete
        deleted = await provider.delete(key)
        assert deleted is True
        assert await provider.exists(key) is False

    def test_directory_traversal_blocked(self, tmp_path: Path):
        provider = LocalStorageProvider(base_dir=tmp_path)
        with pytest.raises(ValueError):
            provider._resolve_path("../../etc/passwd")


# ── Artwork API Endpoints Tests ───────────────────────────────────────────────

class TestArtworkApi:
    @pytest.mark.asyncio
    async def test_upload_unauthenticated_fails(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/artwork/upload",
            data={
                "entity_type": "show",
                "entity_id": str(uuid.uuid4()),
                "artwork_type": "poster",
            },
            files={"file": ("poster.jpg", b"fake", "image/jpeg")},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_upload_valid_poster_success(
        self, client: AsyncClient, editor_user: User, editor_token: str, tmp_path: Path
    ):
        show_id = uuid.uuid4()
        valid_img = create_in_memory_image(600, 900)

        # Mock show existence and DB persistence
        mock_show = Show(id=show_id, title="Test Show", slug="test-show")
        mock_artwork = Artwork(
            id=uuid.uuid4(),
            entity_type=ArtworkEntityType.SHOW,
            entity_id=show_id,
            artwork_type=ArtworkType.POSTER,
            storage_key=f"shows/{show_id}/poster.jpg",
            storage_url=f"http://localhost:8000/storage/shows/{show_id}/poster.jpg",
            width=600,
            height=900,
            file_size_bytes=len(valid_img),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        async def override_get_db():
            mock_db = AsyncMock()
            mock_db.get.return_value = mock_show
            # Slot lookup returns None (new artwork)
            mock_slot_res = MagicMock()
            mock_slot_res.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_slot_res
            mock_db.add = MagicMock()
            mock_db.commit = AsyncMock()

            async def mock_refresh(art):
                art.id = mock_artwork.id
                art.created_at = mock_artwork.created_at
                art.updated_at = mock_artwork.updated_at
            mock_db.refresh = mock_refresh
            yield mock_db

        async def override_get_current_user():
            return editor_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_editor] = override_get_current_user
        try:
            resp = await client.post(
                "/api/v1/artwork/upload",
                data={
                    "entity_type": "show",
                    "entity_id": str(show_id),
                    "artwork_type": "poster",
                },
                files={"file": ("poster.jpg", valid_img, "image/jpeg")},
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert data["artwork_type"] == "poster"
            assert data["width"] == 600
            assert data["height"] == 900
            assert "storage_url" in data
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_upload_wrong_aspect_returns_400(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        show_id = uuid.uuid4()
        # Square image sent as poster (which requires 2:3)
        square_img = create_in_memory_image(500, 500)

        mock_show = Show(id=show_id, title="Test Show", slug="test-show")

        async def override_get_db():
            mock_db = AsyncMock()
            mock_db.get.return_value = mock_show
            yield mock_db

        async def override_get_current_user():
            return editor_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_editor] = override_get_current_user
        try:
            resp = await client.post(
                "/api/v1/artwork/upload",
                data={
                    "entity_type": "show",
                    "entity_id": str(show_id),
                    "artwork_type": "poster",
                },
                files={"file": ("poster.jpg", square_img, "image/jpeg")},
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 400
            assert "Incorrect aspect ratio" in resp.json()["detail"]
        finally:
            app.dependency_overrides.clear()
