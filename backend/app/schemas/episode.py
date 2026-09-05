"""
Pydantic schemas for Episode entity.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import EpisodeStatus

ALLOWED_LANGUAGES = {"en", "hi"}


class EpisodeBase(BaseModel):
    episode_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=255)
    content_group: str = Field(..., min_length=1, max_length=255)
    language: str = Field(..., min_length=2, max_length=10)
    duration_seconds: int | None = Field(default=None, ge=1)
    status: EpisodeStatus = EpisodeStatus.DRAFT
    external_id: str | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_episode(self) -> "EpisodeBase":
        lang = self.language.lower().strip()
        if lang not in ALLOWED_LANGUAGES:
            raise ValueError(
                f"Invalid language '{self.language}'. Allowed languages: {sorted(ALLOWED_LANGUAGES)}"
            )
        self.language = lang

        # A published episode must have duration_seconds specified
        if self.status == EpisodeStatus.PUBLISHED and not self.duration_seconds:
            raise ValueError("A published episode must have a duration (duration_seconds > 0).")

        return self


class EpisodeCreate(EpisodeBase):
    season_id: uuid.UUID


class EpisodeUpdate(BaseModel):
    episode_number: int | None = Field(default=None, ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content_group: str | None = Field(default=None, min_length=1, max_length=255)
    language: str | None = Field(default=None, min_length=2, max_length=10)
    duration_seconds: int | None = Field(default=None, ge=1)
    status: EpisodeStatus | None = None
    external_id: str | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_update(self) -> "EpisodeUpdate":
        if self.language is not None:
            lang = self.language.lower().strip()
            if lang not in ALLOWED_LANGUAGES:
                raise ValueError(
                    f"Invalid language '{self.language}'. Allowed languages: {sorted(ALLOWED_LANGUAGES)}"
                )
            self.language = lang

        return self


class EpisodeRead(BaseModel):
    id: uuid.UUID
    season_id: uuid.UUID
    episode_number: int
    title: str
    content_group: str
    language: str
    duration_seconds: int | None = None
    status: EpisodeStatus
    external_id: str | None = None
    created_at: datetime
    updated_at: datetime
    has_artwork: bool = False

    model_config = ConfigDict(from_attributes=True)


class EpisodeGroupedVariant(BaseModel):
    """Collapsed language variant info within a content group."""
    episode_id: uuid.UUID
    language: str
    title: str
    duration_seconds: int | None = None
    status: EpisodeStatus
    external_id: str | None = None
