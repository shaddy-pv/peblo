"""
Database seed script.

Loads seed_shows.json into the database.

Strategy:
- Idempotent: safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING
  for most records, detects and skips duplicates).
- Preserves external_id from seed data for traceability.
- Handles known data quality issues gracefully (logs them to stderr).
- Creates two demo users: admin / editor.
- Creates placeholder artwork records using sample image files.

Usage:
    python -m app.scripts.seed                  # from backend/ directory
    python -m app.scripts.seed --reset          # drop all data first (dev only)

Data quality issues handled:
  P1: Rhyme Rangers section=null    → imported as-is, validation engine reports it
  P2: ep_0036 artwork_available=[]  → no artwork records created
  P3: Duplicate (content_group=motis-many-lives-s01e02, language=hi) →
        ep_0004 kept, ep_9001 skipped (logged)
  P4/P5: Inconsistent title casing  → imported as-is (CMS can fix)
"""

from __future__ import annotations

import asyncio
import json
import shutil
import sys
import uuid
from collections import defaultdict
from pathlib import Path

# Allow running directly: python app/scripts/seed.py or python -m app.scripts.seed
_BACKEND = Path(__file__).resolve().parents[2]
_ROOT = _BACKEND.parent
for p in [str(_BACKEND), str(_ROOT)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.enums import (
    ArtworkEntityType,
    ArtworkType,
    EpisodeStatus,
    ShowStatus,
    UserRole,
)
from app.models.artwork import Artwork
from app.models.episode import Episode
from app.models.publish_run import PublishRun
from app.models.season import Season
from app.models.show import Show
from app.models.user import User

# ── Paths ─────────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent


def _resolve_asset(filename: str) -> Path:
    candidates = [
        PROJECT_ROOT / filename,
        BACKEND_DIR / "seed_data" / filename,
        BACKEND_DIR / filename,
        Path("/app/seed_data") / filename,
        Path("/app") / filename,
    ]
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]


SEED_FILE = _resolve_asset("seed_shows.json")
REFERENCE_FILE = _resolve_asset("reference.json")

# Sample images bundled with the project
SAMPLE_IMAGES = {
    ArtworkType.POSTER: _resolve_asset("poster_good.jpg"),
    ArtworkType.BANNER: _resolve_asset("banner_good.jpg"),
    ArtworkType.THUMBNAIL: _resolve_asset("thumb_good.jpg"),
}

# Demo user credentials (passwords are bcrypt hashed)
# These are hashed values of "admin123" and "editor123"
# Generated with: passlib.hash.bcrypt.hash("admin123")
DEMO_USERS = [
    {
        "username": "admin",
        "password_plain": "admin123",
        "role": UserRole.ADMIN,
    },
    {
        "username": "editor",
        "password_plain": "editor123",
        "role": UserRole.EDITOR,
    },
]


def _hash_password(plain: str) -> str:
    """Hash a password using bcrypt."""
    from app.core.security import get_password_hash
    return get_password_hash(plain)


def _load_json(path: Path) -> list | dict:
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def _setup_storage(storage_path: Path) -> dict[ArtworkType, Path]:
    """
    Copy sample images to the storage directory.
    Returns a map of artwork_type → stored file path.
    """
    storage_path.mkdir(parents=True, exist_ok=True)
    samples_dir = storage_path / "samples"
    samples_dir.mkdir(exist_ok=True)

    stored: dict[ArtworkType, Path] = {}
    for art_type, src in SAMPLE_IMAGES.items():
        if src.exists():
            dest = samples_dir / src.name
            shutil.copy2(src, dest)
            stored[art_type] = dest
            print(f"  Copied {art_type.value} sample: {dest.name}")
        else:
            print(f"  WARNING: sample image not found: {src}", file=sys.stderr)
    return stored


async def _seed_users(session: AsyncSession) -> dict[str, User]:
    """Create demo users if they don't already exist."""
    users: dict[str, User] = {}
    for info in DEMO_USERS:
        existing = await session.execute(
            select(User).where(User.username == info["username"])
        )
        user = existing.scalar_one_or_none()
        if user is None:
            user = User(
                username=info["username"],
                hashed_password=_hash_password(info["password_plain"]),
                role=info["role"],
                is_active=True,
            )
            session.add(user)
            print(f"  Created user: {info['username']} ({info['role'].value})")
        else:
            print(f"  User already exists: {info['username']}")
        users[info["username"]] = user
    await session.flush()
    return users


async def _seed_content(
    session: AsyncSession,
    seed_rows: list[dict],
    storage_path: Path,
    stored_samples: dict[ArtworkType, Path],
) -> tuple[int, int, int, int]:
    """
    Seed shows, seasons, and episodes from seed_rows.
    Returns (shows_created, seasons_created, episodes_created, skipped).
    """
    # ── Group rows ────────────────────────────────────────────────────────────
    # shows keyed by slug
    shows_data: dict[str, dict] = {}
    # seasons keyed by (slug, season_number)
    seasons_data: dict[tuple[str, int], set[str]] = defaultdict(set)  # → episode_ids
    # rows keyed by episode_id
    episodes_by_id: dict[str, dict] = {row["episode_id"]: row for row in seed_rows}

    for row in seed_rows:
        slug = row["slug"]
        if slug not in shows_data:
            shows_data[slug] = {
                "title": row["show_title"],
                "slug": slug,
                "synopsis": row.get("synopsis"),
                "section": row.get("section"),
                "categories": row.get("categories", []),
                "status": ShowStatus.PUBLISHED if row.get("status") == "published" else ShowStatus.DRAFT,
            }
        seasons_data[(slug, row["season_number"])].add(row["episode_id"])

    # Determine show status: published if any episode is published
    show_statuses: dict[str, ShowStatus] = {}
    for row in seed_rows:
        slug = row["slug"]
        if row.get("status") == "published":
            show_statuses[slug] = ShowStatus.PUBLISHED
        elif slug not in show_statuses:
            show_statuses[slug] = ShowStatus.DRAFT

    shows_created = 0
    seasons_created = 0
    episodes_created = 0
    skipped = 0

    # ── Shows ─────────────────────────────────────────────────────────────────
    show_objects: dict[str, Show] = {}
    for slug, data in shows_data.items():
        existing = await session.execute(select(Show).where(Show.slug == slug))
        show = existing.scalar_one_or_none()
        if show is None:
            show = Show(
                title=data["title"],
                slug=slug,
                synopsis=data["synopsis"],
                section=data["section"],
                categories=data["categories"],
                status=show_statuses.get(slug, ShowStatus.DRAFT),
            )
            session.add(show)
            shows_created += 1
            print(f"  Show: {data['title']!r} section={data['section']!r}")
        show_objects[slug] = show

    await session.flush()

    # ── Seasons ───────────────────────────────────────────────────────────────
    season_objects: dict[tuple[str, int], Season] = {}
    for (slug, season_num), ep_ids in seasons_data.items():
        show = show_objects[slug]
        existing = await session.execute(
            select(Season).where(
                Season.show_id == show.id,
                Season.season_number == season_num,
            )
        )
        season = existing.scalar_one_or_none()
        if season is None:
            title = None if season_num > 0 else "Trailers"
            season = Season(
                show_id=show.id,
                season_number=season_num,
                title=title,
            )
            session.add(season)
            seasons_created += 1
        season_objects[(slug, season_num)] = season

    await session.flush()

    # ── Episodes ──────────────────────────────────────────────────────────────
    # Track (content_group, language) pairs we've already inserted this run
    # to handle the duplicate in seed data (P3)
    inserted_cg_lang: set[tuple[str, str]] = set()

    for row in seed_rows:
        ep_id = row["episode_id"]
        cg = row["content_group"]
        lang = row["language"]
        key = (cg, lang)

        # Check for in-memory duplicates within this seed run
        if key in inserted_cg_lang:
            print(
                f"  SKIP duplicate (content_group={cg!r}, language={lang!r}): "
                f"episode_id={ep_id!r} — keeping first occurrence",
                file=sys.stderr,
            )
            skipped += 1
            continue

        # Check if already in DB (idempotent re-seed)
        existing_ep = await session.execute(
            select(Episode).where(Episode.external_id == ep_id)
        )
        if existing_ep.scalar_one_or_none() is not None:
            inserted_cg_lang.add(key)
            continue

        season = season_objects[(row["slug"], row["season_number"])]
        episode = Episode(
            season_id=season.id,
            episode_number=row["episode_number"],
            title=row["episode_title"],
            content_group=cg,
            language=lang,
            duration_seconds=row.get("duration_seconds"),
            status=(
                EpisodeStatus.PUBLISHED
                if row.get("status") == "published"
                else EpisodeStatus.DRAFT
            ),
            external_id=ep_id,
        )
        try:
            session.add(episode)
            await session.flush()
            inserted_cg_lang.add(key)
            episodes_created += 1

            # ── Artwork ───────────────────────────────────────────────────────
            artwork_available = row.get("artwork_available", [])
            for art_type_str in artwork_available:
                try:
                    art_type = ArtworkType(art_type_str)
                except ValueError:
                    continue

                sample = stored_samples.get(art_type)
                if sample is None:
                    continue

                # Storage key: episodes/{episode_id}/{type}.jpg
                storage_key = f"episodes/{ep_id}/{art_type.value}{sample.suffix}"
                # Copy sample to episode-specific path
                dest = storage_path / "episodes" / ep_id
                dest.mkdir(parents=True, exist_ok=True)
                shutil.copy2(sample, dest / f"{art_type.value}{sample.suffix}")

                artwork = Artwork(
                    entity_type=ArtworkEntityType.EPISODE,
                    entity_id=episode.id,
                    artwork_type=art_type,
                    storage_key=storage_key,
                    storage_url=f"{settings.LOCAL_STORAGE_BASE_URL}/{storage_key}",
                    # Dimensions from sample images (real values)
                    width={"poster": 600, "banner": 1280, "thumbnail": 640}.get(art_type.value),
                    height={"poster": 900, "banner": 720, "thumbnail": 360}.get(art_type.value),
                    file_size_bytes=sample.stat().st_size if sample.exists() else None,
                )
                session.add(artwork)

        except IntegrityError:
            await session.rollback()
            print(
                f"  SKIP DB constraint violation (content_group={cg!r}, language={lang!r}): "
                f"episode_id={ep_id!r}",
                file=sys.stderr,
            )
            skipped += 1
            continue

    await session.flush()

    # ── Show-level artwork (poster + banner on each show) ─────────────────────
    for slug, show in show_objects.items():
        for art_type in [ArtworkType.POSTER, ArtworkType.BANNER]:
            sample = stored_samples.get(art_type)
            if sample is None:
                continue

            # Check if already exists
            existing_art = await session.execute(
                select(Artwork).where(
                    Artwork.entity_type == ArtworkEntityType.SHOW,
                    Artwork.entity_id == show.id,
                    Artwork.artwork_type == art_type,
                )
            )
            if existing_art.scalar_one_or_none() is not None:
                continue

            storage_key = f"shows/{show.id}/{art_type.value}{sample.suffix}"
            dest = storage_path / "shows" / str(show.id)
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copy2(sample, dest / f"{art_type.value}{sample.suffix}")

            artwork = Artwork(
                entity_type=ArtworkEntityType.SHOW,
                entity_id=show.id,
                artwork_type=art_type,
                storage_key=storage_key,
                storage_url=f"{settings.LOCAL_STORAGE_BASE_URL}/{storage_key}",
                width={"poster": 600, "banner": 1280}.get(art_type.value),
                height={"poster": 900, "banner": 720}.get(art_type.value),
                file_size_bytes=sample.stat().st_size if sample.exists() else None,
            )
            session.add(artwork)

    await session.flush()
    return shows_created, seasons_created, episodes_created, skipped


async def seed(reset: bool = False) -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    storage_path = Path(settings.LOCAL_STORAGE_PATH).resolve()

    print("=" * 60)
    print("Peblo TV — Database Seed")
    print("=" * 60)

    if reset:
        print("RESET mode: truncating all tables...")
        async with session_factory() as session:
            await session.execute(text("TRUNCATE TABLE publish_runs, artwork, episodes, seasons, shows, users CASCADE"))
            await session.commit()
        print("  Tables truncated.")

    # Load seed data
    print(f"\nLoading seed data from: {SEED_FILE}")
    if not SEED_FILE.exists():
        print(f"ERROR: {SEED_FILE} not found", file=sys.stderr)
        sys.exit(1)
    seed_rows = _load_json(SEED_FILE)
    print(f"  {len(seed_rows)} episode rows loaded")

    # Setup storage
    print(f"\nSetting up storage at: {storage_path}")
    stored_samples = _setup_storage(storage_path)

    async with session_factory() as session:
        async with session.begin():
            # Users
            print("\nSeeding users...")
            await _seed_users(session)

            # Content
            print("\nSeeding content...")
            shows_c, seasons_c, episodes_c, skipped = await _seed_content(
                session, seed_rows, storage_path, stored_samples
            )

    await engine.dispose()

    print("\n" + "=" * 60)
    print("Seed complete!")
    print(f"  Shows created:    {shows_c}")
    print(f"  Seasons created:  {seasons_c}")
    print(f"  Episodes created: {episodes_c}")
    print(f"  Skipped (dupes):  {skipped}")
    print("=" * 60)


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Seed the Peblo TV database")
    parser.add_argument("--reset", action="store_true", help="Truncate all data before seeding (dev only)")
    args = parser.parse_args()
    asyncio.run(seed(reset=args.reset))


if __name__ == "__main__":
    main()
