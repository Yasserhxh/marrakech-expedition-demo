import { useMutation, useQuery } from '@tanstack/react-query'
import { syncKeys } from '@/features/synchronisation/api/keys'
import { services, type ResultatSynchronisation } from '@/services'
import { useAppStore } from '@/store/useAppStore'
import { notifier, notifierEchec } from '@/utils/notifier'

const FRAICHEUR_MS = 10_000

export function useSyncOperations() {
  return useQuery({
    queryKey: syncKeys.lists(),
    queryFn: ({ signal }) => services.sync.operations({ signal }),
    staleTime: FRAICHEUR_MS,
  })
}

export function useClientsBloques() {
  return useQuery({
    queryKey: syncKeys.clientsBloques(),
    queryFn: ({ signal }) => services.sync.clientsBloques({ signal }),
    staleTime: FRAICHEUR_MS,
  })
}

export function useNombreSyncEnAttente() {
  return useQuery({
    queryKey: syncKeys.lists(),
    queryFn: ({ signal }) => services.sync.operations({ signal }),
    staleTime: FRAICHEUR_MS,
    select: (operations) => operations.filter((o) => o.statut === 'EnAttente' || o.statut === 'Erreur').length,
  })
}

export function usePingSap() {
  const sapOnline = useAppStore((s) => s.sapOnline)
  return useQuery({
    queryKey: syncKeys.ping(sapOnline),
    queryFn: ({ signal }) => services.sync.ping({ signal }),
    staleTime: Infinity,
    retry: false,
  })
}

function notifierSync(resultat: ResultatSynchronisation) {
  if (resultat.issue === 'ignoree') return
  notifier(resultat.notification.tone, resultat.notification.message)
}

export function useSynchroniser() {
  return useMutation({
    mutationFn: (operationId: number) => services.sync.synchroniser(operationId),
    retry: false,
    onSuccess: notifierSync,
    onError: notifierEchec,
  })
}

export function useToutSynchroniser() {
  return useMutation({
    mutationFn: () => services.sync.toutSynchroniser(),
    retry: false,
    onSuccess: (resultats) => {
      for (const resultat of resultats) notifierSync(resultat)
    },
    onError: notifierEchec,
  })
}

export function useDeblocageClient() {
  return useMutation({
    mutationFn: (codeClient: string) => services.sync.simulerDeblocageClient(codeClient),
    retry: false,
    onSuccess: (_vide, codeClient) => {
      notifier('info', `Blocage crédit levé côté SAP pour le client ${codeClient} (simulation)`)
    },
    onError: notifierEchec,
  })
}
