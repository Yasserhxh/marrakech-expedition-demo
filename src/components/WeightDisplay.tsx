import clsx from 'clsx'
import { FiActivity, FiCheckCircle } from 'react-icons/fi'
import { PONTS } from '@/data/mock'
import type { Pont } from '@/types'
import { formatHeure, formatNombre } from '@/utils/format'

interface WeightDisplayProps {
  label: string
  pont: Pont
  onPontChange: (pont: Pont) => void
  lectureKg: number
  stable: boolean
  derniereLectureUtc: string | null
  connecte: boolean
  enCours?: boolean
}

export function WeightDisplay({
  label,
  pont,
  onPontChange,
  lectureKg,
  stable,
  derniereLectureUtc,
  connecte,
  enCours = false,
}: WeightDisplayProps) {
  const presence =
    !connecte
      ? 'Pont déconnecté'
      : !enCours && lectureKg === 0
        ? 'Aucun camion'
        : stable
          ? 'Stable'
          : lectureKg > 0
            ? 'Stabilisation en cours'
            : 'Camion détecté'
  const exploitable = connecte && stable && lectureKg > 0
  const instable = connecte && enCours && !stable && lectureKg > 0
  const consigne = !connecte
    ? 'Connexion interrompue — la pesée ne peut pas être validée'
    : !enCours && lectureKg === 0
      ? 'Aucun camion sur le pont'
      : stable
        ? 'Stable — pesée exploitable'
        : 'Instable — en attente de 15 lectures identiques'
  return (
    <div className="weighbridge">
      <div className="weighbridge__toolbar">
        <div className="bridge-selector" role="group" aria-label="Choix du pont bascule">
          {PONTS.map((p) => {
            const matiere = p.usage === 'matiere'
            return (
              <button
                key={p.code}
                type="button"
                aria-pressed={pont === p.code}
                disabled={matiere}
                title={matiere ? `${p.code} : pont matière (non utilisé pour le ciment)` : `${p.code} : pont ciment`}
                onClick={() => onPontChange(p.code)}
              >
                {p.code}
                {matiere ? ' · matière' : ''}
              </button>
            )
          })}
        </div>
        <div className="bridge-status" role="status">
          <span className={clsx('dot', !connecte && 'is-off')} aria-hidden="true" />
          {connecte ? `${pont} connecté (Databridge)` : `${pont} déconnecté`}
          <span aria-hidden="true">·</span>
          <span>Dernière lecture {derniereLectureUtc ? formatHeure(derniereLectureUtc, true) : '—'}</span>
        </div>
      </div>

      <div className="weighbridge-display" aria-live="polite" aria-atomic="true">
        <span className="weighbridge-display__label">{label}</span>
        <span className={clsx('weighbridge-display__value', instable && 'is-unstable')}>
          {formatNombre(lectureKg)}
          <small>kg</small>
        </span>
        <span className="weighbridge-display__meta">
          {pont} · {presence}
        </span>
      </div>

      <div className={clsx('stable-banner', exploitable ? 'is-stable' : 'is-unstable')} role="status">
        {exploitable ? <FiCheckCircle aria-hidden="true" /> : <FiActivity aria-hidden="true" />}
        {consigne}
      </div>
    </div>
  )
}
