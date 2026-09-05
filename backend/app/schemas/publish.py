"""
Pydantic schemas for Catalogue Publishing operations and audit history.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import PublishOutcome


class PublishResponse(BaseModel):
    """Result returned on POST /admin/catalog/publish."""
    run_id: uuid.UUID
    outcome: PublishOutcome
    started_at: datetime
    completed_at: datetime | None = None
    shows_count: int = 0
    episodes_count: int = 0
    language_variants_count: int = 0
    catalogue_path: str | None = None
    message: str


class PublishRunRead(BaseModel):
    """Audit log entry for a publish run."""
    id: uuid.UUID
    started_at: datetime
    completed_at: datetime | None = None
    actor_id: uuid.UUID | None = None
    actor_username: str | None = None
    outcome: PublishOutcome
    shows_count: int = 0
    episodes_count: int = 0
    language_variants_count: int = 0
    catalogue_path: str | None = None
    error_message: str | None = None

    model_config = ConfigDict(from_attributes=True)
