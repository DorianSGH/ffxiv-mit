/** Renders a job avatar: custom icon_url if set, otherwise coloured letter badge */
interface Props {
  name: string
  abbreviation: string
  color: string
  icon_url?: string
  size?: number   // px, default 28
  className?: string
}

export default function JobIcon({ name, abbreviation, color, icon_url, size = 28, className = '' }: Props) {
  const style = { width: size, height: size, minWidth: size }

  if (icon_url) {
    return (
      <img
        src={icon_url}
        alt={name}
        className={`rounded object-cover ${className}`}
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
      className={`rounded flex items-center justify-center font-bold shrink-0 ${className}`}
      style={{
        ...style,
        fontSize: Math.max(8, size * 0.35),
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {abbreviation.slice(0, 3)}
    </div>
  )
}
