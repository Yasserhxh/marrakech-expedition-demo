import { describe, expect, it, vi } from 'vitest'
import { reinitialiserDemonstration } from '@/app/reinitialiserDemo'
import { services } from '@/services'
import { jeuDemo } from '@/services/mock/jeuDemo'
import { useAppStore } from '@/store/useAppStore'
import type { NouvelleCommandeInput } from '@/types'

const SAISIE: NouvelleCommandeInput = {
  clientId: 'c1',
  chantierId: 'ch1',
  produitId: 'p1',
  quantiteT: 10,
  incoterm: 'Rendu',
  transporteurId: 't1',
  camionId: 'v1',
  chauffeurId: 'd1',
}

describe('commandes simulées', () => {
  it('charge le jeu initial', async () => {
    const commandes = await services.commandes.lister()
    expect(commandes).toHaveLength(12)
    expect(commandes.some((c) => c.origine === 'Sap')).toBe(true)
    expect(commandes.some((c) => c.origine === 'Locale')).toBe(true)
  })

  it('ajoute une commande locale visible dans la liste', async () => {
    const avant = (await services.commandes.lister()).length
    const creee = await services.commandes.creerLocale(SAISIE)
    expect(creee.statut).toBe('Creee')
    expect(creee.synchro).toBe('EnAttente')
    expect(creee.origine).toBe('Locale')
    const apres = await services.commandes.lister()
    expect(apres).toHaveLength(avant + 1)
    expect(apres.some((c) => c.id === creee.id)).toBe(true)
  })

  it('ne crée pas de commande si le produit est inconnu', async () => {
    const avant = (await services.commandes.lister()).length
    await expect(services.commandes.creerLocale({ ...SAISIE, produitId: 'inconnu' })).rejects.toThrow(/Produit/)
    expect(await services.commandes.lister()).toHaveLength(avant)
  })
})

describe('pesée simulée', () => {
  it('refuse une tare instable sans changer le statut', async () => {
    const commande = (await services.commandes.lister()).find((c) => c.statut === 'EntreeAutorisee')
    expect(commande).toBeTruthy()
    if (!commande) return
    useAppStore.getState().setPoids({ lectureKg: 16000, stable: false, connecte: true })
    await expect(services.pesee.validerTare(commande.id)).rejects.toThrow(/stable/)
    const inchangee = (await services.commandes.lister()).find((c) => c.id === commande.id)
    expect(inchangee?.statut).toBe('EntreeAutorisee')
    expect(inchangee?.bonDeChargement).toBeUndefined()
  })

  it('valide la tare une seule fois', async () => {
    const commande = (await services.commandes.lister()).find((c) => c.statut === 'EntreeAutorisee')
    expect(commande).toBeTruthy()
    if (!commande) return
    useAppStore.getState().setPoids({ lectureKg: 16240, stable: true, connecte: true, pont: 'PB22' })
    const suivante = await services.pesee.validerTare(commande.id)
    expect(suivante.statut).toBe('DansUsine')
    expect(suivante.bonDeChargement?.numero).toMatch(/^BC-MRK-/)
    useAppStore.getState().setPoids({ lectureKg: 16240, stable: true, connecte: true, pont: 'PB22' })
    await expect(services.pesee.validerTare(commande.id)).rejects.toThrow(/autorisée/)
    const finale = (await services.commandes.lister()).find((c) => c.id === commande.id)
    expect(finale?.statut).toBe('DansUsine')
    expect(finale?.bonDeChargement?.numero).toBe(suivante.bonDeChargement?.numero)
  })
})

describe('synchronisation simulée', () => {
  it('laisse la file en attente lorsque SAP est hors ligne', async () => {
    const operation = (await services.sync.operations()).find((o) => o.statut === 'EnAttente')
    expect(operation).toBeTruthy()
    if (!operation) return
    const resultat = await services.sync.synchroniser(operation.id)
    expect(resultat.issue).toBe('sapHorsLigne')
    const apres = (await services.sync.operations()).find((o) => o.id === operation.id)
    expect(apres?.tentatives).toBe(operation.tentatives)
    expect(apres?.statut).toBe('EnAttente')
  })

  it('conserve le message de blocage crédit et n’enchaîne pas les essais', async () => {
    vi.useFakeTimers()
    try {
      useAppStore.setState({ sapOnline: true })
      const operation = (await services.sync.operations()).find((o) => o.statut === 'Erreur')
      expect(operation?.message).toMatch(/bloqué/i)
      if (!operation) return
      const promesse = services.sync.synchroniser(operation.id)
      await vi.runAllTimersAsync()
      const resultat = await promesse
      expect(resultat.issue).toBe('erreur')
      if (resultat.issue === 'erreur') expect(resultat.notification.message).toMatch(/bloqué/i)
      const apres = (await services.sync.operations()).find((o) => o.id === operation.id)
      expect(apres?.tentatives).toBe(operation.tentatives + 1)
      expect(apres?.statut).toBe('Erreur')
    } finally {
      vi.useRealTimers()
    }
  })

  it('synchronise une opération en attente et ignore le second appel', async () => {
    vi.useFakeTimers()
    try {
      useAppStore.setState({ sapOnline: true })
      const operation = (await services.sync.operations()).find((o) => o.statut === 'EnAttente')
      expect(operation).toBeTruthy()
      if (!operation) return
      const premier = services.sync.synchroniser(operation.id)
      const second = services.sync.synchroniser(operation.id)
      await vi.runAllTimersAsync()
      const issues = [(await premier).issue, (await second).issue].sort()
      expect(issues).toEqual(['ignoree', 'succes'])
      const apres = (await services.sync.operations()).find((o) => o.id === operation.id)
      expect(apres?.tentatives).toBe(1)
      expect(apres?.statut).toBe('Synchronisee')
      const commande = (await services.commandes.lister()).find((c) => c.id === operation.commandeId)
      expect(commande?.statut).toBe('Synchronisee')
      expect(commande?.bonDeLivraison?.numeroSap).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignore une synchronisation encore en vol après réinitialisation', async () => {
    vi.useFakeTimers()
    try {
      useAppStore.setState({ sapOnline: true })
      const operation = (await services.sync.operations()).find((o) => o.statut === 'EnAttente')
      if (!operation) throw new Error('opération attendue')
      const promesse = services.sync.synchroniser(operation.id)
      expect(reinitialiserDemonstration()).toBe(true)
      await vi.runAllTimersAsync()
      expect((await promesse).issue).toBe('ignoree')
      const commandes = await services.commandes.lister()
      expect(commandes).toHaveLength(12)
      expect(commandes.some((c) => c.synchro === 'EnCours')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('référentiels et réinitialisation', () => {
  it('ajoute un client au référentiel', async () => {
    const avant = (await services.referentiels.lister()).clients.length
    await services.referentiels.ajouter('clients', { code: '0099000001', nom: 'CLIENT TEST', ville: 'Marrakech' })
    const clients = (await services.referentiels.lister()).clients
    expect(clients).toHaveLength(avant + 1)
    expect(clients.some((c) => c.nom === 'CLIENT TEST')).toBe(true)
  })

  it('restaure le jeu initial', async () => {
    await services.commandes.creerLocale(SAISIE)
    expect(await services.commandes.lister()).toHaveLength(13)
    expect(reinitialiserDemonstration()).toBe(true)
    expect(await services.commandes.lister()).toHaveLength(12)
    expect(jeuDemo.clientsBloques()).toEqual(['0010049634'])
    expect(useAppStore.getState().sapOnline).toBe(false)
  })
})
