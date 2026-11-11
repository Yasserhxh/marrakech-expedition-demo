import clsx from 'clsx'
import type { ReactNode } from 'react'
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi'

type Tone = 'info' | 'warning' | 'danger' | 'success'

const ICONES: Record<Tone, JSX.Element> = {
  info: <FiInfo aria-hidden="true" />,
  warning: <FiAlertTriangle aria-hidden="true" />,
  danger: <FiAlertCircle aria-hidden="true" />,
  success: <FiCheckCircle aria-hidden="true" />,
}

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={clsx('notice', `notice--${tone}`)} role={tone === 'danger' ? 'alert' : 'status'}>
      {ICONES[tone]}
      <div>{children}</div>
    </div>
  )
}
