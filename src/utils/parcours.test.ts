import type { Commande } from '@/types'
import { etapeCourante, lienPourRole } from '@/utils/parcours'
import { motifValidation } from '@/utils/peseeUi'
import { describe, expect, it } from 'vitest'

function commande(partiel: Pick<Commande, 'statut' | 'synchro'> & Partial<Commande>): Commande {
  return {
    id: 42,
    origine: 'Sap',
    clientId: 'c',
    chantierId: 'ch',
    produitId: 'p',
    quantiteT: 20,
    incoterm: 'Depart',
    transporteurId: 't',
    camionId: 'v',
    chauffeurId: 'd',
    creeeLeUtc: '2026-01-01T00:00:00.000Z',
    ...partiel,
  }
}

describe('parcours opérationnel', () => {
  it('propose la pesée d’entrée à tous les rôles une fois l’autorisation donnée', () => {
    const lien = etapeCourante(commande({ statut: 'EntreeAutorisee', synchro: 'Aucune' })).lien
    expect(lienPourRole(lien, 'PontBascule')?.vers).toBe('/pesee/entree/42')
    expect(lienPourRole(lien, 'Guichet')?.vers).toBe('/pesee/entree/42')
  })

  it('réserve la file SAP au guichet, même quand la pesée est terminée', () => {
    const lien = etapeCourante(commande({ statut: 'Livree', synchro: 'EnAttente' })).lien
    expect(lienPourRole(lien, 'PontBascule')).toBeUndefined()
    expect(lienPourRole(lien, 'Guichet')?.vers).toBe('/synchronisation')
    expect(etapeCourante(commande({ statut: 'Livree', synchro: 'Synchronisee' })).lien).toBeUndefined()
  })

  it('n’ouvre pas la pesée suivante tant que le statut ne l’autorise pas', () => {
    const etape = etapeCourante(commande({ statut: 'DansUsine', synchro: 'Aucune' }))
    expect(etape.lien?.vers).toBe('/usine')
    expect(etape.explication).toMatch(/second pesage/i)
  })
})

describe('motif de validation', () => {
  const base = {
    pont: 'PB22' as const,
    lectureKg: 0,
    stable: false,
    derniereLectureUtc: null,
    connecte: true,
    enCours: false,
    lecturesIdentiques: 0,
  }

  it('bloque un pont sans camion et un poids instable', () => {
    expect(motifValidation(base, 'prêt')).toMatch(/Aucun camion/)
    expect(
      motifValidation({ ...base, enCours: true, lectureKg: 12000, lecturesIdentiques: 9 }, 'prêt'),
    ).toBe('Stabilisation en cours — 9 lectures sur 15.')
  })

  it('confirme la valeur seulement quand la lecture est stable', () => {
    expect(
      motifValidation({ ...base, enCours: true, lectureKg: 16000, stable: true, lecturesIdentiques: 15 }, 'prêt'),
    ).toBe('prêt')
  })
})
