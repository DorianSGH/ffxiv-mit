from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Ability ───────────────────────────────────────────────────────────────────

class AbilityBase(BaseModel):
    name: str
    duration: float = Field(gt=0)
    cooldown: float = Field(gt=0)
    ability_type: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon_url: Optional[str] = None


class AbilityCreate(AbilityBase):
    pass


class AbilityUpdate(BaseModel):
    name: Optional[str] = None
    duration: Optional[float] = None
    cooldown: Optional[float] = None
    ability_type: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon_url: Optional[str] = None


class AbilityOut(AbilityBase):
    id: str
    job_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Job ───────────────────────────────────────────────────────────────────────

class JobBase(BaseModel):
    name: str
    abbreviation: str
    role: str
    color: str = "#888888"
    icon_url: Optional[str] = None


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    name: Optional[str] = None
    abbreviation: Optional[str] = None
    role: Optional[str] = None
    color: Optional[str] = None
    icon_url: Optional[str] = None


class JobOut(JobBase):
    id: str
    created_at: datetime
    abilities: list[AbilityOut] = []

    model_config = {"from_attributes": True}


class JobSummary(JobBase):
    id: str

    model_config = {"from_attributes": True}


# ── Encounter / BossAction ────────────────────────────────────────────────────

class BossActionIn(BaseModel):
    name: str
    time_offset: float = Field(ge=0)
    damage_type: str = "raidwide"
    description: Optional[str] = None


class BossActionUpdate(BaseModel):
    name: Optional[str] = None
    time_offset: Optional[float] = None
    damage_type: Optional[str] = None
    description: Optional[str] = None


class BossActionOut(BossActionIn):
    id: str

    model_config = {"from_attributes": True}


class EncounterCreate(BaseModel):
    name: str
    duration: int = 600
    is_preset: bool = False
    boss_actions: list[BossActionIn] = []


class EncounterUpdate(BaseModel):
    name: Optional[str] = None
    duration: Optional[int] = None
    is_preset: Optional[bool] = None


class EncounterOut(BaseModel):
    id: str
    name: str
    duration: int
    is_preset: bool
    created_at: datetime
    boss_actions: list[BossActionOut] = []

    model_config = {"from_attributes": True}


class EncounterSummary(BaseModel):
    id: str
    name: str
    duration: int
    is_preset: bool
    boss_action_count: int = 0

    model_config = {"from_attributes": True}


class ActImportRequest(BaseModel):
    log_text: str
    encounter_name: str
    duration: int = 600
    is_preset: bool = False


# ── Plan / Party ──────────────────────────────────────────────────────────────

class PartySlotIn(BaseModel):
    slot_index: int = Field(ge=0, le=7)
    job_id: str


class PartySlotOut(PartySlotIn):
    id: str
    job: JobSummary

    model_config = {"from_attributes": True}


class PlacedAbilityIn(BaseModel):
    ability_id: str
    time_offset: float


class PlacedAbilityOut(PlacedAbilityIn):
    id: str
    ability: AbilityOut
    created_at: datetime

    model_config = {"from_attributes": True}


class PlanCreate(BaseModel):
    name: str
    encounter_id: Optional[str] = None
    fight_duration: int = 600
    prepull_offset: int = Field(default=0, ge=0, le=30)
    party_slots: list[PartySlotIn] = []


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    encounter_id: Optional[str] = None
    fight_duration: Optional[int] = None
    prepull_offset: Optional[int] = None


class PlanOut(BaseModel):
    id: str
    name: str
    encounter_id: Optional[str]
    encounter: Optional[EncounterOut]
    fight_duration: int
    prepull_offset: int
    created_at: datetime
    updated_at: datetime
    party_slots: list[PartySlotOut] = []
    placements: list[PlacedAbilityOut] = []

    model_config = {"from_attributes": True}


class PlanSummary(BaseModel):
    id: str
    name: str
    encounter_id: Optional[str]
    fight_duration: int
    prepull_offset: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Share codes ───────────────────────────────────────────────────────────────

class PlanSharePayload(BaseModel):
    version: int = 1
    name: str
    fight_duration: int
    prepull_offset: int
    encounter_share_code: Optional[str] = None
    party_slots: list[dict] = []
    placements: list[dict] = []


class EncounterSharePayload(BaseModel):
    version: int = 1
    name: str
    duration: int
    boss_actions: list[dict] = []


class ShareCodeOut(BaseModel):
    code: str


class ImportResult(BaseModel):
    id: str
    name: str
