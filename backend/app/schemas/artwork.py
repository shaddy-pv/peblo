"""
Pydantic schemas for Artwork entity.
"""

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from app.models.enums import ArtworkEntityType, ArtworkType


class ArtworkRead(BaseModel):
    id: uuid.UUID
    entity_type: ArtworkEntityType
    entity_id: uuid.UUID
    artwork_type: ArtworkType
    storage_key: str
    storage_url: str
    width: int | None = None
    height: int | None = None
    file_size_bytes: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EntityArtworkSummary(BaseModel):
    """Artwork summary for an entity mapped by slot."""
    entity_type: ArtworkEntityType
    entity_id: uuid.UUID
    slots: dict[str, ArtworkRead] = {}
