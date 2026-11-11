import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiCheck, FiPlus } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { Button } from '@/components/Button'
import { Combobox } from '@/components/Combobox'
import { Notice } from '@/components/Notice'
import { ConditionnementBadge } from '@/components/StatusBadge'
import { useCreerCommandeLocale } from '@/features/commandes/hooks/useCommandeMutations'
import { REFERENTIELS_VIDES, useReferentiels } from '@/features/referentiels/hooks/useReferentiels'
import { useAppStore } from '@/store/useAppStore'
import type { Incoterm } from '@/types'
import { INCOTERM_LABELS } from '@/types'
import { messageErreur } from '@/utils/erreurs'
import { formatNombre, formatTonnes } from '@/utils/format'

const KG_PAR_TONNE = 1000
const QUANTITE_MAX_T = 40
const QUANTITE_PAR_DEFAUT_T = 27

interface Formulaire {
  clientId: string
  chantierId: string
  produitId: string
  quantiteT: string
  incoterm: Incoterm
  transporteurId: string
  camionId: string
  chauffeurId: string
}

const VIDE: Formulaire = {
  clientId: '',
  chantierId: '',
  produitId: '',
  quantiteT: String(QUANTITE_PAR_DEFAUT_T),
  incoterm: 'Rendu',
  transporteurId: '',
  camionId: '',
  chauffeurId: '',
}

export function NouvelleCommandePage() {
  const sapOnline = useAppStore((s) => s.sapOnline)
  const { data } = useReferentiels()
  const ref = data ?? REFERENTIELS_VIDES
  const creerCommande = useCreerCommandeLocale()
  const navigate = useNavigate()
  const [f, setF] = useState<Formulaire>(VIDE)
  const [soumis, setSoumis] = useState(false)

  const maj = (patch: Partial<Formulaire>) => setF((prev) => ({ ...prev, ...patch }))

  const chantiers = useMemo(() => ref.chantiers.filter((c) => c.clientId === f.clientId), [ref.chantiers, f.clientId])
  const camions = useMemo(() => ref.camions.filter((c) => c.transporteurId === f.transporteurId), [ref.camions, f.transporteurId])
  const chauffeurs = useMemo(
    () => ref.chauffeurs.filter((c) => c.transporteurId === f.transporteurId),
    [ref.chauffeurs, f.transporteurId],
  )
  const produit = ref.produits.find((p) => p.id === f.produitId)
  const quantite = Number(f.quantiteT.replace(',', '.'))
  const sacs = produit?.conditionnement === 'SAC' && produit.poidsSacKg && quantite > 0
    ? Math.round((quantite * KG_PAR_TONNE) / produit.poidsSacKg)
    : undefined

  const erreurs: Partial<Record<keyof Formulaire, string>> = {}
  if (!f.clientId) erreurs.clientId = 'Sélectionnez un client'
  if (!f.chantierId) erreurs.chantierId = 'Sélectionnez un chantier du client'
  if (!f.produitId) erreurs.produitId = 'Sélectionnez un produit'
  if (!Number.isFinite(quantite) || quantite <= 0) erreurs.quantiteT = 'Quantité strictement positive'
  else if (quantite > QUANTITE_MAX_T) erreurs.quantiteT = `Maximum ${QUANTITE_MAX_T} t par camion`
  if (!f.transporteurId) erreurs.transporteurId = 'Sélectionnez un transporteur'
  if (!f.camionId) erreurs.camionId = 'Sélectionnez un camion du transporteur'
  if (!f.chauffeurId) erreurs.chauffeurId = 'Sélectionnez un chauffeur'
  const valide = Object.keys(erreurs).length === 0
  const err = (k: keyof Formulaire) => (soumis ? erreurs[k] : undefined)

  const creer = () => {
    setSoumis(true)
    if (!valide) {
      const premier = (
        [
          ['clientId', 'champ-client'],
          ['chantierId', 'champ-chantier'],
          ['produitId', 'champ-produit'],
          ['quantiteT', 'quantite'],
          ['transporteurId', 'champ-transporteur'],
          ['camionId', 'champ-camion'],
          ['chauffeurId', 'champ-chauffeur'],
        ] as const
      ).find(([cle]) => erreurs[cle])
      if (premier) document.getElementById(premier[1])?.focus()
      return
    }
    creerCommande.mutate(
      {
        clientId: f.clientId,
        chantierId: f.chantierId,
        produitId: f.produitId,
        quantiteT: quantite,
        incoterm: f.incoterm,
        transporteurId: f.transporteurId,
        camionId: f.camionId,
        chauffeurId: f.chauffeurId,
      },
      { onSuccess: () => navigate('/commandes') },
    )
  }

  const nom = (liste: { id: string; nom?: string; libelle?: string; immatriculation?: string }[], id: string) => {
    const x = liste.find((e) => e.id === id)
    return x?.nom ?? x?.libelle ?? x?.immatriculation ?? '—'
  }

  return (
    <PageShell
      title="Nouvelle commande locale"
      subtitle="Création au guichet pendant une indisponibilité SAP — la commande sera synchronisée automatiquement"
    >
      {sapOnline ? (
        <Notice tone="warning">
          SAP est en ligne : les commandes doivent être créées dans SAP. Ce formulaire n'est utilisable qu'en mode dégradé
          (basculez SAP « Hors ligne » dans la barre de démonstration).
        </Notice>
      ) : null}
      {creerCommande.isError ? <Notice tone="danger">{messageErreur(creerCommande.error)}</Notice> : null}

      <div className="form-layout">
        <form
          className="admin-card"
          onSubmit={(e) => {
            e.preventDefault()
            creer()
          }}
          noValidate
        >
          <h3 className="form-section-title">
            <span className="form-step">1</span> Client et chantier
          </h3>
          <div className="form-grid">
            <Combobox
              id="champ-client"
              label="Client"
              required
              options={ref.clients.map((c) => ({ value: c.id, label: c.nom, sub: c.code }))}
              value={f.clientId}
              onChange={(v) => maj({ clientId: v, chantierId: '' })}
              placeholder="Rechercher un client (nom ou code SAP)…"
              error={err('clientId')}
            />
            <Combobox
              id="champ-chantier"
              label="Chantier"
              required
              options={chantiers.map((c) => ({ value: c.id, label: c.nom, sub: c.ville }))}
              value={f.chantierId}
              onChange={(v) => maj({ chantierId: v })}
              placeholder={f.clientId ? 'Chantier du client…' : 'Choisissez d’abord un client'}
              disabled={!f.clientId}
              error={err('chantierId')}
              help={f.clientId ? `${chantiers.length} chantier(s) rattaché(s) à ce client` : undefined}
            />
          </div>

          <h3 className="form-section-title" style={{ marginTop: 24 }}>
            <span className="form-step">2</span> Produit et quantité
          </h3>
          <div className="form-grid">
            <Combobox
              id="champ-produit"
              label="Produit"
              required
              options={ref.produits.map((p) => ({
                value: p.id,
                label: `${p.libelle} (${p.conditionnement})`,
                sub: p.codeSap,
              }))}
              value={f.produitId}
              onChange={(v) => maj({ produitId: v })}
              placeholder="Vrac ou sac…"
              error={err('produitId')}
            />
            <div className="form-field">
              <label className="form-label" htmlFor="quantite">
                Quantité (t) *
              </label>
              <input
                id="quantite"
                className="form-input mono"
                inputMode="decimal"
                value={f.quantiteT}
                onChange={(e) => maj({ quantiteT: e.target.value })}
                aria-invalid={err('quantiteT') ? true : undefined}
                aria-required="true"
                aria-describedby={err('quantiteT') ? 'quantite-erreur' : undefined}
              />
              {err('quantiteT') ? (
                <span className="form-error" id="quantite-erreur" role="alert">
                  <FiAlertCircle aria-hidden="true" /> {err('quantiteT')}
                </span>
              ) : (
                <span className="form-help">
                  {sacs ? `${formatNombre(sacs)} sacs de ${produit?.poidsSacKg} kg calculés automatiquement` : `Maximum ${QUANTITE_MAX_T} t`}
                </span>
              )}
            </div>
            <fieldset className="form-field span-2" style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="form-label">Incoterm *</legend>
              <div className="btn-row">
                {(['Depart', 'Rendu'] as Incoterm[]).map((i) => (
                  <label key={i} className="choice">
                    <input
                      type="radio"
                      name="incoterm"
                      value={i}
                      checked={f.incoterm === i}
                      onChange={() => maj({ incoterm: i })}
                    />
                    {INCOTERM_LABELS[i]}
                    <span className="text-muted" style={{ fontWeight: 400 }}>
                      {i === 'Depart' ? '— enlèvement par le client' : '— livraison par CIMAR'}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <h3 className="form-section-title" style={{ marginTop: 24 }}>
            <span className="form-step">3</span> Transport
          </h3>
          <div className="form-grid">
            <Combobox
              id="champ-transporteur"
              label="Transporteur"
              required
              options={ref.transporteurs.map((t) => ({ value: t.id, label: t.nom, sub: t.code }))}
              value={f.transporteurId}
              onChange={(v) => maj({ transporteurId: v, camionId: '', chauffeurId: '' })}
              placeholder="Rechercher un transporteur…"
              error={err('transporteurId')}
            />
            <Combobox
              id="champ-camion"
              label="Camion (immatriculation)"
              required
              options={camions.map((c) => ({ value: c.id, label: c.immatriculation }))}
              value={f.camionId}
              onChange={(v) => maj({ camionId: v })}
              placeholder={f.transporteurId ? '12345-A-6…' : 'Choisissez d’abord un transporteur'}
              disabled={!f.transporteurId}
              error={err('camionId')}
            />
            <Combobox
              id="champ-chauffeur"
              label="Chauffeur (nom + CIN)"
              required
              options={chauffeurs.map((c) => ({ value: c.id, label: c.nom, sub: `CIN ${c.cin}` }))}
              value={f.chauffeurId}
              onChange={(v) => maj({ chauffeurId: v })}
              placeholder={f.transporteurId ? 'Nom ou CIN…' : 'Choisissez d’abord un transporteur'}
              disabled={!f.transporteurId}
              error={err('chauffeurId')}
            />
          </div>

          <div className="btn-row" style={{ marginTop: 28, justifyContent: 'flex-end' }}>
            <Link to="/commandes" className="btn-ghost">
              Annuler
            </Link>
            <Button type="submit" size="lg" loading={creerCommande.isPending} disabled={sapOnline}>
              <FiPlus aria-hidden="true" /> Créer la commande
            </Button>
          </div>
        </form>

        <aside className="admin-card form-recap" aria-label="Récapitulatif">
          <h2 style={{ marginBottom: 12 }}>Récapitulatif</h2>
          <dl className="detail-list" style={{ gridTemplateColumns: '1fr' }}>
            <div>
              <dt>Origine</dt>
              <dd>
                <span className="badge badge--pending">Locale</span> · statut « Créée » · synchro « En attente »
              </dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>{nom(ref.clients, f.clientId)}</dd>
            </div>
            <div>
              <dt>Chantier</dt>
              <dd>{nom(ref.chantiers, f.chantierId)}</dd>
            </div>
            <div>
              <dt>Produit</dt>
              <dd>
                {produit ? (
                  <>
                    {produit.libelle} <ConditionnementBadge conditionnement={produit.conditionnement} />
                    <span className="cell-sub mono">{produit.codeSap}</span>
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Quantité</dt>
              <dd>
                {Number.isFinite(quantite) && quantite > 0 ? formatTonnes(quantite) : '—'}
                {sacs ? <span className="cell-sub">{formatNombre(sacs)} sacs</span> : null}
              </dd>
            </div>
            <div>
              <dt>Incoterm</dt>
              <dd>{INCOTERM_LABELS[f.incoterm]}</dd>
            </div>
            <div>
              <dt>Transporteur</dt>
              <dd>{nom(ref.transporteurs, f.transporteurId)}</dd>
            </div>
            <div>
              <dt>Camion</dt>
              <dd className="mono">{nom(ref.camions, f.camionId)}</dd>
            </div>
            <div>
              <dt>Chauffeur</dt>
              <dd>{nom(ref.chauffeurs, f.chauffeurId)}</dd>
            </div>
          </dl>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 14, display: 'inline-flex', gap: 6 }}>
            <FiCheck aria-hidden="true" /> {valide ? 'Formulaire complet, prêt à créer.' : 'Complétez les champs obligatoires (*).'}
          </p>
        </aside>
      </div>
    </PageShell>
  )
}
