import type {
  CamionSap,
  ChantierSap,
  ClientSap,
  Commande,
  NouvelleCommandeInput,
  Origine,
  Pont,
  ReferentielKind,
  Referentiels,
  SapStatut,
  StatutCommande,
  SyncOperation,
  SyntheseCommandes,
  ResultatLookup,
  TransporteurSap,
} from '@/types'

/**
 * Points d'intégration avec l'API Marrakech (src/Marrakech.Api).
 * `mock/` : implémentations en mémoire adossées au store zustand (démo).
 * `http/` : implémentations réelles (contrat docs/phase2-api-contract.md).
 * Le choix se fait dans `services/index.ts` selon `VITE_DATA_MODE`.
 */

export interface FiltreCommandes {
  /** Jour planifié ou de création (`yyyy-MM-dd`), `all` pour tout ; défaut : aujourd'hui. */
  date?: string
  statut?: StatutCommande
  origine?: Origine
  q?: string
}

export interface ListeCommandes {
  commandes: Commande[]
  /** File de synchro projetée depuis `commande.synchro` (lecture seule en mode API). */
  syncOps: SyncOperation[]
  total: number
}

export interface CommandesService {
  lister(filtre?: FiltreCommandes): Promise<ListeCommandes>
  obtenir(commandeId: number): Promise<Commande>
  creerLocale(input: NouvelleCommandeInput): Promise<Commande>
  autoriserPesee(commandeId: number, pont: Pont): Promise<Commande>
  autoriserSecondPesage(commandeId: number, pont: Pont): Promise<Commande>
  annuler(commandeId: number, motif: string): Promise<Commande>
  synthese(): Promise<SyntheseCommandes>
}

export interface PeseeService {
  /** Ouvre la liaison avec le hub `/hubs/weight` (mode api) ; sans effet en mode mock. */
  demarrer(): Promise<void>
  arreter(): Promise<void>
  selectionnerPont(pont: Pont): void
  /** Démo : lance une rampe 0 → cible puis stabilise (remplace la lecture Databridge) ; sans effet en mode api. */
  simulerCamion(cibleKg: number): void
  arreterSimulation(): void
  /** Tare → Bon de chargement (`POST /commandes/{id}/pesees/entree`). */
  validerTare(commandeId: number): Promise<Commande>
  /** Brut → Bon de livraison (`POST /commandes/{id}/pesees/sortie`). */
  validerBrut(commandeId: number): Promise<Commande>
}

/** Recherche SAP à la création de commande (phase 2b) : relais `/api/sap/*` de l'API, repli « Cache » hors ligne. */
export interface SapLookupService {
  /** Clients dont le code SAP commence par `prefixe` (1 à 10 chiffres), ≤ 20 lignes. */
  rechercherClients(prefixe: string): Promise<ResultatLookup<ClientSap>>
  /** Chantiers (partenaires WE) du client. */
  chantiersDuClient(codeClient: string): Promise<ResultatLookup<ChantierSap>>
  transporteur(code: string): Promise<ResultatLookup<TransporteurSap>>
  camion(code: string): Promise<ResultatLookup<CamionSap>>
}

export interface PingSap {
  enLigne: boolean
  latenceMs?: number
}

export interface SyncService {
  ping(): Promise<PingSap>
  synchroniser(operationId: number): Promise<void>
  toutSynchroniser(): Promise<void>
  /** Démo : lève le blocage crédit côté « SAP » pour permettre un nouvel essai. */
  simulerDeblocageClient(codeClient: string): void
}

export type NouvelElement<K extends ReferentielKind> = Omit<Referentiels[K][number], 'id'>

export interface ReferentielsService {
  /** Charge clients, produits, transporteurs, camions, chauffeurs (chantiers : par client). */
  charger(): Promise<Referentiels>
  /** Chantiers d'un client (garde-fou Temara : jamais la liste globale). */
  chantiersDuClient(clientId: string): Promise<Referentiels['chantiers']>
  ajouter<K extends ReferentielKind>(kind: K, element: NouvelElement<K>): Promise<void>
}

export interface SapService {
  statut(): Promise<SapStatut>
}

export interface Services {
  commandes: CommandesService
  pesee: PeseeService
  sync: SyncService
  referentiels: ReferentielsService
  sap: SapService
  sapLookup: SapLookupService
}
