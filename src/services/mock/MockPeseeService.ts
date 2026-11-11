import type { PeseeService } from '@/services/types'
import { jeuDemo } from '@/services/mock/jeuDemo'
import { useAppStore, type PoidsState } from '@/store/useAppStore'
import type { Commande, EtapeSynchro, Pont } from '@/types'
import { bcNumero } from '@/data/mock'
import { LECTURES_IDENTIQUES_POUR_STABLE, SEUIL_CAMION_KG } from '@/domain/pesee'
import { padNumero } from '@/utils/format'

/* Règles identiques à la production (kiosque Temara) */
const FREQUENCE_HZ = 5
const DUREE_RAMPE_MS = 2500
const GIGUE_KG = 12
const LONGUEUR_NUMERO_SAP = 10

const PERIODE_MS = 1000 / FREQUENCE_HZ
const NB_PAS_RAMPE = Math.ceil(DUREE_RAMPE_MS / PERIODE_MS)

let minuteur: number | undefined
let lecturesIdentiques = 0
let derniereValeur = -1

/**
 * Lecture transitoire du pont : état d'interface, pas une donnée confirmée.
 * Elle reste dans le store client et n'entre pas dans le cache des commandes.
 */
function poids(): PoidsState {
  return useAppStore.getState().poids
}

function majPoids(patch: Partial<PoidsState>) {
  useAppStore.getState().setPoids(patch)
}

function arreter() {
  if (minuteur !== undefined) {
    window.clearInterval(minuteur)
    minuteur = undefined
  }
  lecturesIdentiques = 0
  derniereValeur = -1
}

function exigerPesee(commandeId: number): Commande {
  const commande = jeuDemo.trouverCommande(commandeId)
  if (!commande) throw new Error(`Commande ${commandeId} introuvable`)
  const lecture = poids()
  if (!lecture.stable) throw new Error('Le poids n’est pas stable : validation refusée')
  if (lecture.lectureKg < SEUIL_CAMION_KG) throw new Error('Aucun camion sur le pont')
  return commande
}

export const mockPeseeService: PeseeService = {
  selectionnerPont(pont: Pont) {
    arreter()
    majPoids({ pont, lectureKg: 0, stable: false, enCours: false, lecturesIdentiques: 0 })
  },

  simulerCamion(cibleKg: number) {
    arreter()
    const cible = Math.max(0, Math.round(cibleKg))
    let pas = 0
    majPoids({ enCours: true, stable: false, lectureKg: 0, connecte: true, lecturesIdentiques: 0 })
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
      const stable = lecturesIdentiques >= LECTURES_IDENTIQUES_POUR_STABLE && valeur >= SEUIL_CAMION_KG
      majPoids({ lectureKg: valeur, stable, lecturesIdentiques, derniereLectureUtc: new Date().toISOString() })
    }, PERIODE_MS)
  },

  arreterSimulation() {
    arreter()
    majPoids({ enCours: false, stable: false, lectureKg: 0, lecturesIdentiques: 0 })
  },

  async validerTare(commandeId) {
    const commande = exigerPesee(commandeId)
    if (commande.statut !== 'EntreeAutorisee') {
      throw new Error('La pesée d’entrée n’est pas autorisée pour cette commande')
    }
    const lecture = poids()
    const maintenant = new Date().toISOString()
    const numero = bcNumero(jeuDemo.prendreNumero('bc'), new Date().getFullYear())
    const patch: Partial<Commande> = {
      statut: 'DansUsine',
      entreeUtc: maintenant,
      peseeEntree: {
        type: 'Entree',
        pont: lecture.pont,
        poidsKg: lecture.lectureKg,
        horodatageUtc: maintenant,
      },
      bonDeChargement: { numero, dateUtc: maintenant },
    }
    const suivante = jeuDemo.patcherCommande(commande.id, patch)
    this.arreterSimulation()
    return suivante
  },

  async validerBrut(commandeId) {
    const commande = exigerPesee(commandeId)
    if (commande.statut !== 'SortieAutorisee' || !commande.peseeEntree) {
      throw new Error('Le second pesage n’est pas autorisé pour cette commande')
    }
    const lecture = poids()
    const maintenant = new Date().toISOString()
    const brutKg = lecture.lectureKg
    const tareKg = commande.peseeEntree.poidsKg
    const sapEnLigne = useAppStore.getState().sapOnline
    const blDirectSap = commande.origine === 'Sap' && sapEnLigne
    const numeroSapBl = blDirectSap ? padNumero(jeuDemo.prendreNumero('sapBl'), LONGUEUR_NUMERO_SAP) : undefined

    let synchro: Commande['synchro'] = 'Aucune'
    let etapes: EtapeSynchro[] = []
    if (commande.origine === 'Locale') {
      synchro = 'EnAttente'
      etapes = ['CreerCommande', 'Livraison', 'LireBL']
    } else if (!sapEnLigne) {
      synchro = 'EnAttente'
      etapes = ['Livraison', 'LireBL']
    }

    const patch: Partial<Commande> = {
      statut: 'Livree',
      synchro,
      sortieUtc: maintenant,
      peseeSortie: { type: 'Sortie', pont: lecture.pont, poidsKg: brutKg, horodatageUtc: maintenant },
      bonDeLivraison: {
        numeroProvisoire: commande.numeroSap ?? commande.id.toString(),
        numeroSap: numeroSapBl,
        dateUtc: maintenant,
        brutKg,
        tareKg,
        netKg: brutKg - tareKg,
      },
    }
    const suivante = jeuDemo.patcherCommande(commande.id, patch)
    if (etapes.length > 0) {
      jeuDemo.insererSync({
        id: jeuDemo.prendreNumero('syncOp'),
        commandeId: commande.id,
        etapes,
        etapesFaites: [],
        statut: 'EnAttente',
        tentatives: 0,
      })
    }
    this.arreterSimulation()
    return suivante
  },
}
