import { afterEach, describe, expect, it, vi } from 'vitest'
import { definirFournisseurAuth, httpRequest } from '@/services/http/httpClient'
import { modeApi } from '@/services/http/config'
import { ErreurHttp, ErreurReseau, httpNonDisponible } from '@/services/http/erreurs'

function reponse(partiel: { ok: boolean; status: number; body?: string }) {
  return {
    ok: partiel.ok,
    status: partiel.status,
    text: async () => partiel.body ?? '',
  }
}

describe('client HTTP', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    definirFournisseurAuth(() => null)
  })

  it('reste en mode mock par défaut', () => {
    expect(modeApi()).toBe('mock')
  })

  it('refuse un appel sans URL de base', async () => {
    await expect(httpRequest('/api/commandes')).rejects.toBeInstanceOf(ErreurReseau)
  })

  it('ne replie pas un service HTTP non branché vers le mock', () => {
    expect(() => httpNonDisponible('commandes.lister')).toThrow(/Aucun repli/)
  })

  it('remonte le message métier d’une erreur HTTP', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    const fetchMock = vi.fn().mockResolvedValue(
      reponse({ ok: false, status: 422, body: JSON.stringify({ message: 'Chantier invalide' }) }),
    )
    vi.stubGlobal('fetch', fetchMock)
    definirFournisseurAuth(() => 'Bearer futur-jeton')
    await expect(httpRequest('/commandes', { method: 'POST', body: { a: 1 } })).rejects.toMatchObject({
      name: 'ErreurHttp',
      statut: 422,
      message: 'Chantier invalide',
    })
    const appel = fetchMock.mock.calls[0]
    expect(String(appel?.[0])).toBe('http://api.test/commandes')
    const init = appel?.[1] as RequestInit
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer futur-jeton')
    expect(init.body).toBe(JSON.stringify({ a: 1 }))
  })

  it('convertit une panne réseau', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(httpRequest('/sante')).rejects.toBeInstanceOf(ErreurReseau)
  })

  it('propage l’annulation', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    )
    const signal = new AbortController().signal
    await expect(httpRequest('/sante', { signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('accepte une réponse vide', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: true, status: 204 })))
    await expect(httpRequest<void>('/vide')).resolves.toBeUndefined()
  })
})

describe('ErreurHttp', () => {
  it('porte le statut', () => {
    const erreur = new ErreurHttp(503, 'SAP injoignable')
    expect(erreur.statut).toBe(503)
    expect(erreur.message).toBe('SAP injoignable')
  })
})
