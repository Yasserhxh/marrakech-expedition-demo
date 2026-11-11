import { useEffect, useId, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { FiAlertCircle } from 'react-icons/fi'

export interface ComboOption {
  value: string
  label: string
  sub?: string
}

interface ComboboxProps {
  label: string
  options: ComboOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  help?: string
  required?: boolean
}

export function Combobox({ label, options, value, onChange, placeholder, disabled, error, help, required }: ComboboxProps) {
  const id = useId()
  const [ouvert, setOuvert] = useState(false)
  const [requete, setRequete] = useState('')
  const [actif, setActif] = useState(0)
  const racine = useRef<HTMLDivElement>(null)

  const selection = options.find((o) => o.value === value)

  const filtrees = useMemo(() => {
    const q = requete.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(q))
  }, [options, requete])

  const listId = `${id}-list`
  const erreurId = `${id}-err`
  const optionId = (i: number) => `${id}-opt-${i}`
  const actifId = ouvert && !disabled && filtrees[actif] ? optionId(actif) : undefined

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Garde l'option active visible dans la liste lors de la navigation clavier.
  useEffect(() => {
    if (actifId) document.getElementById(actifId)?.scrollIntoView({ block: 'nearest' })
  }, [actifId])

  const choisir = (o: ComboOption) => {
    onChange(o.value)
    setRequete('')
    setOuvert(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOuvert(true)
      setActif((a) => Math.max(0, Math.min(a + 1, filtrees.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActif((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      const o = filtrees[actif]
      if (ouvert && o) {
        e.preventDefault()
        choisir(o)
      }
    } else if (e.key === 'Escape') {
      setOuvert(false)
    }
  }

  return (
    <div className="form-field combobox" ref={racine}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        className="form-input"
        role="combobox"
        aria-expanded={ouvert}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={actifId}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? erreurId : undefined}
        placeholder={placeholder}
        disabled={disabled}
        value={ouvert ? requete : (selection?.label ?? '')}
        onChange={(e) => {
          setRequete(e.target.value)
          setActif(0)
          setOuvert(true)
        }}
        onFocus={() => {
          setRequete('')
          setActif(Math.max(0, options.findIndex((o) => o.value === value)))
          setOuvert(true)
        }}
        onBlur={(e) => {
          // Tab vers un autre champ : la liste ne doit pas rester ouverte par-dessus.
          if (!racine.current?.contains(e.relatedTarget as Node | null)) setOuvert(false)
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {ouvert && !disabled ? (
        <ul className="combobox__list" role="listbox" id={listId}>
          {filtrees.length === 0 ? (
            <li className="combobox__option text-muted" aria-disabled="true">
              Aucun résultat pour « {requete} »
            </li>
          ) : (
            filtrees.map((o, i) => (
              <li
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={o.value === value}
                className={clsx('combobox__option', i === actif && 'is-active')}
                onMouseEnter={() => setActif(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choisir(o)
                }}
              >
                <span>{o.label}</span>
                {o.sub ? <small>{o.sub}</small> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
      {error ? (
        <span className="form-error" id={erreurId}>
          <FiAlertCircle aria-hidden="true" /> {error}
        </span>
      ) : help ? (
        <span className="form-help">{help}</span>
      ) : null}
    </div>
  )
}
