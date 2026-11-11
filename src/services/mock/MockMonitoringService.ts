import { buildMonitoring } from '@/data/mock'
import { jeuDemo } from '@/services/mock/jeuDemo'
import { verifierSignal } from '@/services/mock/signal'
import type { MonitoringService } from '@/services/types'

export const mockMonitoringService: MonitoringService = {
  async snapshot(options) {
    verifierSignal(options.signal)
    return buildMonitoring(new Date(jeuDemo.chargeeLeUtc()), options.sapEnLigne)
  },
}
