import { describe, expect, it } from 'vitest'
import type { ChantierSap, ResultatLookup } from '@/types'
import {
  ERREUR_CODE_SAP,
  FORMULAIRE_VIDE,
  parserQuantite,
  validerNouvelleCommande,
  type FormulaireCommande,
} from './validation'

const CHANTIERS_SAP: ResultatLookup<ChantierSap> = {
  source: 'Sap',
  items: [
    { code: '20011001', nom: 'Sidi Ghanem', parDefaut: true },
    { code: '20011002', nom: 'Tamansourt', parDefaut: false },
  ],
}

const VALIDE: FormulaireCommande = {
  ...FORMULAIRE_VIDE,
  clientCode: '10045812',
  clientNom: 'ATLAS BÉTON',
  chantierCode: '20011001',
  produitId: 'p1',
  quantiteT: '27,5',
  incoterm: 'Rendu',
  transporteurCode: '6001101',
  immatriculation: '12345-a-6',
  chauffeurNom: 'Omar TAZI',
}

describe('validation nouvelle commande (parité contrat)', () => {
  it('formulaire valide → aucune erreur', () => {
    expect(validerNouvelleCommande(VALIDE, CHANTIERS_SAP)).toEqual({})
  })

  it('parserQuantite accepte virgule et point, refuse le texte', () => {
    expect(parserQuantite('27,5')).toBe(27.5)
    expect(parserQuantite('27.5')).toBe(27.5)
    expect(parserQuantite('abc')).toBeNaN()
    expect(parserQuantite('')).toBeNaN()
  })

  it('quantité : > 0, ≤ 60, au plus 3 décimales', () => {
    expect(validerNouvelleCommande({ ...VALIDE, quantiteT: '0' }, null).quantiteT).toMatch(/positive/)
    expect(validerNouvelleCommande({ ...VALIDE, quantiteT: '60.001' }, null).quantiteT).toMatch(/60/)
    expect(validerNouvelleCommande({ ...VALIDE, quantiteT: '60' }, null).quantiteT).toBeUndefined()
    expect(validerNouvelleCommande({ ...VALIDE, quantiteT: '12,3456' }, null).quantiteT).toMatch(
      /3 décimales/,
    )
    expect(validerNouvelleCommande({ ...VALIDE, quantiteT: '12,345' }, null).quantiteT).toBeUndefined()
  })

  it('immatriculation : format 12345-A-6 sauf si « libre »', () => {
    expect(
      validerNouvelleCommande({ ...VALIDE, immatriculation: 'WW 123 AB' }, null).immatriculation,
    ).toMatch(/Format/)
    expect(
      validerNouvelleCommande({ ...VALIDE, immatriculation: 'WW 123 AB', immatriculationLibre: true }, null)
        .immatriculation,
    ).toBeUndefined()
    expect(
      validerNouvelleCommande({ ...VALIDE, immatriculation: '', immatriculationLibre: true }, null)
        .immatriculation,
    ).toMatch(/Saisissez/)
    expect(
      validerNouvelleCommande({ ...VALIDE, immatriculation: '123456-AB-12' }, null).immatriculation,
    ).toBeUndefined()
    expect(
      validerNouvelleCommande({ ...VALIDE, immatriculation: '1234567-A-1' }, null).immatriculation,
    ).toMatch(/Format/)
  })

  it('transporteur obligatoire en Rendu (CFR), facultatif en Départ (EXW)', () => {
    expect(validerNouvelleCommande({ ...VALIDE, transporteurCode: '' }, null).transporteurCode).toMatch(
      /Transporteur/,
    )
    expect(
      validerNouvelleCommande({ ...VALIDE, transporteurCode: '', incoterm: 'Depart' }, null).transporteurCode,
    ).toBeUndefined()
  })

  it('codes SAP : 1 à 10 chiffres (client, chantier, transporteur, camion)', () => {
    expect(validerNouvelleCommande({ ...VALIDE, clientCode: '' }, null).clientCode).toMatch(/Saisissez/)
    expect(validerNouvelleCommande({ ...VALIDE, clientCode: '12345678901' }, null).clientCode).toBe(
      ERREUR_CODE_SAP,
    )
    expect(validerNouvelleCommande({ ...VALIDE, chantierCode: 'AB12' }, null).chantierCode).toBe(
      ERREUR_CODE_SAP,
    )
    expect(validerNouvelleCommande({ ...VALIDE, transporteurCode: 'TR-1' }, null).transporteurCode).toBe(
      ERREUR_CODE_SAP,
    )
    expect(
      validerNouvelleCommande({ ...VALIDE, camionCodeSap: '6001886' }, null).camionCodeSap,
    ).toBeUndefined()
    expect(validerNouvelleCommande({ ...VALIDE, camionCodeSap: '60018860001' }, null).camionCodeSap).toBe(
      ERREUR_CODE_SAP,
    )
  })

  it('chantier limité au client seulement quand la liste vient de SAP', () => {
    expect(
      validerNouvelleCommande({ ...VALIDE, chantierCode: '20099999' }, CHANTIERS_SAP).chantierCode,
    ).toMatch(/appartenir/)
    expect(
      validerNouvelleCommande({ ...VALIDE, chantierCode: '20099999' }, { ...CHANTIERS_SAP, source: 'Cache' })
        .chantierCode,
    ).toBeUndefined()
    expect(
      validerNouvelleCommande({ ...VALIDE, chantierCode: '20099999' }, null).chantierCode,
    ).toBeUndefined()
    expect(validerNouvelleCommande({ ...VALIDE, chantierCode: '' }, CHANTIERS_SAP).chantierCode).toMatch(
      /Saisissez/,
    )
  })

  it('chauffeur obligatoire, longueurs maximales', () => {
    expect(validerNouvelleCommande({ ...VALIDE, chauffeurNom: '  ' }, null).chauffeurNom).toMatch(
      /obligatoire/,
    )
    expect(validerNouvelleCommande({ ...VALIDE, chauffeurNom: 'x'.repeat(101) }, null).chauffeurNom).toMatch(
      /100/,
    )
    expect(validerNouvelleCommande({ ...VALIDE, chauffeurCin: 'x'.repeat(21) }, null).chauffeurCin).toMatch(
      /20/,
    )
    expect(validerNouvelleCommande({ ...VALIDE, reference: 'x'.repeat(201) }, null).reference).toMatch(/200/)
  })
})
