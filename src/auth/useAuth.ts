import { InteractionStatus } from '@azure/msal-browser'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { estModeApi } from '@/config'
import { useAppStore } from '@/store/useAppStore'
import { demanderConnexion, demanderDeconnexion } from './token'

export interface AuthEtat {
  connecte: boolean
  /** Redirection / acquisition de jeton en cours (mode api). */
  enCours: boolean
  seConnecter: () => Promise<void>
  seDeconnecter: () => Promise<void>
}

const DELAI_CONNEXION_SIMULEE_MS = 700
const UTILISATEUR_DEMO = { nom: 'Yasmine EL FASSI', email: 'y.elfassi@cimar.ma' }

function useAuthMock(): AuthEtat {
  const utilisateur = useAppStore((s) => s.utilisateur)
  const connecter = useAppStore((s) => s.connecter)
  const deconnecter = useAppStore((s) => s.deconnecter)
  return {
    connecte: utilisateur !== null,
    enCours: false,
    seConnecter: () =>
      new Promise((resolve) => {
        window.setTimeout(() => {
          connecter(UTILISATEUR_DEMO)
          resolve()
        }, DELAI_CONNEXION_SIMULEE_MS)
      }),
    seDeconnecter: async () => deconnecter(),
  }
}

function useAuthMsal(): AuthEtat {
  const connecte = useIsAuthenticated()
  const { inProgress } = useMsal()
  const deconnecter = useAppStore((s) => s.deconnecter)
  return {
    connecte,
    enCours: inProgress !== InteractionStatus.None,
    seConnecter: demanderConnexion,
    seDeconnecter: async () => {
      deconnecter()
      await demanderDeconnexion()
    },
  }
}

/** Le mode est fixé au démarrage : le choix du hook est stable pendant toute la vie de l'application. */
export const useAuth: () => AuthEtat = estModeApi ? useAuthMsal : useAuthMock
