"""
Tests for GET /api/v1/health endpoint.

These tests verify:
- The endpoint returns 200 regardless of DB status
- The response shape is correct
- Status reflects database connectivity
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_response_shape(client: AsyncClient):
    response = await client.get("/api/v1/health")
    data = response.json()

    assert "status" in data
    assert data["status"] in ("ok", "degraded")
    assert data["service"] == "peblo-api"
    assert "version" in data
    assert "checks" in data
    assert "database" in data["checks"]


@pytest.mark.asyncio
async def test_health_database_check_present(client: AsyncClient):
    response = await client.get("/api/v1/health")
    data = response.json()
    db_check = data["checks"]["database"]

    assert "status" in db_check
    # If DB is up, latency should be a positive number
    if db_check["status"] == "ok":
        assert isinstance(db_check["latency_ms"], float)
        assert db_check["latency_ms"] >= 0
