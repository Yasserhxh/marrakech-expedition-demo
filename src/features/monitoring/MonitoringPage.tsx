import { useState } from 'react'
import clsx from 'clsx'
import { FiActivity, FiAlertTriangle, FiExternalLink, FiRadio, FiSearch, FiZap } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type Column } from '@/components/DataTable'
import { useMonitoring } from '@/features/monitoring/hooks/useMonitoring'
import type { MonitoringErreur } from '@/types'
import { messageErreur } from '@/utils/erreurs'
import { formatHeure } from '@/utils/format'

export function MonitoringPage() {
  const { data: snapshot, isError, error } = useMonitoring()
  const [recherche, setRecherche] = useState('')

  if (!snapshot) {
    return (
      <PageShell title="Monitoring" subtitle="Santé de l'API Marrakech, dépendances et erreurs récentes (données simulées)">
        <p className="text-muted">{isError ? messageErreur(error) : 'Chargement…'}</p>
      </PageShell>
    )
  }

  const erreurs = snapshot.erreurs.filter((e) => {
    const q = recherche.trim().toLowerCase()
    return !q || `${e.correlationId} ${e.route} ${e.message}`.toLowerCase().includes(q)
  })

  const colonnes: Column<MonitoringErreur>[] = [
    { key: 'heure', header: 'Heure', render: (e) => formatHeure(e.horodatageUtc, true), sortValue: (e) => e.horodatageUtc },
    { key: 'statut', header: 'HTTP', render: (e) => <span className="badge badge--danger">{e.statut}</span>, sortValue: (e) => e.statut },
    { key: 'route', header: 'Route', render: (e) => <span className="mono">{e.route}</span> },
    { key: 'message', header: 'Message', render: (e) => <span style={{ whiteSpace: 'normal' }}>{e.message}</span> },
    {
      key: 'corr',
      header: 'ID de corrélation',
      render: (e) => (
        <a
          className="code-chip"
          href={`${snapshot.liens[0]?.url ?? '#'}?correlationId=${e.correlationId}`}
          target="_blank"
          rel="noreferrer"
          title="Ouvrir la trace"
        >
          {e.correlationId}
        </a>
      ),
    },
  ]

  return (
    <PageShell title="Monitoring" subtitle="Santé de l'API Marrakech, dépendances et erreurs récentes (données simulées)">
      <div className="health-grid">
        {snapshot.sante.map((s) => (
          <div key={s.nom} className="health-card">
            <span className={clsx('health-card__dot', s.etat === 'degrade' && 'is-degraded', s.etat === 'ko' && 'is-down')} aria-hidden="true" />
            <div>
              <div className="health-card__name">
                {s.nom} — {s.etat === 'ok' ? 'OK' : s.etat === 'degrade' ? 'Dégradé' : 'KO'}
              </div>
              <div className="health-card__detail">{s.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="kpi-row">
        <KpiCard
          title="Taux d'erreur (5 min)"
          value={`${snapshot.tauxErreur.toLocaleString('fr-FR')} %`}
          icon={<FiAlertTriangle />}
          tone={snapshot.tauxErreur > 1 ? 'danger' : 'success'}
        />
        <KpiCard title="Requêtes / min" value={snapshot.requetesParMinute} icon={<FiActivity />} />
        <KpiCard title="Durée moyenne DB" value={`${snapshot.dureeDbMs} ms`} icon={<FiZap />} />
        <KpiCard title="Connexions SignalR" value={snapshot.connexionsSignalR} icon={<FiRadio />} tone="info" hint="Kiosques + guichet" />
      </div>

      <div className="two-col">
        <div className="admin-card">
          <h2 style={{ marginBottom: 12 }}>Latence HTTP</h2>
          <div className="latency-grid">
            {(['p50', 'p95', 'p99'] as const).map((p) => (
              <div key={p} className="net-box">
                <div className="net-box__label">{p}</div>
                <div className="net-box__value">{snapshot.latenceMs[p]} ms</div>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-card">
          <h2 style={{ marginBottom: 12 }}>Traces et alertes</h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {snapshot.liens.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {l.libelle} <FiExternalLink aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card__head">
          <h2>Erreurs récentes</h2>
          <div className="filter-search" style={{ minWidth: 320 }}>
            <FiSearch aria-hidden="true" />
            <label className="visually-hidden" htmlFor="corr-recherche">
              Rechercher par ID de corrélation
            </label>
            <input
              id="corr-recherche"
              className="filter-input filter-input--search"
              placeholder="ID de corrélation, route, message…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
        </div>
        <DataTable caption="Erreurs récentes" columns={colonnes} rows={erreurs} rowKey={(e) => e.correlationId} defaultSort={{ key: 'heure', direction: 'desc' }} />
      </div>
    </PageShell>
  )
}
