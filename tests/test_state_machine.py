import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_strict_state_transition_flow_and_history_logging(
    client: AsyncClient,
    citizen_auth: dict,
    hero_auth: dict,
):
    """Test full valid lifecycle:
    REPORTED -> CLAIMED -> IN_PROGRESS -> RESOLVED.
    Verify that each transition is logged automatically into StatusHistory.
    """
    # 1. Citizen creates incident (Initial state: REPORTED)
    res = await client.post(
        "/incidents",
        json={
            "title": "Mysterio Hologram Illusion",
            "description": "Giant illusion terrorizing Brooklyn Bridge.",
            "category": "Public Disturbance",
            "severity": 3,
            "location": "Brooklyn Bridge",
        },
        headers=citizen_auth["headers"],
    )
    assert res.status_code == 201
    incident_id = res.json()["id"]
    assert res.json()["status"] == "REPORTED"

    # 2. Hero claims incident (Transition: REPORTED -> CLAIMED)
    claim_res = await client.patch(
        f"/incidents/{incident_id}/claim",
        headers=hero_auth["headers"],
    )
    assert claim_res.status_code == 200
    assert claim_res.json()["status"] == "CLAIMED"
    assert claim_res.json()["hero_id"] == hero_auth["user"]["id"]

    # 3. Hero moves to IN_PROGRESS (Transition: CLAIMED -> IN_PROGRESS)
    prog_res = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=hero_auth["headers"],
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["status"] == "IN_PROGRESS"

    # 4. Hero marks as RESOLVED (Transition: IN_PROGRESS -> RESOLVED)
    resolve_res = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "RESOLVED"},
        headers=hero_auth["headers"],
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"

    # 5. Verify StatusHistory audit trail
    history_res = await client.get(
        f"/incidents/{incident_id}/history",
        headers=hero_auth["headers"],
    )
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 3

    # Step 1 log: REPORTED -> CLAIMED
    assert history[0]["old_status"] == "REPORTED"
    assert history[0]["new_status"] == "CLAIMED"
    assert history[0]["changed_by"] == hero_auth["user"]["id"]
    assert history[0]["changed_at"] is not None

    # Step 2 log: CLAIMED -> IN_PROGRESS
    assert history[1]["old_status"] == "CLAIMED"
    assert history[1]["new_status"] == "IN_PROGRESS"
    assert history[1]["changed_by"] == hero_auth["user"]["id"]

    # Step 3 log: IN_PROGRESS -> RESOLVED
    assert history[2]["old_status"] == "IN_PROGRESS"
    assert history[2]["new_status"] == "RESOLVED"
    assert history[2]["changed_by"] == hero_auth["user"]["id"]


@pytest.mark.asyncio
async def test_invalid_jumps_rejected_with_400(
    client: AsyncClient,
    citizen_auth: dict,
    hero_auth: dict,
):
    """Test rejection of any invalid state jumps with 400 Bad Request:
    - REPORTED -> IN_PROGRESS (skip CLAIMED): 400
    - REPORTED -> RESOLVED (skip CLAIMED & IN_PROGRESS): 400
    - CLAIMED -> RESOLVED (skip IN_PROGRESS): 400
    - CLAIMED -> REPORTED (backward transition): 400
    - IN_PROGRESS -> CLAIMED (backward transition): 400
    - RESOLVED -> IN_PROGRESS (after resolved): 400
    """
    create_res = await client.post(
        "/incidents",
        json={
            "title": "Vulture Weapon Deal",
            "description": "Alien tech transaction near ferry terminal.",
            "category": "Arms Dealing",
            "severity": 4,
            "location": "Staten Island Ferry Terminal",
        },
        headers=citizen_auth["headers"],
    )
    incident_id = create_res.json()["id"]

    # 1. Invalid jump from REPORTED directly to IN_PROGRESS
    jump_in_prog = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=hero_auth["headers"],
    )
    assert jump_in_prog.status_code == 400
    assert "Invalid status transition" in jump_in_prog.json()["detail"]

    # 2. Invalid jump from REPORTED directly to RESOLVED
    jump_resolved = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "RESOLVED"},
        headers=hero_auth["headers"],
    )
    assert jump_resolved.status_code == 400

    # Valid claim to move to CLAIMED
    claim = await client.patch(
        f"/incidents/{incident_id}/claim",
        headers=hero_auth["headers"],
    )
    assert claim.status_code == 200

    # 3. Invalid jump from CLAIMED directly to RESOLVED (skipping IN_PROGRESS)
    jump_claim_to_res = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "RESOLVED"},
        headers=hero_auth["headers"],
    )
    assert jump_claim_to_res.status_code == 400

    # 4. Invalid backwards jump from CLAIMED to REPORTED
    backward_to_rep = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "REPORTED"},
        headers=hero_auth["headers"],
    )
    assert backward_to_rep.status_code == 400

    # Advance to IN_PROGRESS
    advance_prog = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=hero_auth["headers"],
    )
    assert advance_prog.status_code == 200

    # 5. Invalid backwards jump from IN_PROGRESS to CLAIMED
    backward_to_claim = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "CLAIMED"},
        headers=hero_auth["headers"],
    )
    assert backward_to_claim.status_code == 400

    # Advance to RESOLVED
    advance_res = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "RESOLVED"},
        headers=hero_auth["headers"],
    )
    assert advance_res.status_code == 200

    # 6. Attempting any transition once RESOLVED
    modify_resolved = await client.patch(
        f"/incidents/{incident_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=hero_auth["headers"],
    )
    assert modify_resolved.status_code == 400
