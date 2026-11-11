import { queryClient } from '@/app/queryClient'
import { services } from '@/services'
import { modeApi } from '@/services/http/config'
import { interrompreSynchronisations } from '@/services/mock/MockSyncService'
import { jeuDemo } from '@/services/mock/jeuDemo'
import { useAppStore } from '@/store/useAppStore'
import { notifier } from '@/utils/notifier'

/** Remet le jeu simulé et le cache. Retourne false si le mode HTTP est actif. */
export function reinitialiserDemonstration(): boolean {
  if (modeApi() !== 'mock') {
    notifier('error', "La réinitialisation des données n'est disponible qu'en mode démonstration.")
    return false
  }
  interrompreSynchronisations()
  services.pesee.arreterSimulation()
  void queryClient.cancelQueries()
  jeuDemo.reinitialiser()
  useAppStore.getState().reinitialiserInterface()
  return true
}
