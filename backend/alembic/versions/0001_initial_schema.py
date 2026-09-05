"""
Initial database migration — creates all tables.

Generated for: Peblo TV Mini
Tables: users, shows, seasons, episodes, artwork, publish_runs

Revision ID: 0001_initial_schema
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enum types ────────────────────────────────────────────────────────────
    user_role = postgresql.ENUM("editor", "admin", name="user_role", create_type=False)
    show_status = postgresql.ENUM("draft", "published", name="show_status", create_type=False)
    episode_status = postgresql.ENUM("draft", "published", name="episode_status", create_type=False)
    artwork_entity_type = postgresql.ENUM("show", "episode", name="artwork_entity_type", create_type=False)
    artwork_type = postgresql.ENUM("poster", "banner", "thumbnail", name="artwork_type", create_type=False)
    publish_outcome = postgresql.ENUM("running", "success", "failed", name="publish_outcome", create_type=False)

    # Create enum types first (PostgreSQL requires explicit type creation)
    op.execute("CREATE TYPE user_role AS ENUM ('editor', 'admin')")
    op.execute("CREATE TYPE show_status AS ENUM ('draft', 'published')")
    op.execute("CREATE TYPE episode_status AS ENUM ('draft', 'published')")
    op.execute("CREATE TYPE artwork_entity_type AS ENUM ('show', 'episode')")
    op.execute("CREATE TYPE artwork_type AS ENUM ('poster', 'banner', 'thumbnail')")
    op.execute("CREATE TYPE publish_outcome AS ENUM ('running', 'success', 'failed')")

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # ── shows ─────────────────────────────────────────────────────────────────
    op.create_table(
        "shows",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("synopsis", sa.Text(), nullable=True),
        sa.Column("section", sa.String(length=50), nullable=True),
        sa.Column(
            "categories",
            postgresql.ARRAY(sa.String(length=50)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("status", show_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_shows_slug", "shows", ["slug"], unique=True)
    op.create_index("ix_shows_section", "shows", ["section"])
    op.create_index("ix_shows_status", "shows", ["status"])
    op.create_index("ix_shows_status_section", "shows", ["status", "section"])
    # GIN index for array containment queries on categories
    op.create_index(
        "ix_shows_categories_gin",
        "shows",
        ["categories"],
        postgresql_using="gin",
    )

    # ── seasons ───────────────────────────────────────────────────────────────
    op.create_table(
        "seasons",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("show_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("season_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["show_id"], ["shows.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("show_id", "season_number", name="uq_seasons_show_season"),
    )
    op.create_index("ix_seasons_show_id", "seasons", ["show_id"])
    op.create_index("ix_seasons_show_season_number", "seasons", ["show_id", "season_number"])

    # ── episodes ──────────────────────────────────────────────────────────────
    op.create_table(
        "episodes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("season_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("episode_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content_group", sa.String(length=255), nullable=False),
        sa.Column("language", sa.String(length=10), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("status", episode_status, nullable=False),
        sa.Column("external_id", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "content_group", "language", name="uq_episodes_content_group_language"
        ),
    )
    op.create_index("ix_episodes_season_id", "episodes", ["season_id"])
    op.create_index("ix_episodes_content_group", "episodes", ["content_group"])
    op.create_index("ix_episodes_language", "episodes", ["language"])
    op.create_index("ix_episodes_status", "episodes", ["status"])
    op.create_index(
        "ix_episodes_external_id", "episodes", ["external_id"], unique=True
    )
    op.create_index(
        "ix_episodes_season_episode_number", "episodes", ["season_id", "episode_number"]
    )
    op.create_index(
        "ix_episodes_content_group_language", "episodes", ["content_group", "language"]
    )

    # ── artwork ───────────────────────────────────────────────────────────────
    op.create_table(
        "artwork",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", artwork_entity_type, nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artwork_type", artwork_type, nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("storage_url", sa.String(length=1024), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "entity_type", "entity_id", "artwork_type",
            name="uq_artwork_entity_type_slot"
        ),
    )
    op.create_index("ix_artwork_entity_type", "artwork", ["entity_type"])
    op.create_index("ix_artwork_entity_id", "artwork", ["entity_id"])
    op.create_index("ix_artwork_entity", "artwork", ["entity_type", "entity_id"])

    # ── publish_runs ──────────────────────────────────────────────────────────
    op.create_table(
        "publish_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_username", sa.String(length=100), nullable=True),
        sa.Column("outcome", publish_outcome, nullable=False),
        sa.Column("shows_count", sa.Integer(), nullable=False),
        sa.Column("episodes_count", sa.Integer(), nullable=False),
        sa.Column("language_variants_count", sa.Integer(), nullable=False),
        sa.Column("catalogue_path", sa.String(length=512), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_publish_runs_started_at", "publish_runs", ["started_at"])
    op.create_index("ix_publish_runs_outcome", "publish_runs", ["outcome"])
    op.create_index("ix_publish_runs_actor_id", "publish_runs", ["actor_id"])


def downgrade() -> None:
    op.drop_table("publish_runs")
    op.drop_table("artwork")
    op.drop_table("episodes")
    op.drop_table("seasons")
    op.drop_table("shows")
    op.drop_table("users")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS publish_outcome")
    op.execute("DROP TYPE IF EXISTS artwork_type")
    op.execute("DROP TYPE IF EXISTS artwork_entity_type")
    op.execute("DROP TYPE IF EXISTS episode_status")
    op.execute("DROP TYPE IF EXISTS show_status")
    op.execute("DROP TYPE IF EXISTS user_role")
