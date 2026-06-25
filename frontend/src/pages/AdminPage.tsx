import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Ability, AbilityType, BossAction, DamageType, Encounter, Job, Role } from '../types'
import { roleColor, ABILITY_TYPE_LABELS, DAMAGE_TYPE_LABELS, formatTime } from '../lib/utils'
import JobIcon from '../components/JobIcon'
import AbilityIcon from '../components/AbilityIcon'

const ROLES: Role[] = ['tank', 'healer', 'dps']
const ABILITY_TYPES: AbilityType[] = ['mitigation', 'shield', 'regen', 'invuln']
const DAMAGE_TYPES: DamageType[] = ['raidwide', 'tankbuster', 'enrage', 'other']
const DEFAULT_COLORS: Record<Role, string> = { tank: '#4a9eff', healer: '#57c875', dps: '#ff6b6b' }

type Tab = 'jobs' | 'encounters'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('jobs')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="border-b border-border px-6 flex gap-6 shrink-0">
        {(['jobs', 'encounters'] as Tab[]).map(t => (
          <button
            key={t}
            className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t ? 'border-accent text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'jobs' ? <JobsTab /> : <EncountersTab />}
      </div>
    </div>
  )
}


// ── Jobs tab ──────────────────────────────────────────────────────────────────

function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const [jName, setJName] = useState(''); const [jAbbr, setJAbbr] = useState('')
  const [jRole, setJRole] = useState<Role>('healer'); const [jColor, setJColor] = useState('#57c875')
  const [jIconUrl, setJIconUrl] = useState(''); const [jEditing, setJEditing] = useState<string | null>(null)

  const [aName, setAName] = useState(''); const [aDur, setADur] = useState(10)
  const [aCD, setACD] = useState(60); const [aType, setAType] = useState<AbilityType>('mitigation')
  const [aDesc, setADesc] = useState(''); const [aColor, setAColor] = useState('')
  const [aIconUrl, setAIconUrl] = useState(''); const [aEditing, setAEditing] = useState<string | null>(null)

  useEffect(() => { loadJobs() }, [])

  async function loadJobs() {
    const summaries = await api.jobs.list()
    const full = await Promise.all(summaries.map(s => api.jobs.get(s.id)))
    setJobs(full)
    if (selectedJob) setSelectedJob(full.find(j => j.id === selectedJob.id) ?? null)
  }

  async function saveJob() {
    if (!jName.trim() || !jAbbr.trim()) return
    const body = { name: jName, abbreviation: jAbbr, role: jRole, color: jColor,
      icon_url: jIconUrl || undefined }
    if (jEditing) await api.jobs.update(jEditing, body)
    else await api.jobs.create(body)
    clearJob(); loadJobs()
  }

  function clearJob() { setJEditing(null); setJName(''); setJAbbr(''); setJRole('healer'); setJColor('#57c875'); setJIconUrl('') }
  function startEditJob(j: Job) { setJEditing(j.id); setJName(j.name); setJAbbr(j.abbreviation); setJRole(j.role); setJColor(j.color); setJIconUrl(j.icon_url ?? '') }
  async function deleteJob(id: string) {
    if (!confirm('Delete job and all abilities?')) return
    await api.jobs.delete(id)
    if (selectedJob?.id === id) setSelectedJob(null)
    loadJobs()
  }

  async function saveAbility() {
    if (!selectedJob || !aName.trim()) return
    const body = { name: aName, duration: aDur, cooldown: aCD, ability_type: aType,
      description: aDesc || undefined, color: aColor || undefined,
      icon_url: aIconUrl || undefined }
    if (aEditing) await api.jobs.abilities.update(selectedJob.id, aEditing, body)
    else await api.jobs.abilities.create(selectedJob.id, body)
    clearAbility(); loadJobs()
  }

  function clearAbility() { setAEditing(null); setAName(''); setADur(10); setACD(60); setAType('mitigation'); setADesc(''); setAColor(''); setAIconUrl('') }
  function startEditAbility(a: Ability) { setAEditing(a.id); setAName(a.name); setADur(a.duration); setACD(a.cooldown); setAType(a.ability_type as AbilityType); setADesc(a.description ?? ''); setAColor(a.color ?? ''); setAIconUrl(a.icon_url ?? '') }
  async function deleteAbility(id: string) {
    if (!selectedJob) return
    await api.jobs.abilities.delete(selectedJob.id, id); loadJobs()
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Jobs panel */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border overflow-y-auto">
          <h2 className="font-semibold text-white mb-3">Jobs</h2>
          <div className="flex flex-col gap-2">
            <input className="input" placeholder="Name (e.g. White Mage)" value={jName} onChange={e => setJName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Abbr (WHM)" maxLength={5} value={jAbbr} onChange={e => setJAbbr(e.target.value.toUpperCase())} />
              <select className="input" value={jRole} onChange={e => { const r = e.target.value as Role; setJRole(r); if (!jEditing) setJColor(DEFAULT_COLORS[r]) }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <input className="input flex-1" placeholder="Hex color" value={jColor} onChange={e => setJColor(e.target.value)} />
              <input type="color" value={jColor} onChange={e => setJColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer border border-border bg-transparent" />
            </div>
            <div>
              <label className="label">Icon URL (optional)</label>
              <input className="input" placeholder="https://…" value={jIconUrl} onChange={e => setJIconUrl(e.target.value)} />
              {jIconUrl && (
                <img src={jIconUrl} alt="" className="w-8 h-8 mt-1 rounded object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={saveJob}>{jEditing ? 'Update' : 'Add job'}</button>
              {jEditing && <button className="btn-ghost" onClick={clearJob}>Cancel</button>}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {jobs.map(job => {
            const color = roleColor(job.role)
            const sel = selectedJob?.id === job.id
            return (
              <div key={job.id}
                className={`rounded-lg p-2.5 flex items-center justify-between cursor-pointer border transition-colors ${sel ? 'border-accent bg-accent/10' : 'border-transparent hover:border-border bg-panel'}`}
                onClick={() => setSelectedJob(sel ? null : job)}
              >
                <div className="flex items-center gap-2">
                  <JobIcon name={job.name} abbreviation={job.abbreviation} color={color} icon_url={job.icon_url} size={28} />
                  <div>
                    <div className="text-sm font-medium text-white">{job.name}</div>
                    <div className="text-[10px] capitalize" style={{ color }}>{job.role} · {job.abilities.length} abilities</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="text-gray-500 hover:text-gray-200 text-xs px-1" onClick={e => { e.stopPropagation(); startEditJob(job) }}>✎</button>
                  <button className="text-gray-500 hover:text-red-400 text-xs px-1" onClick={e => { e.stopPropagation(); deleteJob(job.id) }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Abilities panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedJob ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Select a job to manage its abilities</div>
        ) : (
          <>
            <div className="p-4 border-b border-border overflow-y-auto shrink-0">
              <div className="flex items-center gap-3 mb-4">
                <JobIcon name={selectedJob.name} abbreviation={selectedJob.abbreviation} color={roleColor(selectedJob.role)} icon_url={selectedJob.icon_url} size={32} />
                <div>
                  <div className="font-semibold text-white">{selectedJob.name} abilities</div>
                  <div className="text-xs text-gray-400 capitalize">{selectedJob.role}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3">
                  <label className="label">Ability name</label>
                  <input className="input" placeholder="e.g. Sacred Soil" value={aName} onChange={e => setAName(e.target.value)} />
                </div>
                <div><label className="label">Duration (s)</label><input className="input" type="number" min={1} value={aDur} onChange={e => setADur(Number(e.target.value))} /></div>
                <div><label className="label">Cooldown (s)</label><input className="input" type="number" min={1} value={aCD} onChange={e => setACD(Number(e.target.value))} /></div>
                <div><label className="label">Type</label>
                  <select className="input" value={aType} onChange={e => setAType(e.target.value as AbilityType)}>
                    {ABILITY_TYPES.map(t => <option key={t} value={t}>{ABILITY_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="label">Description</label><input className="input" placeholder="Optional" value={aDesc} onChange={e => setADesc(e.target.value)} /></div>
                <div><label className="label">Color</label>
                  <div className="flex gap-2">
                    <input className="input" placeholder="#hex" value={aColor} onChange={e => setAColor(e.target.value)} />
                    <input type="color" value={aColor || '#6b7cff'} onChange={e => setAColor(e.target.value)} className="w-9 h-9 rounded border border-border bg-transparent cursor-pointer" />
                  </div>
                </div>
                <div className="col-span-3">
                  <label className="label">Icon URL (optional)</label>
                  <div className="flex gap-2 items-center">
                    <input className="input" placeholder="https://…" value={aIconUrl} onChange={e => setAIconUrl(e.target.value)} />
                    {aIconUrl && (
                      <img src={aIconUrl} alt="" className="w-8 h-8 rounded object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary" onClick={saveAbility}>{aEditing ? 'Update' : 'Add ability'}</button>
                {aEditing && <button className="btn-ghost" onClick={clearAbility}>Cancel</button>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-2">
                {selectedJob.abilities.map(a => {
                  const color = a.color ?? '#6b7cff'
                  return (
                    <div key={a.id} className="card p-3 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <AbilityIcon name={a.name} color={a.color ?? '#6b7cff'} icon_url={a.icon_url} size={32} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white text-sm">{a.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${color}22`, color }}>{ABILITY_TYPE_LABELS[a.ability_type as AbilityType]}</span>
                          </div>
                          <div className="text-xs text-gray-400 flex gap-3">
                            <span>Duration <span className="text-gray-200">{a.duration}s</span></span>
                            <span>Cooldown <span className="text-gray-200">{a.cooldown}s</span></span>
                          </div>
                          {a.description && <div className="text-xs text-gray-500 mt-1">{a.description}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button className="text-gray-500 hover:text-gray-200 text-xs" onClick={() => startEditAbility(a)}>✎</button>
                        <button className="text-gray-500 hover:text-red-400 text-xs" onClick={() => deleteAbility(a.id)}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


// ── Encounters tab ────────────────────────────────────────────────────────────

function EncountersTab() {
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [selected, setSelected] = useState<Encounter | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [copyLabel, setCopyLabel] = useState('Copy')

  // Encounter form
  const [eName, setEName] = useState(''); const [eDur, setEDur] = useState(600)
  const [ePreset, setEPreset] = useState(false); const [eEditing, setEEditing] = useState<string | null>(null)

  // Action form
  const [aName, setAName] = useState(''); const [aTime, setATime] = useState(0)
  const [aType, setAType] = useState<DamageType>('raidwide'); const [aDesc, setADesc] = useState('')
  const [aEditing, setAEditing] = useState<string | null>(null)

  // ACT import
  const [actLog, setActLog] = useState(''); const [actName, setActName] = useState('')
  const [actDur, setActDur] = useState(600); const [importing, setImporting] = useState(false)
  const [actError, setActError] = useState('')
  const [showActImport, setShowActImport] = useState(false)

  // Share import
  const [importCode, setImportCode] = useState(''); const [importError, setImportError] = useState('')

  useEffect(() => { loadEncounters() }, [])

  async function loadEncounters() {
    const list = await api.encounters.list()
    const full = await Promise.all(list.map(e => api.encounters.get(e.id)))
    setEncounters(full)
    if (selected) setSelected(full.find(e => e.id === selected.id) ?? null)
  }

  async function saveEncounter() {
    if (!eName.trim()) return
    if (eEditing) await api.encounters.update(eEditing, { name: eName, duration: eDur, is_preset: ePreset })
    else await api.encounters.create({ name: eName, duration: eDur, is_preset: ePreset })
    clearEnc(); loadEncounters()
  }

  function clearEnc() { setEEditing(null); setEName(''); setEDur(600); setEPreset(false) }
  function startEditEnc(e: Encounter) { setEEditing(e.id); setEName(e.name); setEDur(e.duration); setEPreset(e.is_preset) }
  async function deleteEnc(id: string) {
    if (!confirm('Delete encounter?')) return
    await api.encounters.delete(id)
    if (selected?.id === id) setSelected(null)
    loadEncounters()
  }

  async function saveAction() {
    if (!selected || !aName.trim()) return
    const body = { name: aName, time_offset: aTime, damage_type: aType, description: aDesc || undefined }
    if (aEditing) await api.encounters.actions.update(selected.id, aEditing, body)
    else await api.encounters.actions.add(selected.id, body)
    clearAction(); loadEncounters()
  }

  function clearAction() { setAEditing(null); setAName(''); setATime(0); setAType('raidwide'); setADesc('') }
  function startEditAction(a: BossAction) { setAEditing(a.id); setAName(a.name); setATime(a.time_offset); setAType(a.damage_type as DamageType); setADesc(a.description ?? '') }
  async function deleteAction(id: string) {
    if (!selected) return
    await api.encounters.actions.delete(selected.id, id); loadEncounters()
  }

  async function handleActImport() {
    if (!actLog.trim() || !actName.trim()) return
    setImporting(true); setActError('')
    try {
      const enc = await api.encounters.importAct({ log_text: actLog, encounter_name: actName, duration: actDur, is_preset: false })
      setShowActImport(false); setActLog(''); setActName('')
      await loadEncounters()
      setSelected(enc)
    } catch (e: unknown) {
      setActError(e instanceof Error ? e.message : 'Import failed')
    } finally { setImporting(false) }
  }

  async function handleShare() {
    if (!selected) return
    const { code } = await api.share.exportEncounter(selected.id)
    setShareCode(code)
  }

  async function handleImportCode() {
    if (!importCode.trim()) return
    setImportError('')
    try {
      const result = await api.share.importEncounter(importCode.trim())
      setImportCode('')
      await loadEncounters()
      const enc = encounters.find(e => e.id === result.id) ?? await api.encounters.get(result.id)
      setSelected(enc)
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    }
  }

  function handleCopy() {
    if (!shareCode) return
    navigator.clipboard.writeText(shareCode)
    setCopyLabel('Copied!'); setTimeout(() => setCopyLabel('Copy'), 2000)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Encounter list */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border overflow-y-auto">
          <h2 className="font-semibold text-white mb-3">Encounters</h2>
          <div className="flex flex-col gap-2">
            <input className="input" placeholder="Encounter name" value={eName} onChange={e => setEName(e.target.value)} />
            <div className="flex gap-2">
              <div className="flex-1"><label className="label">Duration (s)</label><input className="input" type="number" min={60} value={eDur} onChange={e => setEDur(Number(e.target.value))} /></div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={ePreset} onChange={e => setEPreset(e.target.checked)} className="accent-accent" />
                  Preset
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={saveEncounter}>{eEditing ? 'Update' : 'Add encounter'}</button>
              {eEditing && <button className="btn-ghost" onClick={clearEnc}>Cancel</button>}
            </div>
            <div className="border-t border-border pt-2 mt-1">
              <label className="label">Import share code</label>
              <div className="flex gap-2">
                <input className="input flex-1 text-xs" placeholder="Paste code…" value={importCode} onChange={e => { setImportCode(e.target.value); setImportError('') }} />
                <button className="btn-ghost text-xs px-2" onClick={handleImportCode}>Import</button>
              </div>
              {importError && <div className="text-red-400 text-xs mt-1">{importError}</div>}
            </div>
            <button className="btn-ghost text-xs" onClick={() => setShowActImport(v => !v)}>
              {showActImport ? 'Hide' : 'Import ACT log'} ↓
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {encounters.map(enc => {
            const sel = selected?.id === enc.id
            return (
              <div key={enc.id}
                className={`rounded-lg p-2.5 flex items-center justify-between cursor-pointer border transition-colors ${sel ? 'border-accent bg-accent/10' : 'border-transparent hover:border-border bg-panel'}`}
                onClick={() => setSelected(sel ? null : enc)}
              >
                <div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {enc.name}
                    {enc.is_preset && <span className="text-[9px] text-accent border border-accent/50 rounded px-1">PRESET</span>}
                  </div>
                  <div className="text-[10px] text-gray-500">{formatTime(enc.duration)} · {enc.boss_actions.length} mechanics</div>
                </div>
                <div className="flex gap-1">
                  <button className="text-gray-500 hover:text-gray-200 text-xs px-1" onClick={e => { e.stopPropagation(); startEditEnc(enc) }}>✎</button>
                  <button className="text-gray-500 hover:text-red-400 text-xs px-1" onClick={e => { e.stopPropagation(); deleteEnc(enc.id) }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Select an encounter to manage its mechanics</div>
        ) : (
          <>
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-semibold text-white">{selected.name}</div>
                  <div className="text-xs text-gray-400">{formatTime(selected.duration)} · {selected.boss_actions.length} mechanics</div>
                </div>
                <div className="flex gap-2 items-start">
                  <button className="btn-ghost text-xs" onClick={handleShare}>Share</button>
                </div>
              </div>

              {/* Share code */}
              {shareCode && (
                <div className="mb-4 flex gap-2">
                  <input className="input flex-1 text-xs" value={shareCode} readOnly onClick={e => (e.target as HTMLInputElement).select()} />
                  <button className="btn-ghost text-xs px-2" onClick={handleCopy}>{copyLabel}</button>
                </div>
              )}

              {/* Add action form */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2"><label className="label">Mechanic name</label><input className="input" placeholder="e.g. Limit Cut" value={aName} onChange={e => setAName(e.target.value)} /></div>
                <div><label className="label">Time (s)</label><input className="input" type="number" min={0} value={aTime} onChange={e => setATime(Number(e.target.value))} /></div>
                <div><label className="label">Type</label>
                  <select className="input" value={aType} onChange={e => setAType(e.target.value as DamageType)}>
                    {DAMAGE_TYPES.map(t => <option key={t} value={t}>{DAMAGE_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="col-span-4"><label className="label">Description</label><input className="input" placeholder="Optional" value={aDesc} onChange={e => setADesc(e.target.value)} /></div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary" onClick={saveAction}>{aEditing ? 'Update' : 'Add mechanic'}</button>
                {aEditing && <button className="btn-ghost" onClick={clearAction}>Cancel</button>}
              </div>
            </div>

            {/* ACT import panel */}
            {showActImport && (
              <div className="p-4 border-b border-border bg-black/20 shrink-0">
                <div className="text-sm font-medium text-white mb-3">Import from ACT log</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input className="input" placeholder="Encounter name" value={actName} onChange={e => setActName(e.target.value)} />
                  <input className="input" type="number" placeholder="Duration (s)" value={actDur} onChange={e => setActDur(Number(e.target.value))} />
                </div>
                <textarea
                  className="input font-mono text-[10px] h-24 resize-none mb-2"
                  placeholder="Paste ACT Network log lines here…"
                  value={actLog}
                  onChange={e => { setActLog(e.target.value); setActError('') }}
                />
                {actError && <div className="text-red-400 text-xs mb-2">{actError}</div>}
                <button className="btn-primary text-xs" disabled={importing || !actLog.trim() || !actName.trim()} onClick={handleActImport}>
                  {importing ? 'Importing…' : 'Import'}
                </button>
              </div>
            )}

            {/* Action list */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-2">
                {selected.boss_actions.map(a => {
                  const COLORS: Record<DamageType, string> = { raidwide: '#e94560', tankbuster: '#ff9f43', enrage: '#cc44ff', other: '#888' }
                  const color = COLORS[a.damage_type as DamageType] ?? '#888'
                  return (
                    <div key={a.id} className="card p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: color }} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">{a.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}22`, color }}>
                              {DAMAGE_TYPE_LABELS[a.damage_type as DamageType]}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">{formatTime(a.time_offset)}{a.description ? ` · ${a.description}` : ''}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-gray-500 hover:text-gray-200 text-xs" onClick={() => startEditAction(a)}>✎</button>
                        <button className="text-gray-500 hover:text-red-400 text-xs" onClick={() => deleteAction(a.id)}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
