import { useMemo } from 'react'
import type { Ability, PlacedAbility } from '../types'

/**
 * Builds a map of ability_id → sorted cooldown windows [start, end].
 * A window means the ability is unavailable during that interval.
 */
export function useCooldownState(placements: PlacedAbility[]): Map<string, [number, number][]> {
  return useMemo(() => {
    const map = new Map<string, [number, number][]>()
    for (const p of placements) {
      const windows = map.get(p.ability_id) ?? []
      // Cooldown starts when the ability is used, ends cooldown seconds later
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
 * Returns seconds remaining on cooldown for an ability at a given time.
 * 0 means ready. Also checks that the ability fits within fight duration.
 */
export function getCooldownRemaining(
  _ability: Ability,
  windows: [number, number][] | undefined,
  atTime: number = 0,
): number {
  if (!windows) return 0
  for (const [start, end] of windows) {
    // If our proposed placement time falls inside an existing cooldown window
    if (atTime >= start && atTime < end) {
      return end - atTime
    }
  }
  return 0
}

/**
 * Returns true if ability can be placed at atTime without overlapping any
 * existing cooldown window.
 */
export function isAbilityReady(
  ability: Ability,
  windows: [number, number][] | undefined,
  atTime: number,
): boolean {
  return getCooldownRemaining(ability, windows, atTime) <= 0
}

/**
 * For the sidebar: returns the next time the ability will be ready
 * after its most recent use. Used to show a global "ready at X:XX" hint.
 */
export function nextReadyTime(
  windows: [number, number][] | undefined,
): number | null {
  if (!windows || windows.length === 0) return null
  // Find the last window and return when it ends
  const last = windows[windows.length - 1]
  return last[1]
}
