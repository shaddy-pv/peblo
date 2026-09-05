"""
Pydantic schemas for Show entity.
"""

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import ShowStatus

ALLOWED_SECTIONS = {"featured", "series", "minisodes", "songs"}
ALLOWED_CATEGORIES = {
    "adventure", "folk", "friendship", "india", "language", "learning",
    "maths", "music", "nature", "reading", "science", "singalong",
    "stories", "travel", "values"
}


def slugify(value: str) -> str:
    """Generate a clean URL slug from a title."""
    s = value.lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")


class ShowBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    synopsis: str | None = None
    section: str | None = None
    categories: list[str] = Field(default_factory=list)
    status: ShowStatus = ShowStatus.DRAFT

    @model_validator(mode="after")
    def validate_section_and_status(self) -> "ShowBase":
        # Section validation
        if self.section is not None:
            sec = self.section.lower().strip()
            if sec not in ALLOWED_SECTIONS:
                raise ValueError(
                    f"Invalid section '{self.section}'. Allowed sections: {sorted(ALLOWED_SECTIONS)}"
                )
            self.section = sec

        # Published show MUST have a section
        if self.status == ShowStatus.PUBLISHED and not self.section:
            raise ValueError("A published show must have a valid section assigned.")

        # Categories validation
        cleaned_categories = []
        for cat in self.categories:
            c = cat.lower().strip()
            if c not in ALLOWED_CATEGORIES:
                raise ValueError(
                    f"Invalid category '{cat}'. Allowed categories: {sorted(ALLOWED_CATEGORIES)}"
                )
            cleaned_categories.append(c)
        self.categories = list(dict.fromkeys(cleaned_categories))  # preserve order, deduplicate
        return self


class ShowCreate(ShowBase):
    slug: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def ensure_slug(self) -> "ShowCreate":
        if not self.slug:
            self.slug = slugify(self.title)
        else:
            self.slug = slugify(self.slug)
        return self


class ShowUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, max_length=255)
    synopsis: str | None = None
    section: str | None = None
    categories: list[str] | None = None
    status: ShowStatus | None = None

    @model_validator(mode="after")
    def validate_update(self) -> "ShowUpdate":
        if self.section is not None:
            sec = self.section.lower().strip()
            if sec not in ALLOWED_SECTIONS:
                raise ValueError(
                    f"Invalid section '{self.section}'. Allowed sections: {sorted(ALLOWED_SECTIONS)}"
                )
            self.section = sec

        if self.categories is not None:
            cleaned = []
            for cat in self.categories:
                c = cat.lower().strip()
                if c not in ALLOWED_CATEGORIES:
                    raise ValueError(
                        f"Invalid category '{cat}'. Allowed categories: {sorted(ALLOWED_CATEGORIES)}"
                    )
                cleaned.append(c)
            self.categories = list(dict.fromkeys(cleaned))

        if self.slug is not None:
            self.slug = slugify(self.slug)
        return self


class ShowRead(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    synopsis: str | None = None
    section: str | None = None
    categories: list[str] = Field(default_factory=list)
    status: ShowStatus
    created_at: datetime
    updated_at: datetime
    seasons_count: int = 0
    episodes_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ShowDetailRead(ShowRead):
    """Detailed view including seasons summary."""
    pass
