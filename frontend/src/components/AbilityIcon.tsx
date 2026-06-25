/** Renders an ability icon: custom icon_url if set, otherwise coloured initials badge */
interface Props {
  name: string
  color: string
  icon_url?: string
  size?: number
  dimmed?: boolean
  className?: string
}

export default function AbilityIcon({ name, color, icon_url, size = 24, dimmed = false, className = '' }: Props) {
  const style = { width: size, height: size, minWidth: size, opacity: dimmed ? 0.4 : 1 }

  if (icon_url) {
    return (
      <img
        src={icon_url}
        alt={name}
        className={`rounded object-cover shrink-0 ${className}`}
        style={style}
        onError={e => {
          const el = e.currentTarget
          el.style.display = 'none'
          el.nextElementSibling?.removeAttribute('hidden')
        }}
      />
    )
  }

  return (
    <div
      className={`rounded shrink-0 flex items-center justify-center font-bold ${className}`}
      style={{
        ...style,
        fontSize: Math.max(7, size * 0.33),
        backgroundColor: `${color}33`,
        color,
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}
