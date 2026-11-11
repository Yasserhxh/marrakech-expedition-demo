import { FiWifiOff } from 'react-icons/fi'
import { Notice } from '@/components/Notice'
import type { PoidsState } from '@/store/useAppStore'

const DETAIL: Record<Exclude<PoidsState['etat'], 'Connected'>, string> = {
  Disconnected: "l'agent du pont n'est pas connecté à l'API",
  Stale: 'aucune lecture reçue depuis 10 s (Databridge arrêté ou fichier non mis à jour ?)',
  Error: 'le pont signale une erreur de lecture',
}

/** Bandeau « Pont déconnecté » sur Disconnected | Error | Stale (ou lecture périmée). */
export function PontDeconnecte({
  poids,
}: {
  poids: Pick<PoidsState, 'pont' | 'etat' | 'connecte' | 'stale'>
}) {
  if (poids.connecte && !poids.stale && poids.etat === 'Connected') return null
  const etat = poids.etat === 'Connected' ? 'Stale' : poids.etat
  return (
    <Notice tone="danger">
      <FiWifiOff aria-hidden="true" /> <strong>Pont {poids.pont} déconnecté</strong> — {DETAIL[etat]}. La
      validation est bloquée tant qu'une lecture stable et récente n'est pas reçue.
    </Notice>
  )
}
