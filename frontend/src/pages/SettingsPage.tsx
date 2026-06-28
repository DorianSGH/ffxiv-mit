import { useEffect, useState } from 'react'
import { ThemeColors, DEFAULT_THEME, loadTheme, saveTheme, applyTheme, hexToHsl, hslToHex } from '../lib/theme'

// ── HSL slider ───────────────────────────────────────────────────────────────

function HslSlider({ value, onChange, label }: { value: string; onChange: (h: string) => void; label: string }) {
  const [h, s, l] = hexToHsl(value)
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-lg border border-white/20 cursor-pointer" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-300">{label}</span>
          <span className="text-[10px] font-mono text-gray-500">{value.toUpperCase()}</span>
        </div>
        {/* Hue */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-3">H</span>
          <div className="relative flex-1 h-3 rounded-full overflow-hidden"
            style={{ background: `linear-gradient(to right,${[0,30,60,90,120,150,180,210,240,270,300,330,360].map(hv=>hslToHex(hv,80,55)).join(',')})` }}>
            <input type="range" min={0} max={360} value={h}
              onChange={e => onChange(hslToHex(Number(e.target.value), s, l))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="absolute top-0 bottom-0 w-2 -translate-x-1/2 rounded-full border-2 border-white shadow pointer-events-none"
              style={{ left: `${(h/360)*100}%`, backgroundColor: value }} />
          </div>
          <span className="text-[10px] font-mono text-gray-600 w-8 text-right">{h}°</span>
        </div>
        {/* Saturation */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-3">S</span>
          <div className="relative flex-1 h-3 rounded-full overflow-hidden"
            style={{ background: `linear-gradient(to right,${hslToHex(h,0,l)},${hslToHex(h,100,l)})` }}>
            <input type="range" min={0} max={100} value={s}
              onChange={e => onChange(hslToHex(h, Number(e.target.value), l))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="absolute top-0 bottom-0 w-2 -translate-x-1/2 rounded-full border-2 border-white shadow pointer-events-none"
              style={{ left: `${s}%`, backgroundColor: value }} />
          </div>
          <span className="text-[10px] font-mono text-gray-600 w-8 text-right">{s}%</span>
        </div>
        {/* Lightness */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-3">L</span>
          <div className="relative flex-1 h-3 rounded-full overflow-hidden"
            style={{ background: `linear-gradient(to right,#000,${hslToHex(h,s,50)},#fff)` }}>
            <input type="range" min={0} max={100} value={l}
              onChange={e => onChange(hslToHex(h, s, Number(e.target.value)))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="absolute top-0 bottom-0 w-2 -translate-x-1/2 rounded-full border-2 border-white shadow pointer-events-none"
              style={{ left: `${l}%`, backgroundColor: value }} />
          </div>
          <span className="text-[10px] font-mono text-gray-600 w-8 text-right">{l}%</span>
        </div>
      </div>
    </div>
  )
}

// ── Previews ──────────────────────────────────────────────────────────────────

function ChromePreview({ t }: { t: ThemeColors }) {
  return (
    <div className="rounded-xl border overflow-hidden text-xs" style={{ backgroundColor: t.panel, borderColor: t.border }}>
      {/* Mini nav */}
      <div className="flex items-center gap-3 px-3 py-2 border-b" style={{ backgroundColor: t.panel, borderColor: t.border }}>
        <span className="font-bold text-[10px]" style={{ color: t.accent }}>XIV Mit</span>
        <span className="text-[10px]" style={{ color: '#aaa' }}>Plans</span>
        <span className="text-[10px]" style={{ color: '#aaa' }}>Admin</span>
      </div>
      {/* Mini content */}
      <div className="p-3 flex flex-col gap-2" style={{ backgroundColor: t.surface }}>
        <div className="rounded-lg p-2 border flex items-center justify-between"
          style={{ backgroundColor: t.panel, borderColor: t.border }}>
          <span style={{ color: '#ddd' }}>FRU Week 1</span>
          <span className="text-[10px]" style={{ color: '#777' }}>20:00 fight</span>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded text-[10px] font-medium text-white" style={{ backgroundColor: t.accent }}>
            + New Plan
          </button>
          <button className="px-3 py-1 rounded text-[10px]" style={{ border: `1px solid ${t.border}`, color: '#aaa' }}>
            Import
          </button>
        </div>
      </div>
    </div>
  )
}

function RolePreview({ t }: { t: ThemeColors }) {
  const roles = [
    { label: 'PLD', role: 'Tank', color: t.tank },
    { label: 'WHM', role: 'Healer', color: t.healer },
    { label: 'SAM', role: 'DPS', color: t.dps },
  ]
  return (
    <div className="flex flex-col gap-2">
      {roles.map(r => (
        <div key={r.label} className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ backgroundColor: `${r.color}18`, border: `1px solid ${r.color}55` }}>
          <div className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: `${r.color}33`, color: r.color }}>
            {r.label}
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: r.color }}>{r.label}</div>
            <div className="text-[9px] text-gray-500">{r.role}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AbilityTypePreview({ t }: { t: ThemeColors }) {
  const types = [
    { label: 'Shake It Off', type: 'Shield', color: t.shield, dur: 15, cd: 90 },
    { label: 'Dark Missionary', type: 'Mitigation', color: t.mit, dur: 15, cd: 90 },
    { label: 'Asylum', type: 'Regen', color: t.regen, dur: 24, cd: 90 },
    { label: 'Holmgang', type: 'Invuln', color: t.invuln, dur: 10, cd: 240 },
  ]
  return (
    <div className="flex flex-col gap-2">
      {types.map(a => (
        <div key={a.label} className="flex items-center gap-2 rounded-md px-2 py-1.5 border"
          style={{ backgroundColor: `${a.color}18`, borderColor: a.color }}>
          <div className="w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${a.color}33`, color: a.color }}>
            {a.label.slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: a.color }}>{a.label}</div>
            <div className="text-[9px]" style={{ color: a.color, opacity: 0.7 }}>{a.type} · {a.dur}s · CD {a.cd}s</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TimelinePreview({ t }: { t: ThemeColors }) {
  // Mini timeline showing two abilities
  const abilities = [
    { name: 'Divine Veil', time: 0, dur: 5, cd: 18, color: t.shield },
    { name: 'Reprisal', time: 8, dur: 3, cd: 12, color: t.mit },
  ]
  const PX = 10 // px per second
  const totalW = 200

  return (
    <div className="rounded-lg overflow-hidden border" style={{ backgroundColor: t.surface, borderColor: t.border }}>
      {/* Ruler */}
      <div className="relative h-5 border-b" style={{ width: totalW, borderColor: t.border }}>
        {[0, 5, 10, 15, 20].map(t2 => (
          <div key={t2} className="absolute flex flex-col items-start" style={{ left: t2 * PX }}>
            <span className="text-[8px] ml-0.5" style={{ color: '#666' }}>0:{String(t2).padStart(2,'0')}</span>
          </div>
        ))}
      </div>
      {/* Row */}
      <div className="relative" style={{ height: 52, width: totalW }}>
        {abilities.map((a, i) => {
          const left = a.time * PX
          const durW = Math.max(a.dur * PX, 3)
          const cdW = a.cd * PX
          return (
            <div key={i} className="absolute" style={{ left, top: 0, bottom: 0, width: Math.min(cdW, totalW - left) }}>
              {/* CD ghost */}
              <div className="absolute rounded-sm" style={{ left: 0, top: 4, bottom: 4,
                width: Math.min(cdW, totalW - left),
                backgroundColor: `color-mix(in srgb, ${t.cdBar} 10%, transparent)` }} />
              {/* Duration bar fill */}
              <div className="absolute rounded" style={{ left: 0, bottom: 4, height: 8,
                width: Math.min(durW, totalW - left),
                backgroundColor: `color-mix(in srgb, ${t.durBar} 35%, transparent)` }} />
              {/* Duration bar border */}
              <div className="absolute rounded border" style={{ left: 0, bottom: 4, height: 8,
                width: Math.min(durW, totalW - left), borderColor: a.color, backgroundColor: 'transparent' }} />
              {/* Label */}
              <div className="absolute" style={{ left: 4, top: 6 }}>
                <div className="text-[9px] font-semibold whitespace-nowrap" style={{ color: t.label }}>{a.name}</div>
                <div className="text-[8px] whitespace-nowrap" style={{ color: t.label, opacity: 0.7 }}>0:{String(a.time).padStart(2,'0')}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const GROUPS: {
  label: string
  description: string
  keys: { key: keyof ThemeColors; label: string }[]
  Preview: React.ComponentType<{ t: ThemeColors }>
}[] = [
  {
    label: 'UI Chrome',
    description: 'Background surfaces, panels, borders and the accent color.',
    keys: [
      { key: 'accent',  label: 'Accent (buttons, focus, highlights)' },
      { key: 'surface', label: 'Background surface' },
      { key: 'panel',   label: 'Panel / sidebar background' },
      { key: 'border',  label: 'Border color' },
    ],
    Preview: ChromePreview,
  },
  {
    label: 'Role Colors',
    description: 'Colors for tank, healer and DPS job labels and icons.',
    keys: [
      { key: 'tank',   label: 'Tank' },
      { key: 'healer', label: 'Healer' },
      { key: 'dps',    label: 'DPS' },
    ],
    Preview: RolePreview,
  },
  {
    label: 'Ability Types',
    description: 'Colors for ability categories shown on the timeline.',
    keys: [
      { key: 'mit',    label: 'Mitigation' },
      { key: 'shield', label: 'Shield' },
      { key: 'regen',  label: 'Regen' },
      { key: 'invuln', label: 'Invulnerability' },
    ],
    Preview: AbilityTypePreview,
  },
  {
    label: 'Timeline Elements',
    description: 'Controls bar and text colors on the timeline itself.',
    keys: [
      { key: 'durBar', label: 'Active duration bar fill' },
      { key: 'cdBar',  label: 'Cooldown ghost fill' },
      { key: 'label',  label: 'Ability name & timestamp text' },
    ],
    Preview: TimelinePreview,
  },
]

export default function SettingsPage() {
  const [theme, setTheme] = useState<ThemeColors>(loadTheme)
  const [saved, setSaved] = useState(false)

  useEffect(() => { applyTheme(theme) }, [theme])

  function update(key: keyof ThemeColors, value: string) {
    setTheme(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    saveTheme(theme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    setTheme({ ...DEFAULT_THEME })
    setSaved(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Appearance</h1>
          <p className="text-gray-400 text-sm mt-1">Customize colors. Changes apply instantly.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-ghost" onClick={handleReset}>Reset defaults</button>
          <button className="btn-primary" onClick={handleSave}>{saved ? '✓ Saved' : 'Save'}</button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {GROUPS.map(({ label, description, keys, Preview }) => (
          <div key={label} className="card p-5">
            <h2 className="font-semibold text-white mb-0.5">{label}</h2>
            <p className="text-xs text-gray-500 mb-4">{description}</p>
            {/* Side-by-side: sliders left, preview right */}
            <div className="grid grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-4">
                {keys.map(({ key, label: l }) => (
                  <HslSlider key={key} label={l} value={theme[key]} onChange={v => update(key, v)} />
                ))}
              </div>
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Preview</div>
                <Preview t={theme} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
