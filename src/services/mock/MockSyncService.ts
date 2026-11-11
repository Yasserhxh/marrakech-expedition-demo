import type { PingSap, ResultatSynchronisation, SyncService } from '@/services/types'
import { jeuDemo } from '@/services/mock/jeuDemo'
import { verifierSignal } from '@/services/mock/signal'
import { useAppStore } from '@/store/useAppStore'
import type { EtapeSynchro, SyncOperation } from '@/types'
import { MESSAGE_CLIENT_BLOQUE } from '@/data/mock'
import { padNumero } from '@/utils/format'
import { numeroAffiche } from '@/utils/commande'

const DELAI_ETAPE_MS: Record<EtapeSynchro, number> = {
  CreerCommande: 1200,
  Livraison: 1200,
  LireBL: 800,
}
const DELAI_PING_MS = 450
const LATENCE_SAP_BASE_MS = 380
const LATENCE_SAP_GIGUE_MS = 120
const LONGUEUR_NUMERO_SAP = 10
const MESSAGE_SAP_INJOIGNABLE = 'SAP injoignable (timeout 10 s vers SAP PRD)'
const MESSAGE_SAP_HORS_LIGNE = 'SAP est hors ligne : la synchronisation est impossible pour le moment'

/**
 * Le backend devra garantir l'idempotence (clé d'opération) et le contrôle de concurrence.
 * Le verrou ci-dessous empêche seulement un double envoi depuis ce navigateur ;
 * il ne remplace pas cette garantie serveur.
 */
const verrous = new Set<number>()

export function interrompreSynchronisations() {
  verrous.clear()
}

function erreurAnnulation(signal: AbortSignal): unknown {
  if (signal.reason instanceof Error) return signal.reason
  return new DOMException('Aborted', 'AbortError')
}

function attendre(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(erreurAnnulation(signal))
      return
    }
    const id = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(id)
      reject(signal ? erreurAnnulation(signal) : new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function resultatHorsLigne(): ResultatSynchronisation {
  return { issue: 'sapHorsLigne', notification: { tone: 'warning', message: MESSAGE_SAP_HORS_LIGNE } }
}

function echouer(operation: SyncOperation, etape: EtapeSynchro, message: string): ResultatSynchronisation {
  const commande = jeuDemo.trouverCommande(operation.commandeId)
  jeuDemo.patcherSync(operation.id, { statut: 'Erreur', etapeCourante: etape, message })
  if (commande) {
    jeuDemo.patcherCommande(operation.commandeId, { synchro: 'Erreur', statut: 'ErreurSynchro' })
  }
  const libelle = commande ? numeroAffiche(commande) : String(operation.commandeId)
  return { issue: 'erreur', notification: { tone: 'error', message: `Synchronisation ${libelle} : ${message}` } }
}

async function executer(operationId: number): Promise<ResultatSynchronisation> {
  if (verrous.has(operationId)) return { issue: 'ignoree' }
  const operation = jeuDemo.trouverSync(operationId)
  if (!operation || operation.statut === 'EnCours' || operation.statut === 'Synchronisee') return { issue: 'ignoree' }
  if (!useAppStore.getState().sapOnline) return resultatHorsLigne()
  const commande = jeuDemo.trouverCommande(operation.commandeId)
  if (!commande) return { issue: 'ignoree' }

  const client = jeuDemo.referentiels().clients.find((c) => c.id === commande.clientId)
  const generation = jeuDemo.generation()
  verrous.add(operationId)

  try {
    jeuDemo.patcherSync(operation.id, {
      statut: 'EnCours',
      tentatives: operation.tentatives + 1,
      message: undefined,
      derniereTentativeUtc: new Date().toISOString(),
    })
    jeuDemo.patcherCommande(commande.id, { synchro: 'EnCours' })

    const restantes = operation.etapes.filter((etape) => !operation.etapesFaites.includes(etape))
    for (const etape of restantes) {
      jeuDemo.patcherSync(operation.id, { etapeCourante: etape })
      await attendre(DELAI_ETAPE_MS[etape])
      if (jeuDemo.generation() !== generation) return { issue: 'ignoree' }
      const courante = jeuDemo.trouverSync(operation.id)
      if (!courante) return { issue: 'ignoree' }
      if (!useAppStore.getState().sapOnline) return echouer(courante, etape, MESSAGE_SAP_INJOIGNABLE)
      if (etape === 'CreerCommande') {
        if (client && jeuDemo.clientsBloques().includes(client.code)) {
          return echouer(courante, etape, MESSAGE_CLIENT_BLOQUE)
        }
        jeuDemo.patcherCommande(commande.id, {
          numeroSap: padNumero(jeuDemo.prendreNumero('sapCommande'), LONGUEUR_NUMERO_SAP),
        })
      }
      if (etape === 'LireBL') {
        const actuelle = jeuDemo.trouverCommande(commande.id)
        if (actuelle?.bonDeLivraison) {
          const numeroBl = padNumero(jeuDemo.prendreNumero('sapBl'), LONGUEUR_NUMERO_SAP)
          jeuDemo.patcherCommande(actuelle.id, {
            bonDeLivraison: { ...actuelle.bonDeLivraison, numeroSap: numeroBl },
          })
        }
      }
      const apres = jeuDemo.trouverSync(operation.id)
      if (!apres) return { issue: 'ignoree' }
      jeuDemo.patcherSync(operation.id, { etapesFaites: [...apres.etapesFaites, etape] })
    }

    if (jeuDemo.generation() !== generation) return { issue: 'ignoree' }
    jeuDemo.patcherSync(operation.id, { statut: 'Synchronisee', etapeCourante: undefined, message: undefined })
    jeuDemo.patcherCommande(commande.id, { synchro: 'Synchronisee', statut: 'Synchronisee' })
    const finale = jeuDemo.trouverCommande(commande.id)
    const libelle = finale ? numeroAffiche(finale) : String(commande.id)
    return {
      issue: 'succes',
      notification: {
        tone: 'success',
        message: `Commande ${libelle} synchronisée — BL SAP ${finale?.bonDeLivraison?.numeroSap ?? ''}`,
      },
    }
  } finally {
    verrous.delete(operationId)
  }
}

export const mockSyncService: SyncService = {
  async operations(options) {
    verifierSignal(options?.signal)
    return jeuDemo.syncOps()
  },

  async clientsBloques(options) {
    verifierSignal(options?.signal)
    return jeuDemo.clientsBloques()
  },

  async ping(options): Promise<PingSap> {
    await attendre(DELAI_PING_MS, options?.signal)
    const enLigne = useAppStore.getState().sapOnline
    return enLigne
      ? { enLigne, latenceMs: LATENCE_SAP_BASE_MS + Math.round(Math.random() * LATENCE_SAP_GIGUE_MS) }
      : { enLigne }
  },

  synchroniser: executer,

  async toutSynchroniser() {
    if (!useAppStore.getState().sapOnline) return [resultatHorsLigne()]
    const identifiants = jeuDemo
      .syncOps()
      .filter((operation) => operation.statut === 'EnAttente' || operation.statut === 'Erreur')
      .map((operation) => operation.id)
    const resultats: ResultatSynchronisation[] = []
    for (const id of identifiants) {
      resultats.push(await executer(id))
    }
    return resultats
  },

  async simulerDeblocageClient(codeClient: string) {
    jeuDemo.debloquerClient(codeClient)
  },
}
