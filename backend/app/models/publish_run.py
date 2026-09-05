"""
PublishRun model.

Records every publish attempt — successful or failed.
This is the audit log for the publishing pipeline.

Design decisions:
- actor_id is nullable: publish could theoretically be triggered by an
  automated system with no user session. In practice it's always a user.
- actor_username is denormalized: if the user is deleted, history is preserved.
- outcome starts as RUNNING — if the process dies mid-publish, the run
  stays RUNNING forever, which is itself a detectable signal (stale run).
- counts stored as separate integer columns for efficient querying
  (vs. JSONB blob).
- catalogue_path records where the final catalogue was written.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import PublishOutcome, enum_values


class PublishRun(Base):
    __tablename__ = "publish_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Who triggered the publish
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Denormalized: preserved even if user is deleted
    actor_username: Mapped[str | None] = mapped_column(String(100), nullable=True)

    outcome: Mapped[PublishOutcome] = mapped_column(
        Enum(PublishOutcome, name="publish_outcome", values_callable=enum_values),
        nullable=False,
        default=PublishOutcome.RUNNING,
        index=True,
    )

    # Counts of what was published
    shows_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    episodes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    language_variants_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Where the catalogue was written
    catalogue_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Error details if outcome=failed
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    actor: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="publish_runs"
    )

    def __repr__(self) -> str:
        return f"<PublishRun {self.id} outcome={self.outcome} at={self.started_at}>"
