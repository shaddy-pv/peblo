"""
Shared enum definitions used across models.

Defined here (not inside individual models) to avoid circular imports
and make them importable in schemas and services without pulling in ORM.
"""

import enum


class ShowStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class EpisodeStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class ArtworkType(str, enum.Enum):
    POSTER = "poster"
    BANNER = "banner"
    THUMBNAIL = "thumbnail"


class ArtworkEntityType(str, enum.Enum):
    SHOW = "show"
    EPISODE = "episode"


class UserRole(str, enum.Enum):
    EDITOR = "editor"
    ADMIN = "admin"


class PublishOutcome(str, enum.Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


def enum_values(enum_cls) -> list[str]:
    """Extract enum values for SQLAlchemy Enum columns to match PostgreSQL native enum types."""
    return [e.value for e in enum_cls]
