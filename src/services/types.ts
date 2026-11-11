import type {
  Commande,
  MonitoringSnapshot,
  NouvelleCommandeInput,
  Pont,
  ReferentielKind,
  Referentiels,
  SyncOperation,
  ToastTone,
} from '@/types'

/**
 * Contrats d'accès aux données d'expédition.
 * L'implémentation actuelle est simulée (`services/mock`).
 * Le mode HTTP (`services/http`) refuse explicitement les appels tant que le backend n'est pas validé :
 * aucun chemin d'API de production n'est inventé ici.
 */

export interface OptionsRequete {
  signal?: AbortSignal
}

export interface CommandesService {
  lister(options?: OptionsRequete): Promise<Commande[]>
  creerLocale(input: NouvelleCommandeInput): Promise<Commande>
  autoriserPesee(commandeId: number): Promise<Commande>
  autoriserSecondPesage(commandeId: number): Promise<Commande>
  annuler(commandeId: number): Promise<Commande>
}

export interface PeseeService {
  selectionnerPont(pont: Pont): void
  /** Démo : lance une rampe 0 → cible puis stabilise (remplace la lecture Databridge). */
  simulerCamion(cibleKg: number): void
  arreterSimulation(): void
  validerTare(commandeId: number): Promise<Commande>
  validerBrut(commandeId: number): Promise<Commande>
}

export interface PingSap {
  enLigne: boolean
  latenceMs?: number
}

export interface NotificationMetier {
  tone: ToastTone
  message: string
}

export type ResultatSynchronisation =
  | { issue: 'ignoree' }
  | { issue: 'sapHorsLigne'; notification: NotificationMetier }
  | { issue: 'erreur'; notification: NotificationMetier }
  | { issue: 'succes'; notification: NotificationMetier }

export interface SyncService {
  operations(options?: OptionsRequete): Promise<SyncOperation[]>
  clientsBloques(options?: OptionsRequete): Promise<string[]>
  ping(options?: OptionsRequete): Promise<PingSap>
  synchroniser(operationId: number): Promise<ResultatSynchronisation>
  toutSynchroniser(): Promise<ResultatSynchronisation[]>
  /** Démo : lève le blocage crédit côté « SAP » pour permettre un nouvel essai. */
  simulerDeblocageClient(codeClient: string): Promise<void>
}

export type NouvelElement<K extends ReferentielKind> = Omit<Referentiels[K][number], 'id'>

export interface ReferentielsService {
  lister(options?: OptionsRequete): Promise<Referentiels>
  ajouter<K extends ReferentielKind>(kind: K, element: NouvelElement<K>): Promise<void>
}

export interface OptionsMonitoring extends OptionsRequete {
  /** Valeur portée par la clé de cache, pas lue en différé depuis l'interface. */
  sapEnLigne: boolean
}

export interface MonitoringService {
  /**
   * Instantané simulé pour l'écran de démonstration.
   * Ce n'est pas une télémétrie de production et aucun endpoint réel n'est appelé.
   */
  snapshot(options: OptionsMonitoring): Promise<MonitoringSnapshot>
}

export interface Services {
  commandes: CommandesService
  pesee: PeseeService
  sync: SyncService
  referentiels: ReferentielsService
  monitoring: MonitoringService
}
