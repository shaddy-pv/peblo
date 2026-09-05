"""
Season service layer.
Handles CRUD and business logic for Seasons.
"""

import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.season import Season
from app.models.show import Show
from app.schemas.season import SeasonCreate, SeasonUpdate


class SeasonService:
    @staticmethod
    async def list_seasons(
        db: AsyncSession, show_id: uuid.UUID | None = None
    ) -> Sequence[Season]:
        """List seasons, optionally filtered by show_id."""
        query = select(Season).options(selectinload(Season.episodes))
        if show_id:
            query = query.where(Season.show_id == show_id)
        query = query.order_by(Season.season_number.asc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, season_id: uuid.UUID) -> Season | None:
        """Fetch season by UUID, including episodes."""
        stmt = (
            select(Season)
            .where(Season.id == season_id)
            .options(selectinload(Season.episodes))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_show_and_number(
        db: AsyncSession, show_id: uuid.UUID, season_number: int
    ) -> Season | None:
        """Find season by show_id and season_number."""
        stmt = select(Season).where(
            Season.show_id == show_id, Season.season_number == season_number
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_season(db: AsyncSession, season_in: SeasonCreate) -> Season:
        """Create a new season for a show."""
        # Verify parent show exists
        show = await db.get(Show, season_in.show_id)
        if not show:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Show with id '{season_in.show_id}' not found.",
            )

        # Check unique constraint (show_id, season_number)
        existing = await SeasonService.get_by_show_and_number(
            db, season_in.show_id, season_in.season_number
        )
        if existing:
            label = "Trailers" if season_in.season_number == 0 else f"Season {season_in.season_number}"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{label} already exists for this show.",
            )

        season = Season(
            show_id=season_in.show_id,
            season_number=season_in.season_number,
            title=season_in.title,
        )
        db.add(season)
        await db.commit()
        await db.refresh(season)
        return season

    @staticmethod
    async def update_season(
        db: AsyncSession, season: Season, season_in: SeasonUpdate
    ) -> Season:
        """Update existing season."""
        update_data = season_in.model_dump(exclude_unset=True)

        new_number = update_data.get("season_number")
        if new_number is not None and new_number != season.season_number:
            existing = await SeasonService.get_by_show_and_number(
                db, season.show_id, new_number
            )
            if existing and existing.id != season.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Season {new_number} already exists for this show.",
                )

        for field, value in update_data.items():
            setattr(season, field, value)

        await db.commit()
        await db.refresh(season)
        return season

    @staticmethod
    async def delete_season(db: AsyncSession, season: Season) -> None:
        """Delete season (cascades to episodes)."""
        await db.delete(season)
        await db.commit()
