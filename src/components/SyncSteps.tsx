import clsx from 'clsx'
import { FiAlertTriangle, FiCheck, FiCircle, FiLoader } from 'react-icons/fi'
import type { SyncOperation } from '@/types'
import { ETAPE_LABELS } from '@/types'

export function SyncSteps({ op }: { op: SyncOperation }) {
  return (
    <span className="sync-steps" aria-label="Étapes de synchronisation">
      {op.etapes.map((etape, i) => {
        const faite = op.etapesFaites.includes(etape)
        const courante = op.etapeCourante === etape && op.statut === 'EnCours'
        const erreur = op.etapeCourante === etape && op.statut === 'Erreur'
        return (
          <span key={etape} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {i > 0 ? (
              <span className="sync-step__arrow" aria-hidden="true">
                →
              </span>
            ) : null}
            <span
              className={clsx('sync-step', faite && 'is-done', courante && 'is-current', erreur && 'is-error')}
              title={faite ? 'Terminée' : courante ? 'En cours' : erreur ? 'En erreur' : 'À faire'}
            >
              {faite ? (
                <FiCheck aria-hidden="true" />
              ) : courante ? (
                <FiLoader aria-hidden="true" />
              ) : erreur ? (
                <FiAlertTriangle aria-hidden="true" />
              ) : (
                <FiCircle aria-hidden="true" />
              )}
              {ETAPE_LABELS[etape]}
            </span>
          </span>
        )
      })}
    </span>
  )
}
