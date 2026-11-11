import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { FiCheck, FiSliders, FiTruck, FiXCircle } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { Button } from '@/components/Button'
import { WeightDisplay } from '@/components/WeightDisplay'
import { DocumentPreview } from '@/components/DocumentPreview'
import { EmptyState } from '@/components/EmptyState'
import { Notice } from '@/components/Notice'
import { SuiteEtape } from '@/components/SuiteEtape'
import { SynchroBadge } from '@/components/StatusBadge'
import { CommandePeseeResume } from '@/features/pesee/CommandePeseeResume'
import { useCommande } from '@/features/commandes/hooks/useCommandes'
import { useAutoriserSecondPesage, useValiderBrut } from '@/features/commandes/hooks/useCommandeMutations'
import { services } from '@/services'
import { useAppStore } from '@/store/useAppStore'
import type { Commande } from '@/types'
import { formatKg, formatPourcentage } from '@/utils/format'
import { etapeCourante, lienPourRole, peutAutoriserPesee } from '@/utils/parcours'
import { motifValidation } from '@/utils/peseeUi'

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
  const { data: commandeChargee, isPending } = useCommande(Number.isFinite(commandeId) ? commandeId : null)
  const [confirmee, setConfirmee] = useState<Commande | null>(null)
  const commande = confirmee ?? commandeChargee ?? null
  const poids = useAppStore((s) => s.poids)
  const sapOnline = useAppStore((s) => s.sapOnline)
  const role = useAppStore((s) => s.role)
  const validerBrut = useValiderBrut()
  const autoriser = useAutoriserSecondPesage()
  const peutAutoriser = peutAutoriserPesee(role)
  const envoi = useRef(false)

  const tareKg = commande?.peseeEntree?.poidsKg ?? 0
  const commandeKg = (commande?.quantiteT ?? 0) * KG_PAR_TONNE
  const [cibleSaisie, setCibleSaisie] = useState<number | null>(null)
  const cible = cibleSaisie ?? Math.round(tareKg + commandeKg * (1 + ECART_SIMULE_PAR_DEFAUT))

  useEffect(() => () => services.pesee.arreterSimulation(), [])
  useEffect(() => {
    if (!confirmee || !commandeChargee) return
    if (
      confirmee.statut !== commandeChargee.statut ||
      confirmee.bonDeLivraison?.numeroProvisoire !== commandeChargee.bonDeLivraison?.numeroProvisoire
    ) {
      setConfirmee(null)
    }
  }, [commandeChargee, confirmee])

  if (isPending && !commande) {
    return (
      <PageShell title="Pesée de sortie">
        <p className="text-muted">Chargement…</p>
      </PageShell>
    )
  }

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

  const valider = () => {
    if (envoi.current || validerBrut.isPending || !poids.stable) return
    envoi.current = true
    validerBrut.mutate(commande.id, {
      onSuccess: (suivante) => setConfirmee(suivante),
      onSettled: () => {
        envoi.current = false
      },
    })
  }

  const entete = <CommandePeseeResume commande={commande} />
  const brutKg = poids.lectureKg
  const netKg = Math.max(0, brutKg - tareKg)
  const ratio = commandeKg > 0 ? (netKg - commandeKg) / commandeKg : 0
  const tone = toneEcart(ratio)

  if (confirmee?.bonDeLivraison && confirmee.peseeSortie) {
    const bon = confirmee.bonDeLivraison
    const suite = lienPourRole(etapeCourante(confirmee).lien, role)
    return (
      <PageShell
        title="Bon de livraison"
        subtitle={
          bon.numeroSap
            ? `BL SAP ${bon.numeroSap} — commande livrée`
            : 'BL provisoire — pesée terminée localement, synchronisation SAP en attente'
        }
      >
        {entete}
        <SuiteEtape commande={confirmee} masquerLien />
        <p className="text-muted">
          Brut enregistré {formatKg(confirmee.peseeSortie.poidsKg)} · Tare {formatKg(bon.tareKg)} · Net{' '}
          {formatKg(bon.netKg)}. <SynchroBadge synchro={confirmee.synchro} />
        </p>
        {!bon.numeroSap ? (
          <Notice tone="warning">
            SAP n’a pas reçu cette opération. Le bon porte un numéro provisoire. La synchronisation est une étape
            distincte, depuis la file SAP.
          </Notice>
        ) : null}
        <div className="admin-card">
          <DocumentPreview type="BL" commande={confirmee} />
        </div>
        <div className="btn-row">
          {suite ? (
            <Link to={suite.vers} className="btn-primary">
              {suite.libelle}
            </Link>
          ) : (
            <Link to="/commandes" className="btn-primary">
              Retour aux commandes
            </Link>
          )}
          <Link to="/usine" className="btn-ghost">
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
        <SuiteEtape commande={commande} masquerLien />
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
              commande.statut === 'DansUsine' && peutAutoriser ? (
                <Button loading={autoriser.isPending} onClick={() => autoriser.mutate(commande.id)}>
                  <FiCheck aria-hidden="true" /> Autoriser le 2ᵉ pesage (guichet)
                </Button>
              ) : (
                <Link to={commande.statut === 'DansUsine' ? '/usine' : '/commandes'} className="btn-ghost">
                  {commande.statut === 'DansUsine' ? "Retour à « Dans l'usine »" : 'Retour aux commandes'}
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
            enCours={poids.enCours}
            lecturesIdentiques={poids.lecturesIdentiques}
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

          <div className="pesee-action">
            <Button
              size="lg"
              loading={validerBrut.isPending}
              disabled={!poids.stable}
              aria-describedby="motif-brut"
              onClick={valider}
            >
              <FiCheck aria-hidden="true" />{' '}
              {poids.stable ? `Enregistrer ${formatKg(brutKg)} brut` : 'Enregistrer le poids brut'}
            </Button>
            <p id="motif-brut" className="text-muted pesee-action__hint">
              {motifValidation(
                poids,
                tone === 'bad'
                  ? `Écart hors tolérance (${formatPourcentage(ratio)}). L’enregistrement conserve ce poids brut et calcule le net.`
                  : `Le brut ${formatKg(brutKg)} et le net ${formatKg(netKg)} seront enregistrés. L’impression du bon se fait ensuite, à part.`,
              )}
            </p>
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
                onChange={(e) => setCibleSaisie(Number(e.target.value))}
              />
              <span className="form-help">
                Tare {formatKg(tareKg)} + commandé {formatKg(commandeKg)} — modifiez la valeur pour montrer un écart orange
                ou rouge.
              </span>
            </div>
            <div className="btn-row">
              <button type="button" className="btn-ghost" onClick={() => services.pesee.simulerCamion(cible)}>
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
