import { useCallback, useEffect, useState } from 'react'
import { services } from '@/services'
import { estApiError } from '@/services/http/apiClient'
import { useAppStore, type PoidsState } from '@/store/useAppStore'
import { PontDeconnecte } from './PontDeconnecte'

export { PontDeconnecte }

export type TypeValidation = 'tare' | 'brut'

/** Une lecture n'est exploitable que stable, récente (< 10 s) et venant d'un pont connecté. */
export function lectureExploitable(poids: Pick<PoidsState, 'stable' | 'stale' | 'connecte'>): boolean {
  return poids.stable && !poids.stale && poids.connecte
}

/**
 * Cycle de vie de la liaison pont (hub en mode api, simulation en mock) et validation d'une pesée :
 * succès → commande mise à jour dans le store ; 409 (lecture différente, statut, concurrence) → toast déjà émis
 * par le client HTTP, la commande est relue ; autre erreur → toast.
 */
export function usePesee(commandeId: number, type: TypeValidation) {
  const poids = useAppStore((s) => s.poids)
  const upsertCommande = useAppStore((s) => s.upsertCommande)
  const chargerDetail = useAppStore((s) => s.chargerDetail)
  const signalerErreur = useAppStore((s) => s.signalerErreur)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    services.pesee
      .demarrer()
      .catch((e: unknown) => signalerErreur(e, 'Liaison avec le pont bascule impossible'))
    return () => {
      void services.pesee.arreter()
    }
  }, [signalerErreur])

  const valider = useCallback(async (): Promise<boolean> => {
    setEnvoi(true)
    try {
      const commande =
        type === 'tare'
          ? await services.pesee.validerTare(commandeId)
          : await services.pesee.validerBrut(commandeId)
      upsertCommande(commande)
      return true
    } catch (e) {
      if (estApiError(e) && e.status === 409) void chargerDetail(commandeId)
      signalerErreur(e, 'Validation impossible')
      return false
    } finally {
      setEnvoi(false)
    }
  }, [commandeId, type, upsertCommande, chargerDetail, signalerErreur])

  return { poids, exploitable: lectureExploitable(poids), envoi, valider }
}
