import { describe, expect, it, vi } from 'vitest'
import { ApiError, creerApiClient, EN_TETE_CORRELATION, parserProblemDetails } from './apiClient'

function reponse(status: number, body: unknown, contentType = 'application/problem+json'): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': contentType },
  })
}

type Options = Parameters<typeof creerApiClient>[0]

function client(fetchImpl: unknown, extra: Partial<Options> = {}) {
  return creerApiClient({
    baseUrl: 'https://api.test',
    obtenirToken: async () => 'jeton',
    onNonAutorise: vi.fn(),
    onConflit: vi.fn(),
    genererCorrelationId: () => 'corr-123',
    fetchImpl: fetchImpl as typeof fetch,
    ...extra,
  })
}

describe('apiClient', () => {
  it('envoie Bearer, X-Correlation-Id et JSON sur /api', async () => {
    const fetchMock = vi.fn(async () => reponse(200, { ok: true }, 'application/json'))
    const res = await client(fetchMock).post<{ ok: boolean }>('/commandes', { a: 1 })
    expect(res).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.test/api/commandes')
    const h = init.headers as Record<string, string>
    expect(h.Authorization).toBe('Bearer jeton')
    expect(h[EN_TETE_CORRELATION]).toBe('corr-123')
    expect(h['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"a":1}')
  })

  it('sérialise la query en ignorant les valeurs vides', async () => {
    const fetchMock = vi.fn(async () => reponse(200, [], 'application/json'))
    await client(fetchMock).get('/commandes', { query: { date: '2026-11-11', q: '', page: 1 } })
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toBe('https://api.test/api/commandes?date=2026-11-11&page=1')
  })

  it('transforme un ProblemDetails 400 en ApiError avec errors et correlationId serveur', async () => {
    const fetchMock = vi.fn(async () =>
      reponse(400, {
        title: 'Validation',
        detail: 'Champs invalides',
        errors: { Quantite: ['Doit être ≤ 60'] },
        extensions: { correlationId: 'srv-9' },
      }),
    )
    const err = await client(fetchMock)
      .post('/commandes', {})
      .catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    const api = err as ApiError
    expect(api.status).toBe(400)
    expect(api.title).toBe('Validation')
    expect(api.correlationId).toBe('srv-9')
    expect(api.errors).toEqual({ Quantite: ['Doit être ≤ 60'] })
    expect(api.messageUtilisateur).toContain('srv-9')
  })

  it('401 déclenche onNonAutorise, 409 déclenche onConflit', async () => {
    const onNonAutorise = vi.fn()
    const onConflit = vi.fn()
    const f401 = vi.fn(async () => reponse(401, undefined))
    await client(f401, { onNonAutorise, onConflit })
      .get('/commandes')
      .catch(() => undefined)
    expect(onNonAutorise).toHaveBeenCalledOnce()

    const f409 = vi.fn(async () =>
      reponse(409, { title: 'Transition de statut invalide', detail: 'Créée → Livrée' }),
    )
    await client(f409, { onNonAutorise, onConflit })
      .post('/commandes/1/annuler', {})
      .catch(() => undefined)
    expect(onConflit).toHaveBeenCalledOnce()
    expect((onConflit.mock.calls[0] as [ApiError])[0].detail).toBe('Créée → Livrée')
  })

  it('mode silencieux : pas de rappel 401', async () => {
    const onNonAutorise = vi.fn()
    const f401 = vi.fn(async () => reponse(401, undefined))
    await client(f401, { onNonAutorise })
      .post('/client-logs', {}, { silencieux: true })
      .catch(() => undefined)
    expect(onNonAutorise).not.toHaveBeenCalled()
  })

  it('erreur réseau → ApiError status 0 avec le correlationId de la requête', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const err = (await client(fetchMock)
      .get('/sap/statut')
      .catch((e: unknown) => e)) as ApiError
    expect(err.status).toBe(0)
    expect(err.title).toBe('API injoignable')
    expect(err.correlationId).toBe('corr-123')
  })

  it('délai dépassé → ApiError « Délai dépassé »', async () => {
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener('abort', () => {
            const e = new Error('aborted')
            e.name = 'AbortError'
            reject(e)
          })
        }),
    )
    const err = (await client(fetchMock, { delaiMs: 5 })
      .get('/commandes')
      .catch((e: unknown) => e)) as ApiError
    expect(err.title).toBe('Délai dépassé')
  })

  it("parserProblemDetails : titre par défaut si le corps n'est pas un ProblemDetails", () => {
    const e = parserProblemDetails(500, 'oups', 'c-1')
    expect(e.title).toBe('Erreur serveur')
    expect(e.correlationId).toBe('c-1')
  })
})
