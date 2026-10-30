import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_citizen_creates_and_views_only_own_incidents(
    client: AsyncClient,
    citizen_auth: dict,
    second_citizen_auth: dict,
):
    # Citizen 1 creates an incident
    res1 = await client.post(
        "/incidents",
        json={
            "title": "Jewelry store break-in by Black Cat",
            "description": "Black Cat was seen sneaking into the rooftop vault.",
            "category": "Theft",
            "severity": 3,
            "location": "Upper East Side",
        },
        headers=citizen_auth["headers"],
    )
    assert res1.status_code == 201
    inc1 = res1.json()
    assert inc1["status"] == "REPORTED"
    assert inc1["citizen_id"] == citizen_auth["user"]["id"]
    assert inc1["hero_id"] is None

    # Citizen 2 creates an incident
    res2 = await client.post(
        "/incidents",
        json={
            "title": "Green Goblin sighting",
            "description": "Glider heard above Times Square.",
            "category": "Terrorism",
            "severity": 5,
            "location": "Times Square",
        },
        headers=second_citizen_auth["headers"],
    )
    assert res2.status_code == 201

    # Citizen 1 queries /incidents -> should ONLY see inc1
    list_res1 = await client.get("/incidents", headers=citizen_auth["headers"])
    assert list_res1.status_code == 200
    items1 = list_res1.json()
    assert len(items1) == 1
    assert items1[0]["id"] == inc1["id"]

    # Citizen 2 queries /incidents -> should ONLY see inc2
    list_res2 = await client.get("/incidents", headers=second_citizen_auth["headers"])
    assert list_res2.status_code == 200
    items2 = list_res2.json()
    assert len(items2) == 1
    assert items2[0]["id"] == res2.json()["id"]

    # Citizen 1 cannot view Citizen 2's incident directly
    forbidden_res = await client.get(
        f"/incidents/{res2.json()['id']}",
        headers=citizen_auth["headers"],
    )
    assert forbidden_res.status_code == 403


@pytest.mark.asyncio
async def test_hero_views_all_open_incidents(
    client: AsyncClient,
    citizen_auth: dict,
    hero_auth: dict,
):
    # Create 3 incidents
    for i in range(1, 4):
        await client.post(
            "/incidents",
            json={
                "title": f"Incident {i}",
                "description": f"Emergency details {i}",
                "category": "Disaster" if i % 2 == 0 else "Crime",
                "severity": i + 1,
                "location": f"Sector {i}",
            },
            headers=citizen_auth["headers"],
        )

    # Hero lists incidents -> sees all 3 open incidents
    hero_list = await client.get("/incidents", headers=hero_auth["headers"])
    assert hero_list.status_code == 200
    items = hero_list.json()
    assert len(items) == 3


@pytest.mark.asyncio
async def test_orm_pagination_and_filtering(
    client: AsyncClient,
    citizen_auth: dict,
    hero_auth: dict,
):
    # Create incidents across categories and severities
    categories = ["Robbery", "Robbery", "Arson", "Robbery", "Assault"]
    severities = [1, 2, 3, 4, 5]

    for cat, sev in zip(categories, severities):
        await client.post(
            "/incidents",
            json={
                "title": f"{cat} incident level {sev}",
                "description": "Details here",
                "category": cat,
                "severity": sev,
                "location": "Queens",
            },
            headers=citizen_auth["headers"],
        )

    # 1. Test pagination: limit=2, page=1
    page1_res = await client.get(
        "/incidents?page=1&limit=2",
        headers=hero_auth["headers"],
    )
    assert page1_res.status_code == 200
    page1_items = page1_res.json()
    assert len(page1_items) == 2
    assert page1_res.headers.get("x-total-count") == "5"

    # page=2, limit=2
    page2_res = await client.get(
        "/incidents?page=2&limit=2",
        headers=hero_auth["headers"],
    )
    assert page2_res.status_code == 200
    page2_items = page2_res.json()
    assert len(page2_items) == 2
    assert page1_items[0]["id"] != page2_items[0]["id"]

    # 2. Filter by category
    filter_cat = await client.get(
        "/incidents?category=Arson",
        headers=hero_auth["headers"],
    )
    assert filter_cat.status_code == 200
    cat_items = filter_cat.json()
    assert len(cat_items) == 1
    assert cat_items[0]["category"] == "Arson"

    # 3. Filter by severity
    filter_sev = await client.get(
        "/incidents?severity=5",
        headers=hero_auth["headers"],
    )
    assert filter_sev.status_code == 200
    sev_items = filter_sev.json()
    assert len(sev_items) == 1
    assert sev_items[0]["severity"] == 5
