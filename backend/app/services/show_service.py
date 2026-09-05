"""
Show service layer.
Handles CRUD and business logic for Shows.
"""

import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import ShowStatus
from app.models.season import Season
from app.models.show import Show
from app.schemas.show import ShowCreate, ShowUpdate


class ShowService:
    @staticmethod
    async def list_shows(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        section: str | None = None,
        status_filter: ShowStatus | None = None,
        category: str | None = None,
    ) -> tuple[Sequence[Show], int]:
        """
        List shows with optional search, filtering, and pagination.
        Returns (shows, total_count).
        """
        query = select(Show)

        if search:
            search_pattern = f"%{search.strip().lower()}%"
            query = query.where(
                func.lower(Show.title).like(search_pattern)
                | func.lower(func.coalesce(Show.synopsis, "")).like(search_pattern)
            )

        if section:
            query = query.where(Show.section == section.lower().strip())

        if status_filter:
            query = query.where(Show.status == status_filter)

        if category:
            cat = category.lower().strip()
            # For PostgreSQL ARRAY containment, or SQLite compatible string search
            query = query.where(Show.categories.any(cat))

        # Total count query
        count_query = select(func.count()).select_from(query.subquery())
        total_count = (await db.execute(count_query)).scalar_one()

        # Pagination and ordering
        offset = (page - 1) * page_size
        query = query.order_by(Show.created_at.desc()).offset(offset).limit(page_size)

        result = await db.execute(query)
        shows = result.scalars().all()
        return shows, total_count

    @staticmethod
    async def get_by_id(db: AsyncSession, show_id: uuid.UUID) -> Show | None:
        """Fetch show by UUID, including seasons."""
        stmt = (
            select(Show)
            .where(Show.id == show_id)
            .options(selectinload(Show.seasons).selectinload(Season.episodes))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_slug(db: AsyncSession, slug: str) -> Show | None:
        """Fetch show by URL slug."""
        stmt = select(Show).where(Show.slug == slug)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_show(db: AsyncSession, show_in: ShowCreate) -> Show:
        """Create a new show."""
        # Ensure slug uniqueness
        existing = await ShowService.get_by_slug(db, show_in.slug)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Show with slug '{show_in.slug}' already exists.",
            )

        show = Show(
            title=show_in.title,
            slug=show_in.slug,
            synopsis=show_in.synopsis,
            section=show_in.section,
            categories=show_in.categories,
            status=show_in.status,
        )
        db.add(show)
        await db.commit()
        await db.refresh(show)
        return show

    @staticmethod
    async def update_show(
        db: AsyncSession, show: Show, show_in: ShowUpdate
    ) -> Show:
        """Update existing show fields."""
        update_data = show_in.model_dump(exclude_unset=True)

        # If changing slug, verify uniqueness
        new_slug = update_data.get("slug")
        if new_slug and new_slug != show.slug:
            existing = await ShowService.get_by_slug(db, new_slug)
            if existing and existing.id != show.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Show with slug '{new_slug}' already exists.",
                )

        # Validate publish rule: a published show must have a section
        future_status = update_data.get("status", show.status)
        future_section = update_data.get("section", show.section)
        if future_status == ShowStatus.PUBLISHED and not future_section:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A published show must have a section assigned.",
            )

        for field, value in update_data.items():
            setattr(show, field, value)

        await db.commit()
        await db.refresh(show)
        return show

    @staticmethod
    async def delete_show(db: AsyncSession, show: Show) -> None:
        """Delete show (cascades to seasons and episodes)."""
        await db.delete(show)
        await db.commit()
