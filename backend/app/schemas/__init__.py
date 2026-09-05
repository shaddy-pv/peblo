"""
Pydantic schemas registry.
"""

from app.schemas.artwork import ArtworkRead, EntityArtworkSummary
from app.schemas.catalogue import (
    CatalogueArtwork,
    CatalogueData,
    CatalogueEpisode,
    CatalogueLanguageVariant,
    CatalogueSeason,
    CatalogueShow,
    CatalogueStats,
)
from app.schemas.common import PaginatedResponse
from app.schemas.episode import (
    EpisodeBase,
    EpisodeCreate,
    EpisodeGroupedVariant,
    EpisodeRead,
    EpisodeUpdate,
)
from app.schemas.season import (
    SeasonBase,
    SeasonCreate,
    SeasonRead,
    SeasonUpdate,
)
from app.schemas.show import (
    ShowBase,
    ShowCreate,
    ShowDetailRead,
    ShowRead,
    ShowUpdate,
)
from app.schemas.token import Token, TokenPayload
from app.schemas.user import UserBase, UserCreate, UserLogin, UserRead
from app.schemas.validation import (
    IssueCategory,
    ValidationIssue,
    ValidationReport,
    ValidationSeverity,
    ValidationSummary,
)

__all__ = [
    # Common
    "PaginatedResponse",
    # Auth & User
    "Token",
    "TokenPayload",
    "UserBase",
    "UserCreate",
    "UserLogin",
    "UserRead",
    # Shows
    "ShowBase",
    "ShowCreate",
    "ShowRead",
    "ShowDetailRead",
    "ShowUpdate",
    # Seasons
    "SeasonBase",
    "SeasonCreate",
    "SeasonRead",
    "SeasonUpdate",
    # Episodes
    "EpisodeBase",
    "EpisodeCreate",
    "EpisodeRead",
    "EpisodeGroupedVariant",
    "EpisodeUpdate",
    # Artwork
    "ArtworkRead",
    "EntityArtworkSummary",
    # Validation
    "ValidationSeverity",
    "IssueCategory",
    "ValidationIssue",
    "ValidationSummary",
    "ValidationReport",
    # Catalogue
    "CatalogueArtwork",
    "CatalogueLanguageVariant",
    "CatalogueEpisode",
    "CatalogueSeason",
    "CatalogueShow",
    "CatalogueStats",
    "CatalogueData",
]
