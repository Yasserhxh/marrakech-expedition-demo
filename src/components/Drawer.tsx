import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import { useDialogue } from './useDialogue'

interface DrawerProps {
  open: boolean
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Drawer({ open, title, subtitle, onClose, children, footer }: DrawerProps) {
  const titreId = useId()
  const ref = useDialogue(open, onClose)

  if (!open) return null
  return createPortal(
    <>
      <div className="drawer-overlay" onMouseDown={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby={titreId} tabIndex={-1} ref={ref}>
        <div className="drawer__head">
          <div>
            <h2 id={titreId}>{title}</h2>
            {subtitle ? <div className="drawer__subtitle">{subtitle}</div> : null}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer le panneau">
            <FiX size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="drawer__body">{children}</div>
        {footer ? <div className="drawer__foot">{footer}</div> : null}
      </aside>
    </>,
    document.body,
  )
}
