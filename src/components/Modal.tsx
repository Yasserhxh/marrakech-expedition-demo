import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { FiX } from 'react-icons/fi'
import { useOverlay } from './useOverlay'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ open, title, onClose, children, footer, wide }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  useOverlay(open, onClose, ref)

  if (!open) return null
  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={clsx('modal', wide && 'modal--wide')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal__head print-hide">
          <h2 id="modal-title">{title}</h2>
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
