"""
Artwork service layer.
Coordinates image validation, storage upload, and Artwork record persistence.
"""

import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artwork import Artwork
from app.models.enums import ArtworkEntityType, ArtworkType
from app.models.episode import Episode
from app.models.show import Show
from app.services.artwork_validator import ArtworkValidationError, ArtworkValidator
from app.storage import get_storage


class ArtworkService:
    @staticmethod
    async def get_artwork_by_id(
        db: AsyncSession, artwork_id: uuid.UUID
    ) -> Artwork | None:
        """Fetch artwork by its primary key."""
        return await db.get(Artwork, artwork_id)

    @staticmethod
    async def get_artwork_for_entity(
        db: AsyncSession,
        entity_type: ArtworkEntityType,
        entity_id: uuid.UUID,
    ) -> Sequence[Artwork]:
        """Fetch all artwork records associated with an entity."""
        stmt = select(Artwork).where(
            Artwork.entity_type == entity_type,
            Artwork.entity_id == entity_id,
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_slot_artwork(
        db: AsyncSession,
        entity_type: ArtworkEntityType,
        entity_id: uuid.UUID,
        artwork_type: ArtworkType,
    ) -> Artwork | None:
        """Fetch specific artwork slot for an entity."""
        stmt = select(Artwork).where(
            Artwork.entity_type == entity_type,
            Artwork.entity_id == entity_id,
            Artwork.artwork_type == artwork_type,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def upload_artwork(
        db: AsyncSession,
        entity_type: ArtworkEntityType,
        entity_id: uuid.UUID,
        artwork_type: ArtworkType,
        file_bytes: bytes,
    ) -> Artwork:
        """
        Validate, store, and upsert artwork for an entity slot.
        """
        # 1. Verify entity exists in DB
        if entity_type == ArtworkEntityType.SHOW:
            show = await db.get(Show, entity_id)
            if not show:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Show with id '{entity_id}' not found.",
                )
        elif entity_type == ArtworkEntityType.EPISODE:
            episode = await db.get(Episode, entity_id)
            if not episode:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Episode with id '{entity_id}' not found.",
                )

        # 2. Validate image data (format, size <= 200KB, aspect ratio, dimensions)
        try:
            width, height, fmt = ArtworkValidator.validate_image(
                file_bytes, artwork_type
            )
        except ArtworkValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

        # 3. Store file via storage provider
        ext = "jpg" if fmt == "jpeg" else fmt
        storage_key = f"{entity_type.value}s/{entity_id}/{artwork_type.value}.{ext}"
        content_type = f"image/{fmt}"

        storage = get_storage()
        public_url = await storage.upload(
            key=storage_key, data=file_bytes, content_type=content_type
        )

        # 4. Upsert artwork record
        existing = await ArtworkService.get_slot_artwork(
            db, entity_type, entity_id, artwork_type
        )

        if existing:
            existing.storage_key = storage_key
            existing.storage_url = public_url
            existing.width = width
            existing.height = height
            existing.file_size_bytes = len(file_bytes)
            artwork_record = existing
        else:
            artwork_record = Artwork(
                entity_type=entity_type,
                entity_id=entity_id,
                artwork_type=artwork_type,
                storage_key=storage_key,
                storage_url=public_url,
                width=width,
                height=height,
                file_size_bytes=len(file_bytes),
            )
            db.add(artwork_record)

        await db.commit()
        await db.refresh(artwork_record)
        return artwork_record

    @staticmethod
    async def delete_artwork(
        db: AsyncSession,
        entity_type: ArtworkEntityType,
        entity_id: uuid.UUID,
        artwork_type: ArtworkType,
    ) -> None:
        """Delete artwork record and underlying stored asset."""
        artwork = await ArtworkService.get_slot_artwork(
            db, entity_type, entity_id, artwork_type
        )
        if not artwork:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No {artwork_type.value} artwork found for {entity_type.value} '{entity_id}'.",
            )

        storage = get_storage()
        await storage.delete(artwork.storage_key)

        await db.delete(artwork)
        await db.commit()
