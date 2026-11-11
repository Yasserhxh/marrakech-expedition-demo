import { estAnnulation } from '@/utils/erreurs'
import { urlApi } from './config'
import { ErreurHttp, ErreurReseau } from './erreurs'

export interface RequeteHttp {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  headers?: HeadersInit
}

/**
 * Point d'extension : fournir le jeton lorsque l'authentification réelle existera.
 * Aucun login ni rafraîchissement de jeton n'est implémenté.
 */
export type FournisseurAuth = () => string | null | Promise<string | null>

let fournisseurAuth: FournisseurAuth = () => null

export function definirFournisseurAuth(fournisseur: FournisseurAuth) {
  fournisseurAuth = fournisseur
}

function messageCorps(corps: unknown): string | undefined {
  if (!corps || typeof corps !== 'object') return undefined
  if ('message' in corps && typeof corps.message === 'string' && corps.message.trim()) return corps.message
  if ('title' in corps && typeof corps.title === 'string' && corps.title.trim()) return corps.title
  return undefined
}

/**
 * Client Fetch minimal. À n'utiliser que lorsque `VITE_API_BASE_URL` désigne le vrai backend.
 * Les chemins d'API ne sont pas figés dans cette couche.
 */
export async function httpRequest<T>(chemin: string, init: RequeteHttp = {}): Promise<T> {
  const base = urlApi()
  if (!base) {
    throw new ErreurReseau("VITE_API_BASE_URL est vide : aucun serveur n'est configuré.")
  }

  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const jeton = await fournisseurAuth()
  if (jeton) headers.set('Authorization', jeton)

  let reponse: Response
  try {
    reponse = await fetch(`${base.replace(/\/$/, '')}${chemin}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    })
  } catch (erreur) {
    if (estAnnulation(erreur)) throw erreur
    throw new ErreurReseau(erreur instanceof Error && erreur.message ? erreur.message : 'Réseau indisponible')
  }

  if (reponse.status === 204) return undefined as T

  const texte = await reponse.text()
  let corps: unknown = undefined
  if (texte) {
    try {
      corps = JSON.parse(texte) as unknown
    } catch {
      corps = texte
    }
  }

  if (!reponse.ok) {
    throw new ErreurHttp(reponse.status, messageCorps(corps) ?? `Erreur HTTP ${reponse.status}`, corps)
  }

  return corps as T
}
