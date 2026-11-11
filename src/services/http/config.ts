export type ModeApi = 'mock' | 'http'

/** Défaut : mock. Toute autre valeur que `http` reste en démonstration. */
export function modeApi(): ModeApi {
  return import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock'
}

export function urlApi(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? '').trim()
}
