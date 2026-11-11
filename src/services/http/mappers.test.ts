import { describe, expect, it } from 'vitest'
import type { CommandeDetailDto, CommandeDto } from './dto'
import {
  resoudreChauffeurId,
  versChauffeur,
  versCommande,
  versCommandeDetail,
  versCreerCommandeRequest,
  versErreursFormulaire,
  versIncoterm,
  versIncotermDto,
  versProduit,
  versSapStatut,
  versStatut,
  versSyncOperation,
} from './mappers'

const DTO: CommandeDto = {
  id: 32241,
  numeroLocal: 'CMD-MRK-2026-000012',
  salesDocument: null,
  origine: 'Locale',
  statut: 'ErreurSync',
  clientCode: '0010045812',
  clientNom: 'SOCIÉTÉ ATLAS BÉTON',
  chantierCode: '0020011001',
  chantierNom: 'Centrale à béton Sidi Ghanem',
  produitCode: '000000000010035002',
  produitLibelle: 'CPJ 35 sac 50 kg',
  conditionnement: 'Sac',
  quantite: 27.5,
  unite: 'TO',
  nombreSacs: 550,
  incoterm: 'CFR',
  transporteurCode: 'TR-0101',
  transporteurNom: 'TRANS ATLAS LOGISTIQUE',
  immatriculation: '12345-A-6',
  chauffeur: 'Omar TAZI',
  chauffeurCin: 'H765430',
  reference: 'BC client 77',
  pontBascule: 'PB22',
  createdAtUtc: '2026-11-11T08:00:00Z',
  updatedAtUtc: '2026-11-11T08:30:00Z',
  synchro: {
    statut: 'Erreur',
    etape: 'Livraison',
    erreur: 'Client bloqué crédit (SAP: KI-123)',
    tentatives: 2,
  },
}

describe('mappers — énumérations', () => {
  it('incoterm CFR ↔ Rendu, EXW ↔ Depart', () => {
    expect(versIncoterm('CFR')).toBe('Rendu')
    expect(versIncoterm('EXW')).toBe('Depart')
    expect(versIncotermDto('Rendu')).toBe('CFR')
    expect(versIncotermDto('Depart')).toBe('EXW')
  })

  it('ErreurSync → ErreurSynchro, autres statuts inchangés', () => {
    expect(versStatut('ErreurSync')).toBe('ErreurSynchro')
    expect(versStatut('DansUsine')).toBe('DansUsine')
  })
})

describe('mappers — référentiels', () => {
  it('produit Sac : poids du sac dérivé de sacsParTonne', () => {
    const p = versProduit({
      code: 'X',
      libelle: 'CPJ 35',
      conditionnement: 'Sac',
      sacsParTonne: 20,
      actif: true,
    })
    expect(p.conditionnement).toBe('SAC')
    expect(p.poidsSacKg).toBe(50)
    expect(p.id).toBe('X')
  })

  it('produit Vrac : pas de poids de sac', () => {
    const p = versProduit({
      code: 'Y',
      libelle: 'CPJ 45',
      conditionnement: 'Vrac',
      sacsParTonne: null,
      actif: true,
    })
    expect(p.conditionnement).toBe('VRAC')
    expect(p.poidsSacKg).toBeUndefined()
  })

  it('chauffeur : id numérique → chaîne, CIN absent → vide', () => {
    expect(versChauffeur({ id: 8, nom: 'Omar TAZI', cin: null, actif: true })).toEqual({
      id: '8',
      nom: 'Omar TAZI',
      cin: '',
      transporteurId: '',
    })
  })
})

describe('mappers — commandes', () => {
  it('CommandeDto → Commande : codes comme ids, libellés dénormalisés, synchro', () => {
    const c = versCommande(DTO)
    expect(c.id).toBe(32241)
    expect(c.statut).toBe('ErreurSynchro')
    expect(c.incoterm).toBe('Rendu')
    expect(c.clientId).toBe('0010045812')
    expect(c.chantierId).toBe('0020011001')
    expect(c.produitId).toBe('000000000010035002')
    expect(c.camionId).toBe('12345-A-6')
    expect(c.transporteurId).toBe('TR-0101')
    expect(c.quantiteT).toBe(27.5)
    expect(c.nombreSacs).toBe(550)
    expect(c.numeroLocal).toBe('CMD-MRK-2026-000012')
    expect(c.numeroSap).toBeUndefined()
    expect(c.synchro).toBe('Erreur')
    expect(c.libelles?.clientNom).toBe('SOCIÉTÉ ATLAS BÉTON')
    expect(c.libelles?.conditionnement).toBe('SAC')
    expect(c.libelles?.chauffeurNom).toBe('Omar TAZI')
  })

  it('chauffeur résolu par CIN dans le référentiel, sinon clé synthétique', () => {
    const chauffeurs = [{ id: '8', nom: 'Omar TAZI', cin: 'H765430', transporteurId: '' }]
    expect(resoudreChauffeurId(DTO, chauffeurs)).toBe('8')
    expect(resoudreChauffeurId({ chauffeur: 'omar tazi', chauffeurCin: null }, chauffeurs)).toBe('8')
    expect(resoudreChauffeurId({ chauffeur: 'Inconnu', chauffeurCin: 'Z1' }, chauffeurs)).toBe('cin:Z1')
  })

  it('synchro → opération de file : étapes locales, étapes faites avant l’étape courante', () => {
    const op = versSyncOperation(DTO)
    expect(op).toBeDefined()
    expect(op?.etapes).toEqual(['CreerCommande', 'Livraison', 'LireBL'])
    expect(op?.etapesFaites).toEqual(['CreerCommande'])
    expect(op?.etapeCourante).toBe('Livraison')
    expect(op?.statut).toBe('Erreur')
    expect(op?.message).toContain('KI-123')
    expect(versSyncOperation({ ...DTO, synchro: { statut: 'Aucune', tentatives: 0 } })).toBeUndefined()
  })

  it('détail : pesées, BC et BL projetés sur la commande', () => {
    const detail: CommandeDetailDto = {
      ...DTO,
      statut: 'Livree',
      pesees: [
        { type: 'Entree', pontBascule: 'PB23', poidsKg: 16000, horodatageUtc: '2026-11-11T09:00:00Z' },
        { type: 'Sortie', pontBascule: 'PB23', poidsKg: 43500, horodatageUtc: '2026-11-11T09:40:00Z' },
      ],
      bonDeChargement: { numero: 'BC-MRK-2026-000124', dateUtc: '2026-11-11T09:00:00Z' },
      bonDeLivraison: {
        numeroLocal: 32241,
        numeroSap: null,
        dateUtc: '2026-11-11T09:40:00Z',
        brutKg: 43500,
        tareKg: 16000,
        netKg: 27500,
      },
    }
    const c = versCommandeDetail(detail)
    expect(c.peseeEntree?.poidsKg).toBe(16000)
    expect(c.peseeEntree?.pont).toBe('PB23')
    expect(c.entreeUtc).toBe('2026-11-11T09:00:00Z')
    expect(c.peseeSortie?.poidsKg).toBe(43500)
    expect(c.bonDeChargement?.numero).toBe('BC-MRK-2026-000124')
    expect(c.bonDeLivraison?.numeroLocal).toBe('32241')
    expect(c.bonDeLivraison?.netKg).toBe(27500)
  })

  it('statut SAP', () => {
    expect(
      versSapStatut({ enLigne: true, verifieAtUtc: '2026-11-11T10:00:00Z', latenceMs: 42, detail: null }),
    ).toEqual({
      enLigne: true,
      verifieAtUtc: '2026-11-11T10:00:00Z',
      latenceMs: 42,
      detail: undefined,
    })
  })
})

describe('mappers — requête de création', () => {
  it('NouvelleCommandeInput → CreerCommandeLocaleRequest (Rendu = CFR, champs facultatifs omis si vides)', () => {
    const req = versCreerCommandeRequest({
      clientCode: '1004581',
      clientNom: 'ATLAS BÉTON',
      chantierCode: '2001100',
      chantierNom: '',
      produitId: 'P1',
      quantiteT: 27.5,
      incoterm: 'Rendu',
      transporteurCode: '6001101',
      transporteurNom: 'TRANS ATLAS',
      camionCodeSap: '6001886',
      immatriculation: ' 12345-a-6 ',
      immatriculationLibre: false,
      chauffeurNom: 'Omar TAZI',
      chauffeurCin: '',
      reference: undefined,
    })
    expect(req).toEqual({
      clientCode: '1004581',
      clientNom: 'ATLAS BÉTON',
      chantierCode: '2001100',
      produitCode: 'P1',
      quantite: 27.5,
      incoterm: 'CFR',
      transporteurCode: '6001101',
      transporteurNom: 'TRANS ATLAS',
      camionCodeSap: '6001886',
      immatriculation: '12345-A-6',
      immatriculationLibre: false,
      chauffeur: 'Omar TAZI',
    })
  })

  it('Départ sans transporteur → pas de transporteurCode', () => {
    const req = versCreerCommandeRequest({
      clientCode: '1004581',
      chantierCode: '2001100',
      produitId: 'P1',
      quantiteT: 10,
      incoterm: 'Depart',
      immatriculation: 'WW-1',
      immatriculationLibre: true,
      chauffeurNom: 'X',
    })
    expect(req.incoterm).toBe('EXW')
    expect(req).not.toHaveProperty('transporteurCode')
    expect(req.immatriculationLibre).toBe(true)
  })

  it('erreurs serveur 400 → champs du formulaire (insensible à la casse) + erreurs générales', () => {
    const r = versErreursFormulaire({
      Quantite: ['Doit être ≤ 60', 'Au plus 3 décimales'],
      chantierCode: ['Le chantier n’appartient pas au client'],
      '$.incoterm': ['Valeur inconnue'],
      Inconnu: ['Quelque chose'],
    })
    expect(r.parChamp.quantiteT).toBe('Doit être ≤ 60 Au plus 3 décimales')
    expect(r.parChamp.chantierCode).toContain('chantier')
    expect(r.parChamp.incoterm).toBe('Valeur inconnue')
    expect(r.generales).toEqual(['Inconnu : Quelque chose'])
  })
})
