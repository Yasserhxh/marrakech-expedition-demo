import type {
  CommandesService,
  MonitoringService,
  PeseeService,
  ReferentielsService,
  Services,
  SyncService,
} from '@/services/types'
import { httpNonDisponible } from './erreurs'

const commandes: CommandesService = {
  lister: () => httpNonDisponible('commandes.lister'),
  creerLocale: () => httpNonDisponible('commandes.creerLocale'),
  autoriserPesee: () => httpNonDisponible('commandes.autoriserPesee'),
  autoriserSecondPesage: () => httpNonDisponible('commandes.autoriserSecondPesage'),
  annuler: () => httpNonDisponible('commandes.annuler'),
}

const pesee: PeseeService = {
  selectionnerPont: () => httpNonDisponible('pesee.selectionnerPont'),
  simulerCamion: () => httpNonDisponible('pesee.simulerCamion'),
  arreterSimulation: () => httpNonDisponible('pesee.arreterSimulation'),
  validerTare: () => httpNonDisponible('pesee.validerTare'),
  validerBrut: () => httpNonDisponible('pesee.validerBrut'),
}

const sync: SyncService = {
  operations: () => httpNonDisponible('sync.operations'),
  clientsBloques: () => httpNonDisponible('sync.clientsBloques'),
  ping: () => httpNonDisponible('sync.ping'),
  synchroniser: () => httpNonDisponible('sync.synchroniser'),
  toutSynchroniser: () => httpNonDisponible('sync.toutSynchroniser'),
  simulerDeblocageClient: () => httpNonDisponible('sync.simulerDeblocageClient'),
}

const referentiels: ReferentielsService = {
  lister: () => httpNonDisponible('referentiels.lister'),
  ajouter: () => httpNonDisponible('referentiels.ajouter'),
}

const monitoring: MonitoringService = {
  snapshot: () => httpNonDisponible('monitoring.snapshot'),
}

/** Adaptateur HTTP volontairement incomplet : il échoue au lieu de simuler un backend. */
export const servicesHttp: Services = { commandes, pesee, sync, referentiels, monitoring }
