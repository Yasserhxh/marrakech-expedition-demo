/**
 * Pesée en direct (phase 3b) : abonnement au pont via le hub `/hubs/weight` (`SubscribeDevice`),
 * réception `ReceiveWeight` / `ReceiveDeviceStatus`, instantané initial `GET /api/pesees/devices`,
 * puis `POST /api/commandes/{id}/pesees/entree|sortie` avec le poids affiché et le `rowVersion`.
 * Le serveur ne fait pas confiance au poids envoyé : il le compare à sa propre lecture (409 sinon).
 */
import type { PeseeService } from '@/services/types'
import type { Chauffeur, Commande, EtatPont, Pont } from '@/types'
import type { ApiClient } from './apiClient'
import type {
  CommandeDetailDto,
  DeviceSnapshotDto,
  DeviceStatusMessageDto,
  PeseeRequest,
  WeightMessageDto,
} from './dto'
import { HubConnectionState, type HubConnection } from './hubPoids'
import { versCommandeDetail } from './mappers'

/** Sans message depuis ce délai, la lecture est périmée : bouton désactivé (même valeur que `Pesee:StaleAfterSeconds`). */
export const DELAI_PERIME_MS = 10_000

export const METHODES_HUB = {
  subscribe: 'SubscribeDevice',
  unsubscribe: 'UnsubscribeDevice',
  receiveWeight: 'ReceiveWeight',
  receiveStatus: 'ReceiveDeviceStatus',
} as const

export interface EtatPoidsHttp {
  pont: Pont
  lectureKg: number
  stable: boolean
  derniereLectureUtc: string | null
  connecte: boolean
  etat: EtatPont
  stale: boolean
}

export interface HttpPeseeDeps {
  api: ApiClient
  creerConnexion: () => HubConnection
  /** Pont courant (choisi à l'autorisation) et publication de l'état vers le store. */
  pontCourant: () => Pont
  publier: (patch: Partial<EtatPoidsHttp>) => void
  chauffeurs: () => Chauffeur[]
  /** Commande telle que connue par l'écran (pour `rowVersion`). */
  commande: (commandeId: number) => Commande | undefined
  setTimeoutImpl?: (fn: () => void, ms: number) => number
  clearTimeoutImpl?: (id: number) => void
}

const DECONNECTE: Partial<EtatPoidsHttp> = {
  connecte: false,
  etat: 'Disconnected',
  stable: false,
  stale: true,
}

export function creerHttpPeseeService(deps: HttpPeseeDeps): PeseeService {
  const setTimeoutImpl = deps.setTimeoutImpl ?? ((fn, ms) => window.setTimeout(fn, ms))
  const clearTimeoutImpl = deps.clearTimeoutImpl ?? ((id) => window.clearTimeout(id))

  let connexion: HubConnection | null = null
  let pontAbonne: Pont | null = null
  let minuteurPerime: number | undefined

  /** Miroir de ce que l'écran affiche : `validerTare`/`validerBrut` envoient exactement cette lecture. */
  let lecture: EtatPoidsHttp = {
    pont: deps.pontCourant(),
    lectureKg: 0,
    stable: false,
    derniereLectureUtc: null,
    connecte: false,
    etat: 'Disconnected',
    stale: true,
  }

  const publier = (patch: Partial<EtatPoidsHttp>) => {
    lecture = { ...lecture, ...patch }
    deps.publier(patch)
  }

  const desarmerPerime = () => {
    if (minuteurPerime !== undefined) clearTimeoutImpl(minuteurPerime)
    minuteurPerime = undefined
  }

  const armerPerime = () => {
    desarmerPerime()
    minuteurPerime = setTimeoutImpl(() => {
      minuteurPerime = undefined
      publier({ stale: true, etat: 'Stale' })
    }, DELAI_PERIME_MS)
  }

  const surPoids = (message: WeightMessageDto) => {
    if (message.deviceId !== deps.pontCourant()) return
    publier({
      lectureKg: message.weight,
      stable: message.isStable,
      derniereLectureUtc: message.tsUtc,
      connecte: true,
      etat: 'Connected',
      stale: false,
    })
    armerPerime()
  }

  const surStatut = (message: DeviceStatusMessageDto) => {
    if (message.deviceId !== deps.pontCourant()) return
    const connecte = message.state === 'Connected'
    publier({ etat: message.state, connecte, stale: !connecte, ...(connecte ? {} : { stable: false }) })
    if (!connecte) desarmerPerime()
  }

  const appliquerInstantane = (lignes: DeviceSnapshotDto[]) => {
    const ligne = lignes.find((l) => l.deviceId === deps.pontCourant())
    if (!ligne) {
      publier({ ...DECONNECTE, lectureKg: 0 })
      return
    }
    const connecte = ligne.state === 'Connected' && !ligne.stale
    publier({
      lectureKg: ligne.weight ?? 0,
      stable: (ligne.isStable ?? false) && connecte,
      derniereLectureUtc: ligne.tsUtc ?? null,
      connecte,
      etat: ligne.stale && ligne.state === 'Connected' ? 'Stale' : ligne.state,
      stale: !connecte,
    })
    if (connecte) armerPerime()
  }

  const chargerInstantane = async () => {
    appliquerInstantane(await deps.api.get<DeviceSnapshotDto[]>('/pesees/devices'))
  }

  const abonner = async (pont: Pont) => {
    if (!connexion || connexion.state !== HubConnectionState.Connected) return
    if (pontAbonne && pontAbonne !== pont) await connexion.invoke(METHODES_HUB.unsubscribe, pontAbonne)
    await connexion.invoke(METHODES_HUB.subscribe, pont)
    pontAbonne = pont
  }

  const exigerLectureExploitable = (): EtatPoidsHttp => {
    const l = { ...lecture, pont: deps.pontCourant() }
    if (!l.connecte || l.stale)
      throw new Error(`Pont ${l.pont} déconnecté ou lecture périmée : validation refusée`)
    if (!l.stable) throw new Error('Le poids n’est pas stable : validation refusée')
    return l
  }

  const poster = async (commandeId: number, chemin: 'entree' | 'sortie'): Promise<Commande> => {
    const l = exigerLectureExploitable()
    const rowVersion = deps.commande(commandeId)?.rowVersion
    const body: PeseeRequest = {
      deviceId: l.pont,
      poidsKg: l.lectureKg,
      horodatageUtc: l.derniereLectureUtc ?? new Date().toISOString(),
      ...(rowVersion ? { rowVersion } : {}),
    }
    const dto = await deps.api.post<CommandeDetailDto>(`/commandes/${commandeId}/pesees/${chemin}`, body)
    return versCommandeDetail(dto, deps.chauffeurs())
  }

  return {
    async demarrer() {
      if (connexion) return
      const c = deps.creerConnexion()
      connexion = c
      c.on(METHODES_HUB.receiveWeight, surPoids)
      c.on(METHODES_HUB.receiveStatus, surStatut)
      c.onreconnecting(() => {
        desarmerPerime()
        publier(DECONNECTE)
      })
      c.onreconnected(() => {
        pontAbonne = null
        void abonner(deps.pontCourant())
          .then(chargerInstantane)
          .catch(() => publier({ connecte: false, etat: 'Error', stale: true, stable: false }))
      })
      c.onclose(() => {
        desarmerPerime()
        pontAbonne = null
        publier(DECONNECTE)
      })
      await c.start()
      await abonner(deps.pontCourant())
      await chargerInstantane()
    },

    async arreter() {
      desarmerPerime()
      const c = connexion
      connexion = null
      pontAbonne = null
      if (c) await c.stop()
    },

    selectionnerPont(pont) {
      desarmerPerime()
      publier({ ...DECONNECTE, pont, lectureKg: 0, derniereLectureUtc: null })
      void abonner(pont)
        .then(chargerInstantane)
        .catch(() => publier({ connecte: false, etat: 'Error', stale: true, stable: false }))
    },

    simulerCamion() {
      /* Lecture réelle du pont en mode api : rien à simuler. */
    },

    arreterSimulation() {
      /* Idem. */
    },

    validerTare: (commandeId) => poster(commandeId, 'entree'),

    validerBrut: (commandeId) => poster(commandeId, 'sortie'),
  }
}
