import type { CommandesService, ListeCommandes } from '@/services/types'
import { useAppStore, numeroAffiche } from '@/store/useAppStore'
import type {
  Camion,
  Chantier,
  Chauffeur,
  Client,
  Commande,
  NouvelleCommandeInput,
  StatutCommande,
  Transporteur,
} from '@/types'
import { STATUT_LABELS } from '@/types'
import { sansZeros } from './MockSapLookupService'

const KG_PAR_TONNE = 1000
const STATUTS_ANNULABLES: StatutCommande[] = ['Creee', 'EntreeAutorisee']

function trouver(commandeId: number): Commande {
  const c = useAppStore.getState().commandes.find((x) => x.id === commandeId)
  if (!c) throw new Error(`Commande ${commandeId} introuvable`)
  return c
}

function exiger(commandeId: number, attendu: StatutCommande): Commande {
  const c = trouver(commandeId)
  if (c.statut !== attendu) {
    throw new Error(
      `Transition de statut invalide : ${numeroAffiche(c)} est « ${STATUT_LABELS[c.statut]} », attendu « ${STATUT_LABELS[attendu]} »`,
    )
  }
  return c
}

/** Comme l'API (phase 2b) : un code SAP inconnu du cache est accepté tel quel et ajouté au référentiel, sans nom inventé. */
function resoudreClient(code: string, nom: string | undefined): Client {
  const st = useAppStore.getState()
  const existant = st.referentiels.clients.find((c) => sansZeros(c.code) === sansZeros(code))
  if (existant) return existant
  const nouveau: Client = { id: `c-${code}`, code, nom: nom ?? '', ville: '' }
  st.setReferentiels({ ...st.referentiels, clients: [...st.referentiels.clients, nouveau] })
  return nouveau
}

function resoudreChantier(client: Client, code: string, nom: string | undefined): Chantier {
  const st = useAppStore.getState()
  const existant = st.referentiels.chantiers.find((c) => sansZeros(c.code) === sansZeros(code))
  if (existant && existant.clientId !== client.id) {
    throw new Error("Le chantier n'appartient pas au client sélectionné")
  }
  if (existant) return existant
  const nouveau: Chantier = { id: `ch-${code}`, clientId: client.id, code, nom: nom ?? '', ville: '' }
  st.setReferentiels({ ...st.referentiels, chantiers: [...st.referentiels.chantiers, nouveau] })
  return nouveau
}

function resoudreTransporteur(code: string | undefined, nom: string | undefined): Transporteur | undefined {
  if (!code) return undefined
  const st = useAppStore.getState()
  const existant = st.referentiels.transporteurs.find((t) => sansZeros(t.code) === sansZeros(code))
  if (existant) return existant
  const nouveau: Transporteur = { id: `t-${code}`, code, nom: nom ?? '' }
  st.setReferentiels({ ...st.referentiels, transporteurs: [...st.referentiels.transporteurs, nouveau] })
  return nouveau
}

/** Comme l'API : camion inconnu → créé dans le référentiel (clé = immatriculation). */
function resoudreCamion(immatriculation: string, transporteurId: string): Camion {
  const st = useAppStore.getState()
  const immat = immatriculation.trim().toUpperCase()
  const existant = st.referentiels.camions.find((c) => c.immatriculation.toUpperCase() === immat)
  if (existant) return existant
  const nouveau: Camion = { id: `v-${immat}`, immatriculation: immat, transporteurId }
  st.setReferentiels({ ...st.referentiels, camions: [...st.referentiels.camions, nouveau] })
  return nouveau
}

/** Comme l'API : chauffeur inconnu → créé dans le référentiel (CIN prioritaire, puis nom). */
function resoudreChauffeur(nom: string, cin: string | undefined, transporteurId: string): Chauffeur {
  const st = useAppStore.getState()
  const nomNet = nom.trim()
  const cinNet = cin?.trim() ?? ''
  const existant =
    (cinNet && st.referentiels.chauffeurs.find((c) => c.cin.toUpperCase() === cinNet.toUpperCase())) ||
    st.referentiels.chauffeurs.find((c) => c.nom.localeCompare(nomNet, 'fr', { sensitivity: 'base' }) === 0)
  if (existant) return existant
  const nouveau: Chauffeur = { id: `d-${Date.now().toString(36)}`, nom: nomNet, cin: cinNet, transporteurId }
  st.setReferentiels({ ...st.referentiels, chauffeurs: [...st.referentiels.chauffeurs, nouveau] })
  return nouveau
}

export const mockCommandesService: CommandesService = {
  async lister(): Promise<ListeCommandes> {
    const st = useAppStore.getState()
    return { commandes: st.commandes, syncOps: st.syncOps, total: st.commandes.length }
  },

  async obtenir(commandeId) {
    return trouver(commandeId)
  },

  async creerLocale(input: NouvelleCommandeInput): Promise<Commande> {
    const st = useAppStore.getState()
    const produit = st.referentiels.produits.find((p) => p.id === input.produitId)
    if (!produit) throw new Error('Produit introuvable')
    const client = resoudreClient(input.clientCode, input.clientNom)
    const chantier = resoudreChantier(client, input.chantierCode, input.chantierNom)
    const transporteurId = resoudreTransporteur(input.transporteurCode, input.transporteurNom)?.id ?? ''
    const camion = resoudreCamion(input.immatriculation, transporteurId)
    const chauffeur = resoudreChauffeur(input.chauffeurNom, input.chauffeurCin, transporteurId)
    const nombreSacs =
      produit.conditionnement === 'SAC' && produit.poidsSacKg
        ? Math.round((input.quantiteT * KG_PAR_TONNE) / produit.poidsSacKg)
        : undefined
    const commande: Commande = {
      id: st.prochainNumero('commandeId'),
      origine: 'Locale',
      clientId: client.id,
      chantierId: chantier.id,
      produitId: input.produitId,
      quantiteT: input.quantiteT,
      incoterm: input.incoterm,
      transporteurId,
      camionId: camion.id,
      chauffeurId: chauffeur.id,
      reference: input.reference?.trim() || undefined,
      nombreSacs,
      statut: 'Creee',
      synchro: 'EnAttente',
      creeeLeUtc: new Date().toISOString(),
    }
    st.upsertCommande(commande)
    return commande
  },

  async autoriserPesee(commandeId, pont) {
    const c = exiger(commandeId, 'Creee')
    const patch: Partial<Commande> = { statut: 'EntreeAutorisee', pontBascule: pont }
    useAppStore.getState().patchCommande(c.id, patch)
    return { ...c, ...patch }
  },

  async autoriserSecondPesage(commandeId, pont) {
    const c = exiger(commandeId, 'DansUsine')
    const patch: Partial<Commande> = { statut: 'SortieAutorisee', pontBascule: pont }
    useAppStore.getState().patchCommande(c.id, patch)
    return { ...c, ...patch }
  },

  async annuler(commandeId) {
    const c = trouver(commandeId)
    if (!STATUTS_ANNULABLES.includes(c.statut)) {
      throw new Error(
        `Transition de statut invalide : une commande « ${STATUT_LABELS[c.statut]} » ne peut plus être annulée (procédure manuelle après la tare)`,
      )
    }
    const st = useAppStore.getState()
    const patch: Partial<Commande> = { statut: 'Annulee', synchro: 'Aucune' }
    st.patchCommande(c.id, patch)
    st.retirerSyncOpsDeCommande(c.id)
    return { ...c, ...patch }
  },

  async synthese() {
    const commandes = useAppStore.getState().commandes
    return {
      aPeser: commandes.filter((c) => c.statut === 'Creee' || c.statut === 'EntreeAutorisee').length,
      dansUsine: commandes.filter((c) => c.statut === 'DansUsine' || c.statut === 'SortieAutorisee').length,
      livreesAujourdhui: commandes.filter(
        (c) => c.statut === 'Livree' || c.statut === 'Synchronisee' || c.statut === 'ErreurSynchro',
      ).length,
      enAttenteSynchro: commandes.filter(
        (c) => c.synchro === 'EnAttente' || c.synchro === 'EnCours' || c.synchro === 'Erreur',
      ).length,
    }
  },
}
