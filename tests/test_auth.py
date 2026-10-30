import pytest
from httpx import AsyncClient
import jwt

from app.config import settings
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_register_and_login_citizen(client: AsyncClient):
    # 1. Register Citizen
    reg_res = await client.post(
        "/auth/register",
        json={
            "username": "aunt_may",
            "password": "wheatcakes123",
            "role": UserRole.CITIZEN.value,
        },
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "CITIZEN"

    # Decode token payload and verify fields
    payload = jwt.decode(
        data["access_token"],
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    assert payload["username"] == "aunt_may"
    assert payload["role"] == "CITIZEN"

    # 2. Login
    login_res = await client.post(
        "/auth/login",
        json={"username": "aunt_may", "password": "wheatcakes123"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["username"] == "aunt_may"


@pytest.mark.asyncio
async def test_register_duplicate_username_fails(client: AsyncClient):
    await client.post(
        "/auth/register",
        json={
            "username": "spider_ham",
            "password": "porker_power_123",
            "role": UserRole.HERO.value,
        },
    )
    # Attempt second registration with same username
    res = await client.post(
        "/auth/register",
        json={
            "username": "spider_ham",
            "password": "different_password",
            "role": UserRole.HERO.value,
        },
    )
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_invalid_password_fails(client: AsyncClient):
    await client.post(
        "/auth/register",
        json={
            "username": "norman_osborn",
            "password": "goblin_formula",
            "role": UserRole.CITIZEN.value,
        },
    )
    res = await client.post(
        "/auth/login",
        json={"username": "norman_osborn", "password": "wrong_password"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_strict_role_dependency_enforcement(
    client: AsyncClient,
    citizen_auth: dict,
    hero_auth: dict,
):
    """Test strict role dependency checks returning 403 Forbidden on role mismatch."""
    incident_payload = {
        "title": "Rhino Rampage",
        "description": "Rhino charging down Broadway avenue.",
        "category": "Assault",
        "severity": 4,
        "location": "Broadway & 42nd St",
    }

    # 1. Citizen CAN create incident
    citizen_res = await client.post(
        "/incidents",
        json=incident_payload,
        headers=citizen_auth["headers"],
    )
    assert citizen_res.status_code == 201
    created_id = citizen_res.json()["id"]

    # 2. Hero CANNOT create incident (Citizen only endpoint -> 403 Forbidden)
    hero_create_res = await client.post(
        "/incidents",
        json=incident_payload,
        headers=hero_auth["headers"],
    )
    assert hero_create_res.status_code == 403
    assert "CITIZEN" in hero_create_res.json()["detail"]

    # 3. Citizen CANNOT claim an incident (Hero only endpoint -> 403 Forbidden)
    citizen_claim_res = await client.patch(
        f"/incidents/{created_id}/claim",
        headers=citizen_auth["headers"],
    )
    assert citizen_claim_res.status_code == 403
    assert "HERO" in citizen_claim_res.json()["detail"]

    # 4. Unauthenticated request -> 401 Unauthorized
    unauth_res = await client.post("/incidents", json=incident_payload)
    assert unauth_res.status_code == 401
