import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BossAction, Job, PlacedAbility } from '../../types'
import { ABILITY_TYPE_COLORS, DAMAGE_TYPE_COLORS, DAMAGE_TYPE_LABELS, formatTime, roleColor } from '../../lib/utils'
import JobIcon from '../JobIcon'
import AbilityIcon from '../AbilityIcon'

const JOB_LABEL_W = 120
const LANE_H = 52       // px height of each ability lane
const MAX_LANES = 4     // max stacking lanes per job row

interface TimelineRowProps {
  job: Job
  placements: PlacedAbility[]
  fightDuration: number
  prepullOffset: number
  pxPerSec: number
  movingPlacementId: string | null
  dropValid: boolean | null
  collapsed: boolean
  onRemove: (placementId: string) => void
  onToggleCollapse: (jobId: string) => void
}

export default function TimelineRow({
  job, placements, fightDuration, prepullOffset, pxPerSec, movingPlacementId, dropValid, collapsed, onRemove, onToggleCollapse,
}: TimelineRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `timeline-row-${job.id}`,
    data: { jobId: job.id },
  })

  const {
    attributes: sortAttributes,
    listeners: sortListeners,
    setNodeRef: setSortRef,
    transform: sortTransform,
    transition: sortTransition,
    isDragging: sortIsDragging,
  } = useSortable({
    id: job.id,
    data: { type: 'row-sort' },
  })

  const jColor = roleColor(job.role)
  const totalSeconds = prepullOffset + fightDuration
  const rowWidth = totalSeconds * pxPerSec
  const pullX = prepullOffset * pxPerSec

  // ── Lane assignment ────────────────────────────────────────────────────────
  // Sort placements by time, then greedily assign each to the lowest-numbered
  // lane whose last cooldown has already expired by the time this placement starts.
  // laneEnds[i] = the cooldown end time of the last placement in lane i (-Infinity if empty).
  const laneEnds: number[] = new Array(MAX_LANES).fill(-Infinity)
  const sortedPlacements = [...placements].sort((a, b) => a.time_offset - b.time_offset)
  const placementLanes = new Map<string, number>()

  for (const p of sortedPlacements) {
    const startTime = p.time_offset
    const endTime = p.time_offset + p.ability.cooldown
    // Pick lowest lane where this placement doesn't overlap
    let lane = laneEnds.findIndex(end => startTime >= end)
    if (lane === -1) lane = MAX_LANES - 1  // all lanes busy — stack into last lane
    laneEnds[lane] = endTime
    placementLanes.set(p.id, lane)
  }

  // Only count lanes that were actually used
  const usedLanes = Math.max(1, laneEnds.filter(e => e > -Infinity).length)
  const rowHeight = usedLanes * LANE_H


  // Drop zone colour
  const dropBg = isOver
    ? dropValid === false
      ? 'rgba(239,68,68,0.10)'
      : dropValid === true
        ? 'rgba(34,197,94,0.08)'
        : 'rgba(233,69,96,0.06)'
    : 'transparent'

  return (
    <div
      ref={setSortRef}
      className="flex border-b border-border/40 last:border-0"
      style={{
        minHeight: collapsed ? LANE_H : rowHeight,
        transform: CSS.Transform.toString(sortTransform),
        transition: sortTransition,
        zIndex: sortIsDragging ? 10 : undefined,
        position: sortIsDragging ? 'relative' : undefined,
        opacity: sortIsDragging ? 0.5 : 1,
      }}
    >
      {/* ── Sticky job label — drag handle (⠿) + collapse button ─────── */}
      <div
        className="shrink-0 flex items-stretch bg-surface z-10"
        style={{
          width: JOB_LABEL_W,
          minWidth: JOB_LABEL_W,
          position: 'sticky',
          left: 0,
          borderRight: `2px solid ${jColor}44`,
          alignSelf: 'stretch',
        }}
      >
        {/* Drag handle — separate from collapse click */}
        <div
          className="flex items-center justify-center px-1 cursor-grab active:cursor-grabbing
                     hover:bg-white/5 transition-colors shrink-0"
          {...sortListeners}
          {...sortAttributes}
          title="Drag to reorder"
          style={{ touchAction: 'none' }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            {[0,1,2,3,4,5].map(i => (
              <circle key={i} cx={i % 2 === 0 ? 2 : 8} cy={2 + Math.floor(i / 2) * 5} r="1.5"
                fill={jColor} opacity="0.5" />
            ))}
          </svg>
        </div>
        {/* Collapse button */}
        <button
          className="flex items-center gap-1.5 flex-1 py-1 pr-1
                     hover:brightness-110 transition-all cursor-pointer text-left"
          onClick={() => onToggleCollapse(job.id)}
          title={collapsed ? `Expand ${job.abbreviation}` : `Collapse ${job.abbreviation}`}
        >
          <JobIcon
            name={job.name}
            abbreviation={job.abbreviation}
            color={jColor}
            icon_url={job.icon_url}
            size={34}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold leading-tight truncate" style={{ color: jColor }}>
              {job.abbreviation}
            </div>
            <div className="text-[9px] text-gray-500 capitalize">{job.role}</div>
          </div>
          <span style={{ color: jColor, fontSize: 13, lineHeight: 1, opacity: 0.7 }}>
            {collapsed ? '▶' : '▼'}
          </span>
        </button>
      </div>

      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className="relative transition-colors duration-100"
        style={{
          width: rowWidth,
          minHeight: collapsed ? LANE_H : rowHeight,
          backgroundColor: dropBg,
        }}
      >
        {/* Prepull shaded zone — always shown */}
        {prepullOffset > 0 && (
          <div
            className="absolute inset-y-0 pointer-events-none"
            style={{
              left: 0, width: pullX,
              backgroundColor: 'rgba(255,255,255,0.025)',
              borderRight: '1px dashed rgba(255,255,255,0.12)',
            }}
          />
        )}

        {/* Grid lines — always shown */}
        {Array.from({ length: Math.floor(fightDuration / 30) }).map((_, i) => (
          <div
            key={i}
            className="absolute inset-y-0 border-l border-border/20 pointer-events-none"
            style={{ left: pullX + (i + 1) * 30 * pxPerSec }}
          />
        ))}

        {/* Lane dividers + placements — hidden when collapsed */}
        {!collapsed && <>
          {Array.from({ length: usedLanes - 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-border/20 pointer-events-none"
              style={{ top: (i + 1) * LANE_H }}
            />
          ))}
          {placements.map(p => (
            <PlacedAbilityBlock
              key={p.id}
              placement={p}
              lane={placementLanes.get(p.id) ?? 0}
              laneH={LANE_H}
              jobColor={job.color}
              rowWidth={rowWidth}
              pullX={pullX}
              pxPerSec={pxPerSec}
              isMoving={movingPlacementId === p.id}
              onRemove={onRemove}
            />
          ))}
        </>}
      </div>
    </div>
  )
}


// ── Ruler ──────────────────────────────────────────────────────────────────────

const FFXIV_LOGO = 'https://www.clipartmax.com/png/middle/45-454900_final-fantasy-xiv-final-fantasy-xiv.png'

interface RulerProps {
  fightDuration: number
  prepullOffset: number
  pxPerSec: number
  bossActions?: BossAction[]
  mechanicsCollapsed: boolean
  onToggleMechanics: () => void
}

const ACTION_ROW_H = 28

export function TimelineRuler({
  fightDuration, prepullOffset, pxPerSec, bossActions = [],
  mechanicsCollapsed, onToggleMechanics,
}: RulerProps) {
  const totalSeconds = prepullOffset + fightDuration
  const pullX = prepullOffset * pxPerSec

  const ticks: number[] = []
  for (let t = 0; t >= -prepullOffset; t -= 30) ticks.unshift(t)
  for (let t = 30; t <= fightDuration; t += 30) ticks.push(t)

  const MAX_ROWS = 3
  const GAP_PX = 12

  function labelWidthPx(action: BossAction): number {
    const text = formatTime(action.time_offset)
      + ' · ' + action.name
      + ' (' + (DAMAGE_TYPE_LABELS[action.damage_type as keyof typeof DAMAGE_TYPE_LABELS] ?? action.damage_type) + ')'
    return text.length * 7 + 20
  }

  const rowRightEdge: number[] = Array(MAX_ROWS).fill(-Infinity)
  const actionRows: number[] = bossActions.map(action => {
    const x = pullX + action.time_offset * pxPerSec
    const w = labelWidthPx(action)
    let assigned = 0
    for (let r = 0; r < MAX_ROWS; r++) {
      if (x >= rowRightEdge[r] + GAP_PX) { assigned = r; break }
      if (r === MAX_ROWS - 1) assigned = rowRightEdge.indexOf(Math.min(...rowRightEdge))
    }
    rowRightEdge[assigned] = x + w
    return assigned
  })
  const usedRows = actionRows.length > 0 ? Math.max(...actionRows) + 1 : 0

  return (
    <div className="border-b border-border/60 bg-surface" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
      {/* Time tick row */}
      <div className="flex border-b border-border/30">
        {/* Corner — blank, aligned with job labels */}
        <div
          className="shrink-0 bg-surface z-30"
          style={{ width: JOB_LABEL_W, minWidth: JOB_LABEL_W, position: 'sticky', left: 0, height: 28 }}
        />

        <div className="relative" style={{ width: totalSeconds * pxPerSec }}>
          {prepullOffset > 0 && (
            <div className="absolute top-0 bottom-0 border-l-2 border-accent/50" style={{ left: pullX }} />
          )}
          <div className="h-7 relative">
            {ticks.map(t => (
              <div key={t} className="absolute flex flex-col items-start" style={{ left: pullX + t * pxPerSec }}>
                <span className="text-[10px] ml-1 leading-tight select-none" style={{ color: t < 0 ? '#555' : '#777' }}>
                  {formatTime(t)}
                </span>
                <div className="w-px h-2 bg-border/50" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mechanics row — collapsible */}
      {bossActions.length > 0 && (
        <div
          className="flex"
          style={{ height: mechanicsCollapsed ? 32 : usedRows * ACTION_ROW_H + 8 }}
        >
          {/* Corner — logo + collapse arrow, matching job row style */}
          <button
            className="shrink-0 bg-surface z-30 flex items-center justify-center gap-2 px-2
                       hover:brightness-110 transition-all cursor-pointer"
            style={{
              width: JOB_LABEL_W, minWidth: JOB_LABEL_W,
              position: 'sticky', left: 0,
              borderRight: '2px solid rgba(233,69,96,0.3)',
              alignSelf: 'stretch',
            }}
            onClick={onToggleMechanics}
            title={mechanicsCollapsed ? 'Show mechanics' : 'Hide mechanics'}
          >
            <span style={{ fontSize: 13, lineHeight: 1, opacity: 0.8, marginLeft: 'auto' }}>
              Mechanics
              Timeline
            </span>
            <span style={{ color: '#e94560', fontSize: 13, lineHeight: 1, opacity: 0.8, marginLeft: 'auto' }}>
              {mechanicsCollapsed ? '▶' : '▼'}
            </span>
          </button>

          {/* Action labels — hidden when collapsed */}
          <div className="relative flex-1 overflow-hidden">
            {!mechanicsCollapsed && bossActions.map((action, i) => {
              const color = DAMAGE_TYPE_COLORS[action.damage_type as keyof typeof DAMAGE_TYPE_COLORS] ?? '#888'
              const x = pullX + action.time_offset * pxPerSec
              const row = actionRows[i]
              return (
                <div
                  key={action.id}
                  className="absolute flex items-center gap-1 select-none"
                  style={{ left: x + 3, top: row * ACTION_ROW_H + 4, height: ACTION_ROW_H - 4 }}
                >
                  <div className="absolute w-px" style={{ left: -3, top: 0, bottom: 0, backgroundColor: color, opacity: 0.7 }} />
                  <div
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
                    style={{ backgroundColor: `${color}22`, border: `1px solid ${color}66`, color }}
                  >
                    <span className="font-bold">{formatTime(action.time_offset)}</span>
                    <span className="opacity-80">·</span>
                    <span>{action.name}</span>
                    <span className="text-[9px] opacity-60 capitalize" style={{ color }}>
                      ({DAMAGE_TYPE_LABELS[action.damage_type as keyof typeof DAMAGE_TYPE_LABELS]})
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


// ── Placed ability block (draggable) ──────────────────────────────────────────

interface PlacedAbilityBlockProps {
  placement: PlacedAbility
  lane: number
  laneH: number
  jobColor: string
  rowWidth: number
  pullX: number
  pxPerSec: number
  isMoving: boolean
  onRemove: (id: string) => void
}

function PlacedAbilityBlock({
  placement, lane, laneH, jobColor, rowWidth, pullX, pxPerSec, isMoving, onRemove,
}: PlacedAbilityBlockProps) {
  const ability = placement.ability
  const color =
    ability.color ??
    ABILITY_TYPE_COLORS[ability.ability_type as keyof typeof ABILITY_TYPE_COLORS] ??
    jobColor

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placed-${placement.id}`,
    data: { type: 'placed', ability, placementId: placement.id },
  })

  const left = pullX + placement.time_offset * pxPerSec
  const durWidth = Math.max(ability.duration * pxPerSec, 3)
  const cdWidth = ability.cooldown * pxPerSec
  const blockWidth = Math.min(cdWidth, rowWidth - left)
  const ICON_SIZE = Math.min(36, laneH - 12)
  const top = lane * laneH

  return (
    <div
      ref={setNodeRef}
      className="absolute group"
      style={{
        left,
        top,
        height: laneH,
        width: blockWidth,
        overflow: 'visible',
        pointerEvents: 'none',
        opacity: isDragging || isMoving ? 0.25 : 1,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 1,
      }}
      title={`${ability.name}\n${ability.duration}s duration · ${ability.cooldown}s cooldown${ability.description ? '\n' + ability.description : ''}`}
    >
      {/* Cooldown ghost — color-mix gives alpha without losing hue */}
      <div
        className="absolute rounded-sm"
        style={{
          left: 0, top: 4, bottom: 4, width: blockWidth, pointerEvents: 'none',
          backgroundColor: 'color-mix(in srgb, var(--color-cd-bar) 10%, transparent)',
        }}
      />

      {/* Duration bar fill — tinted with dur-bar color at 35% */}
      <div
        className="absolute rounded"
        style={{
          left: 0, bottom: 4, height: 8,
          width: Math.min(durWidth, rowWidth - left),
          pointerEvents: 'none',
          backgroundColor: 'color-mix(in srgb, var(--color-dur-bar) 35%, transparent)',
        }}
      />
      {/* Duration bar border at full ability color */}
      <div
        className="absolute rounded border"
        style={{
          left: 0, bottom: 4, height: 8,
          width: Math.min(durWidth, rowWidth - left),
          borderColor: color,
          backgroundColor: 'transparent',
          pointerEvents: 'none',
        }}
      />

      {/* Icon — only interactive element */}
      <div
        className="absolute cursor-grab active:cursor-grabbing"
        style={{ left: 0, top: (laneH - ICON_SIZE) / 2 - 4, width: ICON_SIZE, height: ICON_SIZE, pointerEvents: 'auto' }}
        {...listeners}
        {...attributes}
      >
        <AbilityIcon name={ability.name} color={color} icon_url={ability.icon_url} size={ICON_SIZE} />
      </div>

      {/* Label + timestamp — visual only, uses --color-label */}
      <div
        className="absolute flex flex-col justify-center whitespace-nowrap select-none"
        style={{ left: ICON_SIZE + 6, top: (laneH - 28) / 2 - 2, pointerEvents: 'none' }}
      >
        <span className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--color-label)' }}>
          {ability.name}
        </span>
        <span className="text-[9px] leading-tight" style={{ color: 'var(--color-label)', opacity: 0.7 }}>
          {formatTime(placement.time_offset)}
        </span>
      </div>

      {/* Remove button */}
      <button
        className="absolute text-[9px] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity z-10"
        style={{ left: 1, top: 2, pointerEvents: 'auto' }}
        onClick={() => onRemove(placement.id)}
        title="Remove"
      >
        ✕
      </button>
    </div>
  )
}
