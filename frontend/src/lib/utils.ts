import type { Role, AbilityType, DamageType } from '../types'

export const ROLE_COLORS: Record<Role, string> = {
  tank:   'var(--color-tank)',
  healer: 'var(--color-healer)',
  dps:    'var(--color-dps)',
}

// These return CSS variable references so they update live with theme changes.
// For inline styles, use getComputedStyle to resolve the actual value,
// or pass the var() string directly — modern browsers handle it fine.
export const ABILITY_TYPE_COLORS: Record<AbilityType, string> = {
  mitigation: 'var(--color-mit)',
  shield:     'var(--color-shield)',
  regen:      'var(--color-regen)',
  invuln:     'var(--color-invuln)',
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
