import { useQuery } from '@tanstack/react-query'
import { monitoringKeys } from '@/features/monitoring/api/keys'
import { services } from '@/services'
import { useAppStore } from '@/store/useAppStore'

export function useMonitoring() {
  const sapOnline = useAppStore((s) => s.sapOnline)
  return useQuery({
    queryKey: monitoringKeys.snapshot(sapOnline),
    queryFn: ({ signal }) => services.monitoring.snapshot({ signal, sapEnLigne: sapOnline }),
    staleTime: 60_000,
    retry: false,
  })
}
