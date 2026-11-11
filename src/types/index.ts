export type Role = 'Guichet' | 'PontBascule' | 'Admin'

export const ROLE_LABELS: Record<Role, string> = {
  Guichet: 'Guichet',
  PontBascule: 'Pont bascule',
  Admin: 'Admin',
}

export type Origine = 'Sap' | 'Locale'
export type Incoterm = 'Depart' | 'Rendu'
export type Conditionnement = 'VRAC' | 'SAC'
export type Pont = 'PB21' | 'PB22' | 'PB23' | 'PB24'

export type StatutCommande =
  | 'Creee'
  | 'EntreeAutorisee'
  | 'DansUsine'
  | 'SortieAutorisee'
  | 'Livree'
  | 'Synchronisee'
  | 'Annulee'
  | 'ErreurSynchro'

export type StatutSynchro = 'Aucune' | 'EnAttente' | 'EnCours' | 'Synchronisee' | 'Erreur'
export type EtapeSynchro = 'CreerCommande' | 'Livraison' | 'LireBL'

export const STATUT_LABELS: Record<StatutCommande, string> = {
  Creee: 'Créée',
  EntreeAutorisee: 'Entrée autorisée',
  DansUsine: "Dans l'usine",
  SortieAutorisee: 'Sortie autorisée',
  Livree: 'Livrée',
  Synchronisee: 'Synchronisée',
  Annulee: 'Annulée',
  ErreurSynchro: 'Erreur de synchro',
}

export const SYNCHRO_LABELS: Record<StatutSynchro, string> = {
  Aucune: '—',
  EnAttente: 'En attente',
  EnCours: 'En cours',
  Synchronisee: 'Synchronisée',
  Erreur: 'Erreur',
}

export const ETAPE_LABELS: Record<EtapeSynchro, string> = {
  CreerCommande: 'Créer commande',
  Livraison: 'Livraison',
  LireBL: 'Lire n° BL',
}

export const INCOTERM_LABELS: Record<Incoterm, string> = {
  Depart: 'Départ',
  Rendu: 'Rendu',
}

export interface Client {
  id: string
  code: string
  nom: string
  ville: string
}

export interface Chantier {
  id: string
  clientId: string
  code: string
  nom: string
  ville: string
}

export interface Produit {
  id: string
  codeSap: string
  libelle: string
  conditionnement: Conditionnement
  poidsSacKg?: number
}

export interface Transporteur {
  id: string
  code: string
  nom: string
}

export interface Camion {
  id: string
  immatriculation: string
  transporteurId: string
  tareReferenceKg?: number
}

export interface Chauffeur {
  id: string
  nom: string
  cin: string
  transporteurId: string
}

export interface Referentiels {
  clients: Client[]
  chantiers: Chantier[]
  produits: Produit[]
  transporteurs: Transporteur[]
  camions: Camion[]
  chauffeurs: Chauffeur[]
}

export type ReferentielKind = keyof Referentiels

export interface Pesee {
  type: 'Entree' | 'Sortie'
  pont: Pont
  poidsKg: number
  horodatageUtc: string
}

export interface BonDeChargement {
  numero: string
  dateUtc: string
}

export interface BonDeLivraison {
  /** Numéro imprimé tant que SAP n'a pas rendu le sien : l'ID de la commande (même règle que le BL Temara). */
  numeroLocal: string
  numeroSap?: string
  dateUtc: string
  brutKg: number
  tareKg: number
  netKg: number
}

export interface Commande {
  id: number
  origine: Origine
  numeroSap?: string
  /** Numéro local `CMD-MRK-yyyy-nnnnnn` attribué par l'API aux commandes créées au guichet. */
  numeroLocal?: string
  clientId: string
  chantierId: string
  produitId: string
  quantiteT: number
  nombreSacs?: number
  incoterm: Incoterm
  transporteurId: string
  camionId: string
  chauffeurId: string
  statut: StatutCommande
  synchro: StatutSynchro
  creeeLeUtc: string
  /** Libellés dénormalisés renvoyés par l'API (fallback quand l'élément n'est pas dans le référentiel chargé). */
  libelles?: CommandeLibelles
  reference?: string
  pontBascule?: Pont
  entreeUtc?: string
  sortieUtc?: string
  peseeEntree?: Pesee
  peseeSortie?: Pesee
  bonDeChargement?: BonDeChargement
  bonDeLivraison?: BonDeLivraison
  commentaire?: string
  /** Jeton de concurrence renvoyé par l'API (mode api), renvoyé tel quel sur les actions. */
  rowVersion?: string
}

export interface SyncOperation {
  id: number
  commandeId: number
  etapes: EtapeSynchro[]
  etapesFaites: EtapeSynchro[]
  etapeCourante?: EtapeSynchro
  statut: StatutSynchro
  tentatives: number
  message?: string
  derniereTentativeUtc?: string
}

export interface CommandeLibelles {
  clientNom: string
  clientCode: string
  chantierNom?: string
  produitLibelle: string
  conditionnement?: Conditionnement
  transporteurNom?: string
  immatriculation?: string
  chauffeurNom?: string
  chauffeurCin?: string
}

/** État du pont bascule tel que relayé par le hub (`ReceiveDeviceStatus`) ou déduit côté écran (`Stale`). */
export type EtatPont = 'Connected' | 'Disconnected' | 'Stale' | 'Error'

export type SourceLookup = 'Sap' | 'Cache'

export interface ClientSap {
  code: string
  nom: string
  ville?: string
}

export interface ChantierSap {
  code: string
  nom: string
  parDefaut: boolean
}

export interface TransporteurSap {
  code: string
  nom: string
}

export interface CamionSap {
  code: string
  immatriculation?: string
  transporteurCode?: string
}

export interface ResultatLookup<T> {
  source: SourceLookup
  items: T[]
}

/**
 * Saisie du guichet, alignée sur `CreerCommandeLocaleRequest` (phase 2b) : codes SAP saisis tels quels,
 * noms facultatifs (remplis depuis la réponse SAP, vides quand SAP est indisponible).
 */
export interface NouvelleCommandeInput {
  clientCode: string
  clientNom?: string
  chantierCode: string
  chantierNom?: string
  produitId: string
  quantiteT: number
  incoterm: Incoterm
  /** Obligatoire en « Rendu » (CFR), facultatif en « Départ » (EXW). */
  transporteurCode?: string
  transporteurNom?: string
  /** Partenaire ZX envoyé à SAP à la synchronisation (facultatif). */
  camionCodeSap?: string
  immatriculation: string
  immatriculationLibre: boolean
  chauffeurNom: string
  chauffeurCin?: string
  reference?: string
}

export interface SyntheseCommandes {
  aPeser: number
  dansUsine: number
  livreesAujourdhui: number
  enAttenteSynchro: number
}

export interface SapStatut {
  enLigne: boolean
  verifieAtUtc: string
  latenceMs?: number
  detail?: string
}

export interface Utilisateur {
  nom: string
  email: string
}

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

export interface MonitoringErreur {
  horodatageUtc: string
  correlationId: string
  route: string
  statut: number
  message: string
}

export interface MonitoringSnapshot {
  sante: { nom: string; etat: 'ok' | 'degrade' | 'ko'; detail: string }[]
  tauxErreur: number
  requetesParMinute: number
  latenceMs: { p50: number; p95: number; p99: number }
  dureeDbMs: number
  connexionsSignalR: number
  erreurs: MonitoringErreur[]
  liens: { libelle: string; url: string }[]
}
