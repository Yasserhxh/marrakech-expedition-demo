import { buildMonitoring } from '@/data/mock'
import { queryClient } from '@/app/queryClient'
import { commandeKeys } from '@/features/commandes/api/keys'
import { monitoringKeys } from '@/features/monitoring/api/keys'
import { referentielKeys } from '@/features/referentiels/api/keys'
import { syncKeys } from '@/features/synchronisation/api/keys'
import { modeApi } from '@/services/http/config'
import { jeuDemo } from '@/services/mock/jeuDemo'

/** Projette le jeu simulé dans le cache. Les mutations du jeu appellent cette fonction. */
export function synchroniserCacheDemo() {
  if (modeApi() !== 'mock') return
  const instant = new Date(jeuDemo.chargeeLeUtc())
  queryClient.setQueryData(commandeKeys.lists(), jeuDemo.commandes())
  queryClient.setQueryData(referentielKeys.lists(), jeuDemo.referentiels())
  queryClient.setQueryData(syncKeys.lists(), jeuDemo.syncOps())
  queryClient.setQueryData(syncKeys.clientsBloques(), jeuDemo.clientsBloques())
  queryClient.setQueryData(monitoringKeys.snapshot(false), buildMonitoring(instant, false))
  queryClient.setQueryData(monitoringKeys.snapshot(true), buildMonitoring(instant, true))
}

if (modeApi() === 'mock') {
  synchroniserCacheDemo()
  jeuDemo.ecouter(synchroniserCacheDemo)
}
