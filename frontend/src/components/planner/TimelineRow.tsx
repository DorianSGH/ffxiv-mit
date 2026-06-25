import { useDroppable } from '@dnd-kit/core'
import type { BossAction, Job, PlacedAbility } from '../../types'
import { ABILITY_TYPE_COLORS, DAMAGE_TYPE_COLORS, DAMAGE_TYPE_LABELS, formatTime, roleColor } from '../../lib/utils'
import JobIcon from '../JobIcon'
import AbilityIcon from '../AbilityIcon'

const JOB_LABEL_W = 96  // px — must match the w-24 on the sticky label

interface TimelineRowProps {
  job: Job
  placements: PlacedAbility[]
  fightDuration: number
  prepullOffset: number
  pxPerSec: number
  onRemove: (placementId: string) => void
}

export default function TimelineRow({
  job, placements, fightDuration, prepullOffset, pxPerSec, onRemove,
}: TimelineRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `timeline-row-${job.id}`,
    data: { jobId: job.id },
  })

  const jColor = roleColor(job.role)
  const totalSeconds = prepullOffset + fightDuration
  const rowWidth = totalSeconds * pxPerSec
  const pullX = prepullOffset * pxPerSec

  return (
    <div className="flex border-b border-border/40 last:border-0" style={{ minHeight: 64 }}>
      {/* ── Sticky job label ─────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-2 bg-surface z-10"
        style={{
          width: JOB_LABEL_W,
          position: 'sticky',
          left: 0,
          borderRight: `2px solid ${jColor}44`,
        }}
      >
        <JobIcon
          name={job.name}
          abbreviation={job.abbreviation}
          color={jColor}
          icon_url={job.icon_url}
          size={30}
        />
        <div className="min-w-0">
          <div className="text-xs font-bold leading-tight truncate" style={{ color: jColor }}>
            {job.abbreviation}
          </div>
          <div className="text-[9px] text-gray-500 capitalize">{job.role}</div>
        </div>
      </div>

      {/* ── Drop zone ────────────────────────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className="relative transition-colors"
        style={{
          width: rowWidth,
          minHeight: 56,
          backgroundColor: isOver ? 'rgba(233,69,96,0.06)' : 'transparent',
        }}
      >
        {/* Prepull shaded zone */}
        {prepullOffset > 0 && (
          <div
            className="absolute inset-y-0 pointer-events-none"
            style={{
              left: 0,
              width: pullX,
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRight: '1px dashed rgba(255,255,255,0.15)',
            }}
          />
        )}

        {/* Grid lines every 30s */}
        {Array.from({ length: Math.floor(fightDuration / 30) }).map((_, i) => (
          <div
            key={i}
            className="absolute inset-y-0 border-l border-border/25"
            style={{ left: pullX + (i + 1) * 30 * pxPerSec }}
          />
        ))}

        {/* Placed abilities */}
        {placements.map(p => {
          const ability = p.ability
          const color =
            ability.color ??
            ABILITY_TYPE_COLORS[ability.ability_type as keyof typeof ABILITY_TYPE_COLORS] ??
            job.color
          const left = pullX + p.time_offset * pxPerSec
          // Duration bar width — strictly represents the ability duration, no minimum.
          // Short abilities (e.g. 3s) will be narrow bars; the icon floats above.
          const durWidth = Math.max(ability.duration * pxPerSec, 3)
          const cdWidth = ability.cooldown * pxPerSec
          const ICON_SIZE = 36

          return (
            <div
              key={p.id}
              className="absolute group"
              style={{ left, top: 0, bottom: 0 }}
              title={`${ability.name}
              ${ability.duration}s duration · ${ability.cooldown}s cooldown${ability.description ? '' + ability.description : ''}`}
              >
              {/* Cooldown ghost — full cooldown width, faint */}
              <div
                className="absolute rounded-sm opacity-[0.07]"
                style={{
                  left: 0, top: 4, bottom: 4,
                  width: Math.min(cdWidth, rowWidth - left),
                  backgroundColor: color,
                }}
              />

              {/* Duration bar — exact duration width, sits in lower portion of row */}
              <div
                className="absolute rounded border cursor-pointer hover:brightness-110 transition-all"
                style={{
                  left: 0,
                  bottom: 4,
                  height: 10,
                  width: Math.min(durWidth, rowWidth - left),
                  backgroundColor: `${color}55`,
                  borderColor: color,
                }}
              />

              {/* Icon + label — floats above the bar, not clipped by duration width */}
              <div
                className="absolute flex items-center gap-1.5 cursor-pointer"
                style={{ left: 0, top: 4 }}
              >
                <AbilityIcon
                  name={ability.name}
                  color={color}
                  icon_url={ability.icon_url}
                  size={ICON_SIZE}
                />
                <span
                  className="text-[11px] font-semibold leading-tight whitespace-nowrap"
                  style={{ color }}
                >
                  {ability.name}
                </span>
              </div>

              {/* Remove button — appears on hover over the whole placement */}
              <button
                className="absolute text-[9px] opacity-0 group-hover:opacity-100
                           hover:text-red-400 transition-opacity z-10"
                style={{ right: -8, top: 2 }}
                onClick={() => onRemove(p.id)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ── Ruler + boss action lane ──────────────────────────────────────────────────

interface RulerProps {
  fightDuration: number
  prepullOffset: number
  pxPerSec: number
  bossActions?: BossAction[]
}

// Height (px) of a single boss-action label row
const ACTION_ROW_H = 28

export function TimelineRuler({
  fightDuration, prepullOffset, pxPerSec, bossActions = [],
}: RulerProps) {
  const totalSeconds = prepullOffset + fightDuration
  const pullX = prepullOffset * pxPerSec

  // Always tick on multiples of 30 relative to t=0 (the pull).
  // Prepull ticks go backwards from 0 in 30s steps, fight ticks forward.
  const ticks: number[] = []
  for (let t = 0; t >= -prepullOffset; t -= 30) ticks.unshift(t)
  for (let t = 30; t <= fightDuration; t += 30) ticks.push(t)

  // Assign each boss action to one of MAX_ROWS rows so labels don't overlap.
  // Strategy: for each action, try rows 0→MAX_ROWS-1 in order and pick the first
  // one where the action's x position is past the previous label's right edge.
  // Label width is estimated as: timestamp (5 chars) + ' · ' + name + ' (type)' chars,
  // multiplied by ~7px/char at text-[10px], plus 20px padding.
  const MAX_ROWS = 3
  const GAP_PX = 12  // minimum gap between labels in the same row

  function labelWidthPx(action: BossAction): number {
    const text = formatTime(action.time_offset)
      + ' · ' + action.name
      + ' (' + (DAMAGE_TYPE_LABELS[action.damage_type as keyof typeof DAMAGE_TYPE_LABELS] ?? action.damage_type) + ')'
    return text.length * 7 + 20
  }

  // rowRightEdge[r] = x pixel where the last label in row r ends
  const rowRightEdge: number[] = Array(MAX_ROWS).fill(-Infinity)

  const actionRows: number[] = bossActions.map(action => {
    const x = pullX + action.time_offset * pxPerSec
    const w = labelWidthPx(action)
    // Try each row in order, pick first that fits
    let assigned = 0
    for (let r = 0; r < MAX_ROWS; r++) {
      if (x >= rowRightEdge[r] + GAP_PX) {
        assigned = r
        break
      }
      // No row fits — use the row whose right edge is earliest (least overlap)
      if (r === MAX_ROWS - 1) {
        assigned = rowRightEdge.indexOf(Math.min(...rowRightEdge))
      }
    }
    rowRightEdge[assigned] = x + w
    return assigned
  })
  // Only allocate height for rows that are actually used
  const usedRows = actionRows.length > 0 ? Math.max(...actionRows) + 1 : 0
  const numRows = usedRows

  return (
    <div
      className="border-b border-border/60 bg-surface"
      style={{ position: 'sticky', top: 0, zIndex: 20 }}
    >
      <div className="flex">
        {/* Sticky corner — blank space above the job labels */}
        <div
          className="shrink-0 bg-surface z-30"
          style={{ width: 96, position: 'sticky', left: 0 }}
        />

        {/* Scrolling header area */}
        <div className="relative" style={{ width: totalSeconds * pxPerSec }}>
          {/* Pull line */}
          {prepullOffset > 0 && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-accent/50"
              style={{ left: pullX }}
            />
          )}

          {/* Time ticks */}
          <div className="h-7 relative">
            {ticks.map(t => (
              <div
                key={t}
                className="absolute flex flex-col items-start"
                style={{ left: pullX + t * pxPerSec }}
              >
                <span
                  className="text-[10px] ml-1 leading-tight select-none"
                  style={{ color: t < 0 ? '#555' : '#777' }}
                >
                  {formatTime(t)}
                </span>
                <div className="w-px h-2 bg-border/50" />
              </div>
            ))}
          </div>

          {/* Boss action label rows */}
          {numRows > 0 && (
            <div style={{ height: numRows * ACTION_ROW_H }} className="relative">
              {bossActions.map((action, i) => {
                const color =
                  DAMAGE_TYPE_COLORS[action.damage_type as keyof typeof DAMAGE_TYPE_COLORS] ?? '#888'
                const x = pullX + action.time_offset * pxPerSec
                const row = actionRows[i]

                return (
                  <div
                    key={action.id}
                    className="absolute flex items-center gap-1 select-none"
                    style={{
                      left: x + 3,
                      top: row * ACTION_ROW_H + 2,
                      height: ACTION_ROW_H - 4,
                    }}
                  >
                    {/* Vertical tick down from ruler */}
                    <div
                      className="absolute w-px"
                      style={{
                        left: -3,
                        top: 0,
                        bottom: 0,
                        backgroundColor: color,
                        opacity: 0.7,
                      }}
                    />
                    {/* Label pill */}
                    <div
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: `${color}22`,
                        border: `1px solid ${color}66`,
                        color,
                      }}
                    >
                      <span className="font-bold">{formatTime(action.time_offset)}</span>
                      <span className="opacity-80">·</span>
                      <span>{action.name}</span>
                      <span
                        className="text-[9px] opacity-60 capitalize"
                        style={{ color }}
                      >
                        ({DAMAGE_TYPE_LABELS[action.damage_type as keyof typeof DAMAGE_TYPE_LABELS]})
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
