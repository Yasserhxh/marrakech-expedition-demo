import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { FiX } from 'react-icons/fi'
import { useDialogue } from './useDialogue'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  /** Un clic sur le fond ferme la fenêtre. Désactivé pour les confirmations. */
  dismissible?: boolean
}

export function Modal({ open, title, onClose, children, footer, wide, dismissible = true }: ModalProps) {
  const titreId = useId()
  const ref = useDialogue(open, onClose)

  if (!open) return null
  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={clsx('modal', wide && 'modal--wide')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal__head print-hide">
          <h2 id={titreId}>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <FiX size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__foot print-hide">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
