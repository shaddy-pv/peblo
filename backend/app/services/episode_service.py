"""
Episode service layer.
Handles CRUD, content_group language variant management, and publish validation rules.
"""

import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.artwork import Artwork
from app.models.enums import ArtworkEntityType, EpisodeStatus
from app.models.episode import Episode
from app.models.season import Season
from app.schemas.episode import EpisodeCreate, EpisodeUpdate


class EpisodeService:
    @staticmethod
    async def list_episodes(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        show_id: uuid.UUID | None = None,
        season_id: uuid.UUID | None = None,
        search: str | None = None,
        status_filter: EpisodeStatus | None = None,
        language: str | None = None,
        content_group: str | None = None,
    ) -> tuple[Sequence[Episode], int]:
        """
        List episodes with filtering and pagination.
        Returns (episodes, total_count).
        """
        query = select(Episode)

        if season_id:
            query = query.where(Episode.season_id == season_id)
        elif show_id:
            query = query.join(Season, Episode.season_id == Season.id).where(
                Season.show_id == show_id
            )

        if search:
            search_pattern = f"%{search.strip().lower()}%"
            query = query.where(
                func.lower(Episode.title).like(search_pattern)
                | func.lower(Episode.content_group).like(search_pattern)
            )

        if status_filter:
            query = query.where(Episode.status == status_filter)

        if language:
            query = query.where(Episode.language == language.lower().strip())

        if content_group:
            query = query.where(Episode.content_group == content_group.strip())

        # Count total matches
        count_query = select(func.count()).select_from(query.subquery())
        total_count = (await db.execute(count_query)).scalar_one()

        # Pagination & ordering
        offset = (page - 1) * page_size
        query = (
            query.order_by(Episode.episode_number.asc(), Episode.language.asc())
            .offset(offset)
            .limit(page_size)
        )

        result = await db.execute(query)
        episodes = result.scalars().all()
        return episodes, total_count

    @staticmethod
    async def get_by_id(db: AsyncSession, episode_id: uuid.UUID) -> Episode | None:
        """Fetch episode by UUID."""
        stmt = (
            select(Episode)
            .where(Episode.id == episode_id)
            .options(selectinload(Episode.season))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_content_group_and_language(
        db: AsyncSession, content_group: str, language: str
    ) -> Episode | None:
        """Find episode by unique pair (content_group, language)."""
        stmt = select(Episode).where(
            Episode.content_group == content_group,
            Episode.language == language,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_variants_by_content_group(
        db: AsyncSession, content_group: str
    ) -> Sequence[Episode]:
        """Fetch all language variants belonging to a content group."""
        stmt = (
            select(Episode)
            .where(Episode.content_group == content_group)
            .order_by(Episode.language.asc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def has_artwork(db: AsyncSession, episode_id: uuid.UUID) -> bool:
        """Check if episode has at least one artwork record."""
        stmt = select(func.count()).where(
            Artwork.entity_type == ArtworkEntityType.EPISODE,
            Artwork.entity_id == episode_id,
        )
        count = (await db.execute(stmt)).scalar_one()
        return count > 0

    @staticmethod
    async def create_episode(db: AsyncSession, episode_in: EpisodeCreate) -> Episode:
        """Create a new episode with constraint and validation checks."""
        # 1. Verify season exists
        season = await db.get(Season, episode_in.season_id)
        if not season:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Season with id '{episode_in.season_id}' not found.",
            )

        # 2. Check (content_group, language) uniqueness
        existing_variant = await EpisodeService.get_by_content_group_and_language(
            db, episode_in.content_group, episode_in.language
        )
        if existing_variant:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"An episode variant for content_group '{episode_in.content_group}' "
                    f"in language '{episode_in.language}' already exists."
                ),
            )

        # 3. Check external_id uniqueness if provided
        if episode_in.external_id:
            stmt = select(Episode).where(Episode.external_id == episode_in.external_id)
            if (await db.execute(stmt)).scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Episode with external_id '{episode_in.external_id}' already exists.",
                )

        # 4. Check publish requirements
        if episode_in.status == EpisodeStatus.PUBLISHED:
            # Must have duration
            if not episode_in.duration_seconds or episode_in.duration_seconds <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot publish episode without a duration (duration_seconds must be > 0).",
                )
            # Cannot publish a newly created episode if no artwork exists yet
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create an episode as PUBLISHED without first uploading required artwork.",
            )

        episode = Episode(
            season_id=episode_in.season_id,
            episode_number=episode_in.episode_number,
            title=episode_in.title,
            content_group=episode_in.content_group,
            language=episode_in.language,
            duration_seconds=episode_in.duration_seconds,
            status=episode_in.status,
            external_id=episode_in.external_id,
        )
        db.add(episode)
        await db.commit()
        await db.refresh(episode)
        return episode

    @staticmethod
    async def update_episode(
        db: AsyncSession, episode: Episode, episode_in: EpisodeUpdate
    ) -> Episode:
        """Update existing episode with validation of unique variant and publish rules."""
        update_data = episode_in.model_dump(exclude_unset=True)

        new_cg = update_data.get("content_group", episode.content_group)
        new_lang = update_data.get("language", episode.language)

        # If changing content_group or language, check uniqueness
        if new_cg != episode.content_group or new_lang != episode.language:
            existing = await EpisodeService.get_by_content_group_and_language(
                db, new_cg, new_lang
            )
            if existing and existing.id != episode.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"An episode variant for content_group '{new_cg}' "
                        f"in language '{new_lang}' already exists."
                    ),
                )

        # Validate publish rule if status is changing to or remaining PUBLISHED
        future_status = update_data.get("status", episode.status)
        future_duration = update_data.get("duration_seconds", episode.duration_seconds)

        if future_status == EpisodeStatus.PUBLISHED:
            if not future_duration or future_duration <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot publish episode without a duration.",
                )
            has_art = await EpisodeService.has_artwork(db, episode.id)
            if not has_art:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot publish episode without uploaded artwork.",
                )

        for field, value in update_data.items():
            setattr(episode, field, value)

        await db.commit()
        await db.refresh(episode)
        return episode

    @staticmethod
    async def delete_episode(db: AsyncSession, episode: Episode) -> None:
        """Delete episode."""
        await db.delete(episode)
        await db.commit()
