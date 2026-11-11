import clsx from 'clsx'
import type { ReactNode } from 'react'
import { SapPill } from './SapPill'

interface PageShellProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  /** En-tête aligné à gauche. `classic` conserve le titre centré. */
  layout?: 'classic' | 'operations'
}

export function PageShell({ title, subtitle, actions, children, layout = 'operations' }: PageShellProps) {
  const titre = (
    <div className="admin-page__heading">
      <h1 className="admin-page__title">{title}</h1>
      {subtitle ? <div className="admin-page__subtitle">{subtitle}</div> : null}
    </div>
  )
  const statut = (
    <div className="admin-page__status print-hide">
      <SapPill />
    </div>
  )
  const barre = actions ? <div className="admin-page__actions print-hide">{actions}</div> : null

  return (
    <div className="admin-page">
      <div className={clsx('admin-page__head', layout === 'operations' && 'is-operations')}>
        {layout === 'operations' ? (
          <>
            {titre}
            <div className="admin-page__tools">
              {statut}
              {barre}
            </div>
          </>
        ) : (
          <>
            {statut}
            {titre}
            {barre}
          </>
        )}
      </div>
      <div className="admin-page__body">{children}</div>
    </div>
  )
}
