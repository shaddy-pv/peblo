"""
Unit tests for domain models, constraints, and seed data structures.
These tests run without requiring a live PostgreSQL instance.
"""

import json
import uuid
from pathlib import Path

from app.db.session import Base
from app.models import (
    Artwork,
    ArtworkEntityType,
    ArtworkType,
    Episode,
    EpisodeStatus,
    PublishOutcome,
    PublishRun,
    Season,
    Show,
    ShowStatus,
    User,
    UserRole,
)

ROOT_DIR = Path(__file__).resolve().parents[2]


class TestModelDefinitions:
    """Test model class attributes, defaults, and helper methods."""

    def test_user_model_defaults(self):
        user = User(
            username="test_editor",
            hashed_password="hashed_pw_secret",
            role=UserRole.EDITOR,
        )
        assert user.username == "test_editor"
        assert user.role == UserRole.EDITOR
        assert repr(user) == "<User 'test_editor' role=UserRole.EDITOR>"

    def test_show_model(self):
        show = Show(
            title="Curious Cubs",
            slug="curious-cubs",
            synopsis="Adventures of cubs in the jungle",
            section="series",
            categories=["learning", "nature"],
            status=ShowStatus.PUBLISHED,
        )
        assert show.title == "Curious Cubs"
        assert show.slug == "curious-cubs"
        assert show.section == "series"
        assert "learning" in show.categories
        assert show.status == ShowStatus.PUBLISHED
        assert repr(show) == "<Show 'curious-cubs' status=ShowStatus.PUBLISHED>"

    def test_show_nullable_section(self):
        """Seed data deliberate flaw P1: shows may have section=None."""
        show = Show(
            title="Rhyme Rangers",
            slug="rhyme-rangers",
            section=None,
            categories=["singalong"],
        )
        assert show.section is None

    def test_season_is_trailers_property(self):
        """Season 0 convention: reserved for trailers."""
        show_id = uuid.uuid4()
        s0 = Season(show_id=show_id, season_number=0, title="Trailers")
        s1 = Season(show_id=show_id, season_number=1, title="Season 1")

        assert s0.is_trailers is True
        assert s1.is_trailers is False

    def test_episode_model(self):
        season_id = uuid.uuid4()
        ep = Episode(
            season_id=season_id,
            episode_number=1,
            title="The Beginning",
            content_group="cubs-s01e01",
            language="en",
            duration_seconds=1200,
            status=EpisodeStatus.PUBLISHED,
            external_id="ep_0001",
        )
        assert ep.content_group == "cubs-s01e01"
        assert ep.language == "en"
        assert ep.duration_seconds == 1200
        assert ep.status == EpisodeStatus.PUBLISHED
        assert ep.external_id == "ep_0001"
        assert "cubs-s01e01" in repr(ep)

    def test_episode_nullable_duration(self):
        """Duration is nullable at DB level; validated on publish."""
        season_id = uuid.uuid4()
        ep = Episode(
            season_id=season_id,
            episode_number=1,
            title="Uncut Preview",
            content_group="preview-s01e01",
            language="hi",
            duration_seconds=None,
        )
        assert ep.duration_seconds is None

    def test_artwork_model(self):
        entity_id = uuid.uuid4()
        art = Artwork(
            entity_type=ArtworkEntityType.SHOW,
            entity_id=entity_id,
            artwork_type=ArtworkType.POSTER,
            storage_key=f"shows/{entity_id}/poster.jpg",
            storage_url=f"http://localhost:8000/storage/shows/{entity_id}/poster.jpg",
            width=600,
            height=900,
            file_size_bytes=150000,
        )
        assert art.entity_type == ArtworkEntityType.SHOW
        assert art.artwork_type == ArtworkType.POSTER
        assert art.width == 600
        assert art.height == 900
        assert "POSTER" in repr(art)

    def test_publish_run_model(self):
        run = PublishRun(
            outcome=PublishOutcome.RUNNING,
            shows_count=5,
            episodes_count=20,
            language_variants_count=35,
        )
        assert run.outcome == PublishOutcome.RUNNING
        assert run.shows_count == 5
        assert run.episodes_count == 20
        assert run.language_variants_count == 35


class TestDatabaseSchemaMetadata:
    """Validate constraints, foreign keys, and indexes in Base.metadata."""

    def test_all_expected_tables_present(self):
        expected_tables = {
            "users",
            "shows",
            "seasons",
            "episodes",
            "artwork",
            "publish_runs",
        }
        actual_tables = set(Base.metadata.tables.keys())
        assert expected_tables.issubset(actual_tables)

    def test_users_constraints(self):
        table = Base.metadata.tables["users"]
        assert "username" in table.columns
        assert table.columns["username"].nullable is False
        assert table.columns["hashed_password"].nullable is False
        assert table.columns["role"].nullable is False

    def test_shows_constraints_and_indexes(self):
        table = Base.metadata.tables["shows"]
        assert table.columns["slug"].nullable is False
        assert table.columns["section"].nullable is True  # deliberate P1

        index_names = {idx.name for idx in table.indexes}
        assert "ix_shows_categories_gin" in index_names
        assert "ix_shows_status_section" in index_names

    def test_seasons_constraints(self):
        table = Base.metadata.tables["seasons"]
        # Foreign key to shows
        fks = list(table.foreign_keys)
        assert len(fks) == 1
        assert fks[0].target_fullname == "shows.id"
        assert fks[0].ondelete == "CASCADE"

        # Unique constraint on (show_id, season_number)
        uq_names = {uq.name for uq in table.constraints if hasattr(uq, "columns")}
        assert "uq_seasons_show_season" in uq_names

    def test_episodes_constraints(self):
        table = Base.metadata.tables["episodes"]
        # Foreign key to seasons
        fks = list(table.foreign_keys)
        assert len(fks) == 1
        assert fks[0].target_fullname == "seasons.id"
        assert fks[0].ondelete == "CASCADE"

        # Unique constraint on (content_group, language)
        uq_names = {uq.name for uq in table.constraints if hasattr(uq, "columns")}
        assert "uq_episodes_content_group_language" in uq_names

        # Indexes
        index_names = {idx.name for idx in table.indexes}
        assert "ix_episodes_content_group_language" in index_names
        assert "ix_episodes_season_episode_number" in index_names

    def test_artwork_constraints(self):
        table = Base.metadata.tables["artwork"]
        uq_names = {uq.name for uq in table.constraints if hasattr(uq, "columns")}
        assert "uq_artwork_entity_type_slot" in uq_names

        index_names = {idx.name for idx in table.indexes}
        assert "ix_artwork_entity" in index_names

    def test_publish_runs_foreign_key(self):
        table = Base.metadata.tables["publish_runs"]
        fks = list(table.foreign_keys)
        assert len(fks) == 1
        assert fks[0].target_fullname == "users.id"
        assert fks[0].ondelete == "SET NULL"


class TestSeedDataIntegrity:
    """Verify seed_shows.json and reference.json integrity and deliberate flaws."""

    def test_reference_json_contents(self):
        ref_path = ROOT_DIR / "reference.json"
        assert ref_path.exists()
        with open(ref_path, encoding="utf-8-sig") as f:
            ref = json.load(f)

        assert "sections" in ref
        assert set(ref["sections"]) == {"featured", "series", "minisodes", "songs"}
        assert "languages" in ref
        assert set(ref["languages"]) == {"en", "hi"}
        assert "artwork_specs" in ref
        assert "poster" in ref["artwork_specs"]
        assert "banner" in ref["artwork_specs"]
        assert "thumbnail" in ref["artwork_specs"]

    def test_seed_shows_structure_and_known_flaws(self):
        seed_path = ROOT_DIR / "seed_shows.json"
        assert seed_path.exists()
        with open(seed_path, encoding="utf-8-sig") as f:
            seed_data = json.load(f)

        assert len(seed_data) == 95

        # P1: Rhyme Rangers has null section
        rhyme_rangers = [row for row in seed_data if row["slug"] == "rhyme-rangers"]
        assert len(rhyme_rangers) > 0
        assert all(row.get("section") is None for row in rhyme_rangers)

        # P2: ep_0036 has empty artwork_available
        ep_36 = [row for row in seed_data if row["episode_id"] == "ep_0036"]
        assert len(ep_36) == 1
        assert ep_36[0]["artwork_available"] == []

        # P3: Duplicate (content_group, language) pair
        # motis-many-lives-s01e02 + hi exists in ep_0004 and ep_9001
        dupes = [
            row for row in seed_data
            if row["content_group"] == "motis-many-lives-s01e02" and row["language"] == "hi"
        ]
        assert len(dupes) == 2
        dupe_ids = {r["episode_id"] for r in dupes}
        assert "ep_0004" in dupe_ids
        assert "ep_9001" in dupe_ids

        # P8: Season 0 trailers exist
        trailers = [row for row in seed_data if row["season_number"] == 0]
        assert len(trailers) >= 2
