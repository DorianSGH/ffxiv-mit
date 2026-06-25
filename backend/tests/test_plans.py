import pytest


async def _make_job(client, name, abbr, role):
    res = await client.post(
        "/api/jobs",
        json={"name": name, "abbreviation": abbr, "role": role, "color": "#888888"},
    )
    return res.json()["id"]


@pytest.mark.asyncio
async def test_create_plan(client):
    whm = await _make_job(client, "White Mage2", "WHM2", "healer")
    res = await client.post(
        "/api/plans",
        json={
            "name": "P8S Test",
            "encounter_name": "Abyssos P8S",
            "fight_duration": 720,
            "party_slots": [{"slot_index": 0, "job_id": whm}],
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "P8S Test"
    assert len(data["party_slots"]) == 1
    assert data["party_slots"][0]["job"]["abbreviation"] == "WHM2"


@pytest.mark.asyncio
async def test_place_and_remove_ability(client):
    pld = await _make_job(client, "Paladin2", "PLD2", "tank")
    ability_res = await client.post(
        f"/api/jobs/{pld}/abilities",
        json={"name": "Passage of Arms", "duration": 18.0, "cooldown": 120.0, "ability_type": "mitigation"},
    )
    ability_id = ability_res.json()["id"]

    plan_res = await client.post(
        "/api/plans",
        json={"name": "FRU Test", "fight_duration": 600, "party_slots": [{"slot_index": 0, "job_id": pld}]},
    )
    plan_id = plan_res.json()["id"]

    place_res = await client.post(
        f"/api/plans/{plan_id}/placements",
        json={"ability_id": ability_id, "time_offset": 45.0},
    )
    assert place_res.status_code == 201
    placement_id = place_res.json()["id"]

    del_res = await client.delete(f"/api/plans/{plan_id}/placements/{placement_id}")
    assert del_res.status_code == 204

    plan_res2 = await client.get(f"/api/plans/{plan_id}")
    assert plan_res2.json()["placements"] == []
