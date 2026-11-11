import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiClock, FiHome, FiInbox, FiPlus, FiRefreshCw, FiSearch, FiTruck, FiCheckCircle } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Notice } from '@/components/Notice'
import { OrigineBadge, StatutBadge, SynchroBadge } from '@/components/StatusBadge'
import { useCommandes } from '@/features/commandes/hooks/useCommandes'
import { useReferentielLookup } from '@/features/referentiels/hooks/useReferentiels'
import { CommandeDrawer } from './CommandeDrawer'
import { useAppStore } from '@/store/useAppStore'
import type { Commande, Origine, StatutCommande } from '@/types'
import { INCOTERM_LABELS, STATUT_LABELS } from '@/types'
import { numeroAffiche } from '@/utils/commande'
import { messageErreur } from '@/utils/erreurs'
import { formatTonnes } from '@/utils/format'

type Groupe = 'tous' | 'aPeser' | 'usine' | 'livrees' | 'synchro'

const GROUPES: Record<Exclude<Groupe, 'tous'>, (c: Commande) => boolean> = {
  aPeser: (c) => c.statut === 'Creee' || c.statut === 'EntreeAutorisee',
  usine: (c) => c.statut === 'DansUsine' || c.statut === 'SortieAutorisee',
  livrees: (c) => c.statut === 'Livree' || c.statut === 'Synchronisee' || c.statut === 'ErreurSynchro',
  synchro: (c) => c.synchro === 'EnAttente' || c.synchro === 'EnCours' || c.synchro === 'Erreur',
}

const STATUTS: StatutCommande[] = [
  'Creee',
  'EntreeAutorisee',
  'DansUsine',
  'SortieAutorisee',
  'Livree',
  'Synchronisee',
  'ErreurSynchro',
  'Annulee',
]

export function CommandesPage() {
  const { data: commandes = [], isError, error } = useCommandes()
  const sapOnline = useAppStore((s) => s.sapOnline)
  const r = useReferentielLookup()
  const [recherche, setRecherche] = useState('')
  const [statut, setStatut] = useState<StatutCommande | ''>('')
  const [origine, setOrigine] = useState<Origine | ''>('')
  const [groupe, setGroupe] = useState<Groupe>('tous')
  const [selection, setSelection] = useState<number | null>(null)

  const compte = useMemo(
    () => ({
      aPeser: commandes.filter(GROUPES.aPeser).length,
      usine: commandes.filter(GROUPES.usine).length,
      livrees: commandes.filter(GROUPES.livrees).length,
      synchro: commandes.filter(GROUPES.synchro).length,
    }),
    [commandes],
  )

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return commandes.filter((c) => {
      if (groupe !== 'tous' && !GROUPES[groupe](c)) return false
      if (statut && c.statut !== statut) return false
      if (origine && c.origine !== origine) return false
      if (!q) return true
      const texte = [
        numeroAffiche(c),
        r.client(c.clientId)?.nom,
        r.chantier(c.chantierId)?.nom,
        r.produit(c.produitId)?.libelle,
        r.camion(c.camionId)?.immatriculation,
        r.chauffeur(c.chauffeurId)?.nom,
      ]
        .join(' ')
        .toLowerCase()
      return texte.includes(q)
    })
  }, [commandes, groupe, statut, origine, recherche, r])

  const colonnes: Column<Commande>[] = [
    {
      key: 'numero',
      header: 'N°',
      render: (c) => <span className="code-chip">{numeroAffiche(c)}</span>,
      sortValue: (c) => numeroAffiche(c),
    },
    { key: 'origine', header: 'Origine', render: (c) => <OrigineBadge origine={c.origine} />, sortValue: (c) => c.origine },
    {
      key: 'client',
      header: 'Client',
      render: (c) => <span className="cell-main">{r.client(c.clientId)?.nom ?? '—'}</span>,
      sortValue: (c) => r.client(c.clientId)?.nom ?? '',
    },
    {
      key: 'chantier',
      header: 'Chantier',
      render: (c) => {
        const ch = r.chantier(c.chantierId)
        return ch ? (
          <span>
            {ch.nom}
            <span className="cell-sub">{ch.ville}</span>
          </span>
        ) : (
          '—'
        )
      },
      sortValue: (c) => r.chantier(c.chantierId)?.nom ?? '',
    },
    {
      key: 'produit',
      header: 'Produit',
      render: (c) => r.produit(c.produitId)?.libelle ?? '—',
      sortValue: (c) => r.produit(c.produitId)?.libelle ?? '',
    },
    {
      key: 'quantite',
      header: 'Quantité',
      align: 'right',
      render: (c) => (
        <span>
          <span className="mono">{formatTonnes(c.quantiteT)}</span>
          <span className="cell-sub">{INCOTERM_LABELS[c.incoterm]}</span>
        </span>
      ),
      sortValue: (c) => c.quantiteT,
    },
    {
      key: 'camion',
      header: 'Camion',
      render: (c) => (
        <span>
          <span className="mono">{r.camion(c.camionId)?.immatriculation ?? '—'}</span>
          <span className="cell-sub">{r.chauffeur(c.chauffeurId)?.nom ?? '—'}</span>
        </span>
      ),
      sortValue: (c) => r.camion(c.camionId)?.immatriculation ?? '',
    },
    { key: 'statut', header: 'Statut', render: (c) => <StatutBadge statut={c.statut} />, sortValue: (c) => STATUT_LABELS[c.statut] },
    {
      key: 'synchro',
      header: 'Synchro',
      render: (c) => <SynchroBadge synchro={c.synchro} sapNatif={c.origine === 'Sap'} />,
      sortValue: (c) => c.synchro,
    },
  ]

  const basculerGroupe = (g: Exclude<Groupe, 'tous'>) => setGroupe((prev) => (prev === g ? 'tous' : g))

  const boutonNouvelle = sapOnline ? (
    <span title="SAP est en ligne : créez la commande dans SAP, elle arrivera automatiquement ici.">
      <button type="button" className="btn-primary" disabled aria-describedby="aide-nouvelle">
        <FiPlus aria-hidden="true" /> Nouvelle commande (SAP indisponible)
      </button>
    </span>
  ) : (
    <Link to="/commandes/nouvelle" className="btn-primary">
      <FiPlus aria-hidden="true" /> Nouvelle commande (SAP indisponible)
    </Link>
  )

  return (
    <PageShell
      title="Commandes du jour"
      subtitle={
        <>
          Usine M102 Marrakech ·{' '}
          <span id="aide-nouvelle">
            {sapOnline
              ? 'Les commandes arrivent de SAP ; la création locale est réservée aux coupures SAP.'
              : 'SAP indisponible : créez des commandes locales, elles seront synchronisées au retour de SAP.'}
          </span>
        </>
      }
      actions={boutonNouvelle}
    >
      {isError ? <Notice tone="danger">{messageErreur(error)}</Notice> : null}
      <div className="kpi-row">
        <KpiCard
          title="À peser"
          value={compte.aPeser}
          hint="Créées ou entrée autorisée"
          icon={<FiTruck />}
          tone="info"
          onClick={() => basculerGroupe('aPeser')}
          selected={groupe === 'aPeser'}
        />
        <KpiCard
          title="Dans l'usine"
          value={compte.usine}
          hint="Camions entre les deux pesées"
          icon={<FiHome />}
          onClick={() => basculerGroupe('usine')}
          selected={groupe === 'usine'}
        />
        <KpiCard
          title="Livrées aujourd'hui"
          value={compte.livrees}
          hint="BL émis"
          icon={<FiCheckCircle />}
          tone="success"
          onClick={() => basculerGroupe('livrees')}
          selected={groupe === 'livrees'}
        />
        <KpiCard
          title="En attente de synchro"
          value={compte.synchro}
          hint="Commandes locales ou BL provisoires"
          icon={<FiRefreshCw />}
          tone={compte.synchro > 0 ? 'warning' : 'default'}
          onClick={() => basculerGroupe('synchro')}
          selected={groupe === 'synchro'}
        />
      </div>

      <div className="documents-filters" role="search">
        <div className="filter-field grow">
          <label className="filter-label" htmlFor="f-recherche">
            Rechercher
          </label>
          <div className="filter-search">
            <FiSearch aria-hidden="true" />
            <input
              id="f-recherche"
              className="filter-input filter-input--search"
              placeholder="N°, client, chantier, camion, chauffeur…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-field">
          <label className="filter-label" htmlFor="f-statut">
            Statut
          </label>
          <select
            id="f-statut"
            className="filter-input"
            value={statut}
            onChange={(e) => setStatut(e.target.value as StatutCommande | '')}
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label className="filter-label" htmlFor="f-origine">
            Origine
          </label>
          <select
            id="f-origine"
            className="filter-input"
            value={origine}
            onChange={(e) => setOrigine(e.target.value as Origine | '')}
          >
            <option value="">Toutes</option>
            <option value="Sap">SAP</option>
            <option value="Locale">Locale</option>
          </select>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setRecherche('')
            setStatut('')
            setOrigine('')
            setGroupe('tous')
          }}
        >
          Réinitialiser
        </button>
        <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
          {lignes.length} commande{lignes.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="admin-card admin-card--flush">
        <DataTable
          caption="Commandes du jour"
          columns={colonnes}
          rows={lignes}
          rowKey={(c) => c.id}
          rowLabel={(c) => `Ouvrir la commande ${numeroAffiche(c)}`}
          onRowClick={(c) => setSelection(c.id)}
          selectedKey={selection}
          empty={
            <EmptyState
              icon={<FiInbox />}
              title="Aucune commande ne correspond"
              description="Modifiez les filtres ou, si SAP est indisponible, créez une commande locale."
              action={
                !sapOnline ? (
                  <Link to="/commandes/nouvelle" className="btn-primary btn-sm">
                    <FiPlus aria-hidden="true" /> Nouvelle commande
                  </Link>
                ) : undefined
              }
            />
          }
        />
      </div>

      <p className="text-muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <FiClock aria-hidden="true" /> Cliquez sur une ligne pour ouvrir le détail et les actions (autoriser la pesée,
        réimprimer, annuler).
      </p>

      <CommandeDrawer commandeId={selection} onClose={() => setSelection(null)} />
    </PageShell>
  )
}
