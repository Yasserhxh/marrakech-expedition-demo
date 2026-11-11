import type { Commande, NouvelleCommandeInput, Pont, ReferentielKind, Referentiels } from '@/types'

/**
 * Points d'intégration avec l'API Marrakech (src/Marrakech.Api).
 * La maquette fournit une implémentation `mock/` adossée au store zustand ;
 * le branchement réel consiste à remplacer `services/index.ts` par des
 * implémentations HTTP (fetch + X-Correlation-Id) sans toucher aux écrans.
 */

export interface CommandesService {
  creerLocale(input: NouvelleCommandeInput): Commande
  autoriserPesee(commandeId: number): void
  autoriserSecondPesage(commandeId: number): void
  annuler(commandeId: number): void
}

export interface PeseeService {
  selectionnerPont(pont: Pont): void
  /** Démo : lance une rampe 0 → cible puis stabilise (remplace la lecture Databridge). */
  simulerCamion(cibleKg: number): void
  arreterSimulation(): void
  validerTare(commandeId: number): Commande
  validerBrut(commandeId: number): Commande
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
  ajouter<K extends ReferentielKind>(kind: K, element: NouvelElement<K>): void
}

export interface Services {
  commandes: CommandesService
  pesee: PeseeService
  sync: SyncService
  referentiels: ReferentielsService
}
