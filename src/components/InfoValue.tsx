import clsx from 'clsx'
import type { ReactNode } from 'react'

interface InfoValueProps {
  children: ReactNode
  /** Identifiant ou métadonnée, toujours sur sa propre ligne. */
  meta?: ReactNode
  /** Libellé court au-dessus de la valeur, sans se coller au texte. */
  kicker?: ReactNode
  mono?: boolean
  metaMono?: boolean
}

export function InfoValue({ children, meta, kicker, mono = false, metaMono = false }: InfoValueProps) {
  const metaVisible = meta !== undefined && meta !== null && meta !== false && meta !== ''
  return (
    <span className="info-value">
      {kicker ? <span className="info-value__kicker">{kicker}</span> : null}
      <span className={clsx('info-value__primary', mono && 'mono')}>{children}</span>
      {metaVisible ? <span className={clsx('info-value__meta', metaMono && 'mono')}>{meta}</span> : null}
    </span>
  )
}
