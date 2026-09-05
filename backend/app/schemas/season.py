"""
Pydantic schemas for Season entity.
"""

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SeasonBase(BaseModel):
    season_number: int = Field(..., ge=0, description="0 = trailers; 1, 2, ... = normal seasons")
    title: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def default_trailers_title(self) -> "SeasonBase":
        if self.season_number == 0 and not self.title:
            self.title = "Trailers"
        return self


class SeasonCreate(SeasonBase):
    show_id: uuid.UUID


class SeasonUpdate(BaseModel):
    season_number: int | None = Field(default=None, ge=0)
    title: str | None = Field(default=None, max_length=255)


class SeasonRead(BaseModel):
    id: uuid.UUID
    show_id: uuid.UUID
    season_number: int
    title: str | None = None
    is_trailers: bool = False
    created_at: datetime
    updated_at: datetime
    episodes_count: int = 0

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def compute_is_trailers(self) -> "SeasonRead":
        self.is_trailers = self.season_number == 0
        return self
