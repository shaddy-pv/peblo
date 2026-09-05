"""
Model registry — import all models here so:
1. Alembic's autogenerate discovers them via Base.metadata
2. Any code that needs all models can do: from app.models import *
3. Circular import chains are broken by importing from this single module
"""

from app.models.artwork import Artwork
from app.models.enums import (
    ArtworkEntityType,
    ArtworkType,
    EpisodeStatus,
    PublishOutcome,
    ShowStatus,
    UserRole,
)
from app.models.episode import Episode
from app.models.publish_run import PublishRun
from app.models.season import Season
from app.models.show import Show
from app.models.user import User

__all__ = [
    # Models
    "User",
    "Show",
    "Season",
    "Episode",
    "Artwork",
    "PublishRun",
    # Enums
    "UserRole",
    "ShowStatus",
    "EpisodeStatus",
    "ArtworkType",
    "ArtworkEntityType",
    "PublishOutcome",
]
