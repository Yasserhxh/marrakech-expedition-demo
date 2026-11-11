import { useQuery } from '@tanstack/react-query'
import { commandeKeys } from '@/features/commandes/api/keys'
import { services } from '@/services'

const FRAICHEUR_MS = 15_000

export function useCommandes() {
  return useQuery({
    queryKey: commandeKeys.lists(),
    queryFn: ({ signal }) => services.commandes.lister({ signal }),
    staleTime: FRAICHEUR_MS,
  })
}

/** Détail dérivé de la liste : une seule copie autoritaire des commandes dans le cache. */
export function useCommande(id: number | null | undefined) {
  return useQuery({
    queryKey: commandeKeys.lists(),
    queryFn: ({ signal }) => services.commandes.lister({ signal }),
    staleTime: FRAICHEUR_MS,
    select: (commandes) =>
      id == null || !Number.isFinite(id) ? null : (commandes.find((commande) => commande.id === id) ?? null),
  })
}
