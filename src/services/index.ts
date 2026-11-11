import type { Services } from './types'
import { mockCommandesService } from './mock/MockCommandesService'
import { mockPeseeService } from './mock/MockPeseeService'
import { mockSyncService } from './mock/MockSyncService'
import { mockReferentielsService } from './mock/MockReferentielsService'

/** Point unique de branchement : remplacer les implémentations mock par des clients HTTP. */
export const services: Services = {
  commandes: mockCommandesService,
  pesee: mockPeseeService,
  sync: mockSyncService,
  referentiels: mockReferentielsService,
}

export type {
  Services,
  CommandesService,
  PeseeService,
  SyncService,
  ReferentielsService,
  PingSap,
  NouvelElement,
} from './types'
