import type { CommandesService } from '@/services/types'
import { jeuDemo } from '@/services/mock/jeuDemo'
import type { Commande, NouvelleCommandeInput, StatutCommande } from '@/types'
import { STATUT_LABELS } from '@/types'
import { numeroAffiche } from '@/utils/commande'
import { verifierSignal } from '@/services/mock/signal'

const KG_PAR_TONNE = 1000

function exiger(commandeId: number, attendu: StatutCommande): Commande {
  const commande = jeuDemo.trouverCommande(commandeId)
  if (!commande) throw new Error(`Commande ${commandeId} introuvable`)
  if (commande.statut !== attendu) {
    throw new Error(
      `Commande ${numeroAffiche(commande)} : statut « ${STATUT_LABELS[commande.statut]} », attendu « ${STATUT_LABELS[attendu]} »`,
    )
  }
  return commande
}

export const mockCommandesService: CommandesService = {
  async lister(options) {
    verifierSignal(options?.signal)
    return jeuDemo.commandes()
  },

  async creerLocale(input: NouvelleCommandeInput): Promise<Commande> {
    const produit = jeuDemo.referentiels().produits.find((p) => p.id === input.produitId)
    if (!produit) throw new Error('Produit introuvable')
    const nombreSacs =
      produit.conditionnement === 'SAC' && produit.poidsSacKg
        ? Math.round((input.quantiteT * KG_PAR_TONNE) / produit.poidsSacKg)
        : undefined
    const commande: Commande = {
      id: jeuDemo.prendreNumero('commandeId'),
      origine: 'Locale',
      ...input,
      nombreSacs,
      statut: 'Creee',
      synchro: 'EnAttente',
      creeeLeUtc: new Date().toISOString(),
    }
    jeuDemo.insererCommande(commande)
    return commande
  },

  async autoriserPesee(commandeId) {
    const commande = exiger(commandeId, 'Creee')
    return jeuDemo.patcherCommande(commande.id, { statut: 'EntreeAutorisee' })
  },

  async autoriserSecondPesage(commandeId) {
    const commande = exiger(commandeId, 'DansUsine')
    return jeuDemo.patcherCommande(commande.id, { statut: 'SortieAutorisee' })
  },

  async annuler(commandeId) {
    const commande = jeuDemo.trouverCommande(commandeId)
    if (!commande) throw new Error(`Commande ${commandeId} introuvable`)
    if (commande.bonDeLivraison) throw new Error('Une commande livrée ne peut plus être annulée')
    const suivante = jeuDemo.patcherCommande(commande.id, { statut: 'Annulee', synchro: 'Aucune' })
    jeuDemo.retirerSyncDeCommande(commande.id)
    return suivante
  },
}
