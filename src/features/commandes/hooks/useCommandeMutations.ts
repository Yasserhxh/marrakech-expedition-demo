import { useMutation } from '@tanstack/react-query'
import { services } from '@/services'
import { messageBonLivraison, numeroAffiche } from '@/utils/commande'
import { notifier, notifierEchec } from '@/utils/notifier'

export function useCreerCommandeLocale() {
  return useMutation({
    mutationFn: services.commandes.creerLocale,
    retry: false,
    onSuccess: (commande) => {
      notifier('success', `Commande locale ${numeroAffiche(commande)} créée — en attente de synchronisation SAP`)
    },
    onError: notifierEchec,
  })
}

export function useAutoriserPesee() {
  return useMutation({
    mutationFn: (commandeId: number) => services.commandes.autoriserPesee(commandeId),
    retry: false,
    onSuccess: (commande) => notifier('success', `Pesée d'entrée autorisée pour ${numeroAffiche(commande)}`),
    onError: notifierEchec,
  })
}

export function useAutoriserSecondPesage() {
  return useMutation({
    mutationFn: (commandeId: number) => services.commandes.autoriserSecondPesage(commandeId),
    retry: false,
    onSuccess: (commande) => notifier('success', `Second pesage autorisé pour ${numeroAffiche(commande)}`),
    onError: notifierEchec,
  })
}

export function useAnnulerCommande() {
  return useMutation({
    mutationFn: (commandeId: number) => services.commandes.annuler(commandeId),
    retry: false,
    onSuccess: (commande) => notifier('warning', `Commande ${numeroAffiche(commande)} annulée`),
    onError: notifierEchec,
  })
}

export function useValiderTare() {
  return useMutation({
    mutationFn: (commandeId: number) => services.pesee.validerTare(commandeId),
    retry: false,
    onSuccess: (commande) => {
      notifier('success', `Tare validée — Bon de chargement ${commande.bonDeChargement?.numero ?? ''} émis`)
    },
    onError: notifierEchec,
  })
}

export function useValiderBrut() {
  return useMutation({
    mutationFn: (commandeId: number) => services.pesee.validerBrut(commandeId),
    retry: false,
    onSuccess: (commande) => notifier('success', messageBonLivraison(commande)),
    onError: notifierEchec,
  })
}
