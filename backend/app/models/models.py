import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    abbreviation: Mapped[str] = mapped_column(String(8), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#888888")
    # URL or path to a custom icon uploaded via admin
    icon_url: Mapped[str] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    abilities: Mapped[list["Ability"]] = relationship(
        "Ability", back_populates="job", cascade="all, delete-orphan"
    )


class Ability(Base):
    __tablename__ = "abilities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=False)
    cooldown: Mapped[float] = mapped_column(Float, nullable=False)
    ability_type: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(String(512), nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=True)
    icon_url: Mapped[str] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    job: Mapped["Job"] = relationship("Job", back_populates="abilities")
    placements: Mapped[list["PlacedAbility"]] = relationship(
        "PlacedAbility", back_populates="ability"
    )


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False, default=600)
    is_preset: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    boss_actions: Mapped[list["BossAction"]] = relationship(
        "BossAction", back_populates="encounter", cascade="all, delete-orphan",
        order_by="BossAction.time_offset"
    )
    plans: Mapped[list["Plan"]] = relationship("Plan", back_populates="encounter")


class BossAction(Base):
    __tablename__ = "boss_actions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    encounter_id: Mapped[str] = mapped_column(ForeignKey("encounters.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    time_offset: Mapped[float] = mapped_column(Float, nullable=False)
    damage_type: Mapped[str] = mapped_column(String(32), nullable=False, default="raidwide")
    description: Mapped[str] = mapped_column(String(512), nullable=True)

    encounter: Mapped["Encounter"] = relationship("Encounter", back_populates="boss_actions")


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    encounter_id: Mapped[str] = mapped_column(ForeignKey("encounters.id"), nullable=True)
    fight_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=600)
    prepull_offset: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    # Use Python-side default for updated_at to avoid async compat issues
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), server_onupdate=func.now()
    )

    encounter: Mapped["Encounter"] = relationship("Encounter", back_populates="plans")
    party_slots: Mapped[list["PartySlot"]] = relationship(
        "PartySlot", back_populates="plan", cascade="all, delete-orphan"
    )
    placements: Mapped[list["PlacedAbility"]] = relationship(
        "PlacedAbility", back_populates="plan", cascade="all, delete-orphan"
    )


class PartySlot(Base):
    __tablename__ = "party_slots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"), nullable=False)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    slot_index: Mapped[int] = mapped_column(Integer, nullable=False)

    plan: Mapped["Plan"] = relationship("Plan", back_populates="party_slots")
    job: Mapped["Job"] = relationship("Job")


class PlacedAbility(Base):
    __tablename__ = "placed_abilities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"), nullable=False)
    ability_id: Mapped[str] = mapped_column(ForeignKey("abilities.id"), nullable=False)
    time_offset: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    plan: Mapped["Plan"] = relationship("Plan", back_populates="placements")
    ability: Mapped["Ability"] = relationship("Ability", back_populates="placements")
