import pytest


@pytest.mark.asyncio
async def test_create_job(client):
    res = await client.post(
        "/api/jobs",
        json={"name": "White Mage", "abbreviation": "WHM", "role": "healer", "color": "#ffffff"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "White Mage"
    assert data["abbreviation"] == "WHM"
    assert data["abilities"] == []


@pytest.mark.asyncio
async def test_list_jobs(client):
    await client.post(
        "/api/jobs",
        json={"name": "Scholar", "abbreviation": "SCH", "role": "healer", "color": "#8888ff"},
    )
    res = await client.get("/api/jobs")
    assert res.status_code == 200
    names = [j["name"] for j in res.json()]
    assert "Scholar" in names


@pytest.mark.asyncio
async def test_add_ability(client):
    job_res = await client.post(
        "/api/jobs",
        json={"name": "Paladin", "abbreviation": "PLD", "role": "tank", "color": "#aaddff"},
    )
    job_id = job_res.json()["id"]

    res = await client.post(
        f"/api/jobs/{job_id}/abilities",
        json={
            "name": "Divine Veil",
            "duration": 30.0,
            "cooldown": 90.0,
            "ability_type": "shield",
            "description": "Applies a shield to party members.",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Divine Veil"
    assert data["cooldown"] == 90.0


@pytest.mark.asyncio
async def test_delete_job(client):
    job_res = await client.post(
        "/api/jobs",
        json={"name": "Warrior", "abbreviation": "WAR", "role": "tank", "color": "#cc3300"},
    )
    job_id = job_res.json()["id"]
    del_res = await client.delete(f"/api/jobs/{job_id}")
    assert del_res.status_code == 204
    get_res = await client.get(f"/api/jobs/{job_id}")
    assert get_res.status_code == 404
