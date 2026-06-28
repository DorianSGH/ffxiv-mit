export interface ThemeColors {
  // UI chrome
  surface: string
  panel: string
  border: string
  accent: string
  // Roles
  tank: string
  healer: string
  dps: string
  // Ability types
  mit: string
  shield: string
  regen: string
  invuln: string
  // Timeline elements
  cdBar: string   // cooldown ghost tint
  durBar: string  // duration bar tint
  label: string   // ability name text
}

export const DEFAULT_THEME: ThemeColors = {
  surface: '#1a1a2e',
  panel:   '#16213e',
  border:  '#0f3460',
  accent:  '#e94560',
  tank:    '#4a9eff',
  healer:  '#57c875',
  dps:     '#ff6b6b',
  mit:     '#6b7cff',
  shield:  '#f5c518',
  regen:   '#57c875',
  invuln:  '#ff9f43',
  cdBar:   '#ffffff',
  durBar:  '#ffffff',
  label:   '#ffffff',
}

const STORAGE_KEY = 'xiv-mit-theme'

export function loadTheme(): ThemeColors {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_THEME, ...JSON.parse(stored) }
  } catch {}
  return { ...DEFAULT_THEME }
}

export function saveTheme(theme: ThemeColors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
}

export function applyTheme(theme: ThemeColors) {
  const root = document.documentElement
  root.style.setProperty('--color-surface', theme.surface)
  root.style.setProperty('--color-panel',   theme.panel)
  root.style.setProperty('--color-border',  theme.border)
  root.style.setProperty('--color-accent',  theme.accent)
  root.style.setProperty('--color-tank',    theme.tank)
  root.style.setProperty('--color-healer',  theme.healer)
  root.style.setProperty('--color-dps',     theme.dps)
  root.style.setProperty('--color-mit',     theme.mit)
  root.style.setProperty('--color-shield',  theme.shield)
  root.style.setProperty('--color-regen',   theme.regen)
  root.style.setProperty('--color-invuln',  theme.invuln)
  root.style.setProperty('--color-cd-bar',  theme.cdBar)
  root.style.setProperty('--color-dur-bar', theme.durBar)
  root.style.setProperty('--color-label',   theme.label)
}

/** Convert hex to [h, s, l] (0-360, 0-100, 0-100) */
export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

/** Convert [h, s, l] back to hex */
export function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100, ll = l / 100
  const a = sl * Math.min(ll, 1 - ll)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
