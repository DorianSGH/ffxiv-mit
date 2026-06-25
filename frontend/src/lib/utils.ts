import type { Role, AbilityType, DamageType } from '../types'

export const ROLE_COLORS: Record<Role, string> = {
  tank:   '#4a9eff',
  healer: '#57c875',
  dps:    '#ff6b6b',
}

export const ABILITY_TYPE_COLORS: Record<AbilityType, string> = {
  mitigation: '#6b7cff',
  shield:     '#f5c518',
  regen:      '#57c875',
  invuln:     '#ff9f43',
}

export const ABILITY_TYPE_LABELS: Record<AbilityType, string> = {
  mitigation: 'Mitigation',
  shield:     'Shield',
  regen:      'Regen',
  invuln:     'Invulnerability',
}

export const DAMAGE_TYPE_COLORS: Record<DamageType, string> = {
  raidwide:   '#e94560',
  tankbuster: '#ff9f43',
  enrage:     '#cc44ff',
  other:      '#888888',
}

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  raidwide:   'Raidwide',
  tankbuster: 'Tankbuster',
  enrage:     'Enrage',
  other:      'Other',
}

export const ROLE_ORDER: Role[] = ['tank', 'healer', 'dps']

export function roleColor(role: Role) {
  return ROLE_COLORS[role] ?? '#888'
}

export function formatTime(seconds: number) {
  const neg = seconds < 0
  const abs = Math.abs(seconds)
  const m = Math.floor(abs / 60)
  const s = Math.floor(abs % 60)
  return `${neg ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`
}
