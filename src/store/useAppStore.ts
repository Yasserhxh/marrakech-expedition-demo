import { create } from 'zustand'
import type {
  Camion,
  Chantier,
  Chauffeur,
  Client,
  Commande,
  EtatPont,
  NouvelleCommandeInput,
  Pont,
  Produit,
  Referentiels,
  Role,
  SapStatut,
  SyncOperation,
  SyntheseCommandes,
  Toast,
  ToastTone,
  Transporteur,
  Utilisateur,
} from '@/types'
import {
  buildCommandes,
  buildSyncOperations,
  CLIENT_BLOQUE_CREDIT_CODE,
  COMPTEURS_INITIAUX,
  referentielsInitiaux,
} from '@/data/mock'
import { estModeApi } from '@/config'
import { services } from '@/services'
import { estApiError } from '@/services/http/apiClient'

export interface PoidsState {
  pont: Pont
  lectureKg: number
  stable: boolean
  derniereLectureUtc: string | null
  connecte: boolean
  /** État relayé par le hub (mode api) ; `Stale` = aucune lecture depuis 10 s. */
  etat: EtatPont
  /** Lecture périmée (pas de message du pont depuis 10 s) : validation refusée. */
  stale: boolean
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

export interface ChargementState {
  commandes: boolean
  referentiels: boolean
}

export interface AppState {
  utilisateur: Utilisateur | null
  role: Role
  sapOnline: boolean
  sapStatut: SapStatut | null
  demoBarOuverte: boolean
  sidebarRepliee: boolean
  commandes: Commande[]
  referentiels: Referentiels
  referentielsCharges: boolean
  syncOps: SyncOperation[]
  synthese: SyntheseCommandes | null
  chargement: ChargementState
  /** Dernière erreur de chargement (liste / référentiels), affichée par les écrans. */
  erreurChargement: string | null
  dernierRafraichissementUtc: string | null
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

  // Chargement via services (mock ou API)
  refresh: () => Promise<void>
  chargerReferentiels: () => Promise<void>
  chargerChantiers: (clientId: string) => Promise<void>
  chargerCommandes: () => Promise<void>
  chargerSynthese: () => Promise<void>
  chargerDetail: (commandeId: number) => Promise<void>
  rafraichirSapStatut: () => Promise<void>

  // Actions métier (via CommandesService) — renvoient `true` en cas de succès, toast en cas d'échec
  creerCommande: (input: NouvelleCommandeInput) => Promise<Commande>
  autoriserPesee: (commandeId: number) => Promise<boolean>
  autoriserSecondPesage: (commandeId: number) => Promise<boolean>
  annulerCommande: (commandeId: number, motif: string) => Promise<boolean>
  signalerErreur: (e: unknown, repli?: string) => void

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
  connecte: !estModeApi,
  etat: estModeApi ? 'Disconnected' : 'Connected',
  stale: estModeApi,
  enCours: false,
}

const REFERENTIELS_VIDES: Referentiels = {
  clients: [],
  chantiers: [],
  produits: [],
  transporteurs: [],
  camions: [],
  chauffeurs: [],
}

const MOTIF_ANNULATION_PAR_DEFAUT = 'Annulation au guichet'

function etatInitial(sapOnline: boolean) {
  const now = new Date()
  const commandes = estModeApi ? [] : buildCommandes(now)
  const syncOps = estModeApi ? [] : buildSyncOperations(commandes, now)
  return {
    sapOnline,
    sapStatut: null as SapStatut | null,
    commandes,
    referentiels: estModeApi ? REFERENTIELS_VIDES : structuredClone(referentielsInitiaux),
    referentielsCharges: !estModeApi,
    syncOps,
    synthese: null as SyntheseCommandes | null,
    chargement: { commandes: false, referentiels: false },
    erreurChargement: null as string | null,
    dernierRafraichissementUtc: null as string | null,
    compteurs: { ...COMPTEURS_INITIAUX, syncOp: COMPTEURS_INITIAUX.syncOp + syncOps.length, toast: 1 },
    toasts: [] as Toast[],
    poids: { ...POIDS_INITIAL },
    clientsBloquesSap: [CLIENT_BLOQUE_CREDIT_CODE],
    chargeeLeUtc: now.toISOString(),
  }
}

function messageErreur(e: unknown, repli: string): string {
  if (estApiError(e)) return e.messageUtilisateur
  if (e instanceof Error && e.message) return e.message
  return repli
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
  reinitialiser: () => {
    set((s) => ({ ...etatInitial(s.sapOnline) }))
    if (estModeApi) void get().refresh()
  },

  /* ---------- Chargement ---------- */

  refresh: async () => {
    set({ erreurChargement: null, chargement: { ...get().chargement, commandes: true } })
    try {
      if (!get().referentielsCharges) await get().chargerReferentiels()
      await get().chargerCommandes()
      await get().chargerSynthese()
      set({ dernierRafraichissementUtc: new Date().toISOString() })
    } catch (e) {
      set({ erreurChargement: messageErreur(e, 'Chargement impossible') })
    } finally {
      set((s) => ({ chargement: { ...s.chargement, commandes: false } }))
    }
  },

  chargerReferentiels: async () => {
    set((s) => ({ chargement: { ...s.chargement, referentiels: true } }))
    try {
      const charges = await services.referentiels.charger()
      set((s) => ({
        // Les chantiers sont chargés par client (pas d'endpoint global) : on conserve ceux déjà connus.
        referentiels: {
          ...charges,
          chantiers: charges.chantiers.length > 0 ? charges.chantiers : s.referentiels.chantiers,
        },
        referentielsCharges: true,
      }))
    } finally {
      set((s) => ({ chargement: { ...s.chargement, referentiels: false } }))
    }
  },

  chargerChantiers: async (clientId) => {
    if (!clientId) return
    const liste = await services.referentiels.chantiersDuClient(clientId)
    set((s) => ({
      referentiels: {
        ...s.referentiels,
        chantiers: [...s.referentiels.chantiers.filter((c) => c.clientId !== clientId), ...liste],
      },
    }))
  },

  chargerCommandes: async () => {
    const liste = await services.commandes.lister()
    set({ commandes: liste.commandes, syncOps: liste.syncOps })
  },

  chargerSynthese: async () => {
    set({ synthese: await services.commandes.synthese() })
  },

  chargerDetail: async (commandeId) => {
    try {
      get().upsertCommande(await services.commandes.obtenir(commandeId))
    } catch (e) {
      get().signalerErreur(e, 'Détail de la commande indisponible')
    }
  },

  rafraichirSapStatut: async () => {
    try {
      const statut = await services.sap.statut()
      set({ sapStatut: statut, sapOnline: statut.enLigne })
    } catch (e) {
      set({
        sapStatut: {
          enLigne: false,
          verifieAtUtc: new Date().toISOString(),
          detail: messageErreur(e, 'Statut SAP indisponible'),
        },
        sapOnline: false,
      })
    }
  },

  /* ---------- Actions métier ---------- */

  creerCommande: async (input) => {
    const commande = await services.commandes.creerLocale(input)
    get().upsertCommande(commande)
    get().pousserToast(
      'success',
      `Commande locale ${numeroAffiche(commande)} créée — en attente de synchronisation SAP`,
    )
    void get()
      .chargerSynthese()
      .catch(() => undefined)
    return commande
  },

  autoriserPesee: async (commandeId) => {
    try {
      const c = await services.commandes.autoriserPesee(commandeId, get().poids.pont)
      get().upsertCommande(c)
      get().pousserToast('success', `Pesée d'entrée autorisée pour ${numeroAffiche(c)}`)
      return true
    } catch (e) {
      get().signalerErreur(e, 'Autorisation impossible')
      return false
    }
  },

  autoriserSecondPesage: async (commandeId) => {
    try {
      const c = await services.commandes.autoriserSecondPesage(commandeId, get().poids.pont)
      get().upsertCommande(c)
      get().pousserToast('success', `Second pesage autorisé pour ${numeroAffiche(c)}`)
      return true
    } catch (e) {
      get().signalerErreur(e, 'Autorisation impossible')
      return false
    }
  },

  annulerCommande: async (commandeId, motif) => {
    try {
      const c = await services.commandes.annuler(commandeId, motif || MOTIF_ANNULATION_PAR_DEFAUT)
      get().upsertCommande(c)
      get().retirerSyncOpsDeCommande(c.id)
      get().pousserToast('warning', `Commande ${numeroAffiche(c)} annulée`)
      void get()
        .chargerSynthese()
        .catch(() => undefined)
      return true
    } catch (e) {
      get().signalerErreur(e, 'Annulation impossible')
      return false
    }
  },

  signalerErreur: (e, repli = 'Action impossible') => {
    // Les 409 sont déjà remontés en toast par le client HTTP (onConflit).
    if (estApiError(e) && e.status === 409) return
    get().pousserToast('error', messageErreur(e, repli))
  },

  /* ---------- Mutateurs bas niveau ---------- */

  upsertCommande: (c) =>
    set((s) => {
      const existe = s.commandes.some((x) => x.id === c.id)
      return {
        commandes: existe
          ? s.commandes.map((x) => (x.id === c.id ? { ...x, ...c } : x))
          : [c, ...s.commandes],
      }
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

/**
 * Résolution des libellés d'une commande : référentiel chargé en priorité, sinon les libellés
 * dénormalisés renvoyés par l'API (`commande.libelles`), afin de ne jamais afficher « — » à tort.
 */
export function useReferentielLookup() {
  const r = useAppStore((s) => s.referentiels)
  return {
    client: (c: Commande): Client | undefined =>
      r.clients.find((x) => x.id === c.clientId) ??
      (c.libelles
        ? { id: c.clientId, code: c.libelles.clientCode, nom: c.libelles.clientNom, ville: '' }
        : undefined),
    chantier: (c: Commande): Chantier | undefined =>
      r.chantiers.find((x) => x.id === c.chantierId) ??
      (c.libelles?.chantierNom
        ? {
            id: c.chantierId,
            clientId: c.clientId,
            code: c.chantierId,
            nom: c.libelles.chantierNom,
            ville: '',
          }
        : undefined),
    produit: (c: Commande): Produit | undefined =>
      r.produits.find((x) => x.id === c.produitId) ??
      (c.libelles
        ? {
            id: c.produitId,
            codeSap: c.produitId,
            libelle: c.libelles.produitLibelle,
            conditionnement: c.libelles.conditionnement ?? 'VRAC',
          }
        : undefined),
    transporteur: (c: Commande): Transporteur | undefined =>
      r.transporteurs.find((x) => x.id === c.transporteurId) ??
      (c.libelles?.transporteurNom
        ? { id: c.transporteurId, code: c.transporteurId, nom: c.libelles.transporteurNom }
        : undefined),
    camion: (c: Commande): Camion | undefined =>
      r.camions.find((x) => x.id === c.camionId) ??
      (c.libelles?.immatriculation
        ? { id: c.camionId, immatriculation: c.libelles.immatriculation, transporteurId: c.transporteurId }
        : undefined),
    chauffeur: (c: Commande): Chauffeur | undefined =>
      r.chauffeurs.find((x) => x.id === c.chauffeurId) ??
      (c.libelles?.chauffeurNom
        ? {
            id: c.chauffeurId,
            nom: c.libelles.chauffeurNom,
            cin: c.libelles.chauffeurCin ?? '',
            transporteurId: c.transporteurId,
          }
        : undefined),
  }
}

export function numeroAffiche(c: Commande): string {
  return c.numeroSap ?? c.numeroLocal ?? `L-${c.id}`
}
