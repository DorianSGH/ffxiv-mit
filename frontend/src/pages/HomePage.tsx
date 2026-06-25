import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { EncounterSummary, JobSummary, PlanSummary } from '../types'
import { roleColor, ROLE_ORDER, formatTime } from '../lib/utils'

const PARTY_SIZE = 8
const PREPULL_OPTIONS = [0, 10, 15, 20]

export default function HomePage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [encounters, setEncounters] = useState<EncounterSummary[]>([])
  const [creating, setCreating] = useState(false)
  const [importCode, setImportCode] = useState('')
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)

  const [planName, setPlanName] = useState('')
  const [selectedEncId, setSelectedEncId] = useState<string | 'custom' | ''>('')
  const [customDuration, setCustomDuration] = useState(600)
  const [prepull, setPrepull] = useState(0)
  const [slots, setSlots] = useState<(string | null)[]>(Array(PARTY_SIZE).fill(null))

  useEffect(() => {
    api.plans.list().then(setPlans)
    api.jobs.list().then(setJobs)
    api.encounters.list().then(setEncounters)
  }, [])

  const presets = encounters.filter(e => e.is_preset)
  const customs = encounters.filter(e => !e.is_preset)
  const jobsByRole = ROLE_ORDER.map(role => ({ role, jobs: jobs.filter(j => j.role === role) }))

  const selectedEnc = encounters.find(e => e.id === selectedEncId)
  const fightDuration = selectedEncId === 'custom'
    ? customDuration
    : selectedEnc?.duration ?? 600

  async function handleCreate() {
    if (!planName.trim()) return
    const filledSlots = slots
      .map((jobId, i) => jobId ? { slot_index: i, job_id: jobId } : null)
      .filter(Boolean) as { slot_index: number; job_id: string }[]

    const plan = await api.plans.create({
      name: planName,
      encounter_id: selectedEncId && selectedEncId !== 'custom' ? selectedEncId : undefined,
      fight_duration: fightDuration,
      prepull_offset: prepull,
      party_slots: filledSlots,
    })
    navigate(`/plan/${plan.id}`)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this plan?')) return
    await api.plans.delete(id)
    setPlans(ps => ps.filter(p => p.id !== id))
  }

  async function handleImport() {
    if (!importCode.trim()) return
    setImporting(true)
    setImportError('')
    try {
      const result = await api.share.importPlan(importCode.trim())
      navigate(`/plan/${result.id}`)
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Mitigation Plans</h1>
          <p className="text-gray-400 text-sm mt-1">Savage &amp; Ultimate cooldown planning</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-ghost" onClick={() => setCreating(true)}>Import plan</button>
          <button className="btn-primary" onClick={() => setCreating(true)}>+ New Plan</button>
        </div>
      </div>

      {/* Import strip */}
      <div className="card p-4 mb-6 flex gap-3 items-start">
        <div className="flex-1">
          <label className="label">Import share code</label>
          <input
            className="input"
            placeholder="Paste a plan share code…"
            value={importCode}
            onChange={e => { setImportCode(e.target.value); setImportError('') }}
          />
          {importError && <div className="text-red-400 text-xs mt-1">{importError}</div>}
        </div>
        <button
          className="btn-primary mt-5"
          disabled={!importCode.trim() || importing}
          onClick={handleImport}
        >
          Import
        </button>
      </div>

      {/* Plan list */}
      {plans.length === 0 ? (
        <div className="card p-16 text-center text-gray-500">
          No plans yet — create one to get started
        </div>
      ) : (
        <div className="grid gap-3">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="card p-4 flex items-center justify-between cursor-pointer
                         hover:border-accent transition-colors"
              onClick={() => navigate(`/plan/${plan.id}`)}
            >
              <div>
                <div className="font-semibold text-white">{plan.name}</div>
                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                  <span>{formatTime(plan.fight_duration)} fight</span>
                  {plan.prepull_offset > 0 && (
                    <span className="text-accent">· {plan.prepull_offset}s prepull</span>
                  )}
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <button
                  className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                  onClick={e => handleDelete(plan.id, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">New Plan</h2>
              <button className="text-gray-400 hover:text-white text-xl" onClick={() => setCreating(false)}>✕</button>
            </div>

            {/* Plan name */}
            <div>
              <label className="label">Plan name *</label>
              <input className="input" placeholder="e.g. FRU Week 1" value={planName}
                onChange={e => setPlanName(e.target.value)} />
            </div>

            {/* Encounter picker */}
            <div>
              <label className="label">Encounter</label>
              <div className="grid gap-2">
                {/* Presets */}
                {presets.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Presets</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {presets.map(enc => (
                        <button
                          key={enc.id}
                          className={`text-left rounded-lg px-3 py-2 border text-sm transition-colors ${
                            selectedEncId === enc.id
                              ? 'border-accent bg-accent/10 text-white'
                              : 'border-border bg-surface hover:border-gray-500 text-gray-300'
                          }`}
                          onClick={() => setSelectedEncId(enc.id)}
                        >
                          <div className="font-medium">{enc.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatTime(enc.duration)} · {enc.boss_action_count} mechanics
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom encounters */}
                {customs.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 mt-2">Custom</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {customs.map(enc => (
                        <button
                          key={enc.id}
                          className={`text-left rounded-lg px-3 py-2 border text-sm transition-colors ${
                            selectedEncId === enc.id
                              ? 'border-accent bg-accent/10 text-white'
                              : 'border-border bg-surface hover:border-gray-500 text-gray-300'
                          }`}
                          onClick={() => setSelectedEncId(enc.id)}
                        >
                          <div className="font-medium">{enc.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatTime(enc.duration)} · {enc.boss_action_count} mechanics
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blank custom */}
                <button
                  className={`text-left rounded-lg px-3 py-2 border text-sm transition-colors ${
                    selectedEncId === 'custom'
                      ? 'border-accent bg-accent/10 text-white'
                      : 'border-border bg-surface hover:border-gray-500 text-gray-300'
                  }`}
                  onClick={() => setSelectedEncId('custom')}
                >
                  <div className="font-medium">Custom (no encounter)</div>
                  <div className="text-xs text-gray-500 mt-0.5">Set your own fight duration</div>
                </button>
              </div>

              {selectedEncId === 'custom' && (
                <div className="mt-3">
                  <label className="label">Fight duration (seconds)</label>
                  <input className="input" type="number" min={60} max={3600}
                    value={customDuration} onChange={e => setCustomDuration(Number(e.target.value))} />
                </div>
              )}
            </div>

            {/* Prepull */}
            <div>
              <label className="label">Prepull offset</label>
              <div className="flex gap-2">
                {PREPULL_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      prepull === s
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-gray-400 hover:border-gray-500'
                    }`}
                    onClick={() => setPrepull(s)}
                  >
                    {s === 0 ? 'None' : `-${s}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Party */}
            <div>
              <label className="label">Party composition</label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {Array.from({ length: PARTY_SIZE }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Slot {i + 1}</span>
                    <select
                      className="input text-xs"
                      value={slots[i] ?? ''}
                      onChange={e => {
                        const next = [...slots]
                        next[i] = e.target.value || null
                        setSlots(next)
                      }}
                    >
                      <option value="">— empty —</option>
                      {jobsByRole.map(({ role, jobs: rjobs }) =>
                        rjobs.length > 0 ? (
                          <optgroup key={role} label={role.toUpperCase()}>
                            {rjobs.map(j => (
                              <option key={j.id} value={j.id}>{j.abbreviation} — {j.name}</option>
                            ))}
                          </optgroup>
                        ) : null
                      )}
                    </select>
                  </div>
                ))}
              </div>

              {/* Visual preview */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {slots.map((jobId, i) => {
                  const job = jobs.find(j => j.id === jobId)
                  const color = job ? roleColor(job.role) : undefined
                  return (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold border-2"
                      style={{
                        borderColor: color ?? '#2a2a4a',
                        backgroundColor: color ? `${color}22` : '#1a1a2e',
                        color: color ?? '#444',
                      }}
                    >
                      {job?.abbreviation ?? '?'}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!planName.trim() || !selectedEncId}
                onClick={handleCreate}
              >
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
