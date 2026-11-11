import { describe, expect, it } from 'vitest'
import { ConfigError, lireConfig } from './config'

const API_OK = {
  VITE_DATA_MODE: 'api',
  VITE_API_BASE_URL: 'https://localhost:7201/',
  VITE_AAD_CLIENT_ID: '00000000-0000-0000-0000-000000000001',
  VITE_AAD_TENANT_ID: '00000000-0000-0000-0000-000000000002',
  VITE_API_SCOPE: 'api://00000000-0000-0000-0000-000000000001/.default',
}

describe('lireConfig', () => {
  it('mode mock par défaut sans aucune variable', () => {
    expect(lireConfig({}).mode).toBe('mock')
  })

  it('mode api valide : base URL sans slash final', () => {
    const c = lireConfig(API_OK)
    expect(c.mode).toBe('api')
    expect(c.apiBaseUrl).toBe('https://localhost:7201')
  })

  it('mode api : échoue bruyamment en listant les variables manquantes', () => {
    expect(() => lireConfig({ VITE_DATA_MODE: 'api' })).toThrow(ConfigError)
    expect(() => lireConfig({ VITE_DATA_MODE: 'api' })).toThrow(/VITE_AAD_CLIENT_ID/)
  })

  it('mode inconnu refusé', () => {
    expect(() => lireConfig({ VITE_DATA_MODE: 'prod' })).toThrow(/mock.*api/)
  })

  it('scope mal formé refusé', () => {
    expect(() => lireConfig({ ...API_OK, VITE_API_SCOPE: 'user.read' })).toThrow(/api:\/\//)
  })
})
