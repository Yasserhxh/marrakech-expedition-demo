import { useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import { FiAlertCircle, FiCloudOff, FiLoader } from 'react-icons/fi'
import type { ResultatLookup, SourceLookup } from '@/types'

export const DEBOUNCE_MS = 300
export const CODE_SAP_MAX = 10
/** Tous les codes SAP : 1 à 10 chiffres (décision 11/11). */
export const CODE_SAP_REGEX = /^\d{1,10}$/
export const AIDE_CODE_NON_VERIFIE = 'Code non vérifié — SAP indisponible'

export interface LigneLookup {
  code: string
  nom: string
  /** Texte secondaire (ville, immatriculation…). */
  sub?: string
}

export interface CodeSapLookupProps<T extends LigneLookup> {
  id?: string
  label: string
  /** Code saisi ou choisi (chiffres uniquement). */
  value: string
  /** `item` est fourni quand la ligne vient d'une réponse SAP/Cache, absent quand le code est saisi tel quel. */
  onChange: (code: string, item?: T) => void
  rechercher: (prefixe: string) => Promise<ResultatLookup<T>>
  /** Nombre minimal de chiffres avant d'interroger (3 pour les clients, 1 pour un code exact). */
  minChiffres?: number
  /** Liste préchargée (ex. chantiers du client) affichée dès le focus, sans interroger `rechercher`. */
  options?: ResultatLookup<T>
  /** SAP injoignable (`/api/sap/statut`) : le code est accepté tel quel, sans liste bloquante. */
  sapOnline: boolean
  /** Nom de la ligne choisie, affiché sous le champ. */
  nomSelectionne?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  help?: string
}

const LIBELLE_SOURCE: Record<SourceLookup, string> = { Sap: 'SAP', Cache: 'Cache local' }

function texteLigne<T extends LigneLookup>(l: T): string {
  return `${l.code} — ${l.nom}`
}

export function CodeSapLookup<T extends LigneLookup>({
  id: idProp,
  label,
  value,
  onChange,
  rechercher,
  minChiffres = 3,
  options,
  sapOnline,
  nomSelectionne,
  placeholder,
  disabled,
  required,
  error,
  help,
}: CodeSapLookupProps<T>) {
  const idGenere = useId()
  const id = idProp ?? idGenere
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(0)
  const [chargement, setChargement] = useState(false)
  const [resultat, setResultat] = useState<ResultatLookup<T> | null>(null)
  const [rechercheFaite, setRechercheFaite] = useState(false)
  const racine = useRef<HTMLDivElement>(null)
  const requeteEnCours = useRef(0)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Recherche différée (300 ms) dès que le préfixe atteint `minChiffres` ; une liste préchargée remplace l'appel.
  useEffect(() => {
    if (options || !ouvert || value.length < minChiffres || !CODE_SAP_REGEX.test(value)) return
    const numero = ++requeteEnCours.current
    const minuteur = window.setTimeout(() => {
      setChargement(true)
      rechercher(value)
        .then((r) => {
          if (numero !== requeteEnCours.current) return
          setResultat(r)
          setRechercheFaite(true)
          setActif(0)
        })
        .catch(() => {
          if (numero !== requeteEnCours.current) return
          setResultat({ source: 'Cache', items: [] })
          setRechercheFaite(true)
        })
        .finally(() => {
          if (numero === requeteEnCours.current) setChargement(false)
        })
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(minuteur)
  }, [value, ouvert, minChiffres, options, rechercher])

  const liste = options ?? resultat
  const lignes = (liste?.items ?? []).filter(
    (l) => options === undefined || value === '' || l.code.startsWith(value),
  )
  const codeValide = value === '' || CODE_SAP_REGEX.test(value)
  const nonVerifie =
    value !== '' && !nomSelectionne && (!sapOnline || (rechercheFaite && lignes.length === 0))

  const choisir = (l: T) => {
    onChange(l.code, l)
    setOuvert(false)
  }

  const saisir = (brut: string) => {
    const chiffres = brut.replace(/\D/g, '').slice(0, CODE_SAP_MAX)
    setRechercheFaite(false)
    setResultat(null)
    onChange(chiffres)
    setOuvert(true)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOuvert(true)
      setActif((a) => Math.min(a + 1, Math.max(lignes.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActif((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      const l = lignes[actif]
      if (ouvert && l) {
        e.preventDefault()
        choisir(l)
      }
    } else if (e.key === 'Escape') {
      setOuvert(false)
    }
  }

  const listId = `${id}-list`
  const erreurId = `${id}-err`
  const aideId = `${id}-aide`
  const erreurAffichee = error ?? (!codeValide ? `Code SAP : 1 à ${CODE_SAP_MAX} chiffres` : undefined)
  const aide = nomSelectionne ?? (nonVerifie ? AIDE_CODE_NON_VERIFIE : help)

  return (
    <div className="form-field combobox" ref={racine}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        className="form-input mono"
        role="combobox"
        inputMode="numeric"
        aria-expanded={ouvert}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={erreurAffichee ? true : undefined}
        aria-describedby={erreurAffichee ? erreurId : aide ? aideId : undefined}
        aria-busy={chargement || undefined}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        maxLength={CODE_SAP_MAX}
        onChange={(e) => saisir(e.target.value)}
        onFocus={() => setOuvert(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {ouvert && !disabled && liste && (lignes.length > 0 || chargement) ? (
        <ul className="combobox__list" role="listbox" id={listId} aria-label={`Résultats ${label}`}>
          <li className="combobox__source" aria-hidden="true">
            {chargement ? (
              <>
                <FiLoader /> Recherche…
              </>
            ) : (
              <span className={clsx('badge', liste.source === 'Sap' ? 'badge--success' : 'badge--pending')}>
                {LIBELLE_SOURCE[liste.source]}
              </span>
            )}
          </li>
          {lignes.map((l, i) => (
            <li
              key={l.code}
              role="option"
              aria-selected={l.code === value}
              className={clsx('combobox__option', i === actif && 'is-active')}
              onMouseEnter={() => setActif(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choisir(l)
              }}
            >
              <span>{texteLigne(l)}</span>
              {l.sub ? <small>{l.sub}</small> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {erreurAffichee ? (
        <span className="form-error" id={erreurId}>
          <FiAlertCircle aria-hidden="true" /> {erreurAffichee}
        </span>
      ) : aide ? (
        <span className={clsx('form-help', nonVerifie && 'form-help--warn')} id={aideId}>
          {nonVerifie ? <FiCloudOff aria-hidden="true" /> : null} {aide}
        </span>
      ) : null}
    </div>
  )
}
