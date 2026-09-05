"""
Show model.

A show is the top-level content container.
It has seasons → episodes.

Design decisions:
- categories stored as PostgreSQL ARRAY(String) — fixed vocabulary from reference.json.
  JSONB would be more flexible but ARRAY allows cleaner indexing with GIN.
- section is nullable at DB level: Rhyme Rangers in seed has section=null,
  and the validation engine (Phase 6) surfaces this as a publish blocker.
- slug must be unique — used in URLs and as a stable content identifier.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Index, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import ShowStatus, enum_values


class Show(Base):
    __tablename__ = "shows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    synopsis: Mapped[str | None] = mapped_column(Text, nullable=True)

    # section from reference.json: featured|series|minisodes|songs
    # Nullable because seed data deliberately has shows without a section
    section: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)

    # categories from reference.json vocabulary (array of strings)
    categories: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)), nullable=False, server_default="{}"
    )

    status: Mapped[ShowStatus] = mapped_column(
        Enum(ShowStatus, name="show_status", values_callable=enum_values),
        nullable=False,
        default=ShowStatus.DRAFT,
        index=True,
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
    seasons: Mapped[list["Season"]] = relationship(  # noqa: F821
        "Season",
        back_populates="show",
        cascade="all, delete-orphan",
        order_by="Season.season_number",
        lazy="select",
    )
    artwork: Mapped[list["Artwork"]] = relationship(  # noqa: F821
        "Artwork",
        primaryjoin="and_(Artwork.entity_type=='show', foreign(Artwork.entity_id)==Show.id)",
        lazy="select",
        viewonly=True,
    )

    # ── Table-level indexes ───────────────────────────────────────────────────
    __table_args__ = (
        # GIN index on categories array for efficient category filtering
        Index("ix_shows_categories_gin", "categories", postgresql_using="gin"),
        # Composite index for common CMS query: status + section
        Index("ix_shows_status_section", "status", "section"),
    )

    def __repr__(self) -> str:
        return f"<Show {self.slug!r} status={self.status}>"
