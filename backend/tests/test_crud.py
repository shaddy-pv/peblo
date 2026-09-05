"""
Unit and API integration tests for Phase 4: CRUD operations and business validation rules.
Covers shows, seasons, episodes, content_group uniqueness, and publish constraints.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient
from pydantic import ValidationError

from app.api.deps import get_db, require_editor
from app.core.security import create_access_token
from app.main import app
from app.models.enums import EpisodeStatus, ShowStatus, UserRole
from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show
from app.models.user import User
from app.schemas.episode import EpisodeCreate
from app.schemas.season import SeasonCreate
from app.schemas.show import ShowCreate

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def editor_user():
    return User(
        id=uuid.uuid4(),
        username="test_editor",
        hashed_password="...",
        role=UserRole.EDITOR,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def editor_token(editor_user):
    return create_access_token(subject=editor_user.username)


# ── Schema Validation Unit Tests ──────────────────────────────────────────────

class TestSchemaValidations:
    def test_show_auto_slug_generation(self):
        show_in = ShowCreate(
            title="Adventures of Moti!",
            synopsis="Exciting tales",
            section="series",
            categories=["adventure"],
            status=ShowStatus.DRAFT,
        )
        assert show_in.slug == "adventures-of-moti"

    def test_published_show_requires_section(self):
        """Rule: A published show MUST have a section."""
        with pytest.raises(ValidationError) as exc_info:
            ShowCreate(
                title="Invalid Show",
                section=None,
                status=ShowStatus.PUBLISHED,  # Cannot be published without section
            )
        assert "A published show must have a valid section assigned" in str(exc_info.value)

    def test_invalid_section_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            ShowCreate(
                title="Invalid Section",
                section="movies",  # Not in allowed sections
            )
        assert "Invalid section 'movies'" in str(exc_info.value)

    def test_invalid_category_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            ShowCreate(
                title="Invalid Category",
                categories=["action", "horror"],  # Not in reference.json
            )
        assert "Invalid category 'action'" in str(exc_info.value)

    def test_season_trailers_default_title(self):
        """Convention: season_number=0 defaults to 'Trailers'."""
        show_id = uuid.uuid4()
        s0 = SeasonCreate(show_id=show_id, season_number=0)
        assert s0.title == "Trailers"

        s1 = SeasonCreate(show_id=show_id, season_number=1)
        assert s1.title is None

    def test_episode_published_requires_duration(self):
        """Rule: An episode can't be published without duration."""
        with pytest.raises(ValidationError) as exc_info:
            EpisodeCreate(
                season_id=uuid.uuid4(),
                episode_number=1,
                title="No Duration",
                content_group="cg-1",
                language="en",
                duration_seconds=None,
                status=EpisodeStatus.PUBLISHED,
            )
        assert "A published episode must have a duration" in str(exc_info.value)

    def test_episode_invalid_language_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            EpisodeCreate(
                season_id=uuid.uuid4(),
                episode_number=1,
                title="French Variant",
                content_group="cg-1",
                language="fr",  # Only en, hi allowed
                duration_seconds=300,
            )
        assert "Invalid language 'fr'" in str(exc_info.value)


# ── Show CRUD API Tests ───────────────────────────────────────────────────────

class TestShowApi:
    @pytest.mark.asyncio
    async def test_create_show_unauthenticated_fails(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/shows/",
            json={"title": "Unauthorized Show"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_create_show_success(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        mock_show = Show(
            id=uuid.uuid4(),
            title="Curious Cubs",
            slug="curious-cubs",
            synopsis="Fun stories",
            section="series",
            categories=["learning"],
            status=ShowStatus.DRAFT,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        async def override_get_db():
            mock_db = AsyncMock()
            # Slug check returns None (no conflict)
            mock_result_slug = MagicMock()
            mock_result_slug.scalar_one_or_none.return_value = None

            mock_db.execute.return_value = mock_result_slug
            mock_db.add = MagicMock()
            mock_db.commit = AsyncMock()
            # On refresh, set mock show attributes
            async def mock_refresh(instance):
                instance.id = mock_show.id
                instance.created_at = mock_show.created_at
                instance.updated_at = mock_show.updated_at
            mock_db.refresh = mock_refresh
            yield mock_db

        async def override_get_current_user():
            return editor_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_editor] = override_get_current_user
        try:
            resp = await client.post(
                "/api/v1/shows/",
                json={
                    "title": "Curious Cubs",
                    "synopsis": "Fun stories",
                    "section": "series",
                    "categories": ["learning"],
                    "status": "draft",
                },
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert data["title"] == "Curious Cubs"
            assert data["slug"] == "curious-cubs"
            assert data["section"] == "series"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_show_duplicate_slug_conflict(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        existing_show = Show(
            id=uuid.uuid4(),
            title="Existing",
            slug="existing",
            section="series",
            status=ShowStatus.DRAFT,
        )

        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = existing_show
            mock_db.execute.return_value = mock_result
            yield mock_db

        async def override_get_current_user():
            return editor_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_editor] = override_get_current_user
        try:
            resp = await client.post(
                "/api/v1/shows/",
                json={"title": "Existing", "slug": "existing"},
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 409
            assert "already exists" in resp.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_shows_paginated(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        mock_shows = [
            Show(
                id=uuid.uuid4(),
                title=f"Show {i}",
                slug=f"show-{i}",
                section="series",
                categories=["values"],
                status=ShowStatus.PUBLISHED,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            for i in range(2)
        ]

        async def override_get_db():
            mock_db = AsyncMock()
            # First execute is count query
            mock_count_res = MagicMock()
            mock_count_res.scalar_one.return_value = 2
            # Second execute is items query
            mock_items_res = MagicMock()
            mock_items_res.scalars.return_value.all.return_value = mock_shows

            mock_db.execute.side_effect = [mock_count_res, mock_items_res]
            yield mock_db

        async def override_get_current_user():
            return editor_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_editor] = override_get_current_user
        try:
            resp = await client.get(
                "/api/v1/shows/?page=1&page_size=10",
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] == 2
            assert data["page"] == 1
            assert len(data["items"]) == 2
        finally:
            app.dependency_overrides.clear()


# ── Episode Business Rules & Uniqueness Tests ─────────────────────────────────

class TestEpisodeRules:
    @pytest.mark.asyncio
    async def test_duplicate_content_group_language_conflict(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        """
        CRITICAL RULE: (content_group, language) must be unique.
        Attempting to insert a duplicate variant returns 409 Conflict.
        """
        season_id = uuid.uuid4()
        existing_episode = Episode(
            id=uuid.uuid4(),
            season_id=season_id,
            episode_number=1,
            title="Episode 1 (Hindi)",
            content_group="moti-s01e01",
            language="hi",
            status=EpisodeStatus.DRAFT,
        )

        async def override_get_db():
            mock_db = AsyncMock()
            # 1. Season check
            mock_db.get.return_value = Season(id=season_id, show_id=uuid.uuid4(), season_number=1)
            # 2. Content group + language uniqueness check returns existing
            mock_res = MagicMock()
            mock_res.scalar_one_or_none.return_value = existing_episode
            mock_db.execute.return_value = mock_res
            yield mock_db

        async def override_get_current_user():
            return editor_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_editor] = override_get_current_user
        try:
            resp = await client.post(
                "/api/v1/episodes/",
                json={
                    "season_id": str(season_id),
                    "episode_number": 1,
                    "title": "Duplicate Episode",
                    "content_group": "moti-s01e01",
                    "language": "hi",
                    "status": "draft",
                },
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 409
            assert "already exists" in resp.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_publish_episode_without_artwork_blocked(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        """
        CRITICAL RULE: An episode cannot be published without artwork.
        """
        episode_id = uuid.uuid4()
        existing_draft_episode = Episode(
            id=episode_id,
            season_id=uuid.uuid4(),
            episode_number=1,
            title="Episode 1",
            content_group="moti-s01e01",
            language="en",
            duration_seconds=600,
            status=EpisodeStatus.DRAFT,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        async def override_get_db():
            mock_db = AsyncMock()
            # 1. get_by_id
            mock_get_res = MagicMock()
            mock_get_res.scalar_one_or_none.return_value = existing_draft_episode

            # 2. artwork check returns count=0 (NO artwork)
            mock_art_res = MagicMock()
            mock_art_res.scalar_one.return_value = 0

            mock_db.execute.side_effect = [mock_get_res, mock_art_res]
            yield mock_db

        async def override_get_current_user():
            return editor_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_editor] = override_get_current_user
        try:
            resp = await client.patch(
                f"/api/v1/episodes/{episode_id}",
                json={"status": "published"},
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 400
            assert "Cannot publish episode without uploaded artwork" in resp.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_publish_episode_without_duration_blocked(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        """
        CRITICAL RULE: An episode cannot be published without duration.
        """
        episode_id = uuid.uuid4()
        existing_draft_episode = Episode(
            id=episode_id,
            season_id=uuid.uuid4(),
            episode_number=1,
            title="Episode 1",
            content_group="moti-s01e01",
            language="en",
            duration_seconds=None,  # NO duration
            status=EpisodeStatus.DRAFT,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        async def override_get_db():
            mock_db = AsyncMock()
            mock_get_res = MagicMock()
            mock_get_res.scalar_one_or_none.return_value = existing_draft_episode
            mock_db.execute.return_value = mock_get_res
            yield mock_db

        async def override_get_current_user():
            return editor_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_editor] = override_get_current_user
        try:
            resp = await client.patch(
                f"/api/v1/episodes/{episode_id}",
                json={"status": "published"},
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 400
            assert "Cannot publish episode without a duration" in resp.json()["detail"]
        finally:
            app.dependency_overrides.clear()
