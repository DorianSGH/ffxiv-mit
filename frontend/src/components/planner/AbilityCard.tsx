import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Ability } from '../../types'
import { ABILITY_TYPE_COLORS, formatTime } from '../../lib/utils'
import { nextReadyTime } from '../../hooks/useCooldownState'
import AbilityIcon from '../AbilityIcon'

interface Props {
  ability: Ability
  jobColor: string
  cooldownWindows: [number, number][] | undefined
  cooldownRemaining: number
}

export default function AbilityCard({ ability, jobColor, cooldownWindows, cooldownRemaining }: Props) {
  const ready = cooldownRemaining <= 0
  const color = ability.color ?? ABILITY_TYPE_COLORS[ability.ability_type as keyof typeof ABILITY_TYPE_COLORS] ?? jobColor

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `ability-${ability.id}`,
    data: { ability, type: 'ability-source' },
    disabled: !ready,
  })

  const nextReady = !ready ? nextReadyTime(cooldownWindows) : null

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
        backgroundColor: `${color}18`,
        borderColor: ready ? color : `${color}44`,
        color: ready ? color : `${color}77`,
      }}
      {...(ready ? { ...listeners, ...attributes } : {})}
      className={`
        relative select-none rounded-md border transition-all duration-150 overflow-hidden
        ${ready ? 'cursor-grab active:cursor-grabbing hover:brightness-110' : 'cursor-not-allowed'}
      `}
      title={[
        ability.name,
        `Duration: ${ability.duration}s`,
        `Cooldown: ${ability.cooldown}s`,
        !ready && nextReady != null ? `Ready at: ${formatTime(nextReady)}` : '',
        ability.description ?? '',
      ].filter(Boolean).join('\n')}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <AbilityIcon
          name={ability.name}
          color={color}
          icon_url={ability.icon_url}
          size={24}
          dimmed={!ready}
        />
        <div className="min-w-0">
          <div className="text-xs font-medium truncate leading-tight">{ability.name}</div>
          <div className="flex items-center gap-1.5 text-[10px] opacity-60 mt-0.5">
            <span>{ability.duration}s</span>
            <span>·</span>
            <span>CD {ability.cooldown}s</span>
          </div>
        </div>
      </div>

      {!ready && nextReady != null && (
        <div
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold rounded-md"
          style={{ backgroundColor: `${color}22` }}
        >
          <span style={{ color }}>{formatTime(nextReady)}</span>
        </div>
      )}
    </div>
  )
}
