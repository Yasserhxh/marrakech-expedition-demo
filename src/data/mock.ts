import type {
  Camion,
  Chantier,
  Chauffeur,
  Client,
  Commande,
  MonitoringSnapshot,
  Produit,
  Referentiels,
  SyncOperation,
  Transporteur,
} from '@/types'

export const USINE = { code: 'M102', nom: 'Usine de Marrakech', societe: 'CIMAR — Ciments du Maroc' }

export const PONTS: { code: 'PB21' | 'PB22' | 'PB23' | 'PB24'; usage: 'ciment' | 'matiere' }[] = [
  { code: 'PB21', usage: 'matiere' },
  { code: 'PB22', usage: 'ciment' },
  { code: 'PB23', usage: 'ciment' },
  { code: 'PB24', usage: 'matiere' },
]

export const CLIENT_BLOQUE_CREDIT_CODE = '0010049634'
export const MESSAGE_CLIENT_BLOQUE = 'Client bloqué crédit (SAP: KI-123)'

const clients: Client[] = [
  { id: 'c1', code: '0010045812', nom: 'SOCIÉTÉ ATLAS BÉTON', ville: 'Marrakech' },
  { id: 'c2', code: '0010046120', nom: 'BENJELLOUN TRAVAUX', ville: 'Marrakech' },
  { id: 'c3', code: '0010047305', nom: 'BTP TENSIFT', ville: 'Chichaoua' },
  { id: 'c4', code: '0010048877', nom: 'MENARA PRÉFA', ville: 'Marrakech' },
  { id: 'c5', code: '0010049021', nom: 'SOGEA MAROC — AGENCE SUD', ville: 'Benguerir' },
  { id: 'c6', code: CLIENT_BLOQUE_CREDIT_CODE, nom: 'ETS. EL OUAFI MATÉRIAUX', ville: 'Essaouira' },
]

const chantiers: Chantier[] = [
  { id: 'ch1', clientId: 'c1', code: '0020011001', nom: 'Centrale à béton Sidi Ghanem', ville: 'Marrakech' },
  { id: 'ch2', clientId: 'c1', code: '0020011002', nom: 'Centrale à béton Tamansourt', ville: 'Marrakech' },
  { id: 'ch3', clientId: 'c2', code: '0020012001', nom: 'Villas Targa — tranche 2', ville: 'Marrakech' },
  { id: 'ch4', clientId: 'c2', code: '0020012002', nom: 'Lotissement Al Massar', ville: 'Marrakech' },
  { id: 'ch5', clientId: 'c3', code: '0020013001', nom: 'Pont RN8 Chichaoua', ville: 'Chichaoua' },
  { id: 'ch6', clientId: 'c3', code: '0020013002', nom: 'Route Imintanoute', ville: 'Chichaoua' },
  {
    id: 'ch7',
    clientId: 'c4',
    code: '0020014001',
    nom: 'Usine de préfabrication route de Safi',
    ville: 'Marrakech',
  },
  {
    id: 'ch8',
    clientId: 'c5',
    code: '0020015001',
    nom: 'Plateforme phosphate Benguerir',
    ville: 'Benguerir',
  },
  { id: 'ch9', clientId: 'c5', code: '0020015002', nom: 'Extension campus UM6P', ville: 'Benguerir' },
  { id: 'ch10', clientId: 'c6', code: '0020016001', nom: 'Dépôt matériaux Essaouira', ville: 'Essaouira' },
]

const produits: Produit[] = [
  { id: 'p1', codeSap: '000000000010045001', libelle: 'CPJ 45 vrac', conditionnement: 'VRAC' },
  {
    id: 'p2',
    codeSap: '000000000010035002',
    libelle: 'CPJ 35 sac 50 kg',
    conditionnement: 'SAC',
    poidsSacKg: 50,
  },
  { id: 'p3', codeSap: '000000000010055003', libelle: 'CPA 55 vrac', conditionnement: 'VRAC' },
  {
    id: 'p4',
    codeSap: '000000000010045004',
    libelle: 'CPJ 45 sac 50 kg',
    conditionnement: 'SAC',
    poidsSacKg: 50,
  },
]

const transporteurs: Transporteur[] = [
  { id: 't1', code: '0006001101', nom: 'TRANS ATLAS LOGISTIQUE' },
  { id: 't2', code: '0006001102', nom: 'STM TENSIFT' },
  { id: 't3', code: '0006001103', nom: 'HAOUZ TRANSPORT' },
  { id: 't4', code: '0006001199', nom: 'Compte propre client' },
]

const camions: Camion[] = [
  { id: 'v1', immatriculation: '45812-A-40', transporteurId: 't1', tareReferenceKg: 16240 },
  { id: 'v2', immatriculation: '78123-B-40', transporteurId: 't1', tareReferenceKg: 15980 },
  { id: 'v3', immatriculation: '12345-A-6', transporteurId: 't2', tareReferenceKg: 14760 },
  { id: 'v4', immatriculation: '90871-D-40', transporteurId: 't2', tareReferenceKg: 17120 },
  { id: 'v5', immatriculation: '33410-A-12', transporteurId: 't3', tareReferenceKg: 16540 },
  { id: 'v6', immatriculation: '67209-B-9', transporteurId: 't3', tareReferenceKg: 15310 },
  { id: 'v7', immatriculation: '21876-A-40', transporteurId: 't4', tareReferenceKg: 14890 },
  { id: 'v8', immatriculation: '55602-C-51', transporteurId: 't1', tareReferenceKg: 16875 },
  { id: 'v9', immatriculation: '48930-A-40', transporteurId: 't2', tareReferenceKg: 15640 },
  { id: 'v10', immatriculation: '70215-B-6', transporteurId: 't3', tareReferenceKg: 16020 },
]

const chauffeurs: Chauffeur[] = [
  { id: 'd1', nom: 'Mohamed AIT BRAHIM', cin: 'EE412367', transporteurId: 't1' },
  { id: 'd2', nom: 'Youssef BENALI', cin: 'E678901', transporteurId: 't1' },
  { id: 'd3', nom: 'Rachid EL MOUDDEN', cin: 'H334521', transporteurId: 't2' },
  { id: 'd4', nom: 'Abdellah OUCHEN', cin: 'EE875412', transporteurId: 't2' },
  { id: 'd5', nom: 'Hassan ZAHIRI', cin: 'JB118745', transporteurId: 't3' },
  { id: 'd6', nom: 'Khalid LAMRANI', cin: 'E903412', transporteurId: 't3' },
  { id: 'd7', nom: 'Said BOUHOUCH', cin: 'EE201198', transporteurId: 't4' },
  { id: 'd8', nom: 'Omar TAZI', cin: 'H765430', transporteurId: 't1' },
]

export const referentielsInitiaux: Referentiels = {
  clients,
  chantiers,
  produits,
  transporteurs,
  camions,
  chauffeurs,
}

const ID_COMMANDE_DEPART = 32241
export const COMPTEURS_INITIAUX = {
  commandeId: ID_COMMANDE_DEPART + 12,
  bc: 124,
  sapCommande: 1234580,
  sapBl: 80412345,
  syncOp: 100,
}

function minutesAvant(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60000).toISOString()
}

function sacs(produitId: string, quantiteT: number): number | undefined {
  const p = produits.find((x) => x.id === produitId)
  if (!p || p.conditionnement !== 'SAC' || !p.poidsSacKg) return undefined
  return Math.round((quantiteT * 1000) / p.poidsSacKg)
}

interface Seed {
  origine: 'Sap' | 'Locale'
  numeroSap?: string
  clientId: string
  chantierId: string
  produitId: string
  quantiteT: number
  incoterm: 'Depart' | 'Rendu'
  transporteurId: string
  camionId: string
  chauffeurId: string
  statut: Commande['statut']
  synchro: Commande['synchro']
  creeeMin: number
  entreeMin?: number
  sortieMin?: number
  tareKg?: number
  brutKg?: number
  pont?: 'PB22' | 'PB23'
  bc?: number
  numeroBl?: string
}

const seeds: Seed[] = [
  // --- 8 commandes SAP ---
  {
    origine: 'Sap',
    numeroSap: '0001234501',
    clientId: 'c1',
    chantierId: 'ch1',
    produitId: 'p1',
    quantiteT: 27,
    incoterm: 'Rendu',
    transporteurId: 't1',
    camionId: 'v1',
    chauffeurId: 'd1',
    statut: 'Creee',
    synchro: 'Aucune',
    creeeMin: 95,
  },
  {
    origine: 'Sap',
    numeroSap: '0001234502',
    clientId: 'c2',
    chantierId: 'ch3',
    produitId: 'p2',
    quantiteT: 20,
    incoterm: 'Depart',
    transporteurId: 't4',
    camionId: 'v7',
    chauffeurId: 'd7',
    statut: 'Creee',
    synchro: 'Aucune',
    creeeMin: 80,
  },
  {
    origine: 'Sap',
    numeroSap: '0001234503',
    clientId: 'c3',
    chantierId: 'ch5',
    produitId: 'p3',
    quantiteT: 30,
    incoterm: 'Rendu',
    transporteurId: 't2',
    camionId: 'v3',
    chauffeurId: 'd3',
    statut: 'EntreeAutorisee',
    synchro: 'Aucune',
    creeeMin: 70,
  },
  {
    origine: 'Sap',
    numeroSap: '0001234504',
    clientId: 'c1',
    chantierId: 'ch2',
    produitId: 'p1',
    quantiteT: 27,
    incoterm: 'Rendu',
    transporteurId: 't1',
    camionId: 'v2',
    chauffeurId: 'd2',
    statut: 'DansUsine',
    synchro: 'Aucune',
    creeeMin: 150,
    entreeMin: 38,
    tareKg: 15980,
    pont: 'PB22',
    bc: 118,
  },
  {
    origine: 'Sap',
    numeroSap: '0001234505',
    clientId: 'c4',
    chantierId: 'ch7',
    produitId: 'p4',
    quantiteT: 25,
    incoterm: 'Depart',
    transporteurId: 't3',
    camionId: 'v5',
    chauffeurId: 'd5',
    statut: 'DansUsine',
    synchro: 'Aucune',
    creeeMin: 240,
    entreeMin: 112,
    tareKg: 16540,
    pont: 'PB23',
    bc: 116,
  },
  {
    origine: 'Sap',
    numeroSap: '0001234506',
    clientId: 'c5',
    chantierId: 'ch8',
    produitId: 'p1',
    quantiteT: 28,
    incoterm: 'Rendu',
    transporteurId: 't2',
    camionId: 'v4',
    chauffeurId: 'd4',
    statut: 'SortieAutorisee',
    synchro: 'Aucune',
    creeeMin: 200,
    entreeMin: 64,
    tareKg: 17120,
    pont: 'PB22',
    bc: 119,
  },
  {
    origine: 'Sap',
    numeroSap: '0001234507',
    clientId: 'c2',
    chantierId: 'ch4',
    produitId: 'p2',
    quantiteT: 20,
    incoterm: 'Rendu',
    transporteurId: 't1',
    camionId: 'v8',
    chauffeurId: 'd8',
    statut: 'Livree',
    synchro: 'Aucune',
    creeeMin: 300,
    entreeMin: 160,
    sortieMin: 110,
    tareKg: 16875,
    brutKg: 36920,
    pont: 'PB23',
    bc: 113,
    numeroBl: '0080412301',
  },
  {
    origine: 'Sap',
    numeroSap: '0001234508',
    clientId: 'c5',
    chantierId: 'ch9',
    produitId: 'p3',
    quantiteT: 30,
    incoterm: 'Depart',
    transporteurId: 't3',
    camionId: 'v6',
    chauffeurId: 'd6',
    statut: 'Livree',
    synchro: 'Aucune',
    creeeMin: 340,
    entreeMin: 190,
    sortieMin: 140,
    tareKg: 15310,
    brutKg: 45470,
    pont: 'PB22',
    bc: 112,
    numeroBl: '0080412302',
  },
  // --- 4 commandes locales (créées pendant la coupure SAP) ---
  {
    origine: 'Locale',
    clientId: 'c3',
    chantierId: 'ch6',
    produitId: 'p1',
    quantiteT: 27,
    incoterm: 'Rendu',
    transporteurId: 't2',
    camionId: 'v9',
    chauffeurId: 'd3',
    statut: 'Creee',
    synchro: 'EnAttente',
    creeeMin: 25,
  },
  {
    origine: 'Locale',
    clientId: 'c4',
    chantierId: 'ch7',
    produitId: 'p2',
    quantiteT: 20,
    incoterm: 'Depart',
    transporteurId: 't3',
    camionId: 'v10',
    chauffeurId: 'd6',
    statut: 'DansUsine',
    synchro: 'EnAttente',
    creeeMin: 75,
    entreeMin: 41,
    tareKg: 16020,
    pont: 'PB23',
    bc: 121,
  },
  {
    origine: 'Locale',
    clientId: 'c1',
    chantierId: 'ch1',
    produitId: 'p1',
    quantiteT: 27,
    incoterm: 'Rendu',
    transporteurId: 't1',
    camionId: 'v1',
    chauffeurId: 'd1',
    statut: 'Livree',
    synchro: 'EnAttente',
    creeeMin: 130,
    entreeMin: 90,
    sortieMin: 35,
    tareKg: 16240,
    brutKg: 43400,
    pont: 'PB22',
    bc: 120,
  },
  {
    origine: 'Locale',
    clientId: 'c6',
    chantierId: 'ch10',
    produitId: 'p4',
    quantiteT: 25,
    incoterm: 'Depart',
    transporteurId: 't4',
    camionId: 'v7',
    chauffeurId: 'd7',
    statut: 'ErreurSynchro',
    synchro: 'Erreur',
    creeeMin: 180,
    entreeMin: 140,
    sortieMin: 85,
    tareKg: 14890,
    brutKg: 39950,
    pont: 'PB23',
    bc: 117,
  },
]

export function bcNumero(n: number, annee: number): string {
  return `BC-MRK-${annee}-${n.toString().padStart(6, '0')}`
}

export function buildCommandes(now: Date): Commande[] {
  const annee = now.getFullYear()
  return seeds.map((s, i) => {
    const id = ID_COMMANDE_DEPART + i
    const c: Commande = {
      id,
      origine: s.origine,
      numeroSap: s.numeroSap,
      clientId: s.clientId,
      chantierId: s.chantierId,
      produitId: s.produitId,
      quantiteT: s.quantiteT,
      nombreSacs: sacs(s.produitId, s.quantiteT),
      incoterm: s.incoterm,
      transporteurId: s.transporteurId,
      camionId: s.camionId,
      chauffeurId: s.chauffeurId,
      statut: s.statut,
      synchro: s.synchro,
      creeeLeUtc: minutesAvant(now, s.creeeMin),
    }
    if (s.entreeMin !== undefined && s.tareKg !== undefined && s.pont && s.bc !== undefined) {
      c.entreeUtc = minutesAvant(now, s.entreeMin)
      c.peseeEntree = { type: 'Entree', pont: s.pont, poidsKg: s.tareKg, horodatageUtc: c.entreeUtc }
      c.bonDeChargement = { numero: bcNumero(s.bc, annee), dateUtc: c.entreeUtc }
    }
    if (s.sortieMin !== undefined && s.brutKg !== undefined && s.tareKg !== undefined && s.pont) {
      c.sortieUtc = minutesAvant(now, s.sortieMin)
      c.peseeSortie = { type: 'Sortie', pont: s.pont, poidsKg: s.brutKg, horodatageUtc: c.sortieUtc }
      c.bonDeLivraison = {
        numeroLocal: id.toString(),
        numeroSap: s.numeroBl,
        dateUtc: c.sortieUtc,
        brutKg: s.brutKg,
        tareKg: s.tareKg,
        netKg: s.brutKg - s.tareKg,
      }
    }
    return c
  })
}

export function buildSyncOperations(commandes: Commande[], now: Date): SyncOperation[] {
  const ops: SyncOperation[] = []
  let nextId = COMPTEURS_INITIAUX.syncOp
  for (const c of commandes) {
    if (!c.bonDeLivraison || c.origine !== 'Locale') continue
    const etapes: SyncOperation['etapes'] = ['CreerCommande', 'Livraison', 'LireBL']
    if (c.synchro === 'Erreur') {
      ops.push({
        id: nextId++,
        commandeId: c.id,
        etapes,
        etapesFaites: [],
        etapeCourante: 'CreerCommande',
        statut: 'Erreur',
        tentatives: 2,
        message: MESSAGE_CLIENT_BLOQUE,
        derniereTentativeUtc: minutesAvant(now, 12),
      })
    } else if (c.synchro === 'EnAttente') {
      ops.push({
        id: nextId++,
        commandeId: c.id,
        etapes,
        etapesFaites: [],
        statut: 'EnAttente',
        tentatives: 0,
      })
    }
  }
  return ops
}

export function buildMonitoring(now: Date, sapOnline: boolean): MonitoringSnapshot {
  const t = (min: number) => minutesAvant(now, min)
  return {
    sante: [
      { nom: 'API Marrakech', etat: 'ok', detail: '/health/live — 200 en 12 ms' },
      { nom: 'Base de données', etat: 'ok', detail: 'Azure SQL — 18 ms, 4 connexions' },
      {
        nom: 'SAP (WCP)',
        etat: sapOnline ? 'ok' : 'ko',
        detail: sapOnline ? 'SAP PRD — 410 ms' : 'Injoignable depuis 09:42 (timeout 10 s)',
      },
      { nom: 'SignalR', etat: 'ok', detail: 'Hub pesées — 3 clients connectés' },
    ],
    tauxErreur: sapOnline ? 0.4 : 2.7,
    requetesParMinute: 184,
    latenceMs: { p50: 46, p95: 212, p99: 688 },
    dureeDbMs: 14,
    connexionsSignalR: 3,
    erreurs: [
      {
        horodatageUtc: t(14),
        correlationId: '8f3c2a1e-6b7d-4f0a-9c21-5e8d7a6b4c3f',
        route: 'POST /api/sync/commandes/32252',
        statut: 502,
        message: 'SAP ZBAPI_CREATE_ORDER : Client bloqué crédit (KI-123)',
      },
      {
        horodatageUtc: t(31),
        correlationId: '1d9e4b7c-2a5f-4c8e-b3d6-7f0a9e2c5b1d',
        route: 'POST /api/sap/genericTransportImport',
        statut: 504,
        message: 'Timeout 10 s vers SAP PRD',
      },
      {
        horodatageUtc: t(58),
        correlationId: 'a4c7e2f9-8b1d-4e6a-9f3c-2d5b8a7e1c4f',
        route: 'GET /api/pesees/PB23/lecture',
        statut: 503,
        message: 'Fichier C:\\Scales\\PB23.txt non rafraîchi depuis 45 s (Databridge)',
      },
      {
        horodatageUtc: t(126),
        correlationId: 'c2b8f1a6-4d3e-4a9c-8e7b-1f6d5c4a3b2e',
        route: 'POST /api/commandes',
        statut: 400,
        message: 'Validation : le chantier 0020012001 n’appartient pas au client 0010045812',
      },
      {
        horodatageUtc: t(201),
        correlationId: 'e7a1d4c9-5f2b-4e8d-a6c3-9b0f8e7d6c5a',
        route: 'POST /api/sync/commandes/32248',
        statut: 502,
        message: 'SAP : session WCP expirée, nouvelle authentification requise',
      },
    ],
    liens: [
      { libelle: 'Application Insights (prod)', url: 'https://portal.azure.com/#view/AppInsightsExtension' },
      { libelle: 'Tableau de bord Aspire (dev)', url: 'http://localhost:18888/traces' },
      {
        libelle: 'Alertes Azure Monitor',
        url: 'https://portal.azure.com/#view/Microsoft_Azure_Monitoring/AlertsMenuBlade',
      },
    ],
  }
}
