import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import BossAction, Encounter
from app.schemas.schemas import (
    ActImportRequest,
    BossActionIn,
    BossActionOut,
    BossActionUpdate,
    EncounterCreate,
    EncounterOut,
    EncounterSummary,
    EncounterUpdate,
)

router = APIRouter(prefix="/encounters", tags=["encounters"])


@router.get("", response_model=list[EncounterSummary])
async def list_encounters(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Encounter).options(selectinload(Encounter.boss_actions))
        .order_by(Encounter.is_preset.desc(), Encounter.name)
    )
    encounters = result.scalars().all()
    return [
        EncounterSummary(
            id=e.id,
            name=e.name,
            duration=e.duration,
            is_preset=e.is_preset,
            boss_action_count=len(e.boss_actions),
        )
        for e in encounters
    ]


@router.post("", response_model=EncounterOut, status_code=status.HTTP_201_CREATED)
async def create_encounter(body: EncounterCreate, db: AsyncSession = Depends(get_db)):
    enc = Encounter(name=body.name, duration=body.duration, is_preset=body.is_preset)
    db.add(enc)
    await db.flush()
    for a in body.boss_actions:
        db.add(BossAction(encounter_id=enc.id, **a.model_dump()))
    await db.commit()
    return await _load(enc.id, db)


@router.get("/{enc_id}", response_model=EncounterOut)
async def get_encounter(enc_id: str, db: AsyncSession = Depends(get_db)):
    return await _load(enc_id, db)


@router.patch("/{enc_id}", response_model=EncounterOut)
async def update_encounter(enc_id: str, body: EncounterUpdate, db: AsyncSession = Depends(get_db)):
    enc = await db.get(Encounter, enc_id)
    if not enc:
        raise HTTPException(404, "Encounter not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(enc, k, v)
    await db.commit()
    return await _load(enc_id, db)


@router.delete("/{enc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_encounter(enc_id: str, db: AsyncSession = Depends(get_db)):
    enc = await db.get(Encounter, enc_id)
    if not enc:
        raise HTTPException(404, "Encounter not found")
    await db.delete(enc)
    await db.commit()


# ── Boss actions sub-resource ─────────────────────────────────────────────────

@router.post("/{enc_id}/actions", response_model=BossActionOut, status_code=201)
async def add_action(enc_id: str, body: BossActionIn, db: AsyncSession = Depends(get_db)):
    enc = await db.get(Encounter, enc_id)
    if not enc:
        raise HTTPException(404, "Encounter not found")
    action = BossAction(encounter_id=enc_id, **body.model_dump())
    db.add(action)
    await db.commit()
    await db.refresh(action)
    return action


@router.patch("/{enc_id}/actions/{action_id}", response_model=BossActionOut)
async def update_action(
    enc_id: str, action_id: str, body: BossActionUpdate, db: AsyncSession = Depends(get_db)
):
    action = await db.get(BossAction, action_id)
    if not action or action.encounter_id != enc_id:
        raise HTTPException(404, "Action not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(action, k, v)
    await db.commit()
    await db.refresh(action)
    return action


@router.delete("/{enc_id}/actions/{action_id}", status_code=204)
async def delete_action(enc_id: str, action_id: str, db: AsyncSession = Depends(get_db)):
    action = await db.get(BossAction, action_id)
    if not action or action.encounter_id != enc_id:
        raise HTTPException(404, "Action not found")
    await db.delete(action)
    await db.commit()


# ── ACT log import ────────────────────────────────────────────────────────────

@router.post("/import/act", response_model=EncounterOut, status_code=201)
async def import_act_log(body: ActImportRequest, db: AsyncSession = Depends(get_db)):
    """
    Parse an ACT Network log and extract boss abilities as BossActions.
    Expects lines like:
      [12:34:56.789] 15:BOSSID:BossName:ActionID:ActionName:...
    or the simpler FFXIV ACT plugin format:
      12:34:56.789|15|...|BossName|ActionName|...
    """
    actions = _parse_act_log(body.log_text)
    if not actions:
        raise HTTPException(400, "No boss actions found in the log. Check the format.")

    enc = Encounter(name=body.encounter_name, duration=body.duration, is_preset=body.is_preset)
    db.add(enc)
    await db.flush()

    for a in actions:
        db.add(BossAction(encounter_id=enc.id, **a))

    await db.commit()
    return await _load(enc.id, db)


def _parse_act_log(text: str) -> list[dict]:
    """
    Supports two common ACT export formats:
    1. [HH:MM:SS.mmm] 15:...:BossName:...:AbilityName:...
    2. HH:MM:SS.mmm|15|...|ActorName|AbilityName|...
    Returns list of {name, time_offset, damage_type} dicts.
    """
    results: list[dict] = []
    origin_time: float | None = None

    # Format 1: bracket timestamp
    pat1 = re.compile(
        r'\[(\d{2}):(\d{2}):(\d{2})[\.\d]*\].*?15:[0-9A-Fa-f]+:([^:]+):[0-9A-Fa-f]+:([^:]+):'
    )
    # Format 2: pipe-delimited
    pat2 = re.compile(
        r'^(\d{2}):(\d{2}):(\d{2})[\.\d]*\|15\|[^|]*\|([^|]+)\|([^|]+)\|'
    )

    for line in text.splitlines():
        m = pat1.search(line) or pat2.match(line)
        if not m:
            continue
        h, mi, s, actor, ability = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        t = int(h) * 3600 + int(mi) * 60 + int(s)

        if origin_time is None:
            origin_time = t

        offset = t - origin_time

        # Skip player abilities (heuristic: actors with common job names)
        player_jobs = {"WAR","PLD","DRK","GNB","WHM","SCH","AST","SGE",
                       "MNK","DRG","NIN","SAM","RPR","VPR","BRD","MCH","DNC",
                       "BLM","SMN","RDM","PCT","LB"}
        if actor.upper() in player_jobs:
            continue

        # Classify damage type by ability name keywords
        name_lower = ability.lower()
        if any(k in name_lower for k in ("enrage", "terminal", "ultima")):
            damage_type = "enrage"
        elif any(k in name_lower for k in ("cleave", "buster", "slash", "sting", "bite")):
            damage_type = "tankbuster"
        else:
            damage_type = "raidwide"

        results.append({
            "name": ability,
            "time_offset": float(offset),
            "damage_type": damage_type,
            "description": f"Used by {actor}",
        })

    # Deduplicate same ability at same second
    seen: set[tuple] = set()
    unique = []
    for r in results:
        key = (r["name"], r["time_offset"])
        if key not in seen:
            seen.add(key)
            unique.append(r)

    return unique


async def _load(enc_id: str, db: AsyncSession) -> Encounter:
    result = await db.execute(
        select(Encounter).where(Encounter.id == enc_id)
        .options(selectinload(Encounter.boss_actions))
    )
    enc = result.scalar_one_or_none()
    if not enc:
        raise HTTPException(404, "Encounter not found")
    return enc
