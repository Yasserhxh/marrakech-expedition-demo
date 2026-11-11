import { create } from 'zustand'
import type {
  Commande,
  Pont,
  Referentiels,
  Role,
  SyncOperation,
  Toast,
  ToastTone,
  Utilisateur,
} from '@/types'
import {
  buildCommandes,
  buildSyncOperations,
  CLIENT_BLOQUE_CREDIT_CODE,
  COMPTEURS_INITIAUX,
  referentielsInitiaux,
} from '@/data/mock'

export interface PoidsState {
  pont: Pont
  lectureKg: number
  stable: boolean
  derniereLectureUtc: string | null
  connecte: boolean
  enCours: boolean
}

export interface Compteurs {
  commandeId: number
  bc: number
  sapCommande: number
  sapBl: number
  syncOp: number
  toast: number
}

export interface AppState {
  utilisateur: Utilisateur | null
  role: Role
  sapOnline: boolean
  demoBarOuverte: boolean
  sidebarRepliee: boolean
  commandes: Commande[]
  referentiels: Referentiels
  syncOps: SyncOperation[]
  compteurs: Compteurs
  toasts: Toast[]
  poids: PoidsState
  clientsBloquesSap: string[]
  chargeeLeUtc: string

  // Session / démo
  connecter: (u: Utilisateur) => void
  deconnecter: () => void
  setRole: (r: Role) => void
  setSapOnline: (v: boolean) => void
  toggleDemoBar: () => void
  toggleSidebar: () => void
  reinitialiser: () => void

  // Mutateurs bas niveau (utilisés par services/mock)
  upsertCommande: (c: Commande) => void
  patchCommande: (id: number, patch: Partial<Commande>) => void
  setReferentiels: (r: Referentiels) => void
  upsertSyncOp: (op: SyncOperation) => void
  patchSyncOp: (id: number, patch: Partial<SyncOperation>) => void
  retirerSyncOpsDeCommande: (commandeId: number) => void
  prochainNumero: (k: keyof Omit<Compteurs, 'toast'>) => number
  setPoids: (patch: Partial<PoidsState>) => void
  debloquerClientSap: (code: string) => void

  // Toasts
  pousserToast: (tone: ToastTone, message: string) => void
  fermerToast: (id: number) => void
}

const POIDS_INITIAL: PoidsState = {
  pont: 'PB22',
  lectureKg: 0,
  stable: false,
  derniereLectureUtc: null,
  connecte: true,
  enCours: false,
}

function etatInitial(sapOnline: boolean) {
  const now = new Date()
  const commandes = buildCommandes(now)
  const syncOps = buildSyncOperations(commandes, now)
  return {
    sapOnline,
    commandes,
    referentiels: structuredClone(referentielsInitiaux),
    syncOps,
    compteurs: { ...COMPTEURS_INITIAUX, syncOp: COMPTEURS_INITIAUX.syncOp + syncOps.length, toast: 1 },
    toasts: [] as Toast[],
    poids: { ...POIDS_INITIAL },
    clientsBloquesSap: [CLIENT_BLOQUE_CREDIT_CODE],
    chargeeLeUtc: now.toISOString(),
  }
}

export const useAppStore = create<AppState>()((set, get) => ({
  utilisateur: null,
  role: 'Guichet',
  demoBarOuverte: true,
  sidebarRepliee: false,
  ...etatInitial(false),

  connecter: (utilisateur) => set({ utilisateur }),
  deconnecter: () => set({ utilisateur: null }),
  setRole: (role) => set({ role }),
  setSapOnline: (sapOnline) => set({ sapOnline }),
  toggleDemoBar: () => set((s) => ({ demoBarOuverte: !s.demoBarOuverte })),
  toggleSidebar: () => set((s) => ({ sidebarRepliee: !s.sidebarRepliee })),
  reinitialiser: () => set((s) => ({ ...etatInitial(s.sapOnline) })),

  upsertCommande: (c) =>
    set((s) => {
      const existe = s.commandes.some((x) => x.id === c.id)
      return { commandes: existe ? s.commandes.map((x) => (x.id === c.id ? c : x)) : [c, ...s.commandes] }
    }),
  patchCommande: (id, patch) =>
    set((s) => ({ commandes: s.commandes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  setReferentiels: (referentiels) => set({ referentiels }),
  upsertSyncOp: (op) =>
    set((s) => {
      const existe = s.syncOps.some((x) => x.id === op.id)
      return { syncOps: existe ? s.syncOps.map((x) => (x.id === op.id ? op : x)) : [...s.syncOps, op] }
    }),
  patchSyncOp: (id, patch) =>
    set((s) => ({ syncOps: s.syncOps.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  retirerSyncOpsDeCommande: (commandeId) =>
    set((s) => ({ syncOps: s.syncOps.filter((x) => x.commandeId !== commandeId) })),
  prochainNumero: (k) => {
    const valeur = get().compteurs[k]
    set((s) => ({ compteurs: { ...s.compteurs, [k]: valeur + 1 } }))
    return valeur
  },
  setPoids: (patch) => set((s) => ({ poids: { ...s.poids, ...patch } })),
  debloquerClientSap: (code) =>
    set((s) => ({ clientsBloquesSap: s.clientsBloquesSap.filter((c) => c !== code) })),

  pousserToast: (tone, message) => {
    const id = get().compteurs.toast
    set((s) => ({
      toasts: [...s.toasts, { id, tone, message }],
      compteurs: { ...s.compteurs, toast: id + 1 },
    }))
    const DUREE_TOAST_MS = 4500
    window.setTimeout(() => get().fermerToast(id), DUREE_TOAST_MS)
  },
  fermerToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/* ---------- Sélecteurs dérivés ---------- */

export function selectCommande(id: number) {
  return (s: AppState) => s.commandes.find((c) => c.id === id)
}

export function useReferentielLookup() {
  const r = useAppStore((s) => s.referentiels)
  return {
    client: (id: string) => r.clients.find((x) => x.id === id),
    chantier: (id: string) => r.chantiers.find((x) => x.id === id),
    produit: (id: string) => r.produits.find((x) => x.id === id),
    transporteur: (id: string) => r.transporteurs.find((x) => x.id === id),
    camion: (id: string) => r.camions.find((x) => x.id === id),
    chauffeur: (id: string) => r.chauffeurs.find((x) => x.id === id),
  }
}

export function numeroAffiche(c: Commande): string {
  return c.numeroSap ?? `L-${c.id}`
}
