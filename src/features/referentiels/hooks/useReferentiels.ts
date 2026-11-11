import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { referentielKeys } from '@/features/referentiels/api/keys'
import { services, type NouvelElement } from '@/services'
import type { ReferentielKind, Referentiels } from '@/types'
import { notifier, notifierEchec } from '@/utils/notifier'

const FRAICHEUR_MS = 5 * 60_000

export const REFERENTIELS_VIDES: Referentiels = {
  clients: [],
  chantiers: [],
  produits: [],
  transporteurs: [],
  camions: [],
  chauffeurs: [],
}

export function useReferentiels() {
  return useQuery({
    queryKey: referentielKeys.lists(),
    queryFn: ({ signal }) => services.referentiels.lister({ signal }),
    staleTime: FRAICHEUR_MS,
  })
}

export function useReferentielLookup() {
  const { data } = useReferentiels()
  return useMemo(
    () => ({
      client: (id: string) => data?.clients.find((x) => x.id === id),
      chantier: (id: string) => data?.chantiers.find((x) => x.id === id),
      produit: (id: string) => data?.produits.find((x) => x.id === id),
      transporteur: (id: string) => data?.transporteurs.find((x) => x.id === id),
      camion: (id: string) => data?.camions.find((x) => x.id === id),
      chauffeur: (id: string) => data?.chauffeurs.find((x) => x.id === id),
    }),
    [data],
  )
}

export function useAjouterReferentiel() {
  return useMutation({
    mutationFn: (variables: { kind: ReferentielKind; element: NouvelElement<ReferentielKind> }) =>
      services.referentiels.ajouter(variables.kind, variables.element as never),
    retry: false,
    onSuccess: () => notifier('success', 'Élément ajouté au référentiel (mémoire uniquement)'),
    onError: notifierEchec,
  })
}
