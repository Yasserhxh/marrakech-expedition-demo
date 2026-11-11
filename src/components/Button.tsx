import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'teal'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTES: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-action',
  outline: 'btn-ghost',
  ghost: 'btn-quiet',
  danger: 'btn-danger',
  teal: 'btn-teal',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  block?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  className,
  disabled,
  type = 'button',
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const inactif = Boolean(disabled || loading)
  return (
    <button
      type={type}
      className={clsx(
        VARIANTES[variant],
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        block && 'btn-block',
        loading && 'is-loading',
        className,
      )}
      disabled={inactif}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (inactif) return
        onClick?.(event)
      }}
      {...rest}
    >
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
