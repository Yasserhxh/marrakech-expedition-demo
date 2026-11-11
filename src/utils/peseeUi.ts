import { LECTURES_IDENTIQUES_POUR_STABLE } from '@/domain/pesee'
import type { PoidsState } from '@/store/useAppStore'

/** Explique pourquoi la validation est disponible ou bloquée, à partir de l'état réel du pont. */
export function motifValidation(poids: PoidsState, pret: string): string {
  if (!poids.connecte) return 'Pont déconnecté : la validation est bloquée.'
  if (!poids.enCours) return 'Aucun camion sur le pont. La validation reste bloquée.'
  if (!poids.stable) {
    if (poids.lecturesIdentiques > 0) {
      return `Stabilisation en cours — ${poids.lecturesIdentiques} lectures sur ${LECTURES_IDENTIQUES_POUR_STABLE}.`
    }
    return 'Poids instable. La validation reste bloquée tant que la lecture n’est pas stable.'
  }
  return pret
}
