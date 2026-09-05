"""
Unit tests for Phase 7: Catalogue Generation & Transformation.
Tests content_group language variant collapsing, Season 0 trailers separation,
section grouping, deterministic ordering, and JSON serialization.
"""

from datetime import datetime, timezone
import json
from unittest.mock import AsyncMock, MagicMock
import uuid

import pytest

from app.models.artwork import Artwork
from app.models.enums import (
    ArtworkEntityType,
    ArtworkType,
    EpisodeStatus,
    ShowStatus,
)
from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show
from app.services.catalogue_builder import CatalogueBuilder


class TestCatalogueBuilder:
    @pytest.mark.asyncio
    async def test_content_group_collapses_language_variants(self):
        """
        CRITICAL CONVENTION:
        Episodes sharing content_group collapse into 1 catalogue entry with languages list.
        """
        show_id = uuid.uuid4()
        season_id = uuid.uuid4()
        ep_en_id = uuid.uuid4()
        ep_hi_id = uuid.uuid4()

        ep_en = Episode(
            id=ep_en_id,
            season_id=season_id,
            episode_number=1,
            title="A Clever Dog",
            content_group="moti-s01e01",
            language="en",
            duration_seconds=1200,
            status=EpisodeStatus.PUBLISHED,
        )
        ep_hi = Episode(
            id=ep_hi_id,
            season_id=season_id,
            episode_number=1,
            title="एक चतुर कुत्ता",
            content_group="moti-s01e01",
            language="hi",
            duration_seconds=1200,
            status=EpisodeStatus.PUBLISHED,
        )

        season = Season(
            id=season_id,
            show_id=show_id,
            season_number=1,
            title="Season 1",
            episodes=[ep_en, ep_hi],
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

        catalogue = await CatalogueBuilder.build_catalogue(mock_db, published_by="admin")

        # Must appear under "featured" section
        assert "featured" in catalogue.sections
        featured_shows = catalogue.sections["featured"]
        assert len(featured_shows) == 1

        show_entry = featured_shows[0]
        assert len(show_entry.seasons) == 1
        season_entry = show_entry.seasons[0]

        # 2 language variants must collapse into exactly 1 catalogue episode
        assert len(season_entry.episodes) == 1
        collapsed_ep = season_entry.episodes[0]
        assert collapsed_ep.content_group == "moti-s01e01"
        assert collapsed_ep.title == "A Clever Dog"  # Prefers English title

        # Languages list must contain both variants
        assert len(collapsed_ep.languages) == 2
        lang_codes = [lang.language for lang in collapsed_ep.languages]
        assert lang_codes == ["en", "hi"]  # Sorted alphabetically

        # Stats check
        assert catalogue.stats.shows_count == 1
        assert catalogue.stats.episodes_count == 1  # 1 collapsed episode
        assert catalogue.stats.language_variants_count == 2  # 2 total playable tracks

    @pytest.mark.asyncio
    async def test_season_zero_trailers_separation(self):
        """
        CRITICAL CONVENTION:
        Season 0 is reserved for trailers — must appear in show.trailers[], NOT in show.seasons[].
        """
        show_id = uuid.uuid4()
        s0_id = uuid.uuid4()
        s1_id = uuid.uuid4()

        ep_trailer = Episode(
            id=uuid.uuid4(),
            season_id=s0_id,
            episode_number=1,
            title="Official Trailer",
            content_group="moti-trailer",
            language="en",
            duration_seconds=90,
            status=EpisodeStatus.PUBLISHED,
        )
        ep_normal = Episode(
            id=uuid.uuid4(),
            season_id=s1_id,
            episode_number=1,
            title="Pilot Episode",
            content_group="moti-s01e01",
            language="en",
            duration_seconds=1200,
            status=EpisodeStatus.PUBLISHED,
        )

        season_0 = Season(
            id=s0_id,
            show_id=show_id,
            season_number=0,  # Trailers
            title="Trailers",
            episodes=[ep_trailer],
        )
        season_1 = Season(
            id=s1_id,
            show_id=show_id,
            season_number=1,
            title="Season 1",
            episodes=[ep_normal],
        )

        show = Show(
            id=show_id,
            title="Moti's Many Lives",
            slug="motis-many-lives",
            section="series",
            status=ShowStatus.PUBLISHED,
            seasons=[season_0, season_1],
        )

        mock_db = AsyncMock()
        shows_res = MagicMock()
        shows_res.scalars.return_value.all.return_value = [show]
        art_res = MagicMock()
        art_res.scalars.return_value.all.return_value = []
        mock_db.execute.side_effect = [shows_res, art_res]

        catalogue = await CatalogueBuilder.build_catalogue(mock_db)

        series_shows = catalogue.sections["series"]
        show_entry = series_shows[0]

        # Season 0 must NOT be in seasons list
        season_numbers = [s.season_number for s in show_entry.seasons]
        assert 0 not in season_numbers
        assert season_numbers == [1]

        # Trailer must appear in trailers list
        assert len(show_entry.trailers) == 1
        assert show_entry.trailers[0].content_group == "moti-trailer"
        assert show_entry.trailers[0].title == "Official Trailer"

    @pytest.mark.asyncio
    async def test_excludes_draft_shows_and_draft_episodes(self):
        """Only published shows and published episodes appear in catalogue."""
        show_pub_id = uuid.uuid4()
        s_id = uuid.uuid4()

        ep_pub = Episode(
            id=uuid.uuid4(),
            season_id=s_id,
            episode_number=1,
            title="Published Ep",
            content_group="cg-1",
            language="en",
            duration_seconds=600,
            status=EpisodeStatus.PUBLISHED,
        )
        ep_draft = Episode(
            id=uuid.uuid4(),
            season_id=s_id,
            episode_number=2,
            title="Draft Ep",
            content_group="cg-2",
            language="en",
            duration_seconds=600,
            status=EpisodeStatus.DRAFT,  # Must be excluded
        )

        season = Season(
            id=s_id,
            show_id=show_pub_id,
            season_number=1,
            episodes=[ep_pub, ep_draft],
        )

        show_published = Show(
            id=show_pub_id,
            title="Published Show",
            slug="published-show",
            section="series",
            status=ShowStatus.PUBLISHED,
            seasons=[season],
        )

        mock_db = AsyncMock()
        shows_res = MagicMock()
        shows_res.scalars.return_value.all.return_value = [show_published]
        art_res = MagicMock()
        art_res.scalars.return_value.all.return_value = []
        mock_db.execute.side_effect = [shows_res, art_res]

        catalogue = await CatalogueBuilder.build_catalogue(mock_db)

        episodes = catalogue.sections["series"][0].seasons[0].episodes
        # Only published episode included
        assert len(episodes) == 1
        assert episodes[0].title == "Published Ep"

    @pytest.mark.asyncio
    async def test_json_serialization(self):
        """to_json() produces valid deterministic JSON string."""
        show_id = uuid.uuid4()
        s_id = uuid.uuid4()

        ep = Episode(
            id=uuid.uuid4(),
            season_id=s_id,
            episode_number=1,
            title="Ep 1",
            content_group="cg-1",
            language="en",
            duration_seconds=500,
            status=EpisodeStatus.PUBLISHED,
        )
        season = Season(id=s_id, show_id=show_id, season_number=1, episodes=[ep])
        show = Show(
            id=show_id,
            title="Alpha Show",
            slug="alpha-show",
            section="songs",
            status=ShowStatus.PUBLISHED,
            seasons=[season],
        )

        mock_db = AsyncMock()
        shows_res = MagicMock()
        shows_res.scalars.return_value.all.return_value = [show]
        art_res = MagicMock()
        art_res.scalars.return_value.all.return_value = []
        mock_db.execute.side_effect = [shows_res, art_res]

        catalogue = await CatalogueBuilder.build_catalogue(mock_db, published_by="admin")
        json_str = CatalogueBuilder.to_json(catalogue)

        parsed = json.loads(json_str)
        assert parsed["version"] == "1.0"
        assert parsed["published_by"] == "admin"
        assert "songs" in parsed["sections"]
        assert parsed["stats"]["shows_count"] == 1
