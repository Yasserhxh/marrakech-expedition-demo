import type { CommandesService } from '@/services/types'
import { useAppStore, numeroAffiche } from '@/store/useAppStore'
import type { Commande, NouvelleCommandeInput, StatutCommande } from '@/types'
import { STATUT_LABELS } from '@/types'

const KG_PAR_TONNE = 1000

function exiger(commandeId: number, attendu: StatutCommande): Commande {
  const c = useAppStore.getState().commandes.find((x) => x.id === commandeId)
  if (!c) throw new Error(`Commande ${commandeId} introuvable`)
  if (c.statut !== attendu) {
    throw new Error(
      `Commande ${numeroAffiche(c)} : statut « ${STATUT_LABELS[c.statut]} », attendu « ${STATUT_LABELS[attendu]} »`,
    )
  }
  return c
}

export const mockCommandesService: CommandesService = {
  creerLocale(input: NouvelleCommandeInput): Commande {
    const st = useAppStore.getState()
    const produit = st.referentiels.produits.find((p) => p.id === input.produitId)
    if (!produit) throw new Error('Produit introuvable')
    const nombreSacs =
      produit.conditionnement === 'SAC' && produit.poidsSacKg
        ? Math.round((input.quantiteT * KG_PAR_TONNE) / produit.poidsSacKg)
        : undefined
    const commande: Commande = {
      id: st.prochainNumero('commandeId'),
      origine: 'Locale',
      ...input,
      nombreSacs,
      statut: 'Creee',
      synchro: 'EnAttente',
      creeeLeUtc: new Date().toISOString(),
    }
    st.upsertCommande(commande)
    st.pousserToast(
      'success',
      `Commande locale ${numeroAffiche(commande)} créée — en attente de synchronisation SAP`,
    )
    return commande
  },

  autoriserPesee(commandeId) {
    const c = exiger(commandeId, 'Creee')
    const st = useAppStore.getState()
    st.patchCommande(c.id, { statut: 'EntreeAutorisee' })
    st.pousserToast('success', `Pesée d'entrée autorisée pour ${numeroAffiche(c)}`)
  },

  autoriserSecondPesage(commandeId) {
    const c = exiger(commandeId, 'DansUsine')
    const st = useAppStore.getState()
    st.patchCommande(c.id, { statut: 'SortieAutorisee' })
    st.pousserToast('success', `Second pesage autorisé pour ${numeroAffiche(c)}`)
  },

  annuler(commandeId) {
    const st = useAppStore.getState()
    const c = st.commandes.find((x) => x.id === commandeId)
    if (!c) throw new Error(`Commande ${commandeId} introuvable`)
    if (c.bonDeLivraison) throw new Error('Une commande livrée ne peut plus être annulée')
    st.patchCommande(c.id, { statut: 'Annulee', synchro: 'Aucune' })
    st.retirerSyncOpsDeCommande(c.id)
    st.pousserToast('warning', `Commande ${numeroAffiche(c)} annulée`)
  },
}
