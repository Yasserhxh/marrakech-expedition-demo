/**
 * Règles de validation du formulaire « Nouvelle commande locale », identiques à celles du contrat
 * (`CreerCommandeLocaleRequest`, docs/phase2-api-contract.md + phase 2b) : l'API reste l'autorité, le client
 * évite un aller-retour. Les codes SAP (client, chantier, transporteur, camion) sont saisis tels quels
 * (1 à 10 chiffres) ; leur existence n'est contrôlée que si SAP a répondu (liste de chantiers « Sap »).
 */
import type { ChantierSap, Incoterm, ResultatLookup } from '@/types'

export const QUANTITE_MAX_T = 60
export const QUANTITE_DECIMALES_MAX = 3
export const CHAUFFEUR_LONGUEUR_MAX = 100
export const CIN_LONGUEUR_MAX = 20
export const REFERENCE_LONGUEUR_MAX = 200
/** Format marocain `12345-A-6` (1-6 chiffres, 1-2 lettres, 1-2 chiffres). */
export const IMMATRICULATION_REGEX = /^\d{1,6}-[A-Z]{1,2}-\d{1,2}$/
/** Tous les codes SAP : 10 caractères max, chiffres uniquement (décision 11/11). */
export const CODE_SAP_REGEX = /^\d{1,10}$/
export const ERREUR_CODE_SAP = 'Code SAP : 1 à 10 chiffres'

export interface FormulaireCommande {
  clientCode: string
  clientNom: string
  chantierCode: string
  chantierNom: string
  produitId: string
  quantiteT: string
  incoterm: Incoterm
  transporteurCode: string
  transporteurNom: string
  camionCodeSap: string
  immatriculation: string
  immatriculationLibre: boolean
  chauffeurNom: string
  chauffeurCin: string
  reference: string
}

export type ErreursFormulaire = Partial<Record<keyof FormulaireCommande, string>>

export const FORMULAIRE_VIDE: FormulaireCommande = {
  clientCode: '',
  clientNom: '',
  chantierCode: '',
  chantierNom: '',
  produitId: '',
  quantiteT: '27',
  incoterm: 'Rendu',
  transporteurCode: '',
  transporteurNom: '',
  camionCodeSap: '',
  immatriculation: '',
  immatriculationLibre: false,
  chauffeurNom: '',
  chauffeurCin: '',
  reference: '',
}

/** « 27,5 » ou « 27.5 » → 27.5 ; NaN si non numérique. */
export function parserQuantite(texte: string): number {
  const net = texte.trim().replace(',', '.')
  if (net === '' || !/^\d+(\.\d+)?$/.test(net)) return Number.NaN
  return Number(net)
}

export function nombreDecimales(texte: string): number {
  const net = texte.trim().replace(',', '.')
  const i = net.indexOf('.')
  return i === -1 ? 0 : net.length - i - 1
}

export function normaliserImmatriculation(texte: string): string {
  return texte.trim().toUpperCase()
}

export function validerNouvelleCommande(
  f: FormulaireCommande,
  chantiersDuClient: ResultatLookup<ChantierSap> | null,
): ErreursFormulaire {
  const erreurs: ErreursFormulaire = {}

  if (!f.clientCode) erreurs.clientCode = 'Saisissez le code SAP du client'
  else if (!CODE_SAP_REGEX.test(f.clientCode)) erreurs.clientCode = ERREUR_CODE_SAP

  if (!f.chantierCode) erreurs.chantierCode = 'Saisissez le code SAP du chantier'
  else if (!CODE_SAP_REGEX.test(f.chantierCode)) erreurs.chantierCode = ERREUR_CODE_SAP
  else if (
    chantiersDuClient?.source === 'Sap' &&
    chantiersDuClient.items.length > 0 &&
    !chantiersDuClient.items.some((c) => c.code === f.chantierCode)
  ) {
    erreurs.chantierCode = 'Le chantier doit appartenir au client sélectionné (liste SAP)'
  }

  if (!f.produitId) erreurs.produitId = 'Sélectionnez un produit'

  const quantite = parserQuantite(f.quantiteT)
  if (!Number.isFinite(quantite) || quantite <= 0)
    erreurs.quantiteT = 'Quantité strictement positive (en tonnes)'
  else if (quantite > QUANTITE_MAX_T) erreurs.quantiteT = `Maximum ${QUANTITE_MAX_T} t par camion`
  else if (nombreDecimales(f.quantiteT) > QUANTITE_DECIMALES_MAX) {
    erreurs.quantiteT = `Au plus ${QUANTITE_DECIMALES_MAX} décimales`
  }

  if (f.incoterm === 'Rendu' && !f.transporteurCode) {
    erreurs.transporteurCode = 'Transporteur obligatoire pour une livraison « Rendu » (CFR)'
  } else if (f.transporteurCode && !CODE_SAP_REGEX.test(f.transporteurCode)) {
    erreurs.transporteurCode = ERREUR_CODE_SAP
  }

  if (f.camionCodeSap && !CODE_SAP_REGEX.test(f.camionCodeSap)) erreurs.camionCodeSap = ERREUR_CODE_SAP

  const immat = normaliserImmatriculation(f.immatriculation)
  if (!immat) erreurs.immatriculation = "Saisissez l'immatriculation du camion"
  else if (!f.immatriculationLibre && !IMMATRICULATION_REGEX.test(immat)) {
    erreurs.immatriculation =
      'Format attendu 12345-A-6 (cochez « immatriculation libre » pour un format étranger)'
  }

  const chauffeur = f.chauffeurNom.trim()
  if (!chauffeur) erreurs.chauffeurNom = 'Nom du chauffeur obligatoire'
  else if (chauffeur.length > CHAUFFEUR_LONGUEUR_MAX)
    erreurs.chauffeurNom = `Au plus ${CHAUFFEUR_LONGUEUR_MAX} caractères`

  if (f.chauffeurCin.trim().length > CIN_LONGUEUR_MAX)
    erreurs.chauffeurCin = `Au plus ${CIN_LONGUEUR_MAX} caractères`
  if (f.reference.trim().length > REFERENCE_LONGUEUR_MAX)
    erreurs.reference = `Au plus ${REFERENCE_LONGUEUR_MAX} caractères`

  return erreurs
}
