import type { Commande } from '@/types'

export function numeroAffiche(commande: Commande): string {
  return commande.numeroSap ?? `L-${commande.id}`
}

export function messageBonLivraison(commande: Commande): string {
  const numeroSapBl = commande.bonDeLivraison?.numeroSap
  return numeroSapBl
    ? `BL SAP ${numeroSapBl} émis pour ${numeroAffiche(commande)}`
    : `BL provisoire émis pour ${numeroAffiche(commande)} — en attente de synchronisation SAP`
}
