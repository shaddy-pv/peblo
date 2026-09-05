"""
Pydantic schemas defining the published OTT Catalogue structure.
Guarantees a stable, documented format consumed by the viewer application.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CatalogueArtwork(BaseModel):
    poster: str | None = None
    banner: str | None = None
    thumbnail: str | None = None


class CatalogueLanguageVariant(BaseModel):
    language: str = Field(..., description="Language code (e.g. 'en', 'hi')")
    episode_id: uuid.UUID = Field(..., description="UUID of this specific language variant")
    title: str = Field(..., description="Localized title in this language")
    duration_seconds: int | None = None
    external_id: str | None = None


class CatalogueEpisode(BaseModel):
    content_group: str = Field(..., description="Shared identifier grouping language variants")
    episode_number: int
    title: str = Field(..., description="Primary display title")
    duration_seconds: int = Field(..., description="Run time in seconds")
    artwork: CatalogueArtwork = Field(default_factory=CatalogueArtwork)
    languages: list[CatalogueLanguageVariant] = Field(
        ..., description="Available language tracks/variants"
    )


class CatalogueSeason(BaseModel):
    season_number: int = Field(..., ge=1, description="Normal numbered season (1, 2, ...)")
    title: str
    episodes: list[CatalogueEpisode] = Field(default_factory=list)


class CatalogueShow(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    synopsis: str | None = None
    section: str
    categories: list[str] = Field(default_factory=list)
    artwork: CatalogueArtwork = Field(default_factory=CatalogueArtwork)
    seasons: list[CatalogueSeason] = Field(default_factory=list)
    trailers: list[CatalogueEpisode] = Field(
        default_factory=list,
        description="Trailers extracted from Season 0; never shown as a normal season",
    )


class CatalogueStats(BaseModel):
    shows_count: int = 0
    episodes_count: int = 0  # Collapsed unique content_group count
    language_variants_count: int = 0  # Total playable audio/video variants


class CatalogueData(BaseModel):
    version: str = "1.0"
    generated_at: datetime
    published_by: str | None = None
    sections: dict[str, list[CatalogueShow]] = Field(
        default_factory=dict,
        description="Published shows grouped by section (featured, series, minisodes, songs)",
    )
    stats: CatalogueStats = Field(default_factory=CatalogueStats)


class CatalogueSearchResponse(BaseModel):
    query: str | None = None
    category: str | None = None
    language: str | None = None
    section: str | None = None
    total_results: int = 0
    results: list[CatalogueShow] = Field(
        default_factory=list,
        description="Matching published shows with seasons, collapsed episodes, and artwork",
    )
