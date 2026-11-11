import { PublicClientApplication } from '@azure/msal-browser'
import { estModeApi } from '@/config'
import { creerMsalConfig } from './msalConfig'

let instance: PublicClientApplication | null = null

/** Instance MSAL unique, créée paresseusement (mode api uniquement ; `MsalProvider` appelle `initialize()`). */
export function obtenirMsal(): PublicClientApplication {
  if (!estModeApi) throw new Error('MSAL n’est disponible qu’en mode api (VITE_DATA_MODE=api)')
  if (!instance) instance = new PublicClientApplication(creerMsalConfig())
  return instance
}
