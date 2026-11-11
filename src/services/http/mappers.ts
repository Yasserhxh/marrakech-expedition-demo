/**
 * Mappers explicites DTO (contrat phase 2) ↔ modèle de l'application.
 * Convention en mode API : l'`id` des éléments de référentiel est leur clé naturelle
 * (code client/chantier/produit/transporteur, immatriculation du camion, id numérique du chauffeur).
 */
import type {
  BonDeChargement,
  BonDeLivraison,
  Camion,
  CamionSap,
  Chantier,
  ChantierSap,
  ClientSap,
  ResultatLookup,
  TransporteurSap,
  Chauffeur,
  Client,
  Commande,
  Conditionnement,
  EtapeSynchro,
  Incoterm,
  NouvelleCommandeInput,
  Pesee,
  Produit,
  Referentiels,
  SapStatut,
  StatutCommande,
  SyncOperation,
  SyntheseCommandes,
  Transporteur,
} from '@/types'
import type {
  BonDeChargementDto,
  BonDeLivraisonDto,
  CamionDto,
  CamionSapDto,
  ChantierDto,
  ChantierSapDto,
  ClientSapDto,
  ItemLookupDto,
  ListeLookupDto,
  TransporteurSapDto,
  ChauffeurDto,
  ClientDto,
  CommandeDetailDto,
  CommandeDto,
  ConditionnementDto,
  CreerCommandeLocaleRequest,
  IncotermDto,
  PeseeDto,
  ProduitDto,
  SapStatutDto,
  StatutDto,
  SyncOperationDto,
  SyntheseDto,
  TransporteurDto,
} from './dto'

const KG_PAR_TONNE = 1000
const ETAPES_LOCALE: EtapeSynchro[] = ['CreerCommande', 'Livraison', 'LireBL']
const ETAPES_SAP: EtapeSynchro[] = ['Livraison', 'LireBL']

/* ---------- Énumérations ---------- */

export function versIncoterm(dto: IncotermDto): Incoterm {
  return dto === 'CFR' ? 'Rendu' : 'Depart'
}

export function versIncotermDto(incoterm: Incoterm): IncotermDto {
  return incoterm === 'Rendu' ? 'CFR' : 'EXW'
}

export function versConditionnement(dto: ConditionnementDto | null | undefined): Conditionnement | undefined {
  if (dto === 'Vrac') return 'VRAC'
  if (dto === 'Sac') return 'SAC'
  return undefined
}

export function versConditionnementDto(c: Conditionnement): ConditionnementDto {
  return c === 'VRAC' ? 'Vrac' : 'Sac'
}

export function versStatut(dto: StatutDto): StatutCommande {
  return dto === 'ErreurSync' ? 'ErreurSynchro' : dto
}

const nonVide = (v: string | null | undefined): string | undefined => (v ? v : undefined)

/* ---------- Référentiels ---------- */

export function versClient(dto: ClientDto): Client {
  return { id: dto.code, code: dto.code, nom: dto.nom, ville: '' }
}

export function versChantier(dto: ChantierDto): Chantier {
  return { id: dto.code, clientId: dto.clientCode, code: dto.code, nom: dto.nom, ville: '' }
}

export function versProduit(dto: ProduitDto): Produit {
  const conditionnement = versConditionnement(dto.conditionnement) ?? 'VRAC'
  const poidsSacKg =
    conditionnement === 'SAC' && dto.sacsParTonne && dto.sacsParTonne > 0
      ? Math.round(KG_PAR_TONNE / dto.sacsParTonne)
      : undefined
  return { id: dto.code, codeSap: dto.code, libelle: dto.libelle, conditionnement, poidsSacKg }
}

export function versTransporteur(dto: TransporteurDto): Transporteur {
  return { id: dto.code, code: dto.code, nom: dto.nom }
}

export function versCamion(dto: CamionDto): Camion {
  return {
    id: dto.immatriculation,
    immatriculation: dto.immatriculation,
    transporteurId: dto.transporteurCode ?? '',
  }
}

export function versChauffeur(dto: ChauffeurDto): Chauffeur {
  return { id: String(dto.id), nom: dto.nom, cin: dto.cin ?? '', transporteurId: '' }
}

export function versReferentiels(dtos: {
  clients: ClientDto[]
  chantiers: ChantierDto[]
  produits: ProduitDto[]
  transporteurs: TransporteurDto[]
  camions: CamionDto[]
  chauffeurs: ChauffeurDto[]
}): Referentiels {
  return {
    clients: dtos.clients.map(versClient),
    chantiers: dtos.chantiers.map(versChantier),
    produits: dtos.produits.map(versProduit),
    transporteurs: dtos.transporteurs.map(versTransporteur),
    camions: dtos.camions.map(versCamion),
    chauffeurs: dtos.chauffeurs.map(versChauffeur),
  }
}

/* ---------- Commandes ---------- */

/** Retrouve l'id du chauffeur dans le référentiel chargé (CIN prioritaire, puis nom), sinon clé synthétique. */
export function resoudreChauffeurId(
  dto: Pick<CommandeDto, 'chauffeur' | 'chauffeurCin'>,
  chauffeurs: Chauffeur[],
): string {
  const cin = nonVide(dto.chauffeurCin)
  const nom = nonVide(dto.chauffeur)
  const trouve =
    (cin && chauffeurs.find((c) => c.cin === cin)) ||
    (nom && chauffeurs.find((c) => c.nom.localeCompare(nom, 'fr', { sensitivity: 'base' }) === 0))
  if (trouve) return trouve.id
  return cin ? `cin:${cin}` : nom ? `nom:${nom}` : ''
}

export function versCommande(dto: CommandeDto, chauffeurs: Chauffeur[] = []): Commande {
  const commande: Commande = {
    id: dto.id,
    origine: dto.origine,
    numeroSap: nonVide(dto.salesDocument),
    numeroLocal: nonVide(dto.numeroLocal),
    clientId: dto.clientCode,
    chantierId: dto.chantierCode ?? '',
    produitId: dto.produitCode,
    quantiteT: dto.quantite,
    nombreSacs: dto.nombreSacs ?? undefined,
    incoterm: versIncoterm(dto.incoterm),
    transporteurId: dto.transporteurCode ?? '',
    camionId: dto.immatriculation ?? '',
    chauffeurId: resoudreChauffeurId(dto, chauffeurs),
    statut: versStatut(dto.statut),
    synchro: dto.synchro?.statut ?? 'Aucune',
    creeeLeUtc: dto.createdAtUtc,
    reference: nonVide(dto.reference),
    pontBascule: dto.pontBascule ?? undefined,
    rowVersion: nonVide(dto.rowVersion),
    libelles: {
      clientNom: dto.clientNom,
      clientCode: dto.clientCode,
      chantierNom: nonVide(dto.chantierNom),
      produitLibelle: dto.produitLibelle,
      conditionnement: versConditionnement(dto.conditionnement),
      transporteurNom: nonVide(dto.transporteurNom),
      immatriculation: nonVide(dto.immatriculation),
      chauffeurNom: nonVide(dto.chauffeur),
      chauffeurCin: nonVide(dto.chauffeurCin),
    },
  }
  return commande
}

function versPesee(dto: PeseeDto, type: Pesee['type']): Pesee {
  return {
    type,
    pont: dto.pontBascule ?? dto.pont ?? 'PB22',
    poidsKg: dto.poidsKg,
    horodatageUtc: dto.horodatageUtc ?? dto.dateUtc ?? '',
  }
}

function versBonDeChargement(dto: BonDeChargementDto): BonDeChargement {
  return { numero: dto.numero, dateUtc: dto.dateUtc }
}

function versBonDeLivraison(dto: BonDeLivraisonDto, commandeId: number): BonDeLivraison {
  return {
    numeroLocal: dto.numeroLocal != null ? String(dto.numeroLocal) : String(commandeId),
    numeroSap: dto.numeroSap ?? undefined,
    dateUtc: dto.dateUtc,
    brutKg: dto.brutKg,
    tareKg: dto.tareKg,
    netKg: dto.netKg,
  }
}

export function versCommandeDetail(dto: CommandeDetailDto, chauffeurs: Chauffeur[] = []): Commande {
  const c = versCommande(dto, chauffeurs)
  const pesees = dto.pesees ?? []
  const entree = dto.peseeEntree ?? pesees.find((p) => p.type === 'Entree')
  const sortie = dto.peseeSortie ?? pesees.find((p) => p.type === 'Sortie')
  if (entree) {
    c.peseeEntree = versPesee(entree, 'Entree')
    c.entreeUtc = c.peseeEntree.horodatageUtc || undefined
  }
  if (sortie) {
    c.peseeSortie = versPesee(sortie, 'Sortie')
    c.sortieUtc = c.peseeSortie.horodatageUtc || undefined
  }
  if (dto.bonDeChargement) c.bonDeChargement = versBonDeChargement(dto.bonDeChargement)
  if (dto.bonDeLivraison) c.bonDeLivraison = versBonDeLivraison(dto.bonDeLivraison, dto.id)
  return c
}

/** Projection de `commande.synchro` (liste) en opération de synchro affichable (file en lecture seule). */
export function versSyncOperation(dto: CommandeDto): SyncOperation | undefined {
  const synchro = dto.synchro
  if (!synchro || synchro.statut === 'Aucune') return undefined
  const etapes = dto.origine === 'Locale' ? ETAPES_LOCALE : ETAPES_SAP
  const etapeCourante = synchro.etape ?? undefined
  const index = etapeCourante ? etapes.indexOf(etapeCourante) : -1
  const etapesFaites = synchro.statut === 'Synchronisee' ? etapes : index > 0 ? etapes.slice(0, index) : []
  return {
    id: dto.id,
    commandeId: dto.id,
    etapes,
    etapesFaites,
    etapeCourante: synchro.statut === 'Synchronisee' ? undefined : etapeCourante,
    statut: synchro.statut,
    tentatives: synchro.tentatives ?? 0,
    message: nonVide(synchro.erreur),
  }
}

export function versSyncOperationsDetail(dto: CommandeDetailDto): SyncOperation[] {
  const ops = dto.syncOperations ?? []
  if (ops.length === 0) {
    const op = versSyncOperation(dto)
    return op ? [op] : []
  }
  const etapes = dto.origine === 'Locale' ? ETAPES_LOCALE : ETAPES_SAP
  return ops.map((o: SyncOperationDto) => ({
    id: o.id,
    commandeId: dto.id,
    etapes,
    etapesFaites: o.statut === 'Synchronisee' ? etapes : [],
    etapeCourante: o.statut === 'Synchronisee' ? undefined : (o.etape ?? o.type ?? undefined),
    statut: o.statut,
    tentatives: o.tentatives ?? 0,
    message: nonVide(o.erreur),
    derniereTentativeUtc: nonVide(o.derniereTentativeUtc),
  }))
}

export function versSynthese(dto: SyntheseDto): SyntheseCommandes {
  return {
    aPeser: dto.aPeser,
    dansUsine: dto.dansUsine,
    livreesAujourdhui: dto.livreesAujourdhui,
    enAttenteSynchro: dto.enAttenteSynchro,
  }
}

export function versSapStatut(dto: SapStatutDto): SapStatut {
  return {
    enLigne: dto.enLigne,
    verifieAtUtc: dto.verifieAtUtc,
    latenceMs: dto.latenceMs ?? undefined,
    detail: nonVide(dto.detail),
  }
}

/* ---------- Requêtes ---------- */

export function versCreerCommandeRequest(input: NouvelleCommandeInput): CreerCommandeLocaleRequest {
  const req: CreerCommandeLocaleRequest = {
    clientCode: input.clientCode.trim(),
    chantierCode: input.chantierCode.trim(),
    produitCode: input.produitId,
    quantite: input.quantiteT,
    incoterm: versIncotermDto(input.incoterm),
    immatriculation: input.immatriculation.trim().toUpperCase(),
    immatriculationLibre: input.immatriculationLibre,
    chauffeur: input.chauffeurNom.trim(),
  }
  if (input.clientNom?.trim()) req.clientNom = input.clientNom.trim()
  if (input.chantierNom?.trim()) req.chantierNom = input.chantierNom.trim()
  if (input.transporteurCode?.trim()) req.transporteurCode = input.transporteurCode.trim()
  if (input.transporteurNom?.trim()) req.transporteurNom = input.transporteurNom.trim()
  if (input.camionCodeSap?.trim()) req.camionCodeSap = input.camionCodeSap.trim()
  if (input.chauffeurCin?.trim()) req.chauffeurCin = input.chauffeurCin.trim()
  if (input.reference?.trim()) req.reference = input.reference.trim()
  return req
}

/** Correspondance champ serveur (`errors` d'un 400) → champ du formulaire. */
const CHAMPS_SERVEUR_VERS_FORMULAIRE: Record<string, string> = {
  clientcode: 'clientCode',
  clientnom: 'clientCode',
  chantiercode: 'chantierCode',
  chantiernom: 'chantierCode',
  produitcode: 'produitId',
  quantite: 'quantiteT',
  incoterm: 'incoterm',
  transporteurcode: 'transporteurCode',
  transporteurnom: 'transporteurCode',
  camioncodesap: 'camionCodeSap',
  immatriculation: 'immatriculation',
  immatriculationlibre: 'immatriculation',
  chauffeur: 'chauffeurNom',
  chauffeurcin: 'chauffeurCin',
  reference: 'reference',
}

export interface ErreursServeurMappees {
  parChamp: Record<string, string>
  generales: string[]
}

export function versErreursFormulaire(errors: Record<string, string[]> | undefined): ErreursServeurMappees {
  const parChamp: Record<string, string> = {}
  const generales: string[] = []
  for (const [cle, messages] of Object.entries(errors ?? {})) {
    const champ =
      CHAMPS_SERVEUR_VERS_FORMULAIRE[
        cle
          .replace(/^\$\./, '')
          .replace(/^request\./i, '')
          .toLowerCase()
      ]
    const texte = messages.join(' ')
    if (champ) parChamp[champ] = parChamp[champ] ? `${parChamp[champ]} ${texte}` : texte
    else generales.push(cle ? `${cle} : ${texte}` : texte)
  }
  return { parChamp, generales }
}

/* ---------- Recherche SAP (phase 2b) ---------- */

export function versClientSap(dto: ClientSapDto): ClientSap {
  return { code: dto.code, nom: dto.nom, ville: nonVide(dto.ville) }
}

export function versChantierSap(dto: ChantierSapDto): ChantierSap {
  return { code: dto.code, nom: dto.nom, parDefaut: dto.parDefaut === true }
}

export function versTransporteurSap(dto: TransporteurSapDto): TransporteurSap {
  return { code: dto.code, nom: dto.nom }
}

export function versCamionSap(dto: CamionSapDto): CamionSap {
  return {
    code: dto.code,
    immatriculation: nonVide(dto.immatriculation),
    transporteurCode: nonVide(dto.transporteurCode),
  }
}

export function versListeLookup<D, T>(dto: ListeLookupDto<D>, mapper: (d: D) => T): ResultatLookup<T> {
  return { source: dto.source, items: (dto.items ?? []).map(mapper) }
}

export function versItemLookup<D, T>(dto: ItemLookupDto<D>, mapper: (d: D) => T): ResultatLookup<T> {
  return { source: dto.source, items: dto.item ? [mapper(dto.item)] : [] }
}
