"""
Pydantic schemas for the Validation Engine and Publish-Readiness Report.
"""

from datetime import datetime
import enum
from typing import Any
import uuid

from pydantic import BaseModel, Field


class ValidationSeverity(str, enum.Enum):
    BLOCKER = "blocker"   # Prevents catalogue publish
    WARNING = "warning"   # Data quality / localization notice (publish still allowed)
    INFO = "info"         # Helpful context for editor


class IssueCategory(str, enum.Enum):
    MISSING_SECTION = "missing_section"
    MISSING_ARTWORK = "missing_artwork"
    MISSING_DURATION = "missing_duration"
    INCOMPLETE_LOCALIZATION = "incomplete_localization"
    TITLE_CASING = "title_casing"
    DUPLICATE_VARIANT = "duplicate_variant"
    NO_EPISODES = "no_episodes"


class ValidationIssue(BaseModel):
    id: str = Field(..., description="Unique code or slug for issue")
    severity: ValidationSeverity
    category: IssueCategory
    entity_type: str = Field(..., description="'show', 'season', or 'episode'")
    entity_id: uuid.UUID
    show_id: uuid.UUID | None = None
    show_title: str | None = None
    season_number: int | None = None
    episode_id: uuid.UUID | None = None
    episode_title: str | None = None
    message: str = Field(..., description="Clear human-readable description of the problem")
    action_needed: str = Field(..., description="Actionable step for the content editor to resolve this")


class ValidationSummary(BaseModel):
    total_shows: int = 0
    published_shows: int = 0
    draft_shows: int = 0
    total_episodes: int = 0
    published_episodes: int = 0
    draft_episodes: int = 0
    blockers_count: int = 0
    warnings_count: int = 0


class ValidationReport(BaseModel):
    generated_at: datetime
    can_publish: bool = Field(
        ...,
        description="True if and only if there are 0 blocking issues preventing catalogue publishing",
    )
    summary: ValidationSummary
    blockers: list[ValidationIssue] = Field(default_factory=list)
    warnings: list[ValidationIssue] = Field(default_factory=list)
    grouped_by_show: dict[str, list[ValidationIssue]] = Field(
        default_factory=dict,
        description="Issues grouped by show title for convenient CMS display",
    )
