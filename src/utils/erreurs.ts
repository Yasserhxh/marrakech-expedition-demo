import { CancelledError } from '@tanstack/react-query'

export function estAnnulation(erreur: unknown): boolean {
  if (erreur instanceof CancelledError) return true
  return erreur instanceof DOMException && erreur.name === 'AbortError'
}

/** Message affichable. Les annulations de requête ne produisent pas de texte. */
export function messageErreur(erreur: unknown): string {
  if (estAnnulation(erreur)) return ''
  if (erreur instanceof Error && erreur.message.trim()) return erreur.message
  return 'Opération impossible'
}
