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
  numeroProvisoire: string
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
  entreeUtc?: string
  sortieUtc?: string
  peseeEntree?: Pesee
  peseeSortie?: Pesee
  bonDeChargement?: BonDeChargement
  bonDeLivraison?: BonDeLivraison
  commentaire?: string
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

export interface NouvelleCommandeInput {
  clientId: string
  chantierId: string
  produitId: string
  quantiteT: number
  incoterm: Incoterm
  transporteurId: string
  camionId: string
  chauffeurId: string
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
