"""
Show management endpoints.
CRUD operations with pagination, filtering, search, and publication validation.
"""

import math
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_editor
from app.models.enums import ShowStatus
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.show import ShowCreate, ShowDetailRead, ShowRead, ShowUpdate
from app.services.show_service import ShowService

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[ShowRead],
    summary="List shows with filtering and search",
)
async def list_shows(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term matching title/synopsis"),
    section: Optional[str] = Query(None, description="Filter by section (featured|series|minisodes|songs)"),
    status_filter: Optional[ShowStatus] = Query(None, alias="status", description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> PaginatedResponse[ShowRead]:
    """List shows with pagination and CMS filtering."""
    shows, total = await ShowService.list_shows(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        section=section,
        status_filter=status_filter,
        category=category,
    )
    pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[ShowRead](
        items=[ShowRead.model_validate(s) for s in shows],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post(
    "/",
    response_model=ShowRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new show",
)
async def create_show(
    show_in: ShowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> ShowRead:
    """Create a new show. Required role: Editor or Admin."""
    show = await ShowService.create_show(db, show_in)
    return ShowRead.model_validate(show)


@router.get(
    "/{show_id}",
    response_model=ShowDetailRead,
    summary="Get show details by ID",
)
async def get_show(
    show_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> ShowDetailRead:
    """Fetch complete show details including seasons."""
    show = await ShowService.get_by_id(db, show_id)
    if not show:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Show with id '{show_id}' not found.",
        )
    return ShowDetailRead.model_validate(show)


@router.patch(
    "/{show_id}",
    response_model=ShowRead,
    summary="Update show",
)
async def update_show(
    show_id: uuid.UUID,
    show_in: ShowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> ShowRead:
    """Update show fields. Required role: Editor or Admin."""
    show = await ShowService.get_by_id(db, show_id)
    if not show:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Show with id '{show_id}' not found.",
        )
    updated_show = await ShowService.update_show(db, show, show_in)
    return ShowRead.model_validate(updated_show)


@router.delete(
    "/{show_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete show",
)
async def delete_show(
    show_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> None:
    """Delete show and cascade to all its seasons and episodes."""
    show = await ShowService.get_by_id(db, show_id)
    if not show:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Show with id '{show_id}' not found.",
        )
    await ShowService.delete_show(db, show)
