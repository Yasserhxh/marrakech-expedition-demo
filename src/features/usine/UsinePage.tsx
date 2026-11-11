import { useMemo } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { FiAlertTriangle, FiClock, FiHome, FiLogOut } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { OrigineBadge, StatutBadge } from '@/components/StatusBadge'
import { useAppStore, useReferentielLookup, numeroAffiche } from '@/store/useAppStore'
import type { Commande } from '@/types'
import { formatDuree, formatHeure, formatKg, formatTonnes, minutesEcoulees } from '@/utils/format'
import { useNow } from '@/utils/useNow'

const SEUIL_ALERTE_MIN = 90

export function UsinePage() {
  const now = useNow(30000)
  const r = useReferentielLookup()
  const toutes = useAppStore((s) => s.commandes)
  const autoriserSecondPesage = useAppStore((s) => s.autoriserSecondPesage)
  const commandes = useMemo(
    () => toutes.filter((c) => c.statut === 'DansUsine' || c.statut === 'SortieAutorisee'),
    [toutes],
  )

  const enRetard = commandes.filter(
    (c) => c.entreeUtc && minutesEcoulees(c.entreeUtc, now) > SEUIL_ALERTE_MIN,
  ).length

  const colonnes: Column<Commande>[] = [
    {
      key: 'numero',
      header: 'N°',
      render: (c) => <span className="code-chip">{numeroAffiche(c)}</span>,
      sortValue: numeroAffiche,
    },
    { key: 'origine', header: 'Origine', render: (c) => <OrigineBadge origine={c.origine} /> },
    {
      key: 'client',
      header: 'Client',
      render: (c) => (
        <span className="cell-main">
          {r.client(c)?.nom ?? '—'}
          <span className="cell-sub">{r.chantier(c)?.nom}</span>
        </span>
      ),
      sortValue: (c) => r.client(c)?.nom ?? '',
    },
    {
      key: 'produit',
      header: 'Produit',
      render: (c) => `${r.produit(c)?.libelle ?? '—'} · ${formatTonnes(c.quantiteT)}`,
    },
    {
      key: 'camion',
      header: 'Camion',
      render: (c) => <span className="mono">{r.camion(c)?.immatriculation ?? '—'}</span>,
      sortValue: (c) => r.camion(c)?.immatriculation ?? '',
    },
    {
      key: 'entree',
      header: "Heure d'entrée",
      render: (c) => formatHeure(c.entreeUtc),
      sortValue: (c) => c.entreeUtc ?? '',
    },
    {
      key: 'tare',
      header: 'Tare',
      align: 'right',
      render: (c) => <span className="mono">{formatKg(c.peseeEntree?.poidsKg)}</span>,
      sortValue: (c) => c.peseeEntree?.poidsKg ?? 0,
    },
    {
      key: 'duree',
      header: 'Temps passé',
      render: (c) => {
        if (!c.entreeUtc) return '—'
        const min = minutesEcoulees(c.entreeUtc, now)
        const tard = min > SEUIL_ALERTE_MIN
        return (
          <span
            className={clsx('time-elapsed', tard && 'is-late')}
            title={tard ? 'Présence supérieure à 90 min' : undefined}
          >
            {tard ? <FiAlertTriangle aria-hidden="true" /> : <FiClock aria-hidden="true" />}
            {formatDuree(min)}
            {tard ? <span className="badge badge--danger">&gt; 90 min</span> : null}
          </span>
        )
      },
      sortValue: (c) => (c.entreeUtc ? minutesEcoulees(c.entreeUtc, now) : 0),
    },
    { key: 'statut', header: 'Statut', render: (c) => <StatutBadge statut={c.statut} /> },
    {
      key: 'actions',
      header: 'Action',
      render: (c) =>
        c.statut === 'DansUsine' ? (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => void autoriserSecondPesage(c.id)}
          >
            <FiLogOut aria-hidden="true" /> Autoriser le 2ᵉ pesage
          </button>
        ) : (
          <Link to={`/pesee/sortie/${c.id}`} className="btn-action btn-sm">
            <FiLogOut aria-hidden="true" /> Ouvrir la pesée de sortie
          </Link>
        ),
    },
  ]

  return (
    <PageShell
      title="Dans l'usine"
      subtitle="Camions ayant passé la pesée d'entrée, en chargement ou en attente du second pesage"
    >
      <div className="kpi-row">
        <KpiCard title="Camions dans l'usine" value={commandes.length} icon={<FiHome />} />
        <KpiCard
          title="En attente du 2ᵉ pesage"
          value={commandes.filter((c) => c.statut === 'SortieAutorisee').length}
          icon={<FiLogOut />}
          tone="info"
        />
        <KpiCard
          title="Présence > 90 min"
          value={enRetard}
          icon={<FiAlertTriangle />}
          tone={enRetard > 0 ? 'danger' : 'default'}
          hint="Alerte de séjour prolongé"
        />
        <KpiCard title="Seuil d'alerte" value="90 min" icon={<FiClock />} hint="Paramètre usine" />
      </div>

      <div className="admin-card admin-card--flush">
        <DataTable
          caption="Camions dans l'usine"
          columns={colonnes}
          rows={commandes}
          rowKey={(c) => c.id}
          defaultSort={{ key: 'entree', direction: 'asc' }}
          empty={
            <EmptyState
              icon={<FiHome />}
              title="Aucun camion dans l'usine"
              description="Les camions apparaissent ici après la validation de la tare au premier pesage."
              action={
                <Link to="/commandes" className="btn-ghost btn-sm">
                  Voir les commandes à peser
                </Link>
              }
            />
          }
        />
      </div>
    </PageShell>
  )
}
