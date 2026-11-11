import type { ReactNode } from 'react'
import { SapPill } from './SapPill'

interface PageShellProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div className="admin-page__status print-hide">
          <SapPill />
        </div>
        <div>
          <h1 className="admin-page__title">{title}</h1>
          {subtitle ? <div className="admin-page__subtitle">{subtitle}</div> : null}
        </div>
        {actions ? <div className="admin-page__actions print-hide">{actions}</div> : null}
      </div>
      <div className="admin-page__body">{children}</div>
    </div>
  )
}
