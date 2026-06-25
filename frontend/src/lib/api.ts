import type {
  Ability, BossAction, Encounter, EncounterSummary,
  Job, JobSummary, PartySlot, Plan, PlacedAbility, PlanSummary
} from '../types'

const BASE = '/api'

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  jobs: {
    list: () => req<JobSummary[]>('GET', '/jobs'),
    get: (id: string) => req<Job>('GET', `/jobs/${id}`),
    create: (body: { name: string; abbreviation: string; role: string; color: string; icon_url?: string }) =>
      req<Job>('POST', '/jobs', body),
    update: (id: string, body: Partial<{ name: string; abbreviation: string; role: string; color: string; icon_url?: string }>) =>
      req<Job>('PATCH', `/jobs/${id}`, body),
    delete: (id: string) => req<void>('DELETE', `/jobs/${id}`),
    abilities: {
      create: (jobId: string, body: {
        name: string; duration: number; cooldown: number
        ability_type: string; description?: string; color?: string; icon_url?: string
      }) => req<Ability>('POST', `/jobs/${jobId}/abilities`, body),
      update: (jobId: string, abilityId: string, body: Partial<{
        name: string; duration: number; cooldown: number
        ability_type: string; description: string; color?: string; icon_url?: string
      }>) => req<Ability>('PATCH', `/jobs/${jobId}/abilities/${abilityId}`, body),
      delete: (jobId: string, abilityId: string) =>
        req<void>('DELETE', `/jobs/${jobId}/abilities/${abilityId}`),
    },
  },

  encounters: {
    list: () => req<EncounterSummary[]>('GET', '/encounters'),
    get: (id: string) => req<Encounter>('GET', `/encounters/${id}`),
    create: (body: { name: string; duration: number; is_preset: boolean }) =>
      req<Encounter>('POST', '/encounters', body),
    update: (id: string, body: Partial<{ name: string; duration: number; is_preset: boolean }>) =>
      req<Encounter>('PATCH', `/encounters/${id}`, body),
    delete: (id: string) => req<void>('DELETE', `/encounters/${id}`),
    actions: {
      add: (encId: string, body: { name: string; time_offset: number; damage_type: string; description?: string }) =>
        req<BossAction>('POST', `/encounters/${encId}/actions`, body),
      update: (encId: string, actionId: string, body: Partial<{ name: string; time_offset: number; damage_type: string; description: string }>) =>
        req<BossAction>('PATCH', `/encounters/${encId}/actions/${actionId}`, body),
      delete: (encId: string, actionId: string) =>
        req<void>('DELETE', `/encounters/${encId}/actions/${actionId}`),
    },
    importAct: (body: { log_text: string; encounter_name: string; duration: number; is_preset: boolean }) =>
      req<Encounter>('POST', '/encounters/import/act', body),
  },

  plans: {
    list: () => req<PlanSummary[]>('GET', '/plans'),
    get: (id: string) => req<Plan>('GET', `/plans/${id}`),
    create: (body: {
      name: string; encounter_id?: string; fight_duration: number
      prepull_offset: number; party_slots: { slot_index: number; job_id: string }[]
    }) => req<Plan>('POST', '/plans', body),
    update: (id: string, body: Partial<{ name: string; encounter_id: string; fight_duration: number; prepull_offset: number }>) =>
      req<Plan>('PATCH', `/plans/${id}`, body),
    delete: (id: string) => req<void>('DELETE', `/plans/${id}`),
    party: {
      set: (planId: string, slots: { slot_index: number; job_id: string }[]) =>
        req<PartySlot[]>('PUT', `/plans/${planId}/party`, slots),
    },
    placements: {
      add: (planId: string, body: { ability_id: string; time_offset: number }) =>
        req<PlacedAbility>('POST', `/plans/${planId}/placements`, body),
      move: (planId: string, placementId: string, body: { ability_id: string; time_offset: number }) =>
        req<PlacedAbility>('PATCH', `/plans/${planId}/placements/${placementId}`, body),
      remove: (planId: string, placementId: string) =>
        req<void>('DELETE', `/plans/${planId}/placements/${placementId}`),
    },
  },

  share: {
    exportPlan: (planId: string) => req<{ code: string }>('GET', `/share/plan/${planId}`),
    importPlan: (code: string) => req<{ id: string; name: string }>('POST', '/share/plan/import', { code }),
    exportEncounter: (encId: string) => req<{ code: string }>('GET', `/share/encounter/${encId}`),
    importEncounter: (code: string) => req<{ id: string; name: string }>('POST', '/share/encounter/import', { code }),
  },
}
