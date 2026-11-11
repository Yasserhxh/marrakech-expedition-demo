/**
 * Client HTTP unique vers l'API Marrakech : base URL, Bearer Entra ID, X-Correlation-Id par requête,
 * JSON, délai 15 s (AbortController), ProblemDetails RFC 7807 → ApiError.
 */

export const DELAI_REQUETE_MS = 15_000
export const EN_TETE_CORRELATION = 'X-Correlation-Id'

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  correlationId?: string
  errors?: Record<string, string[]>
  extensions?: { correlationId?: string }
}

export type ErreursValidation = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail: string | undefined
  readonly correlationId: string
  readonly errors: ErreursValidation | undefined

  constructor(init: {
    status: number
    title: string
    detail?: string
    correlationId: string
    errors?: ErreursValidation
  }) {
    super(init.detail ? `${init.title} : ${init.detail}` : init.title)
    this.name = 'ApiError'
    this.status = init.status
    this.title = init.title
    this.detail = init.detail
    this.correlationId = init.correlationId
    this.errors = init.errors
  }

  /** Message affichable (toast) avec l'ID de corrélation pour le support. */
  get messageUtilisateur(): string {
    return `${this.message} (ID ${this.correlationId})`
  }
}

export function estApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

const TITRES_PAR_DEFAUT: Record<number, string> = {
  400: 'Requête invalide',
  401: 'Authentification requise',
  403: 'Accès refusé',
  404: 'Introuvable',
  409: 'Conflit',
  500: 'Erreur serveur',
}

export function parserProblemDetails(status: number, corps: unknown, correlationIdRequete: string): ApiError {
  const pd = (corps && typeof corps === 'object' ? corps : {}) as ProblemDetails
  const errors = pd.errors && typeof pd.errors === 'object' ? pd.errors : undefined
  return new ApiError({
    status,
    title: pd.title ?? TITRES_PAR_DEFAUT[status] ?? `Erreur HTTP ${status}`,
    detail: pd.detail,
    correlationId: pd.extensions?.correlationId ?? pd.correlationId ?? correlationIdRequete,
    errors,
  })
}

export interface ApiClientOptions {
  baseUrl: string
  obtenirToken: () => Promise<string | null>
  /** 401 : relancer l'authentification. */
  onNonAutorise: (erreur: ApiError) => void
  /** 409 : conflit métier (transition invalide, concurrence) → toast avec `detail`. */
  onConflit: (erreur: ApiError) => void
  fetchImpl?: typeof fetch
  genererCorrelationId?: () => string
  delaiMs?: number
}

export interface RequeteOptions {
  query?: Record<string, string | number | boolean | undefined>
  /** Pas de rappel 401/409 (utilisé par l'envoi des journaux client). */
  silencieux?: boolean
  body?: unknown
}

export interface ApiClient {
  get<T>(chemin: string, options?: RequeteOptions): Promise<T>
  post<T>(chemin: string, body?: unknown, options?: RequeteOptions): Promise<T>
  put<T>(chemin: string, body?: unknown, options?: RequeteOptions): Promise<T>
}

function construireUrl(baseUrl: string, chemin: string, query?: RequeteOptions['query']): string {
  const url = new URL(`${baseUrl}/api${chemin.startsWith('/') ? chemin : `/${chemin}`}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

async function lireCorps(reponse: Response): Promise<unknown> {
  const texte = await reponse.text()
  if (!texte) return undefined
  try {
    return JSON.parse(texte) as unknown
  } catch {
    return texte
  }
}

export function creerApiClient(options: ApiClientOptions): ApiClient {
  const fetchImpl = options.fetchImpl ?? fetch
  const genererId = options.genererCorrelationId ?? (() => crypto.randomUUID())
  const delaiMs = options.delaiMs ?? DELAI_REQUETE_MS

  async function requete<T>(
    methode: 'GET' | 'POST' | 'PUT',
    chemin: string,
    opts: RequeteOptions = {},
  ): Promise<T> {
    const correlationId = genererId()
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), delaiMs)
    const enTetes: Record<string, string> = {
      Accept: 'application/json',
      [EN_TETE_CORRELATION]: correlationId,
    }
    const token = await options.obtenirToken()
    if (token) enTetes.Authorization = `Bearer ${token}`
    if (opts.body !== undefined) enTetes['Content-Type'] = 'application/json'

    let reponse: Response
    try {
      reponse = await fetchImpl(construireUrl(options.baseUrl, chemin, opts.query), {
        method: methode,
        headers: enTetes,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controleur.signal,
        credentials: 'omit',
      })
    } catch (e) {
      const expiree = e instanceof Error && e.name === 'AbortError'
      throw new ApiError({
        status: 0,
        title: expiree ? 'Délai dépassé' : 'API injoignable',
        detail: expiree
          ? `Aucune réponse de l'API après ${delaiMs / 1000} s`
          : "Vérifiez le réseau ou l'URL de l'API",
        correlationId,
      })
    } finally {
      clearTimeout(minuteur)
    }

    const corps = await lireCorps(reponse)
    if (reponse.ok) return corps as T

    const erreur = parserProblemDetails(reponse.status, corps, correlationId)
    if (!opts.silencieux) {
      if (erreur.status === 401) options.onNonAutorise(erreur)
      else if (erreur.status === 409) options.onConflit(erreur)
    }
    throw erreur
  }

  return {
    get: (chemin, o) => requete('GET', chemin, o),
    post: (chemin, body, o) => requete('POST', chemin, { ...o, body: body ?? null }),
    put: (chemin, body, o) => requete('PUT', chemin, { ...o, body: body ?? null }),
  }
}
