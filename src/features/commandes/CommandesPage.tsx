import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { FiClock, FiHome, FiInbox, FiPlus, FiRefreshCw, FiSearch, FiTruck, FiCheckCircle, FiX } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { Button } from '@/components/Button'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Notice } from '@/components/Notice'
import { InfoValue } from '@/components/InfoValue'
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

function libelleResultat(affiches: number, total: number) {
  const nom = (n: number) => (n > 1 ? 'commandes' : 'commande')
  if (affiches === total) return `${affiches} ${nom(affiches)}`
  return `${affiches} ${nom(affiches)} sur ${total}`
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
  const { data: commandes = [], isError, error, isPending, isFetching } = useCommandes()
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
      width: '7.5rem',
      render: (c) => <span className="code-chip">{numeroAffiche(c)}</span>,
      sortValue: (c) => numeroAffiche(c),
    },
    { key: 'origine', header: 'Origine', width: '6.5rem', render: (c) => <OrigineBadge origine={c.origine} />, sortValue: (c) => c.origine },
    {
      key: 'client',
      header: 'Client',
      width: '18%',
      render: (c) => <InfoValue>{r.client(c.clientId)?.nom ?? '—'}</InfoValue>,
      sortValue: (c) => r.client(c.clientId)?.nom ?? '',
    },
    {
      key: 'chantier',
      header: 'Chantier',
      width: '16%',
      render: (c) => {
        const ch = r.chantier(c.chantierId)
        return ch ? <InfoValue meta={ch.ville}>{ch.nom}</InfoValue> : '—'
      },
      sortValue: (c) => r.chantier(c.chantierId)?.nom ?? '',
    },
    {
      key: 'produit',
      header: 'Produit',
      width: '14%',
      render: (c) => <InfoValue>{r.produit(c.produitId)?.libelle ?? '—'}</InfoValue>,
      sortValue: (c) => r.produit(c.produitId)?.libelle ?? '',
    },
    {
      key: 'quantite',
      header: 'Quantité',
      align: 'right',
      width: '7rem',
      render: (c) => (
        <InfoValue meta={INCOTERM_LABELS[c.incoterm]}>
          <span className="num">{formatTonnes(c.quantiteT)}</span>
        </InfoValue>
      ),
      sortValue: (c) => c.quantiteT,
    },
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
    { key: 'statut', header: 'Statut', width: '9rem', render: (c) => <StatutBadge statut={c.statut} />, sortValue: (c) => STATUT_LABELS[c.statut] },
    {
      key: 'synchro',
      header: 'Synchro',
      width: '8.5rem',
      render: (c) => <SynchroBadge synchro={c.synchro} sapNatif={c.origine === 'Sap'} />,
      sortValue: (c) => c.synchro,
    },
  ]

  const basculerGroupe = (g: Exclude<Groupe, 'tous'>) => setGroupe((prev) => (prev === g ? 'tous' : g))
  const filtresActifs = Boolean(recherche.trim() || statut || origine || groupe !== 'tous')
  const reinitialiserFiltres = () => {
    setRecherche('')
    setStatut('')
    setOrigine('')
    setGroupe('tous')
  }

  const boutonNouvelle = sapOnline ? (
    <span title="SAP est en ligne : créez la commande dans SAP, elle arrivera automatiquement ici.">
      <Button disabled aria-describedby="aide-nouvelle">
        <FiPlus aria-hidden="true" /> Nouvelle commande
      </Button>
    </span>
  ) : (
    <Link to="/commandes/nouvelle" className="btn-primary" aria-describedby="aide-nouvelle">
      <FiPlus aria-hidden="true" /> Nouvelle commande
    </Link>
  )

  return (
    <PageShell
      layout="operations"
      title="Commandes du jour"
      subtitle={
        <span id="aide-nouvelle">
          {sapOnline
            ? 'Création locale réservée aux coupures SAP.'
            : 'SAP indisponible : les commandes locales seront synchronisées au retour.'}
        </span>
      }
      actions={boutonNouvelle}
    >
      {isError && commandes.length > 0 ? <Notice tone="danger">{messageErreur(error)}</Notice> : null}
      <div className="kpi-row commandes-kpis">
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
              className={clsx('filter-input filter-input--search', recherche && 'has-clear')}
              placeholder="N°, client, chantier, produit, camion, chauffeur…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && recherche) {
                  e.preventDefault()
                  setRecherche('')
                }
              }}
            />
            {recherche ? (
              <button type="button" className="filter-search__clear" aria-label="Effacer la recherche" onClick={() => setRecherche('')}>
                <FiX aria-hidden="true" />
              </button>
            ) : null}
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
        <div className="filter-meta">
          <Button variant="outline" size="sm" disabled={!filtresActifs} onClick={reinitialiserFiltres}>
            Réinitialiser les filtres
          </Button>
          <p className="filter-count" aria-live="polite">
            {libelleResultat(lignes.length, commandes.length)}
          </p>
        </div>
      </div>

      <div className="admin-card admin-card--flush">
        <DataTable
          className="is-operational"
          caption="Commandes du jour"
          columns={colonnes}
          rows={lignes}
          rowKey={(c) => c.id}
          rowLabel={(c) => `Ouvrir la commande ${numeroAffiche(c)}`}
          onRowClick={(c) => setSelection(c.id)}
          selectedKey={selection}
          loading={isPending && commandes.length === 0}
          refreshing={isFetching && commandes.length > 0}
          error={isError && commandes.length === 0 ? messageErreur(error) : undefined}
          empty={
            commandes.length === 0 ? (
              <EmptyState
                icon={<FiInbox />}
                title="Aucune commande du jour"
                description={
                  sapOnline
                    ? 'Les commandes SAP du jour apparaîtront ici dès leur réception.'
                    : 'SAP est indisponible. Vous pouvez créer une commande locale en attendant le retour de SAP.'
                }
                action={
                  !sapOnline ? (
                    <Link to="/commandes/nouvelle" className="btn-primary btn-sm">
                      <FiPlus aria-hidden="true" /> Nouvelle commande
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <EmptyState
                icon={<FiSearch />}
                title="Aucune commande ne correspond"
                description="Modifiez la recherche ou les filtres. Les commandes du jour restent disponibles."
                action={
                  <Button variant="outline" size="sm" onClick={reinitialiserFiltres}>
                    Réinitialiser les filtres
                  </Button>
                }
              />
            )
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
