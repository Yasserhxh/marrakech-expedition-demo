/**
 * Fabrique de la connexion SignalR vers `/hubs/weight` (isolée pour être remplacée dans les tests).
 * Le jeton Entra passe par `accessTokenFactory` (query `access_token` sur `/hubs/*`, cf. phase 3b §1).
 */
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'

export const CHEMIN_HUB_POIDS = '/hubs/weight'
export { HubConnectionState }
export type { HubConnection }

/** `https://api.exemple/api` ou `https://api.exemple` → `https://api.exemple/hubs/weight`. */
export function urlHubPoids(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '').replace(/\/api$/i, '')}${CHEMIN_HUB_POIDS}`
}

export interface OptionsHubPoids {
  apiBaseUrl: string
  obtenirToken: () => Promise<string | null>
}

export function creerConnexionHubPoids({ apiBaseUrl, obtenirToken }: OptionsHubPoids): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(urlHubPoids(apiBaseUrl), {
      accessTokenFactory: async () => (await obtenirToken()) ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()
}
