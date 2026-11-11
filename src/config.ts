export type DataMode = 'mock' | 'api'

export interface AppConfig {
  mode: DataMode
  apiBaseUrl: string
  aadClientId: string
  aadTenantId: string
  apiScope: string
}

export type EnvSource = Record<string, string | undefined>

const VARIABLES_REQUISES_API = [
  'VITE_API_BASE_URL',
  'VITE_AAD_CLIENT_ID',
  'VITE_AAD_TENANT_ID',
  'VITE_API_SCOPE',
] as const

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

/** Lit et valide la configuration. En mode `api`, toute variable manquante fait échouer le démarrage. */
export function lireConfig(env: EnvSource): AppConfig {
  const modeBrut = (env.VITE_DATA_MODE ?? 'mock').trim().toLowerCase()
  if (modeBrut !== 'mock' && modeBrut !== 'api') {
    throw new ConfigError(`VITE_DATA_MODE doit valoir "mock" ou "api" (reçu : "${modeBrut}")`)
  }
  const mode: DataMode = modeBrut
  const valeur = (k: string) => (env[k] ?? '').trim()

  if (mode === 'api') {
    const manquantes = VARIABLES_REQUISES_API.filter((k) => valeur(k) === '')
    if (manquantes.length > 0) {
      throw new ConfigError(`Mode api : variables manquantes dans .env — ${manquantes.join(', ')}`)
    }
    if (!/^https?:\/\//i.test(valeur('VITE_API_BASE_URL'))) {
      throw new ConfigError('VITE_API_BASE_URL doit commencer par http:// ou https://')
    }
    if (!/^api:\/\/.+\/\.default$/.test(valeur('VITE_API_SCOPE'))) {
      throw new ConfigError('VITE_API_SCOPE doit avoir la forme api://<clientId>/.default')
    }
  }

  return {
    mode,
    apiBaseUrl: valeur('VITE_API_BASE_URL').replace(/\/+$/, ''),
    aadClientId: valeur('VITE_AAD_CLIENT_ID'),
    aadTenantId: valeur('VITE_AAD_TENANT_ID'),
    apiScope: valeur('VITE_API_SCOPE'),
  }
}

export const config: AppConfig = lireConfig(import.meta.env as EnvSource)
export const estModeApi = config.mode === 'api'
