import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragEndEvent, DragMoveEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { api } from '../lib/api'
import type { Ability, Job, Plan, PlacedAbility } from '../types'
import { roleColor, ROLE_ORDER, ABILITY_TYPE_COLORS } from '../lib/utils'
import AbilityCard from '../components/planner/AbilityCard'
import JobIcon from '../components/JobIcon'
import TimelineRow, { TimelineRuler } from '../components/planner/TimelineRow'
import { useCooldownState, getCooldownRemaining, canPlaceAt } from '../hooks/useCooldownState'

const PX_PER_SEC_DEFAULT = 6
const ZOOM_MIN = 2
const ZOOM_MAX = 20
const ZOOM_STEP = 1
const JOB_LABEL_W = 120

export default function PlannerPage() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map())
  const [draggingAbility, setDraggingAbility] = useState<Ability | null>(null)
  const [movingPlacementId, setMovingPlacementId] = useState<string | null>(null)
  // null = not dragging, true = can drop here, false = cannot
  const [dropValid, setDropValid] = useState<boolean | null>(null)
  const [pxPerSec, setPxPerSec] = useState(PX_PER_SEC_DEFAULT)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [sidebarCollapsed, setSidebarCollapsed] = useState<Set<string>>(new Set())
  const [timelineCollapsed, setTimelineCollapsed] = useState<Set<string>>(new Set())
  const [mechanicsCollapsed, setMechanicsCollapsed] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => {
    if (!planId) return
    api.plans.get(planId).then(async p => {
      setPlan(p)
      const jobIds = [...new Set(p.party_slots.map(s => s.job_id))]
      const jobList = await Promise.all(jobIds.map(id => api.jobs.get(id)))
      setJobs(new Map(jobList.map(j => [j.id, j])))
    })
  }, [planId])

  const cooldownWindows = useCooldownState(plan?.placements ?? [])

  const defaultJobOrder = plan
    ? ROLE_ORDER.flatMap(role =>
        plan.party_slots
          .filter(s => jobs.get(s.job_id)?.role === role)
          .sort((a, b) => a.slot_index - b.slot_index)
          .map(s => jobs.get(s.job_id))
          .filter((j): j is Job => !!j)
      ).filter((j, i, arr) => arr.findIndex(x => x.id === j.id) === i)
    : []

  // jobOrder stores the user's custom row order as job IDs.
  // Initialised from defaultJobOrder when the plan loads.
  const [jobOrder, setJobOrder] = useState<string[]>([])

  // Sync jobOrder when plan/jobs first load
  useEffect(() => {
    if (defaultJobOrder.length > 0 && jobOrder.length === 0) {
      setJobOrder(defaultJobOrder.map(j => j.id))
    }
  }, [defaultJobOrder.map(j => j.id).join(',')])

  const orderedUniqueJobs = jobOrder.length > 0
    ? jobOrder.map(id => defaultJobOrder.find(j => j.id === id)).filter((j): j is Job => !!j)
    : defaultJobOrder

  // Compute time offset from a drag event's translated rect
  const getTimeFromDrag = useCallback((
    dragRect: { left: number } | null,
    currentPxPerSec: number,
    currentPlan: Plan,
  ): number | null => {
    const timelineEl = timelineRef.current
    if (!timelineEl || !dragRect) return null
    const rect = timelineEl.getBoundingClientRect()
    const scrollLeft = timelineEl.scrollLeft
    const xInTimeline = dragRect.left - rect.left + scrollLeft - JOB_LABEL_W
    const rawTime = xInTimeline / currentPxPerSec - currentPlan.prepull_offset
    return Math.max(-currentPlan.prepull_offset, Math.round(rawTime))
  }, [])

  // Get effective cooldown windows excluding the moving placement
  const getEffectiveWindows = useCallback((
    ability: Ability,
    placementId: string | null,
  ): [number, number][] => {
    const allWindows = cooldownWindows.get(ability.id) ?? []
    if (!placementId || !plan) return allWindows
    const movingPlacement = plan.placements.find(p => p.id === placementId)
    if (!movingPlacement) return allWindows
    return allWindows.filter(([s, e]) =>
      !(s === movingPlacement.time_offset && e === movingPlacement.time_offset + ability.cooldown)
    )
  }, [cooldownWindows, plan])

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current
    if (data?.type === 'placed') {
      setDraggingAbility(data.ability as Ability)
      setMovingPlacementId(data.placementId as string)
    } else if (data?.ability) {
      setDraggingAbility(data.ability as Ability)
      setMovingPlacementId(null)
    }
    setDropValid(null)
  }

  function handleDragMove(e: DragMoveEvent) {
    if (!draggingAbility || !plan || !e.over?.id?.toString().startsWith('timeline-row-')) {
      setDropValid(null)
      return
    }
    const timeOffset = getTimeFromDrag(e.active.rect.current.translated, pxPerSec, plan)
    if (timeOffset === null) { setDropValid(null); return }
    const windows = getEffectiveWindows(draggingAbility, movingPlacementId)
    setDropValid(canPlaceAt(draggingAbility, windows, timeOffset))
  }

  async function handleDragEnd(e: DragEndEvent) {
    const ability = draggingAbility
    const placementId = movingPlacementId
    setDraggingAbility(null)
    setMovingPlacementId(null)
    setDropValid(null)

    const { active, over } = e
    if (!over || !plan) return

    // Row reorder — sortable drag between job rows
    if (active.data.current?.type === 'row-sort' && over.data.current?.type === 'row-sort') {
      const oldIndex = jobOrder.indexOf(active.id as string)
      const newIndex = jobOrder.indexOf(over.id as string)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setJobOrder(prev => arrayMove(prev, oldIndex, newIndex))
      }
      return
    }

    if (!ability) return
    if (!over.id.toString().startsWith('timeline-row-')) return

    const timeOffset = getTimeFromDrag(active.rect.current.translated, pxPerSec, plan)
    if (timeOffset === null) return

    const windows = getEffectiveWindows(ability, placementId)
    if (!canPlaceAt(ability, windows, timeOffset)) return

    if (placementId) {
      const updated = await api.plans.placements.move(plan.id, placementId, {
        ability_id: ability.id, time_offset: timeOffset,
      })
      setPlan(p => p ? { ...p, placements: p.placements.map(x => x.id === placementId ? updated : x) } : p)
    } else {
      const placement = await api.plans.placements.add(plan.id, {
        ability_id: ability.id, time_offset: timeOffset,
      })
      setPlan(p => p ? { ...p, placements: [...p.placements, placement] } : p)
    }
  }

  async function handleRemove(placementId: string) {
    if (!plan) return
    await api.plans.placements.remove(plan.id, placementId)
    setPlan(p => p ? { ...p, placements: p.placements.filter(x => x.id !== placementId) } : p)
  }

  async function handleShare() {
    if (!planId) return
    const { code } = await api.share.exportPlan(planId)
    setShareCode(code)
  }

  function handleCopy() {
    if (!shareCode) return
    navigator.clipboard.writeText(shareCode)
    setCopyLabel('Copied!')
    setTimeout(() => setCopyLabel('Copy'), 2000)
  }

  function toggleSidebar(jobId: string) {
    setSidebarCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  function toggleTimeline(jobId: string) {
    setTimelineCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  function handleZoom(delta: number) {
    const timelineEl = timelineRef.current
    // Anchor zoom to the center of the visible timeline area
    const scrollLeft = timelineEl?.scrollLeft ?? 0
    const visibleWidth = timelineEl?.clientWidth ?? 0
    const centerX = scrollLeft + visibleWidth / 2

    setPxPerSec(prev => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + delta))
      // After state update, adjust scroll to keep the same time center
      if (timelineEl && next !== prev) {
        const ratio = next / prev
        requestAnimationFrame(() => {
          timelineEl.scrollLeft = centerX * ratio - visibleWidth / 2
        })
      }
      return next
    })
  }

  if (!plan) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>
  }

  const bossActions = plan.encounter?.boss_actions ?? []
  const draggingColor = draggingAbility
    ? (draggingAbility.color ?? ABILITY_TYPE_COLORS[draggingAbility.ability_type as keyof typeof ABILITY_TYPE_COLORS] ?? '#6b7cff')
    : '#6b7cff'

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 bg-panel border-r border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border shrink-0">
            <button className="text-gray-400 hover:text-white text-xs mb-2 flex items-center gap-1"
              onClick={() => navigate('/')}>
              ← Plans
            </button>
            <div className="font-semibold text-white text-sm truncate">{plan.name}</div>
            {plan.encounter && (
              <div className="text-xs text-gray-400 mt-0.5">{plan.encounter.name}</div>
            )}
            {plan.prepull_offset > 0 && (
              <div className="text-xs text-accent mt-1">-{plan.prepull_offset}s prepull</div>
            )}
            <button className="btn-ghost w-full mt-3 text-xs" onClick={handleShare}>
              Share plan
            </button>
          </div>

          {shareCode && (
            <div className="p-3 border-b border-border shrink-0 bg-black/20">
              <div className="text-[10px] text-gray-400 mb-1">Share code</div>
              <div className="flex gap-2">
                <input
                  className="input text-[10px] flex-1"
                  value={shareCode}
                  readOnly
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button className="btn-ghost text-[10px] px-2" onClick={handleCopy}>
                  {copyLabel}
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
            {plan.party_slots
              .sort((a, b) => a.slot_index - b.slot_index)
              .map(slot => {
                const job = jobs.get(slot.job_id)
                if (!job) return null
                const color = roleColor(job.role)
                const collapsed = sidebarCollapsed.has(job.id)
                return (
                  <div key={slot.id}>
                    {/* Job header — click to collapse */}
                    <button
                      className="flex items-center gap-2 mb-2 px-1 w-full hover:opacity-80 transition-opacity"
                      onClick={() => toggleSidebar(job.id)}
                    >
                      <JobIcon
                        name={job.name}
                        abbreviation={job.abbreviation}
                        color={color}
                        icon_url={job.icon_url}
                        size={36}
                      />
                      <span className="text-xs font-semibold flex-1 text-left" style={{ color }}>
                        {job.abbreviation}
                      </span>
                      <span className="text-gray-500" style={{ fontSize: 13, lineHeight: 1 }}>{collapsed ? '▶' : '▼'}</span>
                    </button>
                    {!collapsed && (
                      <div className="flex flex-col gap-1.5 pl-1">
                        {job.abilities.length === 0 ? (
                          <span className="text-[10px] text-gray-600">No abilities defined</span>
                        ) : job.abilities.map(ability => {
                          const windows = cooldownWindows.get(ability.id)
                          const earliestTime = -plan.prepull_offset
                          const cdRemaining = windows
                            ? windows.reduce((best, [start, end]) => {
                                if (earliestTime >= start && earliestTime < end) {
                                  return Math.max(best, end - earliestTime)
                                }
                                return best
                              }, 0)
                            : 0
                          return (
                            <AbilityCard
                              key={ability.id}
                              ability={ability}
                              jobColor={job.color}
                              cooldownWindows={windows}
                              cooldownRemaining={cdRemaining}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </aside>

        {/* ── Timeline area ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-panel shrink-0">
            {/* Zoom */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Zoom</span>
              <button
                className="w-6 h-6 rounded border border-border text-gray-300 hover:text-white
                           hover:border-gray-500 flex items-center justify-center text-sm transition-colors"
                onClick={() => handleZoom(-ZOOM_STEP)}
                disabled={pxPerSec <= ZOOM_MIN}
              >−</button>
              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={ZOOM_STEP}
                value={pxPerSec}
                onChange={e => handleZoom(Number(e.target.value) - pxPerSec)}
                className="w-32 accent-accent"
              />
              <button
                className="w-6 h-6 rounded border border-border text-gray-300 hover:text-white
                           hover:border-gray-500 flex items-center justify-center text-sm transition-colors"
                onClick={() => handleZoom(ZOOM_STEP)}
                disabled={pxPerSec >= ZOOM_MAX}
              >+</button>
              <span className="text-xs text-gray-600 w-12">{pxPerSec}px/s</span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-border" />

            {/* Role collapse toggles */}
            <div className="flex items-center gap-2">
              {(['tank', 'healer', 'dps'] as const).map(role => {
                const roleJobs = orderedUniqueJobs.filter(j => j.role === role)
                if (roleJobs.length === 0) return null
                const allCollapsed = roleJobs.every(j => timelineCollapsed.has(j.id))
                const color = role === 'tank' ? '#4a9eff' : role === 'healer' ? '#57c875' : '#ff6b6b'
                const label = role === 'tank' ? 'Tanks' : role === 'healer' ? 'Healers' : 'DPS'
                return (
                  <button
                    key={role}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs
                               font-medium transition-all duration-150"
                    style={{
                      borderColor: allCollapsed ? `${color}88` : color,
                      backgroundColor: allCollapsed ? 'transparent' : `${color}18`,
                      color: allCollapsed ? `${color}88` : color,
                    }}
                    onClick={() => {
                      setTimelineCollapsed(prev => {
                        const next = new Set(prev)
                        if (allCollapsed) roleJobs.forEach(j => next.delete(j.id))
                        else roleJobs.forEach(j => next.add(j.id))
                        return next
                      })
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0"
                      style={{
                        borderColor: allCollapsed ? `${color}88` : color,
                        backgroundColor: allCollapsed ? 'transparent' : color,
                      }}
                    >
                      {!allCollapsed && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Scrollable timeline */}
          <div className="flex-1 overflow-auto bg-surface" ref={timelineRef}>
            <div className="min-w-max flex flex-col min-h-full">
              <TimelineRuler
                fightDuration={plan.fight_duration}
                prepullOffset={plan.prepull_offset}
                pxPerSec={pxPerSec}
                bossActions={bossActions}
                mechanicsCollapsed={mechanicsCollapsed}
                onToggleMechanics={() => setMechanicsCollapsed(v => !v)}
              />
              <div className="flex flex-col flex-1">
                <SortableContext
                  items={orderedUniqueJobs.map(j => j.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedUniqueJobs.map(job => (
                    <TimelineRow
                      key={job.id}
                      job={job}
                      placements={plan.placements.filter(p => p.ability.job_id === job.id)}
                      fightDuration={plan.fight_duration}
                      prepullOffset={plan.prepull_offset}
                      pxPerSec={pxPerSec}
                      movingPlacementId={movingPlacementId}
                      dropValid={dropValid}
                      collapsed={timelineCollapsed.has(job.id)}
                      onRemove={handleRemove}
                      onToggleCollapse={toggleTimeline}
                    />
                  ))}
                </SortableContext>
                <div className="flex-1 border-t border-border/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drop validity overlay on the drag ghost */}
      <DragOverlay>
        {draggingAbility && (
          <div
            className="rounded-md px-2 py-1 text-xs font-medium border shadow-lg pointer-events-none opacity-95 flex items-center gap-1.5"
            style={{
              backgroundColor: dropValid === false
                ? 'rgba(239,68,68,0.2)'
                : dropValid === true
                  ? 'rgba(34,197,94,0.2)'
                  : `${draggingColor}22`,
              borderColor: dropValid === false ? '#ef4444'
                : dropValid === true ? '#22c55e'
                : draggingColor,
              color: dropValid === false ? '#ef4444'
                : dropValid === true ? '#22c55e'
                : draggingColor,
            }}
          >
            {dropValid === false && <span>✕</span>}
            {dropValid === true && <span>✓</span>}
            {draggingAbility.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
