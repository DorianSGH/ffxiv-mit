export type Role = 'tank' | 'healer' | 'dps'
export type AbilityType = 'mitigation' | 'shield' | 'regen' | 'invuln'
export type DamageType = 'raidwide' | 'tankbuster' | 'enrage' | 'other'

export interface Ability {
  id: string
  job_id: string
  name: string
  duration: number
  cooldown: number
  ability_type: AbilityType
  description?: string
  color?: string
  icon_url?: string
  created_at: string
}

export interface Job {
  id: string
  name: string
  abbreviation: string
  role: Role
  color: string
  icon_url?: string
  created_at: string
  abilities: Ability[]
}

export interface JobSummary {
  id: string
  name: string
  abbreviation: string
  role: Role
  color: string
  icon_url?: string
}

export interface BossAction {
  id: string
  name: string
  time_offset: number
  damage_type: DamageType
  description?: string
}

export interface Encounter {
  id: string
  name: string
  duration: number
  is_preset: boolean
  created_at: string
  boss_actions: BossAction[]
}

export interface EncounterSummary {
  id: string
  name: string
  duration: number
  is_preset: boolean
  boss_action_count: number
}

export interface PartySlot {
  id: string
  slot_index: number
  job_id: string
  job: JobSummary
}

export interface PlacedAbility {
  id: string
  ability_id: string
  time_offset: number
  ability: Ability & { job: JobSummary }
  created_at: string
}

export interface Plan {
  id: string
  name: string
  encounter_id?: string
  encounter?: Encounter
  fight_duration: number
  prepull_offset: number
  created_at: string
  updated_at: string
  party_slots: PartySlot[]
  placements: PlacedAbility[]
}

export interface PlanSummary {
  id: string
  name: string
  encounter_id?: string
  fight_duration: number
  prepull_offset: number
  created_at: string
}
