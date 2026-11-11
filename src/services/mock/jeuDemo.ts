import {
  buildCommandes,
  buildSyncOperations,
  CLIENT_BLOQUE_CREDIT_CODE,
  COMPTEURS_INITIAUX,
  referentielsInitiaux,
} from '@/data/mock'
import type { NouvelElement } from '@/services/types'
import type { Commande, ReferentielKind, Referentiels, SyncOperation } from '@/types'

/**
 * Jeu de données simulé, source autoritaire tant que le backend n'existe pas.
 * Le cache React Query en est une projection : il ne doit pas être modifié à la place de ce module.
 */

export interface CompteursDemo {
  commandeId: number
  bc: number
  sapCommande: number
  sapBl: number
  syncOp: number
}

interface JeuDemo {
  commandes: Commande[]
  referentiels: Referentiels
  syncOps: SyncOperation[]
  compteurs: CompteursDemo
  clientsBloquesSap: string[]
  chargeeLeUtc: string
  generation: number
}

type Ecouteur = () => void

function creerJeu(): JeuDemo {
  const now = new Date()
  const commandes = buildCommandes(now)
  const syncOps = buildSyncOperations(commandes, now)
  return {
    commandes,
    referentiels: structuredClone(referentielsInitiaux),
    syncOps,
    compteurs: { ...COMPTEURS_INITIAUX, syncOp: COMPTEURS_INITIAUX.syncOp + syncOps.length },
    clientsBloquesSap: [CLIENT_BLOQUE_CREDIT_CODE],
    chargeeLeUtc: now.toISOString(),
    generation: 0,
  }
}

let jeu = creerJeu()
const ecouteurs = new Set<Ecouteur>()

function publier() {
  for (const ecouteur of ecouteurs) ecouteur()
}

export const jeuDemo = {
  generation: () => jeu.generation,
  chargeeLeUtc: () => jeu.chargeeLeUtc,
  commandes: () => jeu.commandes,
  referentiels: () => jeu.referentiels,
  syncOps: () => jeu.syncOps,
  clientsBloques: () => jeu.clientsBloquesSap,
  trouverCommande: (id: number) => jeu.commandes.find((c) => c.id === id),
  trouverSync: (id: number) => jeu.syncOps.find((o) => o.id === id),

  prendreNumero(cle: keyof CompteursDemo): number {
    const valeur = jeu.compteurs[cle]
    jeu.compteurs = { ...jeu.compteurs, [cle]: valeur + 1 }
    return valeur
  },

  insererCommande(commande: Commande) {
    jeu.commandes = [commande, ...jeu.commandes]
    publier()
  },

  patcherCommande(id: number, patch: Partial<Commande>): Commande {
    const actuelle = jeu.commandes.find((c) => c.id === id)
    if (!actuelle) throw new Error(`Commande ${id} introuvable`)
    const suivante = { ...actuelle, ...patch }
    jeu.commandes = jeu.commandes.map((c) => (c.id === id ? suivante : c))
    publier()
    return suivante
  },

  insererSync(operation: SyncOperation) {
    jeu.syncOps = [...jeu.syncOps, operation]
    publier()
  },

  patcherSync(id: number, patch: Partial<SyncOperation>): SyncOperation | undefined {
    const actuelle = jeu.syncOps.find((o) => o.id === id)
    if (!actuelle) return undefined
    const suivante = { ...actuelle, ...patch }
    jeu.syncOps = jeu.syncOps.map((o) => (o.id === id ? suivante : o))
    publier()
    return suivante
  },

  retirerSyncDeCommande(commandeId: number) {
    jeu.syncOps = jeu.syncOps.filter((o) => o.commandeId !== commandeId)
    publier()
  },

  ajouterReferentiel<K extends ReferentielKind>(kind: K, element: NouvelElement<K> & { id: string }) {
    const liste = jeu.referentiels[kind]
    const suivant = element as Referentiels[K][number]
    jeu.referentiels = {
      ...jeu.referentiels,
      [kind]: [...liste, suivant],
    }
    publier()
  },

  debloquerClient(code: string) {
    jeu.clientsBloquesSap = jeu.clientsBloquesSap.filter((c) => c !== code)
    publier()
  },

  reinitialiser() {
    const generation = jeu.generation + 1
    jeu = creerJeu()
    jeu.generation = generation
    publier()
  },

  ecouter(ecouteur: Ecouteur) {
    ecouteurs.add(ecouteur)
    return () => {
      ecouteurs.delete(ecouteur)
    }
  },
}
