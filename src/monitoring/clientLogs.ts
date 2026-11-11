/**
 * Rapport d'erreurs front → `POST /api/client-logs` (mode api uniquement ; no-op en mock).
 * Limité côté client (10 envois / minute glissante) et dédoublonné (même message dans la fenêtre).
 * Le message et l'URL sont nettoyés : pas de query string (jetons, identifiants).
 */
import type { ClientLogRequest } from '@/services/http/dto'

export const MAX_ENVOIS_PAR_MINUTE = 10
const FENETRE_MS = 60_000
const LONGUEUR_MAX_MESSAGE = 1000
const LONGUEUR_MAX_PILE = 4000

export type NiveauJournal = ClientLogRequest['level']

export interface RapporteurDeps {
  envoyer: (corps: ClientLogRequest) => Promise<void>
  maintenant?: () => number
  genererCorrelationId?: () => string
  urlCourante?: () => string
}

export interface Rapporteur {
  /** Renvoie le correlationId utilisé, ou `null` si l'envoi a été écarté (quota, doublon). */
  signaler: (niveau: NiveauJournal, message: string, pile?: string, correlationId?: string) => string | null
}

export function urlSansQuery(url: string): string {
  const i = url.search(/[?#]/)
  return i === -1 ? url : url.slice(0, i)
}

export function creerRapporteur({
  envoyer,
  maintenant,
  genererCorrelationId,
  urlCourante,
}: RapporteurDeps): Rapporteur {
  const horloge = maintenant ?? (() => Date.now())
  const genererId = genererCorrelationId ?? (() => crypto.randomUUID())
  const url = urlCourante ?? (() => window.location.href)
  const envois: { horodatage: number; message: string }[] = []

  return {
    signaler(niveau, message, pile, correlationId) {
      const t = horloge()
      while (envois.length > 0 && envois[0] !== undefined && t - envois[0].horodatage > FENETRE_MS)
        envois.shift()
      const texte = (message || 'Erreur inconnue').slice(0, LONGUEUR_MAX_MESSAGE)
      if (envois.length >= MAX_ENVOIS_PAR_MINUTE) return null
      if (envois.some((e) => e.message === texte)) return null
      envois.push({ horodatage: t, message: texte })

      const id = correlationId ?? genererId()
      const corps: ClientLogRequest = {
        level: niveau,
        message: texte,
        url: urlSansQuery(url()),
        stack: pile ? pile.slice(0, LONGUEUR_MAX_PILE) : undefined,
        correlationId: id,
      }
      envoyer(corps).catch((e: unknown) => {
        console.warn('[client-logs] envoi impossible', e instanceof Error ? e.message : e)
      })
      return id
    },
  }
}

const RAPPORTEUR_INACTIF: Rapporteur = { signaler: () => null }
let rapporteur: Rapporteur = RAPPORTEUR_INACTIF

export function obtenirRapporteur(): Rapporteur {
  return rapporteur
}

function decrireRaison(raison: unknown): { message: string; pile?: string } {
  if (raison instanceof Error) return { message: `${raison.name}: ${raison.message}`, pile: raison.stack }
  if (typeof raison === 'string') return { message: raison }
  try {
    return { message: JSON.stringify(raison) }
  } catch {
    return { message: String(raison) }
  }
}

/** Branche `window.onerror` et `unhandledrejection` sur le rapporteur fourni (idempotent par appel). */
export function installerRapportErreurs(r: Rapporteur): () => void {
  rapporteur = r
  const surErreur = (e: ErrorEvent) => {
    const { message, pile } = e.error instanceof Error ? decrireRaison(e.error) : { message: e.message }
    r.signaler('Error', message, pile)
  }
  const surRejet = (e: PromiseRejectionEvent) => {
    const { message, pile } = decrireRaison(e.reason)
    r.signaler('Error', `Promesse rejetée : ${message}`, pile)
  }
  window.addEventListener('error', surErreur)
  window.addEventListener('unhandledrejection', surRejet)
  return () => {
    window.removeEventListener('error', surErreur)
    window.removeEventListener('unhandledrejection', surRejet)
    rapporteur = RAPPORTEUR_INACTIF
  }
}
