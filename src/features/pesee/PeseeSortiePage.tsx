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
import { services } from '@/services'
import { useAppStore, useReferentielLookup, numeroAffiche } from '@/store/useAppStore'
import { ABSENT, formatKg, formatNombre, formatPourcentage, formatTonnes } from '@/utils/format'

const KG_PAR_TONNE = 1000
const ECART_OK = 0.02
const ECART_WARN = 0.05
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
  const pousserToast = useAppStore((s) => s.pousserToast)
  const r = useReferentielLookup()

  const tareKg = commande?.peseeEntree?.poidsKg ?? 0
  const commandeKg = (commande?.quantiteT ?? 0) * KG_PAR_TONNE
  const [cible, setCible] = useState<number>(Math.round(tareKg + commandeKg * (1 + ECART_SIMULE_PAR_DEFAUT)))
  const [blEmis, setBlEmis] = useState(false)

  useEffect(() => () => services.pesee.arreterSimulation(), [])

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

  const client = r.client(commande.clientId)
  const chantier = r.chantier(commande.chantierId)
  const produit = r.produit(commande.produitId)
  const camion = r.camion(commande.camionId)
  const chauffeur = r.chauffeur(commande.chauffeurId)

  const brutKg = poids.lectureKg
  const netKg = Math.max(0, brutKg - tareKg)
  const ratio = commandeKg > 0 ? (netKg - commandeKg) / commandeKg : 0
  const tone = toneEcart(ratio)

  const valider = () => {
    try {
      services.pesee.validerBrut(commande.id)
      setBlEmis(true)
    } catch (e) {
      pousserToast('error', e instanceof Error ? e.message : 'Validation impossible')
    }
  }

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
          <dd>{chantier ? `${chantier.nom}, ${chantier.ville}` : ABSENT}</dd>
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
    return (
      <PageShell
        title="Bon de livraison"
        subtitle={
          commande.bonDeLivraison.numeroSap
            ? `BL SAP ${commande.bonDeLivraison.numeroSap} — commande livrée`
            : 'BL provisoire — commande livrée, synchronisation SAP en attente'
        }
      >
        {entete}
        {!commande.bonDeLivraison.numeroSap ? (
          <Notice tone="warning">
            Le numéro SAP sera attribué lors de la synchronisation ; vous pourrez alors réimprimer le BL définitif depuis
            la page « Synchronisation SAP ».
          </Notice>
        ) : null}
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
                  onClick={() => services.commandes.autoriserSecondPesage(commande.id)}
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

          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn-primary btn-lg btn-block" disabled={!poids.stable} onClick={valider}>
              <FiCheck aria-hidden="true" /> Valider et imprimer le Bon de livraison
            </button>
            {!poids.stable ? (
              <p className="text-muted" style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                Le bouton s'active dès que le poids brut est stable.
              </p>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                Tare {formatKg(tareKg)} + commandé {formatKg(commandeKg)} — modifiez la valeur pour montrer un écart orange
                ou rouge.
              </span>
            </div>
            <div className="btn-row">
              <button type="button" className="btn-action" onClick={() => services.pesee.simulerCamion(cible)}>
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
          <Notice tone={sapOnline ? 'info' : 'warning'}>
            {sapOnline && commande.origine === 'Sap'
              ? 'SAP en ligne : le BL recevra immédiatement son numéro SAP (0080…).'
              : 'Le BL sera émis avec un numéro provisoire (ID commande) et mis en file de synchronisation SAP.'}
          </Notice>
        </div>
      </div>
    </PageShell>
  )
}
