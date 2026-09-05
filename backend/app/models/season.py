"""
Season model.

Design decisions:
- season_number=0 is reserved for trailers (reference.json convention).
  This is enforced at application level, not DB level, to allow the CMS
  to manage it without DB triggers.
- UNIQUE(show_id, season_number) prevents duplicate seasons at DB level.
- title is optional — Season 1 may have no explicit title, just a number.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Season(Base):
    __tablename__ = "seasons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    show_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # 0 = trailers; 1, 2, 3, … = normal seasons
    season_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
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
    show: Mapped["Show"] = relationship("Show", back_populates="seasons")  # noqa: F821
    episodes: Mapped[list["Episode"]] = relationship(  # noqa: F821
        "Episode",
        back_populates="season",
        cascade="all, delete-orphan",
        order_by="Episode.episode_number",
        lazy="select",
    )

    # ── Constraints & indexes ─────────────────────────────────────────────────
    __table_args__ = (
        # A show cannot have two seasons with the same season_number
        UniqueConstraint("show_id", "season_number", name="uq_seasons_show_season"),
        Index("ix_seasons_show_season_number", "show_id", "season_number"),
    )

    @property
    def is_trailers(self) -> bool:
        """Season 0 is the trailers bucket, not a normal viewer season."""
        return self.season_number == 0

    def __repr__(self) -> str:
        return f"<Season show_id={self.show_id} season={self.season_number}>"
