import { config, estModeApi } from '@/config'
import { useAppStore } from '@/store/useAppStore'
import { demanderConnexion, obtenirTokenApi } from '@/auth/token'
import type { Services } from './types'
import { creerApiClient, type ApiClient } from './http/apiClient'
import { creerHttpCommandesService } from './http/HttpCommandesService'
import { creerHttpReferentielsService } from './http/HttpReferentielsService'
import { creerHttpSapService } from './http/HttpSapService'
import { creerHttpSapLookupService } from './http/HttpSapLookupService'
import { creerHttpPeseeService } from './http/HttpPeseeService'
import { creerConnexionHubPoids } from './http/hubPoids'
import { mockCommandesService } from './mock/MockCommandesService'
import { mockPeseeService } from './mock/MockPeseeService'
import { mockSyncService } from './mock/MockSyncService'
import { mockReferentielsService } from './mock/MockReferentielsService'
import { mockSapService } from './mock/MockSapService'
import { mockSapLookupService } from './mock/MockSapLookupService'

function creerServicesMock(): Services {
  return {
    commandes: mockCommandesService,
    pesee: mockPeseeService,
    sync: mockSyncService,
    referentiels: mockReferentielsService,
    sap: mockSapService,
    sapLookup: mockSapLookupService,
  }
}

let apiClientPartage: ApiClient | null = null

/** Client HTTP unique (Bearer MSAL, X-Correlation-Id, ProblemDetails). Mode api uniquement. */
export function obtenirApiClient(): ApiClient {
  if (!apiClientPartage) {
    apiClientPartage = creerApiClient({
      baseUrl: config.apiBaseUrl,
      obtenirToken: obtenirTokenApi,
      onNonAutorise: () => void demanderConnexion(),
      onConflit: (erreur) => useAppStore.getState().pousserToast('error', erreur.messageUtilisateur),
    })
  }
  return apiClientPartage
}

/** La synchro SAP reste simulée (phase 5) ; l'écran l'affiche via le bandeau « Démonstration ». */
function creerServicesApi(): Services {
  const api = obtenirApiClient()
  const chauffeurs = () => useAppStore.getState().referentiels.chauffeurs
  return {
    commandes: creerHttpCommandesService({ api, chauffeurs }),
    pesee: creerHttpPeseeService({
      api,
      chauffeurs,
      creerConnexion: () => creerConnexionHubPoids({ apiBaseUrl: config.apiBaseUrl, obtenirToken: obtenirTokenApi }),
      pontCourant: () => useAppStore.getState().poids.pont,
      publier: (patch) => useAppStore.getState().setPoids(patch),
      commande: (id) => useAppStore.getState().commandes.find((c) => c.id === id),
    }),
    sync: mockSyncService,
    referentiels: creerHttpReferentielsService({
      api,
      onModification: () => useAppStore.getState().chargerReferentiels(),
    }),
    sap: creerHttpSapService(api),
    sapLookup: creerHttpSapLookupService(api),
  }
}

export const services: Services = estModeApi ? creerServicesApi() : creerServicesMock()

export type {
  Services,
  CommandesService,
  PeseeService,
  SyncService,
  ReferentielsService,
  SapService,
  SapLookupService,
  PingSap,
  NouvelElement,
  FiltreCommandes,
  ListeCommandes,
} from './types'
