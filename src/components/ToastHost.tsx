import clsx from 'clsx'
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi'
import { useAppStore } from '@/store/useAppStore'
import type { ToastTone } from '@/types'

const ICONES: Record<ToastTone, JSX.Element> = {
  success: <FiCheckCircle aria-hidden="true" />,
  error: <FiAlertCircle aria-hidden="true" />,
  warning: <FiAlertTriangle aria-hidden="true" />,
  info: <FiInfo aria-hidden="true" />,
}

export function ToastHost() {
  const toasts = useAppStore((s) => s.toasts)
  const fermer = useAppStore((s) => s.fermerToast)
  return (
    <div className="toast-host" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={clsx('toast', `toast--${t.tone}`)} role="status">
          {ICONES[t.tone]}
          <span>{t.message}</span>
          <button type="button" onClick={() => fermer(t.id)} aria-label="Fermer la notification">
            <FiX aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
