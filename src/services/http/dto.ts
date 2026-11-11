/** DTO du contrat `docs/phase2-api-contract.md` (camelCase, dates ISO UTC). */

export type OrigineDto = 'Sap' | 'Locale'
export type StatutDto =
  | 'Creee'
  | 'EntreeAutorisee'
  | 'DansUsine'
  | 'SortieAutorisee'
  | 'Livree'
  | 'Synchronisee'
  | 'Annulee'
  | 'ErreurSync'
export type IncotermDto = 'CFR' | 'EXW'
export type ConditionnementDto = 'Vrac' | 'Sac'
export type StatutSynchroDto = 'Aucune' | 'EnAttente' | 'EnCours' | 'Erreur' | 'Synchronisee'
export type EtapeDto = 'CreerCommande' | 'Livraison' | 'LireBL'
export type PontDto = 'PB21' | 'PB22' | 'PB23' | 'PB24'

export interface SynchroDto {
  statut: StatutSynchroDto
  etape?: EtapeDto | null
  erreur?: string | null
  tentatives: number
}

export interface CommandeDto {
  id: number
  numeroLocal?: string | null
  salesDocument?: string | null
  transportCode?: string | null
  deliveryCode?: string | null
  origine: OrigineDto
  statut: StatutDto
  clientCode: string
  clientNom: string
  chantierCode?: string | null
  chantierNom?: string | null
  produitCode: string
  produitLibelle: string
  conditionnement?: ConditionnementDto | null
  quantite: number
  unite: string
  nombreSacs?: number | null
  incoterm: IncotermDto
  transporteurCode?: string | null
  transporteurNom?: string | null
  immatriculation?: string | null
  chauffeur?: string | null
  chauffeurCin?: string | null
  reference?: string | null
  pontBascule?: PontDto | null
  datePlanifieeUtc?: string | null
  createdAtUtc: string
  updatedAtUtc: string
  rowVersion?: string | null
  synchro: SynchroDto
}

/** Sous-objets du détail : forme non figée dans le contrat, lue de façon tolérante (voir mappers). */
export interface PeseeDto {
  type?: 'Entree' | 'Sortie' | null
  pontBascule?: PontDto | null
  pont?: PontDto | null
  poidsKg: number
  horodatageUtc?: string | null
  dateUtc?: string | null
}

export interface BonDeChargementDto {
  numero: string
  dateUtc: string
}

export interface BonDeLivraisonDto {
  /** ID de la commande tant que `numeroSap` est vide (entier côté API). */
  numeroLocal?: string | number | null
  numeroSap?: string | null
  dateUtc: string
  brutKg: number
  tareKg: number
  netKg: number
}

export interface SyncOperationDto {
  id: number
  type?: EtapeDto | null
  etape?: EtapeDto | null
  statut: StatutSynchroDto
  tentatives?: number | null
  erreur?: string | null
  derniereTentativeUtc?: string | null
}

export interface CommandeDetailDto extends CommandeDto {
  pesees?: PeseeDto[] | null
  peseeEntree?: PeseeDto | null
  peseeSortie?: PeseeDto | null
  bonDeChargement?: BonDeChargementDto | null
  bonDeLivraison?: BonDeLivraisonDto | null
  syncOperations?: SyncOperationDto[] | null
}

export interface PageDto<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface SyntheseDto {
  aPeser: number
  dansUsine: number
  livreesAujourdhui: number
  enAttenteSynchro: number
}

export interface SapStatutDto {
  enLigne: boolean
  verifieAtUtc: string
  latenceMs?: number | null
  detail?: string | null
}

export interface CreerCommandeLocaleRequest {
  clientCode: string
  clientNom?: string
  chantierCode: string
  chantierNom?: string
  produitCode: string
  quantite: number
  incoterm: IncotermDto
  transporteurCode?: string
  transporteurNom?: string
  camionCodeSap?: string
  immatriculation: string
  immatriculationLibre?: boolean
  chauffeur: string
  chauffeurCin?: string
  reference?: string
}

export interface ClientDto {
  code: string
  nom: string
  actif: boolean
}
export interface ChantierDto {
  code: string
  clientCode: string
  nom: string
  actif: boolean
}
export interface ProduitDto {
  code: string
  libelle: string
  conditionnement: ConditionnementDto
  sacsParTonne?: number | null
  actif: boolean
}
export interface TransporteurDto {
  code: string
  nom: string
  actif: boolean
}
export interface CamionDto {
  immatriculation: string
  vehicleCode?: string | null
  transporteurCode?: string | null
  actif: boolean
}
export interface ChauffeurDto {
  id: number
  nom: string
  cin?: string | null
  actif: boolean
}

export interface ClientLogRequest {
  level: 'Error' | 'Warning' | 'Information'
  message: string
  url: string
  stack?: string
  correlationId: string
}

/* ---------- Phase 2b : recherche SAP (`/api/sap/*`) ---------- */

export type SourceLookupDto = 'Sap' | 'Cache'

export interface ClientSapDto {
  code: string
  nom: string
  ville?: string | null
}
export interface ChantierSapDto {
  code: string
  nom: string
  parDefaut?: boolean | null
}
export interface TransporteurSapDto {
  code: string
  nom: string
}
export interface CamionSapDto {
  code: string
  immatriculation?: string | null
  transporteurCode?: string | null
}
export interface ListeLookupDto<T> {
  source: SourceLookupDto
  items: T[]
}
export interface ItemLookupDto<T> {
  source: SourceLookupDto
  item: T
}

/* ---------- Phase 3b : pesées (`/api/pesees/devices`, hub `/hubs/weight`) ---------- */

export type EtatPontDto = 'Connected' | 'Disconnected' | 'Stale' | 'Error'

/** Message `ReceiveWeight` du hub (format Temara, camelCase). */
export interface WeightMessageDto {
  deviceId: string
  weight: number
  isStable: boolean
  tsUtc: string
  source?: string
  sequence?: number
  agentId?: string
  receivedAtUtc?: string | null
}

/** Message `ReceiveDeviceStatus` du hub. */
export interface DeviceStatusMessageDto {
  deviceId: string
  state: EtatPontDto
  detail?: string | null
  tsUtc: string
}

/** Ligne de `GET /api/pesees/devices` (instantané du cache serveur). */
export interface DeviceSnapshotDto {
  deviceId: string
  state: EtatPontDto
  weight?: number | null
  isStable?: boolean | null
  tsUtc?: string | null
  receivedAtUtc?: string | null
  agentId?: string | null
  stale: boolean
}

export interface PeseeRequest {
  deviceId: PontDto
  poidsKg: number
  horodatageUtc: string
  rowVersion?: string
}
