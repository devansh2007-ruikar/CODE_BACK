import asyncio
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_concurrent_claim_race_condition(
    client: AsyncClient,
    citizen_auth: dict,
    hero_auth: dict,
    second_hero_auth: dict,
):
    """Critical Concurrency Test:
    Two heroes attempt to claim the exact same incident simultaneously.
    Using the atomic conditional update:
    UPDATE incidents SET status='CLAIMED', hero_id=:hero_id WHERE id=:id AND status='REPORTED' AND hero_id IS NULL
    Exactly ONE hero must succeed (200 OK) and the other must fail with 409 Conflict.
    """
    # 1. Citizen reports an incident
    create_res = await client.post(
        "/incidents",
        json={
            "title": "Electro at the Power Plant",
            "description": "Electro draining the grid at Consolidated Edison.",
            "category": "Sabotage",
            "severity": 4,
            "location": "Queens Power Substation",
        },
        headers=citizen_auth["headers"],
    )
    assert create_res.status_code == 201
    incident_id = create_res.json()["id"]

    # 2. Both heroes try to claim concurrently
    async def hero1_claim():
        return await client.patch(
            f"/incidents/{incident_id}/claim",
            headers=hero_auth["headers"],
        )

    async def hero2_claim():
        return await client.patch(
            f"/incidents/{incident_id}/claim",
            headers=second_hero_auth["headers"],
        )

    res1, res2 = await asyncio.gather(hero1_claim(), hero2_claim())

    status_codes = [res1.status_code, res2.status_code]
    assert 200 in status_codes, f"Expected one 200 OK, got {status_codes}"
    assert 409 in status_codes, f"Expected one 409 Conflict, got {status_codes}"

    # Verify final state in database
    get_res = await client.get(f"/incidents/{incident_id}", headers=hero_auth["headers"])
    assert get_res.status_code == 200
    incident_data = get_res.json()
    assert incident_data["status"] == "CLAIMED"
    assert incident_data["hero_id"] in [hero_auth["user"]["id"], second_hero_auth["user"]["id"]]


@pytest.mark.asyncio
async def test_claim_already_claimed_returns_409(
    client: AsyncClient,
    citizen_auth: dict,
    hero_auth: dict,
    second_hero_auth: dict,
):
    """Subsequent claim attempts on an already claimed incident return 409 Conflict."""
    create_res = await client.post(
        "/incidents",
        json={
            "title": "Doc Ock bank heist",
            "description": "Four mechanical arms tearing through titanium doors.",
            "category": "Robbery",
            "severity": 5,
            "location": "Federal Reserve Bank",
        },
        headers=citizen_auth["headers"],
    )
    incident_id = create_res.json()["id"]

    # First claim succeeds
    claim1 = await client.patch(
        f"/incidents/{incident_id}/claim",
        headers=hero_auth["headers"],
    )
    assert claim1.status_code == 200

    # Second claim fails with 409 Conflict
    claim2 = await client.patch(
        f"/incidents/{incident_id}/claim",
        headers=second_hero_auth["headers"],
    )
    assert claim2.status_code == 409
    assert "cannot be claimed" in claim2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_claim_non_existent_returns_409(
    client: AsyncClient,
    hero_auth: dict,
):
    """Claiming non-existent incident updates 0 rows and returns 409 Conflict."""
    claim_res = await client.patch(
        "/incidents/99999/claim",
        headers=hero_auth["headers"],
    )
    assert claim_res.status_code == 409
