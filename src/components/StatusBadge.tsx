import clsx from 'clsx'
import {
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiHome,
  FiLogIn,
  FiLogOut,
  FiMinus,
  FiRefreshCw,
  FiXCircle,
} from 'react-icons/fi'
import type { Conditionnement, Origine, StatutCommande, StatutSynchro } from '@/types'
import { STATUT_LABELS, SYNCHRO_LABELS } from '@/types'

const STATUT_STYLE: Record<StatutCommande, { cls: string; icon: JSX.Element }> = {
  Creee: { cls: 'badge--neutral', icon: <FiFileText aria-hidden="true" /> },
  EntreeAutorisee: { cls: 'badge--info', icon: <FiLogIn aria-hidden="true" /> },
  DansUsine: { cls: 'badge--blue', icon: <FiHome aria-hidden="true" /> },
  SortieAutorisee: { cls: 'badge--info', icon: <FiLogOut aria-hidden="true" /> },
  Livree: { cls: 'badge--success', icon: <FiCheck aria-hidden="true" /> },
  Synchronisee: { cls: 'badge--success-strong', icon: <FiCheckCircle aria-hidden="true" /> },
  Annulee: { cls: 'badge--cancelled', icon: <FiXCircle aria-hidden="true" /> },
  ErreurSynchro: { cls: 'badge--danger', icon: <FiAlertTriangle aria-hidden="true" /> },
}

export function StatutBadge({ statut }: { statut: StatutCommande }) {
  const s = STATUT_STYLE[statut]
  return (
    <span className={clsx('badge', s.cls)}>
      {s.icon}
      {STATUT_LABELS[statut]}
    </span>
  )
}

const SYNCHRO_STYLE: Record<StatutSynchro, { cls: string; icon: JSX.Element }> = {
  Aucune: { cls: 'badge--neutral', icon: <FiMinus aria-hidden="true" /> },
  EnAttente: { cls: 'badge--pending', icon: <FiClock aria-hidden="true" /> },
  EnCours: { cls: 'badge--info badge--running', icon: <FiRefreshCw aria-hidden="true" /> },
  Synchronisee: { cls: 'badge--success', icon: <FiCheckCircle aria-hidden="true" /> },
  Erreur: { cls: 'badge--danger', icon: <FiAlertTriangle aria-hidden="true" /> },
}

export function SynchroBadge({ synchro, sapNatif }: { synchro: StatutSynchro; sapNatif?: boolean }) {
  if (synchro === 'Aucune') {
    return (
      <span className="text-muted" title={sapNatif ? 'Commande SAP : aucune synchronisation nécessaire' : undefined}>
        —
      </span>
    )
  }
  const s = SYNCHRO_STYLE[synchro]
  return (
    <span className={clsx('badge', s.cls)}>
      {s.icon}
      {SYNCHRO_LABELS[synchro]}
    </span>
  )
}

export function OrigineBadge({ origine }: { origine: Origine }) {
  return (
    <span className={clsx('badge', origine === 'Sap' ? 'badge--neutral' : 'badge--pending')}>
      {origine === 'Sap' ? 'SAP' : 'Locale'}
    </span>
  )
}

export function ConditionnementBadge({ conditionnement }: { conditionnement: Conditionnement }) {
  return (
    <span className={clsx('badge', conditionnement === 'VRAC' ? 'badge--vrac' : 'badge--sac')}>{conditionnement}</span>
  )
}
