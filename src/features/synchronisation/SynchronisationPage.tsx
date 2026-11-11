import { useEffect, useState } from 'react'
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiPrinter,
  FiRefreshCw,
  FiUnlock,
  FiWifi,
  FiWifiOff,
} from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Modal } from '@/components/Modal'
import { Notice } from '@/components/Notice'
import { DemoNotice } from '@/components/DemoNotice'
import { DocumentPreview } from '@/components/DocumentPreview'
import { SynchroBadge } from '@/components/StatusBadge'
import { SyncSteps } from '@/components/SyncSteps'
import { services, type PingSap } from '@/services'
import { useAppStore, useReferentielLookup, numeroAffiche } from '@/store/useAppStore'
import type { Commande, SyncOperation } from '@/types'
import { ABSENT, formatDateTime, formatHeure } from '@/utils/format'

interface Ligne {
  op: SyncOperation
  commande: Commande
}

export function SynchronisationPage() {
  const sapOnline = useAppStore((s) => s.sapOnline)
  const syncOps = useAppStore((s) => s.syncOps)
  const commandes = useAppStore((s) => s.commandes)
  const clientsBloques = useAppStore((s) => s.clientsBloquesSap)
  const r = useReferentielLookup()
  const [ping, setPing] = useState<PingSap | null>(null)
  const [pingEnCours, setPingEnCours] = useState(false)
  const [pingUtc, setPingUtc] = useState<string | null>(null)
  const [toutEnCours, setToutEnCours] = useState(false)
  const [blAReimprimer, setBlAReimprimer] = useState<Commande | null>(null)

  const tester = async () => {
    setPingEnCours(true)
    const res = await services.sync.ping()
    setPing(res)
    setPingUtc(new Date().toISOString())
    setPingEnCours(false)
  }

  useEffect(() => {
    void tester()
    // On re-teste automatiquement lorsque l'état SAP change (barre de démo).
  }, [sapOnline])

  const lignes: Ligne[] = syncOps
    .map((op) => ({ op, commande: commandes.find((c) => c.id === op.commandeId) }))
    .filter((l): l is Ligne => Boolean(l.commande))
    .sort((a, b) => b.op.id - a.op.id)

  const compte = {
    attente: syncOps.filter((o) => o.statut === 'EnAttente').length,
    enCours: syncOps.filter((o) => o.statut === 'EnCours').length,
    erreur: syncOps.filter((o) => o.statut === 'Erreur').length,
    ok: syncOps.filter((o) => o.statut === 'Synchronisee').length,
  }
  const localesNonLivrees = commandes.filter(
    (c) => c.origine === 'Locale' && !c.bonDeLivraison && c.statut !== 'Annulee',
  ).length

  const toutSynchroniser = async () => {
    setToutEnCours(true)
    await services.sync.toutSynchroniser()
    setToutEnCours(false)
  }

  const colonnes: Column<Ligne>[] = [
    {
      key: 'commande',
      header: 'Commande',
      render: ({ commande }) => (
        <span>
          <span className="code-chip">{numeroAffiche(commande)}</span>
          <span className="cell-sub">{r.client(commande)?.nom}</span>
        </span>
      ),
      sortValue: ({ commande }) => numeroAffiche(commande),
    },
    { key: 'etapes', header: 'Étapes', render: ({ op }) => <SyncSteps op={op} /> },
    {
      key: 'statut',
      header: 'Statut',
      render: ({ op }) => (
        <span>
          <SynchroBadge synchro={op.statut} />
          {op.statut === 'EnCours' ? (
            <span className="progress" aria-hidden="true">
              <span
                className="progress__bar"
                style={{
                  width: `${Math.round(((op.etapesFaites.length + 0.5) / op.etapes.length) * 100)}%`,
                }}
              />
            </span>
          ) : null}
        </span>
      ),
      sortValue: ({ op }) => op.statut,
    },
    {
      key: 'tentatives',
      header: 'Tentatives',
      align: 'right',
      render: ({ op }) => <span className="mono">{op.tentatives}</span>,
      sortValue: ({ op }) => op.tentatives,
    },
    {
      key: 'dernier',
      header: 'Dernier essai',
      render: ({ op }) => (op.derniereTentativeUtc ? formatHeure(op.derniereTentativeUtc) : ABSENT),
      sortValue: ({ op }) => op.derniereTentativeUtc ?? '',
    },
    {
      key: 'message',
      header: 'Message',
      render: ({ op, commande }) => {
        if (op.statut === 'Synchronisee') {
          return (
            <span className="text-muted">
              N° SAP <span className="mono">{commande.numeroSap}</span> · BL{' '}
              <span className="mono">{commande.bonDeLivraison?.numeroSap}</span>
            </span>
          )
        }
        if (!op.message) return <span className="text-muted">—</span>
        const client = r.client(commande)
        const bloque = client ? clientsBloques.includes(client.code) : false
        return (
          <span style={{ whiteSpace: 'normal', display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
            <span className="text-danger" style={{ fontWeight: 600 }}>
              {op.message}
            </span>
            {bloque ? (
              <button
                type="button"
                className="btn-link"
                style={{ fontSize: 12 }}
                onClick={() => client && services.sync.simulerDeblocageClient(client.code)}
              >
                <FiUnlock aria-hidden="true" /> Simuler le déblocage du client dans SAP (démo)
              </button>
            ) : null}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: ({ op, commande }) => (
        <span className="btn-row" style={{ flexWrap: 'nowrap' }}>
          {op.statut === 'EnAttente' ? (
            <button
              type="button"
              className="btn-action btn-sm"
              disabled={!sapOnline || toutEnCours}
              onClick={() => void services.sync.synchroniser(op.id)}
            >
              <FiRefreshCw aria-hidden="true" /> Synchroniser
            </button>
          ) : null}
          {op.statut === 'Erreur' ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={!sapOnline || toutEnCours}
              onClick={() => void services.sync.synchroniser(op.id)}
            >
              <FiRefreshCw aria-hidden="true" /> Réessayer
            </button>
          ) : null}
          {op.statut === 'Synchronisee' && commande.bonDeLivraison ? (
            <button type="button" className="btn-teal btn-sm" onClick={() => setBlAReimprimer(commande)}>
              <FiPrinter aria-hidden="true" /> Réimprimer le BL
            </button>
          ) : null}
        </span>
      ),
    },
  ]

  const aSynchroniser = compte.attente + compte.erreur

  return (
    <PageShell
      title="Synchronisation SAP"
      subtitle="File des opérations à rejouer vers SAP : création de commande, livraison, lecture du numéro de BL"
      actions={
        <>
          <button type="button" className="btn-ghost" onClick={() => void tester()} disabled={pingEnCours}>
            <FiWifi aria-hidden="true" /> {pingEnCours ? 'Test en cours…' : 'Tester la connexion SAP'}
          </button>
          <span title={!sapOnline ? 'SAP est hors ligne : impossible de synchroniser' : undefined}>
            <button
              type="button"
              className="btn-primary"
              disabled={!sapOnline || toutEnCours || aSynchroniser === 0}
              onClick={() => void toutSynchroniser()}
            >
              <FiRefreshCw aria-hidden="true" />
              {toutEnCours ? 'Synchronisation en cours…' : `Tout synchroniser (${aSynchroniser})`}
            </button>
          </span>
        </>
      }
    >
      <DemoNotice sujet="synchronisation SAP (file des opérations, reprise)" />
      <div className="admin-card">
        <div className="admin-card__head">
          <h2>État de la connexion SAP</h2>
          <span className="text-muted" style={{ fontSize: 13 }}>
            Dernier test : {pingUtc ? formatDateTime(pingUtc) : '—'}
          </span>
        </div>
        {ping === null ? (
          <p className="text-muted">Test en cours…</p>
        ) : ping.enLigne ? (
          <Notice tone="success">
            <strong>SAP joignable</strong> — SAP ECC (PRD), latence {ping.latenceMs} ms. Les opérations en
            attente peuvent être synchronisées.
          </Notice>
        ) : (
          <Notice tone="danger">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FiWifiOff aria-hidden="true" /> <strong>SAP injoignable</strong>
            </span>{' '}
            — timeout 10 s. Les commandes et BL locaux restent en file ; la synchronisation sera
            possible dès le retour de SAP (basculez l'interrupteur de la barre de démonstration).
          </Notice>
        )}
      </div>

      <div className="kpi-row">
        <KpiCard
          title="En attente"
          value={compte.attente}
          icon={<FiClock />}
          tone={compte.attente > 0 ? 'warning' : 'default'}
        />
        <KpiCard title="En cours" value={compte.enCours} icon={<FiRefreshCw />} tone="info" />
        <KpiCard
          title="En erreur"
          value={compte.erreur}
          icon={<FiAlertTriangle />}
          tone={compte.erreur > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          title="Synchronisées"
          value={compte.ok}
          icon={<FiCheckCircle />}
          tone="success"
          hint="Depuis l'ouverture"
        />
      </div>

      {localesNonLivrees > 0 ? (
        <Notice tone="info">
          {localesNonLivrees} commande{localesNonLivrees > 1 ? 's' : ''} locale
          {localesNonLivrees > 1 ? 's' : ''} en cours d'expédition : elle{localesNonLivrees > 1 ? 's' : ''}{' '}
          rejoindr{localesNonLivrees > 1 ? 'ont' : 'a'} la file après l'émission du Bon de livraison.
        </Notice>
      ) : null}

      <div className="admin-card admin-card--flush">
        <DataTable
          caption="File des opérations de synchronisation SAP"
          columns={colonnes}
          rows={lignes}
          rowKey={(l) => l.op.id}
          empty={
            <EmptyState
              icon={<FiCheckCircle />}
              title="Aucune opération en file"
              description="Les commandes locales livrées et les BL émis hors ligne apparaissent ici pour être rejoués vers SAP."
            />
          }
        />
      </div>

      <Modal
        open={blAReimprimer !== null}
        onClose={() => setBlAReimprimer(null)}
        title="Réimpression du Bon de livraison (numéro SAP définitif)"
        wide
      >
        {blAReimprimer ? <DocumentPreview type="BL" commande={blAReimprimer} /> : null}
      </Modal>
    </PageShell>
  )
}
