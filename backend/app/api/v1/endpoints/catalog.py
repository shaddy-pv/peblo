"""
Viewer-facing Catalogue API endpoints.
Provides high-performance read and search access to the published catalogue.
Strictly public (no auth required) and decoupled from administrative database mutations.
"""

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.schemas.catalogue import (
    CatalogueData,
    CatalogueSearchResponse,
    CatalogueShow,
)
from app.services.catalogue_service import CatalogueService

router = APIRouter()


@router.get(
    "",
    response_model=CatalogueData,
    summary="Get Published Catalogue",
    description=(
        "Returns the complete live published catalogue data structure. "
        "High-performance, cacheable response consumed by the viewer UI."
    ),
)
async def get_published_catalogue(response: Response) -> CatalogueData:
    """Read and return the live published catalogue."""
    # Set cache headers for CDN / browser caching
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    return CatalogueService.load_catalogue()


@router.get(
    "/search",
    response_model=CatalogueSearchResponse,
    summary="Search Published Catalogue",
    description=(
        "Composable multi-criteria search over the published catalogue: "
        "matches show titles, synopsis, categories, episode titles, trailers, "
        "and filters by section, category, and language track."
    ),
)
async def search_catalogue(
    q: str | None = Query(
        default=None,
        description="Search term matching show title, synopsis, category, or episode title",
    ),
    category: str | None = Query(
        default=None,
        description="Filter by category (e.g. 'adventure', 'learning', 'stories')",
    ),
    language: str | None = Query(
        default=None,
        description="Filter by available language variant (e.g. 'en', 'hi')",
    ),
    section: str | None = Query(
        default=None,
        description="Filter by section (e.g. 'featured', 'series', 'minisodes', 'songs')",
    ),
) -> CatalogueSearchResponse:
    """Execute composable search over published catalogue."""
    return CatalogueService.search_catalogue(
        q=q,
        category=category,
        language=language,
        section=section,
    )


@router.get(
    "/shows/{slug_or_id}",
    response_model=CatalogueShow,
    summary="Get Published Show by Slug or ID",
    description="Retrieve a single published show with its seasons, collapsed episodes, and trailers.",
)
async def get_published_show(slug_or_id: str) -> CatalogueShow:
    """Lookup a single show in the published catalogue."""
    return CatalogueService.get_show_by_slug_or_id(slug_or_id)


@router.get(
    "/sections",
    response_model=dict[str, int],
    summary="Get Published Sections",
    description="Returns list of sections currently present in the published catalogue with show counts.",
)
async def get_sections() -> dict[str, int]:
    """Retrieve published sections with show counts."""
    return CatalogueService.get_sections_summary()
