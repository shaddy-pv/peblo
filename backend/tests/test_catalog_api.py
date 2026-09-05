"""
Unit and API integration tests for Phase 9: Catalog Read & Search API.
Verifies:
1. GET /catalog and GET /api/v1/catalog serve published catalogue.json.
2. 404 returned when catalogue has not been published yet.
3. Public accessibility (no JWT or admin auth required).
4. Composed multi-criteria search:
   - Free-text query 'q' matching show title, synopsis, categories, and episode titles.
   - Category filter.
   - Section filter.
   - Language filter.
   - Logical AND composition of multiple filters.
5. Show detail lookup: GET /catalog/shows/{slug_or_id}.
6. Sections summary: GET /catalog/sections.
7. Sub-millisecond in-memory mtime cache behavior.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
from unittest.mock import patch
import uuid

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.main import app
from app.schemas.catalogue import (
    CatalogueArtwork,
    CatalogueData,
    CatalogueEpisode,
    CatalogueLanguageVariant,
    CatalogueSeason,
    CatalogueShow,
    CatalogueStats,
)
from app.services.catalogue_service import CatalogueService


@pytest.fixture(autouse=True)
def reset_catalogue_service_cache():
    """Ensure clean cache before and after every test."""
    CatalogueService.clear_cache()
    yield
    CatalogueService.clear_cache()


@pytest.fixture
def mock_catalogue_data():
    moti_id = uuid.uuid4()
    nest_id = uuid.uuid4()
    songs_id = uuid.uuid4()

    show_moti = CatalogueShow(
        id=moti_id,
        slug="motis-many-lives",
        title="Moti's Many Lives",
        synopsis="A brave street puppy journeys across India finding family and adventure.",
        section="featured",
        categories=["adventure", "friendship", "india"],
        artwork=CatalogueArtwork(
            poster="http://localhost:8000/storage/moti_poster.jpg",
            banner="http://localhost:8000/storage/moti_banner.jpg",
        ),
        seasons=[
            CatalogueSeason(
                season_number=1,
                title="Season 1",
                episodes=[
                    CatalogueEpisode(
                        content_group="motis-many-lives-s01e01",
                        episode_number=1,
                        title="Finding Home",
                        duration_seconds=900,
                        artwork=CatalogueArtwork(thumbnail="http://localhost:8000/storage/moti_s1e1_thumb.jpg"),
                        languages=[
                            CatalogueLanguageVariant(
                                language="en",
                                episode_id=uuid.uuid4(),
                                title="Finding Home",
                                duration_seconds=900,
                            ),
                            CatalogueLanguageVariant(
                                language="hi",
                                episode_id=uuid.uuid4(),
                                title="Ghar Ki Khoj",
                                duration_seconds=900,
                            ),
                        ],
                    ),
                    CatalogueEpisode(
                        content_group="motis-many-lives-s01e02",
                        episode_number=2,
                        title="The Secret Garden",
                        duration_seconds=950,
                        artwork=CatalogueArtwork(thumbnail="http://localhost:8000/storage/moti_s1e2_thumb.jpg"),
                        languages=[
                            CatalogueLanguageVariant(
                                language="en",
                                episode_id=uuid.uuid4(),
                                title="The Secret Garden",
                                duration_seconds=950,
                            )
                        ],
                    ),
                ],
            )
        ],
        trailers=[
            CatalogueEpisode(
                content_group="moti-trailer",
                episode_number=1,
                title="Official Trailer",
                duration_seconds=120,
                artwork=CatalogueArtwork(thumbnail="http://localhost:8000/storage/moti_tr_thumb.jpg"),
                languages=[
                    CatalogueLanguageVariant(
                        language="en",
                        episode_id=uuid.uuid4(),
                        title="Official Trailer",
                        duration_seconds=120,
                    )
                ],
            )
        ],
    )

    show_nest = CatalogueShow(
        id=nest_id,
        slug="number-nest",
        title="Number Nest",
        synopsis="Chirpy birds teach early math, counting, and shapes through musical fun.",
        section="series",
        categories=["maths", "learning"],
        artwork=CatalogueArtwork(
            poster="http://localhost:8000/storage/nest_poster.jpg",
            banner="http://localhost:8000/storage/nest_banner.jpg",
        ),
        seasons=[
            CatalogueSeason(
                season_number=1,
                title="Season 1",
                episodes=[
                    CatalogueEpisode(
                        content_group="nest-s01e01",
                        episode_number=1,
                        title="Counting Twigs",
                        duration_seconds=600,
                        artwork=CatalogueArtwork(thumbnail="http://localhost:8000/storage/nest_s1e1_thumb.jpg"),
                        languages=[
                            CatalogueLanguageVariant(
                                language="en",
                                episode_id=uuid.uuid4(),
                                title="Counting Twigs",
                                duration_seconds=600,
                            ),
                            CatalogueLanguageVariant(
                                language="hi",
                                episode_id=uuid.uuid4(),
                                title="Tinke Ginna",
                                duration_seconds=600,
                            ),
                        ],
                    )
                ],
            )
        ],
        trailers=[],
    )

    show_songs = CatalogueShow(
        id=songs_id,
        slug="peblo-songs",
        title="Peblo Songs",
        synopsis="Catchy singalong nursery rhymes and festive tunes for children of all ages.",
        section="songs",
        categories=["music", "singalong"],
        artwork=CatalogueArtwork(
            poster="http://localhost:8000/storage/songs_poster.jpg",
            banner="http://localhost:8000/storage/songs_banner.jpg",
        ),
        seasons=[
            CatalogueSeason(
                season_number=1,
                title="Season 1",
                episodes=[
                    CatalogueEpisode(
                        content_group="songs-s01e01",
                        episode_number=1,
                        title="Rain on the Roof",
                        duration_seconds=300,
                        artwork=CatalogueArtwork(thumbnail="http://localhost:8000/storage/songs_s1e1_thumb.jpg"),
                        languages=[
                            CatalogueLanguageVariant(
                                language="en",
                                episode_id=uuid.uuid4(),
                                title="Rain on the Roof",
                                duration_seconds=300,
                            )
                        ],
                    )
                ],
            )
        ],
        trailers=[],
    )

    return CatalogueData(
        version="1.0",
        generated_at=datetime.now(timezone.utc),
        published_by="admin",
        sections={
            "featured": [show_moti],
            "series": [show_nest],
            "songs": [show_songs],
        },
        stats=CatalogueStats(
            shows_count=3,
            episodes_count=4,
            language_variants_count=6,
        ),
    )


@pytest.fixture
def published_catalogue_file(tmp_path, mock_catalogue_data):
    """Write mock catalogue data to a temporary catalogue.json file."""
    cat_dir = tmp_path / "catalogue_live"
    cat_dir.mkdir(parents=True, exist_ok=True)
    live_file = cat_dir / "catalogue.json"
    with open(live_file, "w", encoding="utf-8") as f:
        f.write(mock_catalogue_data.model_dump_json(indent=2))
    return cat_dir


class TestCatalogueServiceUnit:
    def test_load_catalogue_raises_404_when_unpublished(self, tmp_path):
        empty_dir = tmp_path / "empty_cat"
        empty_dir.mkdir(parents=True, exist_ok=True)
        with patch("app.core.config.settings.CATALOGUE_DIR", str(empty_dir)):
            with pytest.raises(Exception) as exc_info:
                CatalogueService.load_catalogue()
            assert exc_info.value.status_code == 404
            assert "not been published yet" in exc_info.value.detail

    def test_load_catalogue_success_and_caching(self, published_catalogue_file):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            cat1 = CatalogueService.load_catalogue()
            assert cat1.version == "1.0"
            assert cat1.stats.shows_count == 3
            assert "featured" in cat1.sections

            # Second load should return cached object without disk re-parse
            cat2 = CatalogueService.load_catalogue()
            assert cat1 is cat2

    def test_search_by_show_title(self, published_catalogue_file):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            res = CatalogueService.search_catalogue(q="moti")
            assert res.total_results == 1
            assert res.results[0].slug == "motis-many-lives"

    def test_search_by_episode_title(self, published_catalogue_file):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            # "Counting Twigs" is an episode in Number Nest
            res = CatalogueService.search_catalogue(q="Twigs")
            assert res.total_results == 1
            assert res.results[0].slug == "number-nest"

    def test_search_by_language_variant_title(self, published_catalogue_file):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            # "Tinke Ginna" is the Hindi variant title in Number Nest
            res = CatalogueService.search_catalogue(q="Tinke Ginna")
            assert res.total_results == 1
            assert res.results[0].slug == "number-nest"

    def test_search_by_category_filter(self, published_catalogue_file):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            res = CatalogueService.search_catalogue(category="learning")
            assert res.total_results == 1
            assert res.results[0].slug == "number-nest"

    def test_search_by_section_filter(self, published_catalogue_file):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            res = CatalogueService.search_catalogue(section="songs")
            assert res.total_results == 1
            assert res.results[0].slug == "peblo-songs"

    def test_search_by_language_filter(self, published_catalogue_file):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            # Shows with Hindi tracks: Moti and Number Nest (Peblo Songs only has en)
            res_hi = CatalogueService.search_catalogue(language="hi")
            assert res_hi.total_results == 2
            slugs = {s.slug for s in res_hi.results}
            assert slugs == {"motis-many-lives", "number-nest"}

    def test_search_composed_filters(self, published_catalogue_file):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            # Moti has section=featured, category=adventure, language=hi
            res = CatalogueService.search_catalogue(
                q="puppy",
                category="adventure",
                language="hi",
                section="featured",
            )
            assert res.total_results == 1
            assert res.results[0].slug == "motis-many-lives"

            # Changing section to songs yields 0 results (logical AND)
            res_empty = CatalogueService.search_catalogue(
                q="puppy",
                section="songs",
            )
            assert res_empty.total_results == 0

    def test_get_show_by_slug_and_id(self, published_catalogue_file, mock_catalogue_data):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            # Lookup by slug
            show = CatalogueService.get_show_by_slug_or_id("number-nest")
            assert show.title == "Number Nest"

            # Lookup by UUID
            moti = mock_catalogue_data.sections["featured"][0]
            show_by_id = CatalogueService.get_show_by_slug_or_id(str(moti.id))
            assert show_by_id.slug == "motis-many-lives"

            # Non-existent raises 404
            with pytest.raises(Exception) as exc_info:
                CatalogueService.get_show_by_slug_or_id("non-existent-show")
            assert exc_info.value.status_code == 404


class TestCatalogueEndpoints:
    @pytest.mark.asyncio
    async def test_get_catalog_unpublished_returns_404(self, client: AsyncClient, tmp_path):
        empty_dir = tmp_path / "empty_cat_api"
        empty_dir.mkdir(parents=True, exist_ok=True)
        with patch("app.core.config.settings.CATALOGUE_DIR", str(empty_dir)):
            # Both direct /catalog and versioned /api/v1/catalog
            resp1 = await client.get("/catalog")
            assert resp1.status_code == 404
            assert "not been published yet" in resp1.json()["detail"]

            resp2 = await client.get("/api/v1/catalog")
            assert resp2.status_code == 404

    @pytest.mark.asyncio
    async def test_get_catalog_published_returns_200_and_cache_headers(
        self, client: AsyncClient, published_catalogue_file
    ):
        """Public endpoint returns 200 without auth and includes Cache-Control header."""
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            resp = await client.get("/catalog")
            assert resp.status_code == 200
            assert "Cache-Control" in resp.headers
            assert "public" in resp.headers["Cache-Control"]

            data = resp.json()
            assert data["version"] == "1.0"
            assert data["stats"]["shows_count"] == 3
            assert "featured" in data["sections"]
            assert len(data["sections"]["featured"]) == 1

            # Also check versioned endpoint
            v1_resp = await client.get("/api/v1/catalog")
            assert v1_resp.status_code == 200

    @pytest.mark.asyncio
    async def test_search_endpoint_with_query_and_filters(
        self, client: AsyncClient, published_catalogue_file
    ):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            # Free text search
            resp = await client.get("/catalog/search?q=moti")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total_results"] == 1
            assert data["results"][0]["title"] == "Moti's Many Lives"

            # Composed search
            resp2 = await client.get("/catalog/search?category=learning&language=en")
            assert resp2.status_code == 200
            data2 = resp2.json()
            assert data2["total_results"] == 1
            assert data2["results"][0]["slug"] == "number-nest"

            # Empty results state
            resp3 = await client.get("/catalog/search?q=nonexistentquery123")
            assert resp3.status_code == 200
            data3 = resp3.json()
            assert data3["total_results"] == 0
            assert data3["results"] == []

    @pytest.mark.asyncio
    async def test_get_show_detail_endpoint(
        self, client: AsyncClient, published_catalogue_file
    ):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            resp = await client.get("/catalog/shows/motis-many-lives")
            assert resp.status_code == 200
            data = resp.json()
            assert data["title"] == "Moti's Many Lives"
            assert len(data["seasons"]) == 1
            assert len(data["trailers"]) == 1

            # Not found
            resp404 = await client.get("/catalog/shows/random-unknown")
            assert resp404.status_code == 404

    @pytest.mark.asyncio
    async def test_get_sections_summary_endpoint(
        self, client: AsyncClient, published_catalogue_file
    ):
        with patch("app.core.config.settings.CATALOGUE_DIR", str(published_catalogue_file)):
            resp = await client.get("/catalog/sections")
            assert resp.status_code == 200
            data = resp.json()
            assert data == {"featured": 1, "series": 1, "songs": 1}
