import type { PingSap, SyncService } from '@/services/types'
import { useAppStore, numeroAffiche } from '@/store/useAppStore'
import type { EtapeSynchro, SyncOperation } from '@/types'
import { MESSAGE_CLIENT_BLOQUE } from '@/data/mock'
import { padNumero } from '@/utils/format'

const DELAI_ETAPE_MS: Record<EtapeSynchro, number> = {
  CreerCommande: 1200,
  Livraison: 1200,
  LireBL: 800,
}
const DELAI_PING_MS = 450
const LATENCE_SAP_BASE_MS = 380
const LATENCE_SAP_GIGUE_MS = 120
const LONGUEUR_NUMERO_SAP = 10
const MESSAGE_SAP_INJOIGNABLE = 'SAP injoignable (timeout 10 s vers SAP PRD)'

const attendre = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function opActuelle(id: number): SyncOperation | undefined {
  return useAppStore.getState().syncOps.find((o) => o.id === id)
}

function echouer(op: SyncOperation, etape: EtapeSynchro, message: string) {
  const st = useAppStore.getState()
  st.patchSyncOp(op.id, { statut: 'Erreur', etapeCourante: etape, message })
  st.patchCommande(op.commandeId, { synchro: 'Erreur', statut: 'ErreurSynchro' })
  const c = st.commandes.find((x) => x.id === op.commandeId)
  st.pousserToast('error', `Synchronisation ${c ? numeroAffiche(c) : op.commandeId} : ${message}`)
}

async function executer(operationId: number): Promise<void> {
  const st0 = useAppStore.getState()
  const op = opActuelle(operationId)
  if (!op || op.statut === 'EnCours' || op.statut === 'Synchronisee') return
  if (!st0.sapOnline) {
    st0.pousserToast('warning', 'SAP est hors ligne : la synchronisation est impossible pour le moment')
    return
  }
  const commande = st0.commandes.find((c) => c.id === op.commandeId)
  if (!commande) return
  const client = st0.referentiels.clients.find((c) => c.id === commande.clientId)

  st0.patchSyncOp(op.id, {
    statut: 'EnCours',
    tentatives: op.tentatives + 1,
    message: undefined,
    derniereTentativeUtc: new Date().toISOString(),
  })
  st0.patchCommande(commande.id, { synchro: 'EnCours' })

  const restantes = op.etapes.filter((e) => !op.etapesFaites.includes(e))
  for (const etape of restantes) {
    useAppStore.getState().patchSyncOp(op.id, { etapeCourante: etape })
    await attendre(DELAI_ETAPE_MS[etape])
    const st = useAppStore.getState()
    const courante = opActuelle(op.id)
    if (!courante) return
    if (!st.sapOnline) {
      echouer(courante, etape, MESSAGE_SAP_INJOIGNABLE)
      return
    }
    if (etape === 'CreerCommande') {
      if (client && st.clientsBloquesSap.includes(client.code)) {
        echouer(courante, etape, MESSAGE_CLIENT_BLOQUE)
        return
      }
      st.patchCommande(commande.id, {
        numeroSap: padNumero(st.prochainNumero('sapCommande'), LONGUEUR_NUMERO_SAP),
      })
    }
    if (etape === 'LireBL') {
      const c = st.commandes.find((x) => x.id === commande.id)
      if (c?.bonDeLivraison) {
        const numeroBl = padNumero(st.prochainNumero('sapBl'), LONGUEUR_NUMERO_SAP)
        st.patchCommande(c.id, { bonDeLivraison: { ...c.bonDeLivraison, numeroSap: numeroBl } })
      }
    }
    st.patchSyncOp(op.id, { etapesFaites: [...courante.etapesFaites, etape] })
  }

  const stFin = useAppStore.getState()
  stFin.patchSyncOp(op.id, { statut: 'Synchronisee', etapeCourante: undefined, message: undefined })
  stFin.patchCommande(commande.id, { synchro: 'Synchronisee', statut: 'Synchronisee' })
  const finale = stFin.commandes.find((x) => x.id === commande.id)
  stFin.pousserToast(
    'success',
    `Commande ${finale ? numeroAffiche(finale) : commande.id} synchronisée — BL SAP ${finale?.bonDeLivraison?.numeroSap ?? ''}`,
  )
}

export const mockSyncService: SyncService = {
  async ping(): Promise<PingSap> {
    await attendre(DELAI_PING_MS)
    const enLigne = useAppStore.getState().sapOnline
    return enLigne
      ? { enLigne, latenceMs: LATENCE_SAP_BASE_MS + Math.round(Math.random() * LATENCE_SAP_GIGUE_MS) }
      : { enLigne }
  },

  synchroniser: executer,

  async toutSynchroniser() {
    const st = useAppStore.getState()
    if (!st.sapOnline) {
      st.pousserToast('warning', 'SAP est hors ligne : la synchronisation est impossible pour le moment')
      return
    }
    const aTraiter = st.syncOps
      .filter((o) => o.statut === 'EnAttente' || o.statut === 'Erreur')
      .map((o) => o.id)
    for (const id of aTraiter) {
      await executer(id)
    }
  },

  simulerDeblocageClient(codeClient: string) {
    const st = useAppStore.getState()
    st.debloquerClientSap(codeClient)
    st.pousserToast('info', `Blocage crédit levé côté SAP pour le client ${codeClient} (simulation)`)
  },
}
