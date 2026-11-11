import type { SapService } from '@/services/types'
import { useAppStore } from '@/store/useAppStore'

const LATENCE_SIMULEE_MS = 380

/** Démo : l'état SAP est piloté par l'interrupteur de la barre de démonstration. */
export const mockSapService: SapService = {
  async statut() {
    const enLigne = useAppStore.getState().sapOnline
    return {
      enLigne,
      verifieAtUtc: new Date().toISOString(),
      latenceMs: enLigne ? LATENCE_SIMULEE_MS : undefined,
      detail: enLigne ? 'Simulation : SAP en ligne' : 'Simulation : SAP hors ligne',
    }
  },
}
