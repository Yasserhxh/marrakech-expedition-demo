import { useState } from 'react'
import { FiDatabase, FiPlus, FiSearch } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { DataTable, type Column } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { ConditionnementBadge } from '@/components/StatusBadge'
import { estModeApi } from '@/config'
import { services } from '@/services'
import { useAppStore } from '@/store/useAppStore'
import type { ReferentielKind } from '@/types'

const ONGLETS: { kind: ReferentielKind; label: string }[] = [
  { kind: 'clients', label: 'Clients' },
  { kind: 'chantiers', label: 'Chantiers' },
  { kind: 'produits', label: 'Produits' },
  { kind: 'transporteurs', label: 'Transporteurs' },
  { kind: 'camions', label: 'Camions' },
  { kind: 'chauffeurs', label: 'Chauffeurs' },
]

interface Champ {
  key: string
  label: string
  type?: 'text' | 'select' | 'number'
  options?: { value: string; label: string }[]
  mono?: boolean
}

type Ligne = Record<string, unknown> & { id: string }

export function ReferentielsPage() {
  const ref = useAppStore((s) => s.referentiels)
  const role = useAppStore((s) => s.role)
  const signalerErreur = useAppStore((s) => s.signalerErreur)
  const chargerChantiers = useAppStore((s) => s.chargerChantiers)
  const pousserToast = useAppStore((s) => s.pousserToast)
  const [clientChantiers, setClientChantiers] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)
  const [onglet, setOnglet] = useState<ReferentielKind>('clients')
  const [recherche, setRecherche] = useState('')
  const [ajout, setAjout] = useState(false)
  const [valeurs, setValeurs] = useState<Record<string, string>>({})

  const clientsOpts = ref.clients.map((c) => ({ value: c.id, label: c.nom }))
  const transporteursOpts = ref.transporteurs.map((t) => ({ value: t.id, label: t.nom }))

  const CHAMPS: Record<ReferentielKind, Champ[]> = {
    clients: [
      { key: 'code', label: 'Code SAP', mono: true },
      { key: 'nom', label: 'Nom' },
      { key: 'ville', label: 'Ville' },
    ],
    chantiers: [
      { key: 'clientId', label: 'Client', type: 'select', options: clientsOpts },
      { key: 'code', label: 'Code SAP', mono: true },
      { key: 'nom', label: 'Nom' },
      { key: 'ville', label: 'Ville' },
    ],
    produits: [
      { key: 'codeSap', label: 'Code SAP (18 chiffres)', mono: true },
      { key: 'libelle', label: 'Libellé' },
      {
        key: 'conditionnement',
        label: 'Conditionnement',
        type: 'select',
        options: [
          { value: 'VRAC', label: 'VRAC' },
          { value: 'SAC', label: 'SAC' },
        ],
      },
      { key: 'poidsSacKg', label: 'Poids sac (kg)', type: 'number' },
    ],
    transporteurs: [
      { key: 'code', label: 'Code', mono: true },
      { key: 'nom', label: 'Nom' },
    ],
    camions: [
      { key: 'immatriculation', label: 'Immatriculation (12345-A-6)', mono: true },
      { key: 'transporteurId', label: 'Transporteur', type: 'select', options: transporteursOpts },
      { key: 'tareReferenceKg', label: 'Tare de référence (kg)', type: 'number' },
    ],
    chauffeurs: [
      { key: 'nom', label: 'Nom' },
      { key: 'cin', label: 'CIN', mono: true },
      { key: 'transporteurId', label: 'Transporteur', type: 'select', options: transporteursOpts },
    ],
  }

  const champs = CHAMPS[onglet]
  const libelleOption = (champ: Champ, v: unknown) =>
    champ.options?.find((o) => o.value === v)?.label ?? String(v ?? '—')

  const lignes = (ref[onglet] as unknown as Ligne[]).filter((l) => {
    const q = recherche.trim().toLowerCase()
    if (!q) return true
    return champs.some((c) => libelleOption(c, l[c.key]).toLowerCase().includes(q))
  })

  const colonnes: Column<Ligne>[] = champs.map((c) => ({
    key: c.key,
    header: c.label,
    render: (l) => {
      const v = l[c.key]
      if (c.key === 'conditionnement' && (v === 'VRAC' || v === 'SAC'))
        return <ConditionnementBadge conditionnement={v} />
      if (v === undefined || v === null || v === '') return <span className="text-muted">—</span>
      return <span className={c.mono ? 'code-chip' : undefined}>{libelleOption(c, v)}</span>
    },
    sortValue: (l) => libelleOption(c, l[c.key]),
  }))

  const ouvrirAjout = () => {
    setValeurs(Object.fromEntries(champs.map((c) => [c.key, c.options?.[0]?.value ?? ''])))
    setAjout(true)
  }

  const enregistrer = async () => {
    const element: Record<string, unknown> = {}
    for (const c of champs) {
      const v = valeurs[c.key] ?? ''
      if (c.type === 'number') {
        if (v !== '') element[c.key] = Number(v)
      } else {
        element[c.key] = v
      }
    }
    setEnregistrement(true)
    try {
      await services.referentiels.ajouter(onglet, element as never)
      if (estModeApi) pousserToast('success', 'Élément enregistré dans le référentiel')
      setAjout(false)
    } catch (e) {
      signalerErreur(e, 'Enregistrement impossible')
    } finally {
      setEnregistrement(false)
    }
  }

  const chargerChantiersClient = async (clientId: string) => {
    setClientChantiers(clientId)
    try {
      await chargerChantiers(clientId)
    } catch (e) {
      signalerErreur(e, 'Chantiers du client indisponibles')
    }
  }

  const ajoutAutorise = !estModeApi || role === 'Admin'

  const complet = champs.every((c) => c.type === 'number' || (valeurs[c.key] ?? '').trim() !== '')

  return (
    <PageShell
      title="Référentiels"
      subtitle="Données locales utilisées pendant une coupure SAP (clients, chantiers, produits, transport)"
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={ouvrirAjout}
          disabled={!ajoutAutorise}
          title={ajoutAutorise ? undefined : 'Écriture des référentiels réservée au rôle Admin'}
        >
          <FiPlus aria-hidden="true" /> Ajouter — {ONGLETS.find((o) => o.kind === onglet)?.label}
        </button>
      }
    >
      <div className="admin-card">
        <div className="tabs" role="tablist" aria-label="Référentiels">
          {ONGLETS.map((o) => (
            <button
              key={o.kind}
              type="button"
              role="tab"
              aria-selected={onglet === o.kind}
              className={onglet === o.kind ? 'tab is-active' : 'tab'}
              onClick={() => {
                setOnglet(o.kind)
                setRecherche('')
              }}
            >
              {o.label} <span className="tab__count">{ref[o.kind].length}</span>
            </button>
          ))}
        </div>
        <div className="documents-filters" style={{ marginTop: 16, boxShadow: 'none' }} role="search">
          {estModeApi && onglet === 'chantiers' ? (
            <div className="filter-field">
              <label className="filter-label" htmlFor="ref-client-chantiers">
                Client (chantiers chargés par client)
              </label>
              <select
                id="ref-client-chantiers"
                className="filter-input"
                value={clientChantiers}
                onChange={(e) => void chargerChantiersClient(e.target.value)}
              >
                <option value="">Choisir un client…</option>
                {ref.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="filter-field grow">
            <label className="filter-label" htmlFor="ref-recherche">
              Rechercher
            </label>
            <div className="filter-search">
              <FiSearch aria-hidden="true" />
              <input
                id="ref-recherche"
                className="filter-input filter-input--search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Nom, code, ville…"
              />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <DataTable
            caption={`Référentiel ${onglet}`}
            columns={colonnes}
            rows={lignes}
            rowKey={(l) => l.id}
            empty={<span className="text-muted">Aucun élément.</span>}
          />
        </div>
      </div>

      <Modal
        open={ajout}
        onClose={() => setAjout(false)}
        title={`Ajouter — ${ONGLETS.find((o) => o.kind === onglet)?.label}`}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setAjout(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void enregistrer()}
              disabled={!complet || enregistrement}
            >
              <FiDatabase aria-hidden="true" /> {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          {champs.map((c) => (
            <div key={c.key} className="form-field">
              <label className="form-label" htmlFor={`ref-${c.key}`}>
                {c.label}
              </label>
              {c.type === 'select' ? (
                <select
                  id={`ref-${c.key}`}
                  className="form-input"
                  value={valeurs[c.key] ?? ''}
                  onChange={(e) => setValeurs((v) => ({ ...v, [c.key]: e.target.value }))}
                >
                  {c.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`ref-${c.key}`}
                  className={c.mono ? 'form-input mono' : 'form-input'}
                  type={c.type === 'number' ? 'number' : 'text'}
                  value={valeurs[c.key] ?? ''}
                  onChange={(e) => setValeurs((v) => ({ ...v, [c.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      </Modal>
    </PageShell>
  )
}
