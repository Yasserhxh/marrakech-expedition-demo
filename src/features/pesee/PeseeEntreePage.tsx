import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowRight, FiCheck, FiSliders, FiTruck, FiXCircle } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { Button } from '@/components/Button'
import { WeightDisplay } from '@/components/WeightDisplay'
import { DocumentPreview } from '@/components/DocumentPreview'
import { EmptyState } from '@/components/EmptyState'
import { CommandePeseeResume } from '@/features/pesee/CommandePeseeResume'
import { useCommande } from '@/features/commandes/hooks/useCommandes'
import { useAutoriserPesee, useValiderTare } from '@/features/commandes/hooks/useCommandeMutations'
import { useReferentielLookup } from '@/features/referentiels/hooks/useReferentiels'
import { services } from '@/services'
import { useAppStore } from '@/store/useAppStore'
import type { Commande } from '@/types'
import { formatNombre } from '@/utils/format'

const TARE_PAR_DEFAUT_KG = 16000

export function PeseeEntreePage() {
  const { id } = useParams()
  const commandeId = Number(id)
  const navigate = useNavigate()
  const { data: commandeChargee, isPending } = useCommande(Number.isFinite(commandeId) ? commandeId : null)
  const [confirmee, setConfirmee] = useState<Commande | null>(null)
  const commande = confirmee ?? commandeChargee ?? null
  const poids = useAppStore((s) => s.poids)
  const validerTare = useValiderTare()
  const autoriser = useAutoriserPesee()
  const r = useReferentielLookup()
  const camion = commande ? r.camion(commande.camionId) : undefined
  const [cible, setCible] = useState<number>(camion?.tareReferenceKg ?? TARE_PAR_DEFAUT_KG)

  useEffect(() => () => services.pesee.arreterSimulation(), [])

  if (isPending && !commande) {
    return (
      <PageShell title="Pesée d'entrée">
        <p className="text-muted">Chargement…</p>
      </PageShell>
    )
  }

  if (!commande) {
    return (
      <PageShell title="Pesée d'entrée">
        <div className="admin-card">
          <EmptyState
            icon={<FiXCircle />}
            title="Commande introuvable"
            action={
              <Link to="/commandes" className="btn-ghost">
                Retour aux commandes
              </Link>
            }
          />
        </div>
      </PageShell>
    )
  }

  const valider = () => {
    validerTare.mutate(commande.id, { onSuccess: (suivante) => setConfirmee(suivante) })
  }

  const entete = <CommandePeseeResume commande={commande} />

  if (confirmee?.bonDeChargement) {
    return (
      <PageShell title="Bon de chargement" subtitle="Tare enregistrée — le camion peut entrer dans l'usine">
        {entete}
        <div className="admin-card">
          <DocumentPreview type="BC" commande={confirmee} />
        </div>
        <div className="btn-row">
          <Link to="/usine" className="btn-primary">
            Terminer — voir « Dans l'usine » <FiArrowRight aria-hidden="true" />
          </Link>
          <Link to="/commandes" className="btn-ghost">
            Retour aux commandes
          </Link>
        </div>
      </PageShell>
    )
  }

  if (commande.statut !== 'EntreeAutorisee') {
    return (
      <PageShell title="Pesée d'entrée" subtitle="Premier pesage : tare du camion vide">
        {entete}
        <div className="admin-card">
          <EmptyState
            icon={<FiTruck />}
            title={
              commande.statut === 'Creee'
                ? "La pesée d'entrée n'est pas encore autorisée"
                : 'Cette commande a déjà passé la pesée d’entrée'
            }
            description={
              commande.statut === 'Creee'
                ? 'Le guichet doit autoriser la pesée avant que le pont-bascule puisse enregistrer la tare.'
                : 'Consultez le détail de la commande pour les actions disponibles.'
            }
            action={
              commande.statut === 'Creee' ? (
                <Button loading={autoriser.isPending} onClick={() => autoriser.mutate(commande.id)}>
                  <FiCheck aria-hidden="true" /> Autoriser la pesée (guichet)
                </Button>
              ) : (
                <button type="button" className="btn-ghost" onClick={() => navigate('/commandes')}>
                  Retour aux commandes
                </button>
              )
            }
          />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Pesée d'entrée" subtitle="Premier pesage : tare du camion vide">
      {entete}
      <div className="pesee-layout">
        <div className="admin-card">
          <WeightDisplay
            label="Tare en direct"
            pont={poids.pont}
            onPontChange={(p) => services.pesee.selectionnerPont(p)}
            lectureKg={poids.lectureKg}
            stable={poids.stable}
            derniereLectureUtc={poids.derniereLectureUtc}
            connecte={poids.connecte}
            enCours={poids.enCours}
          />
          <div className="pesee-action">
            <Button size="lg" loading={validerTare.isPending} disabled={!poids.stable} onClick={valider}>
              <FiCheck aria-hidden="true" /> Valider la tare et imprimer le Bon de chargement
            </Button>
            {!poids.stable ? (
              <p className="text-muted pesee-action__hint">
                {!poids.connecte
                  ? 'Pont déconnecté : la validation est bloquée.'
                  : !poids.enCours
                    ? 'Aucun camion sur le pont. La validation reste bloquée.'
                    : 'Le bouton s’active dès que le pont renvoie 15 lectures identiques (≥ 2 000 kg).'}
              </p>
            ) : (
              <p className="text-muted pesee-action__hint">Pesée stable : la tare peut être enregistrée.</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="demo-panel">
            <span className="demo-panel__title">
              <FiSliders aria-hidden="true" /> Démonstration — remplace la lecture Databridge
            </span>
            <div className="form-field">
              <label className="form-label" htmlFor="cible-tare">
                Tare simulée (kg)
              </label>
              <input
                id="cible-tare"
                className="form-input mono"
                type="number"
                min={2000}
                step={10}
                value={cible}
                onChange={(e) => setCible(Number(e.target.value))}
              />
              <span className="form-help">
                Référence camion {camion?.immatriculation} : {camion?.tareReferenceKg ? formatNombre(camion.tareReferenceKg) : '—'} kg
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
          <details className="tech-note">
            <summary>Lecture Databridge</summary>
            <p>
              En production, le poids provient du fichier <span className="mono">C:\Scales\{poids.pont}.txt</span> écrit par
              Databridge (5 lectures/s). La règle de stabilité est identique à Temara. Les commandes de cette colonne
              simulent cette lecture et ne pilotent pas un pont réel.
            </p>
          </details>
        </div>
      </div>
    </PageShell>
  )
}
