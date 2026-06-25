from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import Ability, BossAction, Encounter, Job, PartySlot, Plan, PlacedAbility
from app.schemas.schemas import (
    PartySlotIn, PartySlotOut,
    PlacedAbilityIn, PlacedAbilityOut,
    PlanCreate, PlanOut, PlanSummary, PlanUpdate,
)

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=list[PlanSummary])
async def list_plans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).order_by(Plan.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
async def create_plan(body: PlanCreate, db: AsyncSession = Depends(get_db)):
    if body.encounter_id:
        enc = await db.get(Encounter, body.encounter_id)
        if not enc:
            raise HTTPException(400, "Encounter not found")

    plan = Plan(
        name=body.name,
        encounter_id=body.encounter_id,
        fight_duration=body.fight_duration,
        prepull_offset=body.prepull_offset,
    )
    db.add(plan)
    await db.flush()

    for slot in body.party_slots:
        job = await db.get(Job, slot.job_id)
        if not job:
            raise HTTPException(400, f"Job {slot.job_id} not found")
        db.add(PartySlot(plan_id=plan.id, **slot.model_dump()))

    await db.commit()
    return await _load_plan(plan.id, db)


@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(plan_id: str, db: AsyncSession = Depends(get_db)):
    return await _load_plan(plan_id, db)


@router.patch("/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: str, body: PlanUpdate, db: AsyncSession = Depends(get_db)):
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(plan, k, v)
    await db.commit()
    return await _load_plan(plan_id, db)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(plan_id: str, db: AsyncSession = Depends(get_db)):
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    await db.delete(plan)
    await db.commit()


# ── Party ─────────────────────────────────────────────────────────────────────

@router.put("/{plan_id}/party", response_model=list[PartySlotOut])
async def set_party(
    plan_id: str, slots: list[PartySlotIn], db: AsyncSession = Depends(get_db)
):
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")

    existing = await db.execute(select(PartySlot).where(PartySlot.plan_id == plan_id))
    for s in existing.scalars():
        await db.delete(s)

    for slot in slots:
        job = await db.get(Job, slot.job_id)
        if not job:
            raise HTTPException(400, f"Job {slot.job_id} not found")
        db.add(PartySlot(plan_id=plan_id, **slot.model_dump()))

    await db.commit()
    result = await db.execute(
        select(PartySlot)
        .where(PartySlot.plan_id == plan_id)
        .options(selectinload(PartySlot.job))
        .order_by(PartySlot.slot_index)
    )
    return result.scalars().all()


# ── Placements ────────────────────────────────────────────────────────────────

@router.post("/{plan_id}/placements", response_model=PlacedAbilityOut, status_code=201)
async def place_ability(
    plan_id: str, body: PlacedAbilityIn, db: AsyncSession = Depends(get_db)
):
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    ability = await db.get(Ability, body.ability_id)
    if not ability:
        raise HTTPException(404, "Ability not found")

    # Validate prepull bounds
    min_offset = -plan.prepull_offset
    if body.time_offset < min_offset:
        raise HTTPException(400, f"time_offset cannot be less than -{plan.prepull_offset}")

    pa = PlacedAbility(plan_id=plan_id, **body.model_dump())
    db.add(pa)
    await db.commit()
    await db.refresh(pa)
    return await _load_placement(pa.id, db)


@router.patch("/{plan_id}/placements/{placement_id}", response_model=PlacedAbilityOut)
async def move_placement(
    plan_id: str, placement_id: str, body: PlacedAbilityIn,
    db: AsyncSession = Depends(get_db),
):
    pa = await db.get(PlacedAbility, placement_id)
    if not pa or pa.plan_id != plan_id:
        raise HTTPException(404, "Placement not found")
    pa.time_offset = body.time_offset
    await db.commit()
    return await _load_placement(pa.id, db)


@router.delete("/{plan_id}/placements/{placement_id}", status_code=204)
async def remove_placement(
    plan_id: str, placement_id: str, db: AsyncSession = Depends(get_db)
):
    pa = await db.get(PlacedAbility, placement_id)
    if not pa or pa.plan_id != plan_id:
        raise HTTPException(404, "Placement not found")
    await db.delete(pa)
    await db.commit()


# ── helpers ───────────────────────────────────────────────────────────────────

async def _load_plan(plan_id: str, db: AsyncSession) -> Plan:
    result = await db.execute(
        select(Plan)
        .where(Plan.id == plan_id)
        .options(
            selectinload(Plan.encounter).selectinload(Encounter.boss_actions),
            selectinload(Plan.party_slots).selectinload(PartySlot.job),
            selectinload(Plan.placements)
            .selectinload(PlacedAbility.ability)
            .selectinload(Ability.job),
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, "Plan not found")
    return plan


async def _load_placement(placement_id: str, db: AsyncSession) -> PlacedAbility:
    result = await db.execute(
        select(PlacedAbility)
        .where(PlacedAbility.id == placement_id)
        .options(selectinload(PlacedAbility.ability).selectinload(Ability.job))
    )
    return result.scalar_one()
