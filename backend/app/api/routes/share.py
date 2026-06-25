import base64
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import (
    Ability, BossAction, Encounter, Job, PartySlot, Plan, PlacedAbility
)
from app.schemas.schemas import (
    EncounterOut, EncounterSharePayload,
    ImportResult, PlanOut, PlanSharePayload, ShareCodeOut,
)
from app.api.routes.encounters import _load as _load_encounter
from app.api.routes.plans import _load_plan

router = APIRouter(prefix="/share", tags=["share"])


def _encode(payload: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode(code: str) -> dict:
    try:
        return json.loads(base64.urlsafe_b64decode(code.encode()).decode())
    except Exception:
        raise HTTPException(400, "Invalid share code")


# ── Plan export ───────────────────────────────────────────────────────────────

@router.get("/plan/{plan_id}", response_model=ShareCodeOut)
async def export_plan(plan_id: str, db: AsyncSession = Depends(get_db)):
    plan = await _load_plan(plan_id, db)

    # Export encounter share code if linked
    enc_code: str | None = None
    if plan.encounter_id:
        enc = await _load_encounter(plan.encounter_id, db)
        enc_payload = EncounterSharePayload(
            name=enc.name,
            duration=enc.duration,
            boss_actions=[
                {
                    "name": a.name,
                    "time_offset": a.time_offset,
                    "damage_type": a.damage_type,
                    "description": a.description,
                }
                for a in enc.boss_actions
            ],
        )
        enc_code = _encode(enc_payload.model_dump())

    payload = PlanSharePayload(
        name=plan.name,
        fight_duration=plan.fight_duration,
        prepull_offset=plan.prepull_offset,
        encounter_share_code=enc_code,
        party_slots=[
            {"slot_index": s.slot_index, "job_abbreviation": s.job.abbreviation}
            for s in plan.party_slots
        ],
        placements=[
            {
                "job_abbreviation": p.ability.job.abbreviation,
                "ability_name": p.ability.name,
                "time_offset": p.time_offset,
            }
            for p in plan.placements
        ],
    )
    return ShareCodeOut(code=_encode(payload.model_dump()))


@router.post("/plan/import", response_model=ImportResult)
async def import_plan(body: ShareCodeOut, db: AsyncSession = Depends(get_db)):
    data = _decode(body.code)
    if data.get("version", 1) != 1:
        raise HTTPException(400, "Unsupported share code version")

    payload = PlanSharePayload(**data)

    # Resolve encounter if present
    enc_id: str | None = None
    if payload.encounter_share_code:
        enc_data = _decode(payload.encounter_share_code)
        enc_payload = EncounterSharePayload(**enc_data)
        enc = Encounter(name=enc_payload.name, duration=enc_payload.duration, is_preset=False)
        db.add(enc)
        await db.flush()
        for a in enc_payload.boss_actions:
            db.add(BossAction(encounter_id=enc.id, **a))
        enc_id = enc.id

    # Resolve job abbreviations → IDs
    abbr_result = await db.execute(select(Job))
    jobs_by_abbr = {j.abbreviation: j for j in abbr_result.scalars().all()}

    plan = Plan(
        name=payload.name,
        encounter_id=enc_id,
        fight_duration=payload.fight_duration,
        prepull_offset=payload.prepull_offset,
    )
    db.add(plan)
    await db.flush()

    for slot in payload.party_slots:
        job = jobs_by_abbr.get(slot["job_abbreviation"])
        if job:
            db.add(PartySlot(plan_id=plan.id, slot_index=slot["slot_index"], job_id=job.id))

    # Build ability lookup: (job_abbr, ability_name) → ability
    abilities_result = await db.execute(
        select(Ability).options(selectinload(Ability.job))
    )
    ability_lookup: dict[tuple[str, str], Ability] = {}
    for ab in abilities_result.scalars().all():
        ability_lookup[(ab.job.abbreviation, ab.name)] = ab

    for p in payload.placements:
        ab = ability_lookup.get((p["job_abbreviation"], p["ability_name"]))
        if ab:
            db.add(PlacedAbility(
                plan_id=plan.id,
                ability_id=ab.id,
                time_offset=p["time_offset"],
            ))

    await db.commit()
    return ImportResult(id=plan.id, name=plan.name)


# ── Encounter export ──────────────────────────────────────────────────────────

@router.get("/encounter/{enc_id}", response_model=ShareCodeOut)
async def export_encounter(enc_id: str, db: AsyncSession = Depends(get_db)):
    enc = await _load_encounter(enc_id, db)
    payload = EncounterSharePayload(
        name=enc.name,
        duration=enc.duration,
        boss_actions=[
            {
                "name": a.name,
                "time_offset": a.time_offset,
                "damage_type": a.damage_type,
                "description": a.description,
            }
            for a in enc.boss_actions
        ],
    )
    return ShareCodeOut(code=_encode(payload.model_dump()))


@router.post("/encounter/import", response_model=ImportResult)
async def import_encounter(body: ShareCodeOut, db: AsyncSession = Depends(get_db)):
    data = _decode(body.code)
    payload = EncounterSharePayload(**data)

    enc = Encounter(name=payload.name, duration=payload.duration, is_preset=False)
    db.add(enc)
    await db.flush()

    for a in payload.boss_actions:
        db.add(BossAction(encounter_id=enc.id, **a))

    await db.commit()
    return ImportResult(id=enc.id, name=enc.name)
