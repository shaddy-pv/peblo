"""
Episode management endpoints.
CRUD operations, content_group language variant clustering, and publication validation.
"""

import math
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_editor
from app.models.enums import EpisodeStatus
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.episode import (
    EpisodeCreate,
    EpisodeGroupedVariant,
    EpisodeRead,
    EpisodeUpdate,
)
from app.services.episode_service import EpisodeService

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[EpisodeRead],
    summary="List episodes with filtering",
)
async def list_episodes(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    show_id: Optional[uuid.UUID] = Query(None, description="Filter by show UUID"),
    season_id: Optional[uuid.UUID] = Query(None, description="Filter by season UUID"),
    search: Optional[str] = Query(None, description="Search episode title or content_group"),
    status_filter: Optional[EpisodeStatus] = Query(None, alias="status", description="Filter by status"),
    language: Optional[str] = Query(None, description="Filter by language (en|hi)"),
    content_group: Optional[str] = Query(None, description="Filter by content_group"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> PaginatedResponse[EpisodeRead]:
    """List episodes with filters and pagination."""
    episodes, total = await EpisodeService.list_episodes(
        db=db,
        page=page,
        page_size=page_size,
        show_id=show_id,
        season_id=season_id,
        search=search,
        status_filter=status_filter,
        language=language,
        content_group=content_group,
    )
    pages = math.ceil(total / page_size) if total > 0 else 0

    items = []
    for ep in episodes:
        read_ep = EpisodeRead.model_validate(ep)
        read_ep.has_artwork = await EpisodeService.has_artwork(db, ep.id)
        items.append(read_ep)

    return PaginatedResponse[EpisodeRead](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post(
    "/",
    response_model=EpisodeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create episode",
)
async def create_episode(
    episode_in: EpisodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> EpisodeRead:
    """Create a new episode. Validates (content_group, language) uniqueness and publish rules."""
    episode = await EpisodeService.create_episode(db, episode_in)
    read_ep = EpisodeRead.model_validate(episode)
    read_ep.has_artwork = await EpisodeService.has_artwork(db, episode.id)
    return read_ep


@router.get(
    "/content-group/{content_group}/variants",
    response_model=list[EpisodeGroupedVariant],
    summary="Get all language variants for a content group",
)
async def get_content_group_variants(
    content_group: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> list[EpisodeGroupedVariant]:
    """Return all episodes sharing the same content_group."""
    variants = await EpisodeService.get_variants_by_content_group(db, content_group)
    return [
        EpisodeGroupedVariant(
            episode_id=v.id,
            language=v.language,
            title=v.title,
            duration_seconds=v.duration_seconds,
            status=v.status,
            external_id=v.external_id,
        )
        for v in variants
    ]


@router.get(
    "/{episode_id}",
    response_model=EpisodeRead,
    summary="Get episode by ID",
)
async def get_episode(
    episode_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> EpisodeRead:
    """Fetch episode details."""
    episode = await EpisodeService.get_by_id(db, episode_id)
    if not episode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Episode with id '{episode_id}' not found.",
        )
    read_ep = EpisodeRead.model_validate(episode)
    read_ep.has_artwork = await EpisodeService.has_artwork(db, episode.id)
    return read_ep


@router.patch(
    "/{episode_id}",
    response_model=EpisodeRead,
    summary="Update episode",
)
async def update_episode(
    episode_id: uuid.UUID,
    episode_in: EpisodeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> EpisodeRead:
    """Update episode. Enforces unique (content_group, language) and publish rules."""
    episode = await EpisodeService.get_by_id(db, episode_id)
    if not episode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Episode with id '{episode_id}' not found.",
        )
    updated_ep = await EpisodeService.update_episode(db, episode, episode_in)
    read_ep = EpisodeRead.model_validate(updated_ep)
    read_ep.has_artwork = await EpisodeService.has_artwork(db, updated_ep.id)
    return read_ep


@router.delete(
    "/{episode_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete episode",
)
async def delete_episode(
    episode_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> None:
    """Delete episode."""
    episode = await EpisodeService.get_by_id(db, episode_id)
    if not episode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Episode with id '{episode_id}' not found.",
        )
    await EpisodeService.delete_episode(db, episode)
