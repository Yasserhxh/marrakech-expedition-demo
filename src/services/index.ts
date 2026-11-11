import type { Services } from './types'
import { modeApi } from './http/config'
import { servicesHttp } from './http/servicesHttp'
import { mockCommandesService } from './mock/MockCommandesService'
import { mockMonitoringService } from './mock/MockMonitoringService'
import { mockPeseeService } from './mock/MockPeseeService'
import { mockReferentielsService } from './mock/MockReferentielsService'
import { mockSyncService } from './mock/MockSyncService'

const servicesMock: Services = {
  commandes: mockCommandesService,
  pesee: mockPeseeService,
  sync: mockSyncService,
  referentiels: mockReferentielsService,
  monitoring: mockMonitoringService,
}

/** Point unique de branchement. Le mode HTTP n'emprunte pas les données simulées. */
export const services: Services = modeApi() === 'http' ? servicesHttp : servicesMock

export type {
  Services,
  CommandesService,
  PeseeService,
  SyncService,
  ReferentielsService,
  MonitoringService,
  PingSap,
  NouvelElement,
  ResultatSynchronisation,
  NotificationMetier,
  OptionsRequete,
} from './types'
