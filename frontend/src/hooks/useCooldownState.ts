import { useMemo } from 'react'
import type { Ability, PlacedAbility } from '../types'

/**
 * Builds a map of ability_id → sorted cooldown windows [start, end].
 * A window [start, end] means the ability was used at `start` and is
 * unavailable until `end` (start + cooldown).
 */
export function useCooldownState(placements: PlacedAbility[]): Map<string, [number, number][]> {
  return useMemo(() => {
    const map = new Map<string, [number, number][]>()
    for (const p of placements) {
      const windows = map.get(p.ability_id) ?? []
      windows.push([p.time_offset, p.time_offset + p.ability.cooldown])
      map.set(p.ability_id, windows)
    }
    for (const [id, windows] of map.entries()) {
      map.set(id, windows.sort((a, b) => a[0] - b[0]))
    }
    return map
  }, [placements])
}

/**
 * Returns whether an ability can be placed at `atTime` given existing windows.
 *
 * Two conditions must both pass:
 *   1. `atTime` must not fall inside any existing cooldown window
 *      (i.e. the ability isn't still on CD from a previous use)
 *   2. The new cooldown window [atTime, atTime+cooldown] must not overlap
 *      the START of any existing window
 *      (i.e. we can't use it right before another use that would be pre-empted)
 */
export function canPlaceAt(
  ability: Ability,
  windows: [number, number][] | undefined,
  atTime: number,
): boolean {
  if (!windows || windows.length === 0) return true
  for (const [start, end] of windows) {
    // Condition 1: atTime is inside an existing CD window
    if (atTime >= start && atTime < end) return false
    // Condition 2: new CD window would overlap an existing use
    // i.e. atTime < existingStart < atTime + cooldown
    if (atTime < start && atTime + ability.cooldown > start) return false
  }
  return true
}

/**
 * Returns seconds remaining on cooldown at `atTime` (for display purposes).
 * Uses the first window that blocks placement.
 */
export function getCooldownRemaining(
  ability: Ability,
  windows: [number, number][] | undefined,
  atTime: number = 0,
): number {
  if (!windows || windows.length === 0) return 0
  for (const [start, end] of windows) {
    if (atTime >= start && atTime < end) return end - atTime
    if (atTime < start && atTime + ability.cooldown > start) return start - atTime
  }
  return 0
}

export function isAbilityReady(
  ability: Ability,
  windows: [number, number][] | undefined,
  atTime: number,
): boolean {
  return canPlaceAt(ability, windows, atTime)
}

/**
 * For the sidebar: returns the next time the ability will be ready
 * after its most recent use.
 */
export function nextReadyTime(
  windows: [number, number][] | undefined,
): number | null {
  if (!windows || windows.length === 0) return null
  const last = windows[windows.length - 1]
  return last[1]
}
