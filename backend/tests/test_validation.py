"""
Unit and API integration tests for Phase 6: Validation Engine & Publish-Readiness Report.
Verifies detection of P1-P8 deliberate data flaws, blocker vs warning categorization,
and the GET /admin/validation-report endpoint.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import uuid

import pytest
from httpx import AsyncClient

from app.api.deps import get_db, require_editor
from app.core.security import create_access_token
from app.main import app
from app.models.artwork import Artwork
from app.models.enums import (
    ArtworkEntityType,
    ArtworkType,
    EpisodeStatus,
    ShowStatus,
    UserRole,
)
from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show
from app.models.user import User
from app.schemas.validation import IssueCategory, ValidationSeverity
from app.services.validation_engine import ValidationEngine


@pytest.fixture
def editor_user():
    return User(
        id=uuid.uuid4(),
        username="qa_editor",
        hashed_password="...",
        role=UserRole.EDITOR,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def editor_token(editor_user):
    return create_access_token(subject=editor_user.username)


class TestValidationEngineUnit:
    @pytest.mark.asyncio
    async def test_detects_missing_section_flaw_p1(self):
        """P1: Show with section=None must be flagged."""
        show_id = uuid.uuid4()
        show = Show(
            id=show_id,
            title="Rhyme Rangers",
            slug="rhyme-rangers",
            section=None,  # P1 deliberate flaw
            categories=["singalong"],
            status=ShowStatus.PUBLISHED,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            seasons=[],
        )

        mock_db = AsyncMock()
        # Mock shows query
        shows_res = MagicMock()
        shows_res.scalars.return_value.all.return_value = [show]
        # Mock artwork query
        art_res = MagicMock()
        art_res.scalars.return_value.all.return_value = []

        mock_db.execute.side_effect = [shows_res, art_res]

        report = await ValidationEngine.generate_report(mock_db)

        # Must flag section missing
        section_issues = [
            i for i in report.blockers if i.category == IssueCategory.MISSING_SECTION
        ]
        assert len(section_issues) == 1
        assert "Rhyme Rangers" in section_issues[0].message
        assert report.can_publish is False

    @pytest.mark.asyncio
    async def test_detects_missing_artwork_flaw_p2(self):
        """P2: Published episode without artwork must be a blocker."""
        show_id = uuid.uuid4()
        season_id = uuid.uuid4()
        ep_id = uuid.uuid4()

        ep = Episode(
            id=ep_id,
            season_id=season_id,
            episode_number=4,
            title="Taj Mahal Adventure",
            content_group="discover-india-ep04",
            language="en",
            duration_seconds=900,
            status=EpisodeStatus.PUBLISHED,
        )
        season = Season(
            id=season_id,
            show_id=show_id,
            season_number=1,
            title="Season 1",
            episodes=[ep],
        )
        show = Show(
            id=show_id,
            title="Discover India with Moti",
            slug="discover-india",
            section="minisodes",
            status=ShowStatus.PUBLISHED,
            seasons=[season],
        )

        # Show has artwork, but episode does NOT
        show_poster = Artwork(
            id=uuid.uuid4(),
            entity_type=ArtworkEntityType.SHOW,
            entity_id=show_id,
            artwork_type=ArtworkType.POSTER,
            storage_key="shows/poster.jpg",
            storage_url="http://storage/poster.jpg",
        )

        mock_db = AsyncMock()
        shows_res = MagicMock()
        shows_res.scalars.return_value.all.return_value = [show]

        art_res = MagicMock()
        art_res.scalars.return_value.all.return_value = [show_poster]

        mock_db.execute.side_effect = [shows_res, art_res]

        report = await ValidationEngine.generate_report(mock_db)

        ep_art_blockers = [
            i for i in report.blockers if i.category == IssueCategory.MISSING_ARTWORK and i.entity_type == "episode"
        ]
        assert len(ep_art_blockers) == 1
        assert "Taj Mahal Adventure" in ep_art_blockers[0].message
        assert report.can_publish is False

    @pytest.mark.asyncio
    async def test_detects_inconsistent_title_casing_p4_p5(self):
        """P4/P5: ALL CAPS or all lowercase titles flagged as warnings."""
        show_id = uuid.uuid4()
        season_id = uuid.uuid4()

        ep_upper = Episode(
            id=uuid.uuid4(),
            season_id=season_id,
            episode_number=1,
            title="A BRIDGE OF STONES",  # ALL CAPS
            content_group="stones-s01e01",
            language="en",
            duration_seconds=600,
            status=EpisodeStatus.PUBLISHED,
        )
        ep_lower = Episode(
            id=uuid.uuid4(),
            season_id=season_id,
            episode_number=2,
            title="rain on the roof",  # all lowercase
            content_group="roof-s01e02",
            language="en",
            duration_seconds=600,
            status=EpisodeStatus.PUBLISHED,
        )
        season = Season(
            id=season_id,
            show_id=show_id,
            season_number=1,
            episodes=[ep_upper, ep_lower],
        )
        show = Show(
            id=show_id,
            title="Curious Tales",
            slug="curious-tales",
            section="series",
            status=ShowStatus.PUBLISHED,
            seasons=[season],
        )

        mock_db = AsyncMock()
        shows_res = MagicMock()
        shows_res.scalars.return_value.all.return_value = [show]
        art_res = MagicMock()
        art_res.scalars.return_value.all.return_value = []
        mock_db.execute.side_effect = [shows_res, art_res]

        report = await ValidationEngine.generate_report(mock_db)

        casing_warnings = [
            i for i in report.warnings if i.category == IssueCategory.TITLE_CASING
        ]
        assert len(casing_warnings) == 2
        titles = {w.episode_title for w in casing_warnings}
        assert "A BRIDGE OF STONES" in titles
        assert "rain on the roof" in titles

    @pytest.mark.asyncio
    async def test_detects_incomplete_localization_p6(self):
        """P6: Content group with only 1 language variant flagged as localization warning."""
        show_id = uuid.uuid4()
        season_id = uuid.uuid4()

        ep_en = Episode(
            id=uuid.uuid4(),
            season_id=season_id,
            episode_number=8,
            title="Moti Solo",
            content_group="moti-s01e08-solo",
            language="en",  # No 'hi' variant
            duration_seconds=600,
            status=EpisodeStatus.PUBLISHED,
        )
        season = Season(
            id=season_id,
            show_id=show_id,
            season_number=1,
            episodes=[ep_en],
        )
        show = Show(
            id=show_id,
            title="Moti's Many Lives",
            slug="motis-many-lives",
            section="featured",
            status=ShowStatus.PUBLISHED,
            seasons=[season],
        )

        mock_db = AsyncMock()
        shows_res = MagicMock()
        shows_res.scalars.return_value.all.return_value = [show]
        art_res = MagicMock()
        art_res.scalars.return_value.all.return_value = []
        mock_db.execute.side_effect = [shows_res, art_res]

        report = await ValidationEngine.generate_report(mock_db)

        loc_warnings = [
            i for i in report.warnings if i.category == IssueCategory.INCOMPLETE_LOCALIZATION
        ]
        assert len(loc_warnings) >= 1
        assert "moti-s01e08-solo" in loc_warnings[0].message


class TestValidationReportEndpoint:
    @pytest.mark.asyncio
    async def test_endpoint_unauthorized_without_token(self, client: AsyncClient):
        resp = await client.get("/api/v1/admin/validation-report")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_endpoint_returns_valid_report_structure(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        show_id = uuid.uuid4()
        show = Show(
            id=show_id,
            title="Healthy Show",
            slug="healthy-show",
            section="series",
            status=ShowStatus.PUBLISHED,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            seasons=[],
        )

        async def override_get_db():
            mock_db = AsyncMock()
            shows_res = MagicMock()
            shows_res.scalars.return_value.all.return_value = [show]
            art_res = MagicMock()
            art_res.scalars.return_value.all.return_value = []
            mock_db.execute.side_effect = [shows_res, art_res]
            yield mock_db

        async def override_get_current_user():
            return editor_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_editor] = override_get_current_user
        try:
            resp = await client.get(
                "/api/v1/admin/validation-report",
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "can_publish" in data
            assert "summary" in data
            assert "blockers" in data
            assert "warnings" in data
            assert "grouped_by_show" in data
            assert data["summary"]["total_shows"] == 1
        finally:
            app.dependency_overrides.clear()
