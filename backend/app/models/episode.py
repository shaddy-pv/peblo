"""
Episode model.

Design decisions:
- content_group: string identifier shared by language variants of the same episode.
  e.g. "motis-many-lives-s01e01" groups English and Hindi variants.
- UNIQUE(content_group, language): enforced at DB level to prevent duplicate variants.
  This is the most critical constraint in the system.
- duration_seconds is nullable: editors can create episodes without duration,
  but the validation engine blocks publishing until it's filled in.
- external_id: preserves the original episode_id from seed data (e.g. "ep_0001")
  for traceability and idempotent seeding.
- status is per-episode (DRAFT/PUBLISHED), independent of the show's status.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import EpisodeStatus, enum_values


class Episode(Base):
    __tablename__ = "episodes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    season_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("seasons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    # Language variant fields
    # content_group groups language variants of the same episode
    content_group: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # language code from reference.json: "en" | "hi"
    language: Mapped[str] = mapped_column(String(10), nullable=False, index=True)

    # duration_seconds is nullable — required for publish (validated in Phase 6)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[EpisodeStatus] = mapped_column(
        Enum(EpisodeStatus, name="episode_status", values_callable=enum_values),
        nullable=False,
        default=EpisodeStatus.DRAFT,
        index=True,
    )

    # Preserves original seed ID for idempotent re-seeding and traceability
    external_id: Mapped[str | None] = mapped_column(
        String(50), nullable=True, unique=True, index=True
    )

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

    # Relationships
    season: Mapped["Season"] = relationship("Season", back_populates="episodes")  # noqa: F821
    artwork: Mapped[list["Artwork"]] = relationship(  # noqa: F821
        "Artwork",
        primaryjoin="and_(Artwork.entity_type=='episode', foreign(Artwork.entity_id)==Episode.id)",
        lazy="select",
        viewonly=True,
    )

    # ── Constraints & indexes ─────────────────────────────────────────────────
    __table_args__ = (
        # THE most important constraint: no two episodes can be the same
        # language variant of the same content group.
        UniqueConstraint("content_group", "language", name="uq_episodes_content_group_language"),
        # Efficient lookup by season + episode_number for ordered lists
        Index("ix_episodes_season_episode_number", "season_id", "episode_number"),
        # Efficient lookup of all variants of a content group
        Index("ix_episodes_content_group_language", "content_group", "language"),
    )

    def __repr__(self) -> str:
        return (
            f"<Episode {self.content_group!r} lang={self.language!r} "
            f"ep={self.episode_number} status={self.status}>"
        )
