import type { SapLookupService } from '@/services/types'
import { useAppStore } from '@/store/useAppStore'
import type { ResultatLookup, SourceLookup } from '@/types'

const LIGNES_MAX = 20
const DELAI_SIMULE_MS = 150

/** Les codes SAP sont comparés sans leurs zéros de tête (`0010045812` ≡ `10045812`). */
export function sansZeros(code: string): string {
  return code.replace(/^0+/, '')
}

export function codeCommencePar(code: string, prefixe: string): boolean {
  const p = sansZeros(prefixe)
  return p !== '' && sansZeros(code).startsWith(p)
}

function source(): SourceLookup {
  return useAppStore.getState().sapOnline ? 'Sap' : 'Cache'
}

async function resultat<T>(items: T[]): Promise<ResultatLookup<T>> {
  await new Promise((r) => window.setTimeout(r, DELAI_SIMULE_MS))
  return { source: source(), items: items.slice(0, LIGNES_MAX) }
}

/** Démo : le « SAP » est le référentiel en mémoire ; hors ligne (barre de démo), les réponses sont étiquetées « Cache ». */
export const mockSapLookupService: SapLookupService = {
  rechercherClients(prefixe) {
    const clients = useAppStore.getState().referentiels.clients
    return resultat(
      clients
        .filter((c) => codeCommencePar(c.code, prefixe))
        .map((c) => ({ code: sansZeros(c.code), nom: c.nom, ville: c.ville || undefined })),
    )
  },

  chantiersDuClient(codeClient) {
    const r = useAppStore.getState().referentiels
    const client = r.clients.find((c) => sansZeros(c.code) === sansZeros(codeClient))
    if (!client) return resultat([])
    return resultat(
      r.chantiers
        .filter((ch) => ch.clientId === client.id)
        .map((ch, i) => ({
          code: sansZeros(ch.code),
          nom: ch.ville ? `${ch.nom}, ${ch.ville}` : ch.nom,
          parDefaut: i === 0,
        })),
    )
  },

  transporteur(code) {
    const t = useAppStore
      .getState()
      .referentiels.transporteurs.find((x) => sansZeros(x.code) === sansZeros(code))
    return resultat(t ? [{ code: sansZeros(t.code), nom: t.nom }] : [])
  },

  camion(code) {
    const r = useAppStore.getState().referentiels
    // Démo : le code SAP d'un camion est « 600 » + son index dans le référentiel (6001001, 6001002…).
    const index = Number(sansZeros(code)) - 6001000
    const camion = r.camions[index - 1]
    if (!camion) return resultat([])
    const transporteur = r.transporteurs.find((t) => t.id === camion.transporteurId)
    return resultat([
      {
        code: sansZeros(code),
        immatriculation: camion.immatriculation,
        transporteurCode: transporteur ? sansZeros(transporteur.code) : undefined,
      },
    ])
  },
}
