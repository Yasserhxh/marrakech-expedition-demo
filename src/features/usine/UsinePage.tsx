import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { FiAlertTriangle, FiClock, FiHome, FiLogOut } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { Button } from '@/components/Button'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { InfoValue } from '@/components/InfoValue'
import { StatutBadge } from '@/components/StatusBadge'
import { useAutoriserSecondPesage } from '@/features/commandes/hooks/useCommandeMutations'
import { useReferentielLookup } from '@/features/referentiels/hooks/useReferentiels'
import { useCamionsDansUsine } from '@/features/usine/hooks/useCamionsDansUsine'
import type { Commande } from '@/types'
import { numeroAffiche } from '@/utils/commande'
import { messageErreur } from '@/utils/erreurs'
import { formatDuree, formatHeure, formatKg, formatTonnes, minutesEcoulees } from '@/utils/format'
import { useNow } from '@/utils/useNow'

const SEUIL_ALERTE_MIN = 90

export function UsinePage() {
  const now = useNow(30000)
  const r = useReferentielLookup()
  const { data: commandes = [], isPending, isFetching, isError, error } = useCamionsDansUsine()
  const autoriser = useAutoriserSecondPesage()

  const enRetard = commandes.filter((c) => c.entreeUtc && minutesEcoulees(c.entreeUtc, now) > SEUIL_ALERTE_MIN).length

  const colonnes: Column<Commande>[] = [
    { key: 'numero', header: 'N°', width: '7.5rem', render: (c) => <span className="code-chip">{numeroAffiche(c)}</span>, sortValue: numeroAffiche },
    {
      key: 'camion',
      header: 'Camion',
      width: '9.5rem',
      render: (c) => (
        <InfoValue mono meta={r.chauffeur(c.chauffeurId)?.nom}>
          {r.camion(c.camionId)?.immatriculation ?? '—'}
        </InfoValue>
      ),
      sortValue: (c) => r.camion(c.camionId)?.immatriculation ?? '',
    },
    {
      key: 'client',
      header: 'Client',
      width: '24%',
      render: (c) => (
        <InfoValue meta={r.chantier(c.chantierId)?.nom}>
          {r.client(c.clientId)?.nom ?? '—'}
        </InfoValue>
      ),
      sortValue: (c) => r.client(c.clientId)?.nom ?? '',
    },
    {
      key: 'produit',
      header: 'Produit',
      width: '18%',
      render: (c) => (
        <InfoValue meta={formatTonnes(c.quantiteT)}>
          {r.produit(c.produitId)?.libelle ?? '—'}
        </InfoValue>
      ),
    },
    {
      key: 'entree',
      header: 'Entrée',
      width: '6.5rem',
      render: (c) => <span className="num">{formatHeure(c.entreeUtc)}</span>,
      sortValue: (c) => c.entreeUtc ?? '',
    },
    {
      key: 'duree',
      header: 'Durée',
      width: '8rem',
      render: (c) => {
        if (!c.entreeUtc) return '—'
        const min = minutesEcoulees(c.entreeUtc, now)
        const tard = min > SEUIL_ALERTE_MIN
        return (
          <span className={clsx('time-elapsed', tard && 'is-late')} title={tard ? 'Présence supérieure à 90 min' : undefined}>
            <span className="time-elapsed__value">
              {tard ? <FiAlertTriangle aria-hidden="true" /> : <FiClock aria-hidden="true" />}
              {formatDuree(min)}
            </span>
            {tard ? <span className="info-value__meta">Plus de 90 min</span> : null}
          </span>
        )
      },
      sortValue: (c) => (c.entreeUtc ? minutesEcoulees(c.entreeUtc, now) : 0),
    },
    {
      key: 'tare',
      header: 'Tare',
      align: 'right',
      width: '7rem',
      render: (c) => <span className="num">{formatKg(c.peseeEntree?.poidsKg)}</span>,
      sortValue: (c) => c.peseeEntree?.poidsKg ?? 0,
    },
    { key: 'statut', header: 'Statut', width: '9rem', render: (c) => <StatutBadge statut={c.statut} /> },
    {
      key: 'actions',
      header: 'Action',
      width: '9.5rem',
      render: (c) =>
        c.statut === 'DansUsine' ? (
          <Button
            variant="secondary"
            size="sm"
            loading={autoriser.isPending && autoriser.variables === c.id}
            aria-label="Autoriser le 2ᵉ pesage"
            onClick={() => autoriser.mutate(c.id)}
          >
            2ᵉ pesage
          </Button>
        ) : (
          <Link to={`/pesee/sortie/${c.id}`} className="btn-ghost btn-sm">
            Pesée de sortie
          </Link>
        ),
    },
  ]

  return (
    <PageShell title="Dans l'usine" subtitle="Camions entre la tare et le second pesage">
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
          className="is-operational"
          caption="Camions dans l'usine"
          columns={colonnes}
          rows={commandes}
          rowKey={(c) => c.id}
          defaultSort={{ key: 'entree', direction: 'asc' }}
          loading={isPending && commandes.length === 0}
          refreshing={isFetching && commandes.length > 0}
          error={isError ? messageErreur(error) : undefined}
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
