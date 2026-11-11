import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Commande, Pont } from '@/types'
import type { ApiClient } from './apiClient'
import { HubConnectionState, type HubConnection } from './hubPoids'
import { creerHttpPeseeService, DELAI_PERIME_MS, METHODES_HUB, type EtatPoidsHttp } from './HttpPeseeService'
import type { CommandeDetailDto, DeviceSnapshotDto, DeviceStatusMessageDto, WeightMessageDto } from './dto'

type Handler = (...args: unknown[]) => void

/** Connexion SignalR factice : capture les handlers `on`, journalise les `invoke`. */
function fausseConnexion() {
  const handlers = new Map<string, Handler>()
  const callbacks: { reconnecting: Handler[]; reconnected: Handler[]; close: Handler[] } = {
    reconnecting: [],
    reconnected: [],
    close: [],
  }
  const invocations: [string, unknown][] = []
  const connexion = {
    state: HubConnectionState.Disconnected,
    on: vi.fn((methode: string, h: Handler) => handlers.set(methode, h)),
    onreconnecting: vi.fn((h: Handler) => callbacks.reconnecting.push(h)),
    onreconnected: vi.fn((h: Handler) => callbacks.reconnected.push(h)),
    onclose: vi.fn((h: Handler) => callbacks.close.push(h)),
    start: vi.fn(async () => {
      connexion.state = HubConnectionState.Connected
    }),
    stop: vi.fn(async () => {
      connexion.state = HubConnectionState.Disconnected
    }),
    invoke: vi.fn(async (methode: string, arg: unknown) => {
      invocations.push([methode, arg])
    }),
  }
  return {
    connexion: connexion as unknown as HubConnection,
    emettre: (methode: string, message: unknown) => handlers.get(methode)?.(message),
    callbacks,
    invocations,
    brute: connexion,
  }
}

const DETAIL: CommandeDetailDto = {
  id: 7,
  origine: 'Locale',
  statut: 'DansUsine',
  clientCode: '1004581',
  clientNom: 'ATLAS',
  produitCode: 'P1',
  produitLibelle: 'CPJ 45',
  quantite: 27,
  unite: 'TO',
  incoterm: 'CFR',
  createdAtUtc: '2026-11-11T10:00:00Z',
  updatedAtUtc: '2026-11-11T10:10:00Z',
  synchro: { statut: 'EnAttente', etape: 'CreerCommande', tentatives: 0 },
  pesees: [{ type: 'Entree', pontBascule: 'PB22', poidsKg: 16000, horodatageUtc: '2026-11-11T10:10:00Z' }],
  bonDeChargement: { numero: 'BC-MRK-2026-000001', dateUtc: '2026-11-11T10:10:00Z' },
}

const poids = (deviceId: string, weight: number, isStable: boolean): WeightMessageDto => ({
  deviceId,
  weight,
  isStable,
  tsUtc: '2026-11-11T10:09:59Z',
})

describe('HttpPeseeService (hub /hubs/weight + POST pesées)', () => {
  let etat: EtatPoidsHttp
  let pont: Pont
  let api: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }
  let hub: ReturnType<typeof fausseConnexion>
  let minuteurs: { fn: () => void; ms: number }[]
  const commande = { id: 7, rowVersion: 'AQIDBA==' } as Commande

  const creer = () =>
    creerHttpPeseeService({
      api: api as unknown as ApiClient,
      creerConnexion: () => hub.connexion,
      pontCourant: () => pont,
      publier: (patch) => {
        etat = { ...etat, ...patch }
      },
      chauffeurs: () => [],
      commande: (id) => (id === 7 ? commande : undefined),
      setTimeoutImpl: (fn, ms) => minuteurs.push({ fn, ms }),
      clearTimeoutImpl: () => minuteurs.splice(0),
    })

  beforeEach(() => {
    pont = 'PB22'
    etat = {
      pont,
      lectureKg: 0,
      stable: false,
      derniereLectureUtc: null,
      connecte: false,
      etat: 'Disconnected',
      stale: true,
    }
    hub = fausseConnexion()
    minuteurs = []
    const instantane: DeviceSnapshotDto[] = [
      {
        deviceId: 'PB22',
        state: 'Connected',
        weight: 120,
        isStable: false,
        tsUtc: '2026-11-11T10:09:00Z',
        stale: false,
      },
      { deviceId: 'PB23', state: 'Disconnected', stale: true },
    ]
    api = { get: vi.fn(async () => instantane), post: vi.fn(async () => DETAIL) }
  })

  it('demarrer : démarre, s’abonne au pont courant et applique l’instantané', async () => {
    const service = creer()
    await service.demarrer()

    expect(hub.brute.start).toHaveBeenCalledTimes(1)
    expect(hub.invocations).toEqual([[METHODES_HUB.subscribe, 'PB22']])
    expect(api.get).toHaveBeenCalledWith('/pesees/devices')
    expect(etat).toMatchObject({
      connecte: true,
      etat: 'Connected',
      stale: false,
      lectureKg: 120,
      stable: false,
    })
  })

  it('ReceiveWeight du pont courant → lecture publiée ; un autre pont est ignoré', async () => {
    const service = creer()
    await service.demarrer()

    hub.emettre(METHODES_HUB.receiveWeight, poids('PB23', 99999, true))
    expect(etat.lectureKg).toBe(120)

    hub.emettre(METHODES_HUB.receiveWeight, poids('PB22', 16000, true))
    expect(etat).toMatchObject({
      lectureKg: 16000,
      stable: true,
      derniereLectureUtc: '2026-11-11T10:09:59Z',
      stale: false,
    })
  })

  it('sans message pendant 10 s la lecture devient périmée (Stale)', async () => {
    const service = creer()
    await service.demarrer()
    hub.emettre(METHODES_HUB.receiveWeight, poids('PB22', 16000, true))

    const minuteur = minuteurs[minuteurs.length - 1]
    expect(minuteur?.ms).toBe(DELAI_PERIME_MS)
    minuteur?.fn()

    expect(etat).toMatchObject({ stale: true, etat: 'Stale' })
    await expect(service.validerTare(7)).rejects.toThrow(/périmée/)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('ReceiveDeviceStatus Disconnected → pont déconnecté, poids instable', async () => {
    const service = creer()
    await service.demarrer()
    hub.emettre(METHODES_HUB.receiveWeight, poids('PB22', 16000, true))

    const statut: DeviceStatusMessageDto = {
      deviceId: 'PB22',
      state: 'Disconnected',
      tsUtc: '2026-11-11T10:10:00Z',
    }
    hub.emettre(METHODES_HUB.receiveStatus, statut)

    expect(etat).toMatchObject({ connecte: false, etat: 'Disconnected', stable: false, stale: true })
  })

  it('reconnexion : état déconnecté pendant la reprise, réabonnement ensuite', async () => {
    const service = creer()
    await service.demarrer()
    hub.invocations.splice(0)

    hub.callbacks.reconnecting.forEach((h) => h())
    expect(etat).toMatchObject({ connecte: false, etat: 'Disconnected' })

    hub.callbacks.reconnected.forEach((h) => h())
    await Promise.resolve()
    expect(hub.invocations).toEqual([[METHODES_HUB.subscribe, 'PB22']])
  })

  it('selectionnerPont : désabonne l’ancien pont, abonne le nouveau, recharge l’instantané', async () => {
    const service = creer()
    await service.demarrer()
    hub.invocations.splice(0)

    pont = 'PB23'
    service.selectionnerPont('PB23')
    await vi.waitFor(() => expect(hub.invocations).toHaveLength(2))

    expect(hub.invocations).toEqual([
      [METHODES_HUB.unsubscribe, 'PB22'],
      [METHODES_HUB.subscribe, 'PB23'],
    ])
    await vi.waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    expect(etat).toMatchObject({ pont: 'PB23', connecte: false, etat: 'Disconnected' })
  })

  it('validerTare : refuse un poids instable, sinon POST entree avec le poids affiché et le rowVersion', async () => {
    const service = creer()
    await service.demarrer()

    await expect(service.validerTare(7)).rejects.toThrow(/stable/)

    hub.emettre(METHODES_HUB.receiveWeight, poids('PB22', 16000, true))
    const commande = await service.validerTare(7)

    expect(api.post).toHaveBeenCalledWith('/commandes/7/pesees/entree', {
      deviceId: 'PB22',
      poidsKg: 16000,
      horodatageUtc: '2026-11-11T10:09:59Z',
      rowVersion: 'AQIDBA==',
    })
    expect(commande.statut).toBe('DansUsine')
    expect(commande.peseeEntree?.poidsKg).toBe(16000)
    expect(commande.bonDeChargement?.numero).toBe('BC-MRK-2026-000001')
  })

  it('validerBrut : POST sortie', async () => {
    const service = creer()
    await service.demarrer()
    hub.emettre(METHODES_HUB.receiveWeight, poids('PB22', 43500, true))

    await service.validerBrut(7)

    expect(api.post).toHaveBeenCalledWith(
      '/commandes/7/pesees/sortie',
      expect.objectContaining({ poidsKg: 43500 }),
    )
  })

  it('arreter : ferme la connexion et annule le minuteur', async () => {
    const service = creer()
    await service.demarrer()
    hub.emettre(METHODES_HUB.receiveWeight, poids('PB22', 16000, true))

    await service.arreter()

    expect(hub.brute.stop).toHaveBeenCalledTimes(1)
    expect(minuteurs).toHaveLength(0)
  })
})
