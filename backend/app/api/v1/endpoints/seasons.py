"""
Season management endpoints.
CRUD operations for show seasons, including Season 0 / trailer management.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_editor
from app.models.user import User
from app.schemas.season import SeasonCreate, SeasonRead, SeasonUpdate
from app.services.season_service import SeasonService

router = APIRouter()


@router.get(
    "",
    response_model=list[SeasonRead],
    include_in_schema=False,
)
@router.get(
    "/",
    response_model=list[SeasonRead],
    summary="List seasons",
)
async def list_seasons(
    show_id: Optional[uuid.UUID] = Query(None, description="Filter seasons by show UUID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> list[SeasonRead]:
    """List seasons, optionally filtered by show."""
    seasons = await SeasonService.list_seasons(db, show_id=show_id)
    return [SeasonRead.model_validate(s) for s in seasons]


@router.post(
    "",
    response_model=SeasonRead,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/",
    response_model=SeasonRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create season",
)
async def create_season(
    season_in: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> SeasonRead:
    """Create a new season for a show. season_number=0 is reserved for trailers."""
    season = await SeasonService.create_season(db, season_in)
    return SeasonRead.model_validate(season)


@router.get(
    "/{season_id}",
    response_model=SeasonRead,
    summary="Get season by ID",
)
async def get_season(
    season_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> SeasonRead:
    """Fetch season details."""
    season = await SeasonService.get_by_id(db, season_id)
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Season with id '{season_id}' not found.",
        )
    return SeasonRead.model_validate(season)


@router.patch(
    "/{season_id}",
    response_model=SeasonRead,
    summary="Update season",
)
async def update_season(
    season_id: uuid.UUID,
    season_in: SeasonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> SeasonRead:
    """Update season fields."""
    season = await SeasonService.get_by_id(db, season_id)
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Season with id '{season_id}' not found.",
        )
    updated_season = await SeasonService.update_season(db, season, season_in)
    return SeasonRead.model_validate(updated_season)


@router.delete(
    "/{season_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete season",
)
async def delete_season(
    season_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> None:
    """Delete season and cascade delete all its episodes."""
    season = await SeasonService.get_by_id(db, season_id)
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Season with id '{season_id}' not found.",
        )
    await SeasonService.delete_season(db, season)
