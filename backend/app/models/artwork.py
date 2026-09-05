"""
Artwork model.

Design decisions:
- Polymorphic entity reference: (entity_type, entity_id) instead of two
  separate FK columns. This lets one table handle both show-level and
  episode-level artwork without a union approach.
  Trade-off: no DB-enforced FK to the specific entity table.
  Mitigation: entity_type is an enum and application code always validates
  that entity_id actually exists.
- UNIQUE(entity_type, entity_id, artwork_type): one artwork slot per type per entity.
  An upload to an existing slot replaces the previous record (upsert logic in service).
- storage_key: the path/key used to reference the file in the storage provider.
  For local storage: "shows/{show_id}/poster.jpg"
  For R2: same key structure, different bucket.
- width, height, file_size_bytes: stored after server-side validation (Phase 5).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.enums import ArtworkEntityType, ArtworkType


class Artwork(Base):
    __tablename__ = "artwork"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Polymorphic entity reference
    entity_type: Mapped[ArtworkEntityType] = mapped_column(
        Enum(ArtworkEntityType, name="artwork_entity_type"), nullable=False, index=True
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )

    # Artwork slot type
    artwork_type: Mapped[ArtworkType] = mapped_column(
        Enum(ArtworkType, name="artwork_type"), nullable=False
    )

    # Storage
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    # Cached public URL — recomputed on read if blank (storage backend may change)
    storage_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # Image metadata (populated after server-side validation)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Constraints & indexes ─────────────────────────────────────────────────
    __table_args__ = (
        # One artwork per type per entity — uploading replaces the existing record
        UniqueConstraint(
            "entity_type", "entity_id", "artwork_type",
            name="uq_artwork_entity_type_slot"
        ),
        # Efficient lookup of all artwork for an entity
        Index("ix_artwork_entity", "entity_type", "entity_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<Artwork {self.artwork_type} for {self.entity_type}:{self.entity_id}>"
        )
