"""
Artwork upload and management endpoints.
Enforces image specifications from reference.json and delegates storage to configured provider.
"""

import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_editor
from app.models.enums import ArtworkEntityType, ArtworkType
from app.models.user import User
from app.schemas.artwork import ArtworkRead
from app.services.artwork_service import ArtworkService

router = APIRouter()


@router.post(
    "/upload",
    response_model=ArtworkRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and validate artwork slot",
    description=(
        "Uploads an artwork file for a show or episode slot (poster, banner, thumbnail). "
        "Validates aspect ratio, dimensions, and the 200 KB ceiling with human-friendly errors."
    ),
)
async def upload_artwork(
    entity_type: ArtworkEntityType = Form(..., description="Target entity type (show or episode)"),
    entity_id: uuid.UUID = Form(..., description="Target entity UUID"),
    artwork_type: ArtworkType = Form(..., description="Slot type (poster, banner, thumbnail)"),
    file: UploadFile = File(..., description="Image file (JPEG, PNG, WebP; max 200 KB)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> ArtworkRead:
    """Upload and validate image asset."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    artwork = await ArtworkService.upload_artwork(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
        artwork_type=artwork_type,
        file_bytes=file_bytes,
    )
    return ArtworkRead.model_validate(artwork)


@router.get(
    "/{entity_type}/{entity_id}",
    response_model=list[ArtworkRead],
    summary="List all artwork for an entity",
)
async def get_entity_artwork(
    entity_type: ArtworkEntityType,
    entity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> list[ArtworkRead]:
    """Retrieve all artwork assets associated with a show or episode."""
    artworks = await ArtworkService.get_artwork_for_entity(
        db, entity_type, entity_id
    )
    return [ArtworkRead.model_validate(a) for a in artworks]


@router.delete(
    "/{entity_type}/{entity_id}/{artwork_type}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete artwork for a specific slot",
)
async def delete_artwork(
    entity_type: ArtworkEntityType,
    entity_id: uuid.UUID,
    artwork_type: ArtworkType,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> None:
    """Delete artwork slot record and underlying stored asset."""
    await ArtworkService.delete_artwork(
        db, entity_type, entity_id, artwork_type
    )
