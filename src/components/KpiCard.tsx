import clsx from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'default' | 'info' | 'warning' | 'danger' | 'success'

interface KpiCardProps {
  title: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  tone?: Tone
  onClick?: () => void
  selected?: boolean
}

export function KpiCard({ title, value, hint, icon, tone = 'default', onClick, selected }: KpiCardProps) {
  const contenu = (
    <>
      {icon ? (
        <span className={clsx('kpi-icon', tone !== 'default' && `tone-${tone}`)} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>
        <span className="kpi-title">{title}</span>
        <span className={clsx('kpi-value', tone !== 'default' && `tone-${tone}`)} style={{ display: 'block' }}>
          {value}
        </span>
        {hint ? <span className="kpi-hint" style={{ display: 'block' }}>{hint}</span> : null}
      </span>
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        className={clsx('kpi-card is-clickable', selected && 'is-selected')}
        onClick={onClick}
        aria-pressed={selected}
      >
        {contenu}
      </button>
    )
  }
  return <div className="kpi-card">{contenu}</div>
}
