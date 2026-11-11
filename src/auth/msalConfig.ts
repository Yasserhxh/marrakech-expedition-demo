import { BrowserCacheLocation, LogLevel, type Configuration, type RedirectRequest } from '@azure/msal-browser'
import { config } from '@/config'

/**
 * Enregistrement d'application Entra ID attendu (SPA) :
 * - Redirect URI (plateforme « Single-page application ») = origine du site (ex. http://localhost:5174, https://<app>.azurewebsites.net)
 * - Permission API : `api://<clientId>/.default` (scope exposé par l'API Marrakech, consentement admin)
 * - App roles `Guichet`, `PontBascule`, `Admin` (claim `roles` dans l'ID token et l'access token)
 * - Claims facultatifs : `name`, `preferred_username` (déjà présents par défaut)
 */
export function creerMsalConfig(): Configuration {
  return {
    auth: {
      clientId: config.aadClientId,
      authority: `https://login.microsoftonline.com/${config.aadTenantId}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: `${window.location.origin}/connexion`,
    },
    cache: {
      // Jamais localStorage : jetons limités à l'onglet (règle « pas de jeton en localStorage »).
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
    system: {
      loggerOptions: {
        logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Warning,
        piiLoggingEnabled: false,
        loggerCallback: (level, message) => {
          if (level === LogLevel.Error) console.error(message)
          else if (level === LogLevel.Warning) console.warn(message)
        },
      },
    },
  }
}

export function requeteConnexion(): RedirectRequest {
  return { scopes: [config.apiScope], prompt: 'select_account' }
}

export function scopesApi(): string[] {
  return [config.apiScope]
}
