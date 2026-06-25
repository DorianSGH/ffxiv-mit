from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import Ability, Job
from app.schemas.schemas import (
    AbilityCreate,
    AbilityOut,
    AbilityUpdate,
    JobCreate,
    JobOut,
    JobSummary,
    JobUpdate,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobSummary])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).order_by(Job.name))
    return result.scalars().all()


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(body: JobCreate, db: AsyncSession = Depends(get_db)):
    job = Job(**body.model_dump())
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return await _load_job(job.id, db)


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    return await _load_job(job_id, db)


@router.patch("/{job_id}", response_model=JobOut)
async def update_job(job_id: str, body: JobUpdate, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(job, k, v)
    await db.commit()
    return await _load_job(job_id, db)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    await db.delete(job)
    await db.commit()


# ── Abilities sub-resource ────────────────────────────────────────────────────

@router.post("/{job_id}/abilities", response_model=AbilityOut, status_code=201)
async def add_ability(
    job_id: str, body: AbilityCreate, db: AsyncSession = Depends(get_db)
):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    ability = Ability(job_id=job_id, **body.model_dump())
    db.add(ability)
    await db.commit()
    await db.refresh(ability)
    return ability


@router.patch("/{job_id}/abilities/{ability_id}", response_model=AbilityOut)
async def update_ability(
    job_id: str,
    ability_id: str,
    body: AbilityUpdate,
    db: AsyncSession = Depends(get_db),
):
    ability = await db.get(Ability, ability_id)
    if not ability or ability.job_id != job_id:
        raise HTTPException(404, "Ability not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(ability, k, v)
    await db.commit()
    await db.refresh(ability)
    return ability


@router.delete(
    "/{job_id}/abilities/{ability_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_ability(
    job_id: str, ability_id: str, db: AsyncSession = Depends(get_db)
):
    ability = await db.get(Ability, ability_id)
    if not ability or ability.job_id != job_id:
        raise HTTPException(404, "Ability not found")
    await db.delete(ability)
    await db.commit()


# ── helpers ───────────────────────────────────────────────────────────────────

async def _load_job(job_id: str, db: AsyncSession) -> Job:
    result = await db.execute(
        select(Job).where(Job.id == job_id).options(selectinload(Job.abilities))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    return job
