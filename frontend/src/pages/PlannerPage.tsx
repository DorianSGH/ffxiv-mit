import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { api } from '../lib/api'
import type { Ability, Job, Plan, PlacedAbility } from '../types'
import { roleColor, ROLE_ORDER } from '../lib/utils'
import AbilityCard from '../components/planner/AbilityCard'
import JobIcon from '../components/JobIcon'
import TimelineRow, { TimelineRuler } from '../components/planner/TimelineRow'
import { useCooldownState, getCooldownRemaining } from '../hooks/useCooldownState'

const PX_PER_SEC = 6

export default function PlannerPage() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map())
  const [draggingAbility, setDraggingAbility] = useState<Ability | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [copyLabel, setCopyLabel] = useState('Copy')
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

  const orderedUniqueJobs = plan
    ? ROLE_ORDER.flatMap(role =>
        plan.party_slots
          .filter(s => jobs.get(s.job_id)?.role === role)
          .sort((a, b) => a.slot_index - b.slot_index)
          .map(s => jobs.get(s.job_id))
          .filter((j): j is Job => !!j)
      ).filter((j, i, arr) => arr.findIndex(x => x.id === j.id) === i)
    : []

  function handleDragStart(e: DragStartEvent) {
    const ability = e.active.data.current?.ability as Ability | undefined
    if (ability) setDraggingAbility(ability)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDraggingAbility(null)
    const { active, over } = e
    if (!over || !plan) return

    const ability = active.data.current?.ability as Ability | undefined
    if (!ability) return

    const overId = over.id as string
    if (!overId.startsWith('timeline-row-')) return

    const timelineEl = timelineRef.current
    if (!timelineEl) return

    const rect = timelineEl.getBoundingClientRect()
    const dragRect = active.rect.current.translated
    if (!dragRect) return

    // dragRect.left is in viewport coordinates.
    // rect.left is also in viewport coordinates (visible left edge of the scroller).
    // We must add scrollLeft to convert from visible-relative to content-relative,
    // then subtract the 80px job label column.
    const scrollLeft = timelineEl.scrollLeft
    const xInTimeline = dragRect.left - rect.left + scrollLeft - 80
    const rawTime = xInTimeline / PX_PER_SEC - plan.prepull_offset
    const timeOffset = Math.max(-plan.prepull_offset, Math.round(rawTime))

    // Cooldown check
    const windows = cooldownWindows.get(ability.id)
    if (getCooldownRemaining(ability, windows, timeOffset) > 0) return

    const placement = await api.plans.placements.add(plan.id, {
      ability_id: ability.id,
      time_offset: timeOffset,
    })

    setPlan(p => p ? { ...p, placements: [...p.placements, placement] } : p)
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

  if (!plan) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>
  }

  const bossActions = plan.encounter?.boss_actions ?? []

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 bg-panel border-r border-border flex flex-col overflow-hidden">
          {/* Header */}
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
            <button
              className="btn-ghost w-full mt-3 text-xs"
              onClick={handleShare}
            >
              Share plan
            </button>
          </div>

          {/* Share code */}
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

          {/* Ability list per party member */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
            {plan.party_slots
              .sort((a, b) => a.slot_index - b.slot_index)
              .map(slot => {
                const job = jobs.get(slot.job_id)
                if (!job) return null
                const color = roleColor(job.role)

                return (
                  <div key={slot.id}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <JobIcon
                        name={job.name}
                        abbreviation={job.abbreviation}
                        color={color}
                        icon_url={job.icon_url}
                        size={24}
                      />
                      <span className="text-xs font-semibold" style={{ color }}>
                        {job.abbreviation}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 pl-1">
                      {job.abilities.length === 0 ? (
                        <span className="text-[10px] text-gray-600">No abilities defined</span>
                      ) : job.abilities.map(ability => {
                        const windows = cooldownWindows.get(ability.id)
                        const cdRemaining = getCooldownRemaining(ability, windows, -plan.prepull_offset)
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
                  </div>
                )
              })}
          </div>
        </aside>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        {/*
          overflow-auto on this div handles BOTH horizontal and vertical scroll.
          The sticky ruler uses position:sticky/top:0 inside this scroller.
          The sticky job labels use position:sticky/left:0 inside this scroller.
          Both work because they share the same scroll container.
        */}
        <div className="flex-1 overflow-auto bg-surface" ref={timelineRef}>
          {/* min-w-max makes the container as wide as the timeline content */}
          <div className="min-w-max flex flex-col min-h-full">
            <TimelineRuler
              fightDuration={plan.fight_duration}
              prepullOffset={plan.prepull_offset}
              pxPerSec={PX_PER_SEC}
              bossActions={bossActions}
            />
            {/* flex-1 so rows stretch to fill remaining vertical space */}
            <div className="flex flex-col flex-1">
              {orderedUniqueJobs.map(job => (
                <TimelineRow
                  key={job.id}
                  job={job}
                  placements={plan.placements.filter(p => p.ability.job_id === job.id)}
                  fightDuration={plan.fight_duration}
                  prepullOffset={plan.prepull_offset}
                  pxPerSec={PX_PER_SEC}
                  onRemove={handleRemove}
                />
              ))}
              {/* Spacer row fills leftover vertical space so the timeline looks full */}
              <div className="flex-1 border-t border-border/20" />
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggingAbility && (
          <div
            className="rounded-md px-2 py-1 text-xs font-medium border shadow-lg pointer-events-none opacity-90"
            style={{
              backgroundColor: `${draggingAbility.color ?? '#6b7cff'}33`,
              borderColor: draggingAbility.color ?? '#6b7cff',
              color: draggingAbility.color ?? '#6b7cff',
            }}
          >
            {draggingAbility.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
