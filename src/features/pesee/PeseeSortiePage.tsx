import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { FiArrowRight, FiCheck, FiSliders, FiTruck, FiXCircle } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { WeightDisplay } from '@/components/WeightDisplay'
import { DocumentPreview } from '@/components/DocumentPreview'
import { EmptyState } from '@/components/EmptyState'
import { Notice } from '@/components/Notice'
import { StatutBadge } from '@/components/StatusBadge'
import { estModeApi } from '@/config'
import { services } from '@/services'
import { useAppStore, useReferentielLookup, numeroAffiche } from '@/store/useAppStore'
import { ABSENT, formatKg, formatNombre, formatPourcentage, formatTonnes } from '@/utils/format'
import { PontDeconnecte, usePesee } from './usePesee'

const KG_PAR_TONNE = 1000
const ECART_OK = 0.02
const ECART_WARN = 0.05
/** Au-delà, l'API refuse la pesée (409 « Écart de pesée hors tolérance », `Pesee:EcartMaxPourcent`). */
const ECART_BLOQUANT = 0.1
const ECART_SIMULE_PAR_DEFAUT = 0.006

type Tone = 'ok' | 'warn' | 'bad'

function toneEcart(ratio: number): Tone {
  const abs = Math.abs(ratio)
  if (abs <= ECART_OK) return 'ok'
  if (abs <= ECART_WARN) return 'warn'
  return 'bad'
}

const LIBELLE_TONE: Record<Tone, string> = {
  ok: 'Conforme (±2 %)',
  warn: 'À surveiller (±5 %)',
  bad: 'Hors tolérance (> 5 %)',
}

export function PeseeSortiePage() {
  const { id } = useParams()
  const commandeId = Number(id)
  const commande = useAppStore((s) => s.commandes.find((c) => c.id === commandeId))
  const poids = useAppStore((s) => s.poids)
  const sapOnline = useAppStore((s) => s.sapOnline)
  const autoriserSecondPesage = useAppStore((s) => s.autoriserSecondPesage)
  const r = useReferentielLookup()

  const tareKg = commande?.peseeEntree?.poidsKg ?? 0
  const commandeKg = (commande?.quantiteT ?? 0) * KG_PAR_TONNE
  const [cible, setCible] = useState<number>(Math.round(tareKg + commandeKg * (1 + ECART_SIMULE_PAR_DEFAUT)))
  const [blEmis, setBlEmis] = useState(false)
  const { exploitable, envoi, valider } = usePesee(commandeId, 'brut')

  useEffect(() => {
    if (commande?.pontBascule && commande.pontBascule !== poids.pont)
      services.pesee.selectionnerPont(commande.pontBascule)
    // Le pont est choisi à l'autorisation ; on ne resynchronise qu'au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!commande) {
    return (
      <PageShell title="Pesée de sortie">
        <div className="admin-card">
          <EmptyState
            icon={<FiXCircle />}
            title="Commande introuvable"
            action={
              <Link to="/usine" className="btn-ghost">
                Retour à « Dans l'usine »
              </Link>
            }
          />
        </div>
      </PageShell>
    )
  }

  const client = r.client(commande)
  const chantier = r.chantier(commande)
  const produit = r.produit(commande)
  const camion = r.camion(commande)
  const chauffeur = r.chauffeur(commande)

  const brutKg = poids.lectureKg
  const netKg = Math.max(0, brutKg - tareKg)
  const ratio = commandeKg > 0 ? (netKg - commandeKg) / commandeKg : 0
  const tone = toneEcart(ratio)
  const ecartBloquant = brutKg > 0 && Math.abs(ratio) > ECART_BLOQUANT

  const entete = (
    <div className="admin-card">
      <div className="admin-card__head">
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          Commande <span className="code-chip">{numeroAffiche(commande)}</span>
        </h2>
        <StatutBadge statut={commande.statut} />
      </div>
      <dl className="detail-list cols-4">
        <div>
          <dt>Client</dt>
          <dd>{client?.nom ?? ABSENT}</dd>
        </div>
        <div>
          <dt>Chantier</dt>
          <dd>{chantier ? `${chantier.nom}${chantier.ville ? `, ${chantier.ville}` : ''}` : ABSENT}</dd>
        </div>
        <div>
          <dt>Produit</dt>
          <dd>
            {produit?.libelle ?? ABSENT} · {formatTonnes(commande.quantiteT)}
            {commande.nombreSacs ? ` (${formatNombre(commande.nombreSacs)} sacs)` : ''}
          </dd>
        </div>
        <div>
          <dt>Camion / chauffeur</dt>
          <dd>
            <span className="mono">{camion?.immatriculation ?? ABSENT}</span> · {chauffeur?.nom ?? ABSENT}
          </dd>
        </div>
      </dl>
    </div>
  )

  if (blEmis && commande.bonDeLivraison) {
    const bl = commande.bonDeLivraison
    return (
      <PageShell
        title="Bon de livraison"
        subtitle={`BL N° ${bl.numeroSap ?? bl.numeroLocal} — commande livrée`}
      >
        {entete}
        <div className="admin-card">
          <DocumentPreview type="BL" commande={commande} />
        </div>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          {commande.synchro === 'EnAttente' ? (
            <Link to="/synchronisation" className="btn-primary btn-lg">
              Terminer — voir la synchronisation SAP <FiArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/commandes" className="btn-primary btn-lg">
              Terminer — retour aux commandes <FiArrowRight aria-hidden="true" />
            </Link>
          )}
          <Link to="/usine" className="btn-ghost btn-lg">
            Retour à « Dans l'usine »
          </Link>
        </div>
      </PageShell>
    )
  }

  if (commande.statut !== 'SortieAutorisee' || !commande.peseeEntree) {
    return (
      <PageShell title="Pesée de sortie" subtitle="Second pesage : poids brut du camion chargé">
        {entete}
        <div className="admin-card">
          <EmptyState
            icon={<FiTruck />}
            title={
              commande.statut === 'DansUsine'
                ? "Le 2ᵉ pesage n'est pas encore autorisé"
                : 'Cette commande n’est pas en attente de pesée de sortie'
            }
            description={
              commande.statut === 'DansUsine'
                ? 'Le guichet doit autoriser le second pesage depuis la page « Dans l’usine ».'
                : 'Consultez le détail de la commande pour les actions disponibles.'
            }
            action={
              commande.statut === 'DansUsine' ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void autoriserSecondPesage(commande.id)}
                >
                  <FiCheck aria-hidden="true" /> Autoriser le 2ᵉ pesage (guichet)
                </button>
              ) : (
                <Link to="/commandes" className="btn-ghost">
                  Retour aux commandes
                </Link>
              )
            }
          />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Pesée de sortie" subtitle="Second pesage : poids brut du camion chargé">
      {entete}
      <PontDeconnecte poids={poids} />
      <div className="pesee-layout">
        <div className="admin-card">
          <WeightDisplay
            label="Poids brut en direct"
            pont={poids.pont}
            onPontChange={(p) => services.pesee.selectionnerPont(p)}
            lectureKg={poids.lectureKg}
            stable={poids.stable}
            derniereLectureUtc={poids.derniereLectureUtc}
            connecte={poids.connecte}
            etat={poids.etat}
          />

          <div className="net-panel" style={{ marginTop: 16 }} aria-live="polite">
            <div className="net-box">
              <div className="net-box__label">Tare (1ᵉʳ pesage · {commande.peseeEntree.pont})</div>
              <div className="net-box__value">{formatKg(tareKg)}</div>
            </div>
            <div className="net-box">
              <div className="net-box__label">Net = brut − tare</div>
              <div className="net-box__value">{formatKg(netKg)}</div>
            </div>
            <div className={clsx('net-box', brutKg > 0 && `tone-${tone}`)}>
              <div className="net-box__label">Écart vs commandé ({formatKg(commandeKg)})</div>
              <div className="net-box__value">{brutKg > 0 ? formatPourcentage(ratio) : '—'}</div>
              {brutKg > 0 ? <div className="form-help">{LIBELLE_TONE[tone]}</div> : null}
            </div>
          </div>

          {ecartBloquant ? (
            <Notice tone="danger">
              Écart supérieur à 10 % : l'API refusera cette pesée. Vérifiez le chargement avant de valider.
            </Notice>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn-primary btn-lg btn-block"
              disabled={!exploitable || envoi}
              onClick={() => void valider().then((ok) => ok && setBlEmis(true))}
            >
              <FiCheck aria-hidden="true" />{' '}
              {envoi ? 'Enregistrement…' : 'Valider et imprimer le Bon de livraison'}
            </button>
            {!exploitable ? (
              <p className="text-muted" style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                Le bouton s'active dès que le poids brut est stable et récent.
              </p>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!estModeApi ? (
            <div className="demo-panel">
              <span className="demo-panel__title">
                <FiSliders aria-hidden="true" /> Démonstration — remplace la lecture Databridge
              </span>
              <div className="form-field">
                <label className="form-label" htmlFor="cible-brut">
                  Poids brut simulé (kg)
                </label>
                <input
                  id="cible-brut"
                  className="form-input mono"
                  type="number"
                  min={2000}
                  step={10}
                  value={cible}
                  onChange={(e) => setCible(Number(e.target.value))}
                />
                <span className="form-help">
                  Tare {formatKg(tareKg)} + commandé {formatKg(commandeKg)} — modifiez la valeur pour montrer
                  un écart orange ou rouge.
                </span>
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => services.pesee.simulerCamion(cible)}
                >
                  <FiTruck aria-hidden="true" /> Simuler un camion
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => services.pesee.arreterSimulation()}
                  disabled={!poids.enCours}
                >
                  Retirer le camion
                </button>
              </div>
            </div>
          ) : null}
          <Notice tone="info">
            {sapOnline && commande.origine === 'Sap'
              ? 'SAP en ligne : le BL recevra immédiatement son numéro SAP (0080…).'
              : 'Le BL est émis sous le numéro de la commande ; le numéro SAP est renseigné à la synchronisation.'}
          </Notice>
        </div>
      </div>
    </PageShell>
  )
}
