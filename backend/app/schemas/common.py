"""
Common schemas: pagination and generic response containers.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated envelope for list endpoints."""
    items: list[T]
    total: int = Field(..., description="Total number of items matching filters")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(..., ge=1, le=100, description="Items per page")
    pages: int = Field(..., description="Total pages")
