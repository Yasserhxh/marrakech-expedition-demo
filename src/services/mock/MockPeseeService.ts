import type { PeseeService } from '@/services/types'
import { useAppStore, numeroAffiche } from '@/store/useAppStore'
import type { Commande, EtapeSynchro, Pont } from '@/types'
import { bcNumero } from '@/data/mock'
import { padNumero } from '@/utils/format'

/* Règles identiques à la production (kiosque Temara) */
const FREQUENCE_HZ = 5
const DUREE_RAMPE_MS = 2500
const LECTURES_IDENTIQUES_POUR_STABLE = 15
const SEUIL_STABLE_KG = 2000
const GIGUE_KG = 12
const LONGUEUR_NUMERO_SAP = 10

const PERIODE_MS = 1000 / FREQUENCE_HZ
const NB_PAS_RAMPE = Math.ceil(DUREE_RAMPE_MS / PERIODE_MS)

let minuteur: number | undefined
let lecturesIdentiques = 0
let derniereValeur = -1

function arreter() {
  if (minuteur !== undefined) {
    window.clearInterval(minuteur)
    minuteur = undefined
  }
  lecturesIdentiques = 0
  derniereValeur = -1
}

function exigerPesee(commandeId: number): Commande {
  const st = useAppStore.getState()
  const c = st.commandes.find((x) => x.id === commandeId)
  if (!c) throw new Error(`Commande ${commandeId} introuvable`)
  if (!st.poids.stable) throw new Error('Le poids n’est pas stable : validation refusée')
  if (st.poids.lectureKg < SEUIL_STABLE_KG) throw new Error('Aucun camion sur le pont')
  return c
}

export const mockPeseeService: PeseeService = {
  async demarrer() {
    useAppStore.getState().setPoids({ connecte: true, etat: 'Connected', stale: false })
  },

  async arreter() {
    arreter()
  },

  selectionnerPont(pont: Pont) {
    arreter()
    useAppStore.getState().setPoids({ pont, lectureKg: 0, stable: false, enCours: false })
  },

  simulerCamion(cibleKg: number) {
    arreter()
    const cible = Math.max(0, Math.round(cibleKg))
    let pas = 0
    useAppStore
      .getState()
      .setPoids({ enCours: true, stable: false, lectureKg: 0, connecte: true, etat: 'Connected', stale: false })
    minuteur = window.setInterval(() => {
      pas += 1
      let valeur: number
      if (pas < NB_PAS_RAMPE) {
        const gigue = Math.round((Math.random() * 2 - 1) * GIGUE_KG)
        valeur = Math.max(0, Math.round((cible * pas) / NB_PAS_RAMPE) + gigue)
      } else {
        valeur = cible
      }
      lecturesIdentiques = valeur === derniereValeur ? lecturesIdentiques + 1 : 1
      derniereValeur = valeur
      const stable = lecturesIdentiques >= LECTURES_IDENTIQUES_POUR_STABLE && valeur >= SEUIL_STABLE_KG
      useAppStore
        .getState()
        .setPoids({ lectureKg: valeur, stable, derniereLectureUtc: new Date().toISOString() })
    }, PERIODE_MS)
  },

  arreterSimulation() {
    arreter()
    useAppStore.getState().setPoids({ enCours: false, stable: false, lectureKg: 0 })
  },

  async validerTare(commandeId) {
    const c = exigerPesee(commandeId)
    if (c.statut !== 'EntreeAutorisee')
      throw new Error('La pesée d’entrée n’est pas autorisée pour cette commande')
    const st = useAppStore.getState()
    const maintenant = new Date().toISOString()
    const numero = bcNumero(st.prochainNumero('bc'), new Date().getFullYear())
    const patch: Partial<Commande> = {
      statut: 'DansUsine',
      entreeUtc: maintenant,
      peseeEntree: {
        type: 'Entree',
        pont: st.poids.pont,
        poidsKg: st.poids.lectureKg,
        horodatageUtc: maintenant,
      },
      bonDeChargement: { numero, dateUtc: maintenant },
    }
    st.patchCommande(c.id, patch)
    this.arreterSimulation()
    st.pousserToast('success', `Tare validée — Bon de chargement ${numero} émis`)
    return { ...c, ...patch }
  },

  async validerBrut(commandeId) {
    const c = exigerPesee(commandeId)
    if (c.statut !== 'SortieAutorisee' || !c.peseeEntree) {
      throw new Error('Le second pesage n’est pas autorisé pour cette commande')
    }
    const st = useAppStore.getState()
    const maintenant = new Date().toISOString()
    const brutKg = st.poids.lectureKg
    const tareKg = c.peseeEntree.poidsKg
    const blDirectSap = c.origine === 'Sap' && st.sapOnline
    const numeroSapBl = blDirectSap ? padNumero(st.prochainNumero('sapBl'), LONGUEUR_NUMERO_SAP) : undefined

    let synchro: Commande['synchro'] = 'Aucune'
    let etapes: EtapeSynchro[] = []
    if (c.origine === 'Locale') {
      synchro = 'EnAttente'
      etapes = ['CreerCommande', 'Livraison', 'LireBL']
    } else if (!st.sapOnline) {
      synchro = 'EnAttente'
      etapes = ['Livraison', 'LireBL']
    }

    const patch: Partial<Commande> = {
      statut: 'Livree',
      synchro,
      sortieUtc: maintenant,
      peseeSortie: { type: 'Sortie', pont: st.poids.pont, poidsKg: brutKg, horodatageUtc: maintenant },
      bonDeLivraison: {
        numeroLocal: c.id.toString(),
        numeroSap: numeroSapBl,
        dateUtc: maintenant,
        brutKg,
        tareKg,
        netKg: brutKg - tareKg,
      },
    }
    st.patchCommande(c.id, patch)
    if (etapes.length > 0) {
      st.upsertSyncOp({
        id: st.prochainNumero('syncOp'),
        commandeId: c.id,
        etapes,
        etapesFaites: [],
        statut: 'EnAttente',
        tentatives: 0,
      })
    }
    this.arreterSimulation()
    st.pousserToast(
      'success',
      numeroSapBl
        ? `BL SAP ${numeroSapBl} émis pour ${numeroAffiche(c)}`
        : `Bon de livraison émis pour ${numeroAffiche(c)}`,
    )
    return { ...c, ...patch }
  },
}
