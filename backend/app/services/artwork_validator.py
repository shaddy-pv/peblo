"""
Artwork validation service.
Validates uploaded image byte size, format, aspect ratio, and dimensions
against reference.json specifications with non-technical editor friendly error messages.
"""

from dataclasses import dataclass
import io
from typing import Tuple

from PIL import Image, UnidentifiedImageError

from app.models.enums import ArtworkType

# 200 KB ceiling as strictly defined in reference.json
MAX_FILE_SIZE_BYTES = 200 * 1024  # 204,800 bytes
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

# Tolerance on aspect ratio (±5% accommodates real-world pixel rounding)
ASPECT_TOLERANCE = 0.05


@dataclass(frozen=True)
class ArtworkSpec:
    target_width: int
    target_height: int
    aspect_label: str
    target_aspect: float
    min_width: int
    max_width: int
    min_height: int
    max_height: int


ARTWORK_SPECS: dict[ArtworkType, ArtworkSpec] = {
    ArtworkType.POSTER: ArtworkSpec(
        target_width=600,
        target_height=900,
        aspect_label="2:3",
        target_aspect=2.0 / 3.0,  # ~0.6667
        min_width=450,
        max_width=1000,
        min_height=675,
        max_height=1500,
    ),
    ArtworkType.BANNER: ArtworkSpec(
        target_width=1280,
        target_height=720,
        aspect_label="16:9",
        target_aspect=16.0 / 9.0,  # ~1.7778
        min_width=960,
        max_width=1920,
        min_height=540,
        max_height=1080,
    ),
    ArtworkType.THUMBNAIL: ArtworkSpec(
        target_width=640,
        target_height=360,
        aspect_label="16:9",
        target_aspect=16.0 / 9.0,  # ~1.7778
        min_width=480,
        max_width=1280,
        min_height=270,
        max_height=720,
    ),
}


class ArtworkValidationError(ValueError):
    """Raised when an artwork file fails validation."""
    pass


class ArtworkValidator:
    """Validates image files against OTT specs."""

    @staticmethod
    def validate_image(
        data: bytes, artwork_type: ArtworkType
    ) -> Tuple[int, int, str]:
        """
        Validate image data.
        Returns (width, height, format_name) on success.
        Raises ArtworkValidationError with editor-friendly message on failure.
        """
        # 1. File size check (200 KB ceiling)
        size_bytes = len(data)
        if size_bytes > MAX_FILE_SIZE_BYTES:
            size_kb = size_bytes / 1024.0
            raise ArtworkValidationError(
                f"File size ({size_kb:.1f} KB) exceeds the 200 KB limit. "
                "Please compress your image before uploading."
            )

        # 2. Image parseability and format check
        try:
            with Image.open(io.BytesIO(data)) as img:
                img_format = img.format
                width, height = img.size
        except UnidentifiedImageError:
            raise ArtworkValidationError(
                "The uploaded file is not a valid image. "
                "Please upload a JPEG, PNG, or WebP file."
            )
        except Exception as e:
            raise ArtworkValidationError(f"Unable to read image file: {str(e)}")

        if not img_format or img_format.upper() not in ALLOWED_FORMATS:
            raise ArtworkValidationError(
                f"Unsupported image format '{img_format}'. "
                "Allowed formats are JPEG, PNG, and WebP."
            )

        spec = ARTWORK_SPECS[artwork_type]

        # 3. Aspect ratio validation
        actual_aspect = width / height
        aspect_diff = abs(actual_aspect - spec.target_aspect) / spec.target_aspect

        if aspect_diff > ASPECT_TOLERANCE:
            raise ArtworkValidationError(
                f"Incorrect aspect ratio for {artwork_type.value}: "
                f"image is {width}×{height} ({actual_aspect:.2f}:1). "
                f"Expected {spec.aspect_label} ratio (~{spec.target_width}×{spec.target_height}). "
                f"Please crop your image to {spec.aspect_label}."
            )

        # 4. Dimension checks (resolution too low or excessively oversized)
        if width < spec.min_width or height < spec.min_height:
            raise ArtworkValidationError(
                f"Image resolution is too low ({width}×{height}px). "
                f"Target size for {artwork_type.value} is ~{spec.target_width}×{spec.target_height}px. "
                "Uploading low-resolution images causes blurriness on high-DPI displays."
            )

        if width > spec.max_width or height > spec.max_height:
            raise ArtworkValidationError(
                f"Image dimensions are too large ({width}×{height}px). "
                f"Target size for {artwork_type.value} is ~{spec.target_width}×{spec.target_height}px. "
                f"Please resize the image closer to {spec.target_width}×{spec.target_height}px."
            )

        return width, height, img_format.lower()
