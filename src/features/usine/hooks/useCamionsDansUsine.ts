import { useQuery } from '@tanstack/react-query'
import { commandeKeys } from '@/features/commandes/api/keys'
import { services } from '@/services'

export function useCamionsDansUsine() {
  return useQuery({
    queryKey: commandeKeys.lists(),
    queryFn: ({ signal }) => services.commandes.lister({ signal }),
    staleTime: 15_000,
    select: (commandes) => commandes.filter((c) => c.statut === 'DansUsine' || c.statut === 'SortieAutorisee'),
  })
}
