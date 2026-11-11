import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiCheck, FiSliders, FiTruck, FiXCircle } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { Button } from '@/components/Button'
import { WeightDisplay } from '@/components/WeightDisplay'
import { DocumentPreview } from '@/components/DocumentPreview'
import { EmptyState } from '@/components/EmptyState'
import { SuiteEtape } from '@/components/SuiteEtape'
import { CommandePeseeResume } from '@/features/pesee/CommandePeseeResume'
import { useCommande } from '@/features/commandes/hooks/useCommandes'
import { useAutoriserPesee, useValiderTare } from '@/features/commandes/hooks/useCommandeMutations'
import { useReferentielLookup } from '@/features/referentiels/hooks/useReferentiels'
import { services } from '@/services'
import { useAppStore } from '@/store/useAppStore'
import type { Commande } from '@/types'
import { formatKg, formatNombre } from '@/utils/format'
import { peutAutoriserPesee } from '@/utils/parcours'
import { motifValidation } from '@/utils/peseeUi'

const TARE_PAR_DEFAUT_KG = 16000

export function PeseeEntreePage() {
  const { id } = useParams()
  const commandeId = Number(id)
  const navigate = useNavigate()
  const { data: commandeChargee, isPending } = useCommande(Number.isFinite(commandeId) ? commandeId : null)
  const [confirmee, setConfirmee] = useState<Commande | null>(null)
  const commande = confirmee ?? commandeChargee ?? null
  const autoriser = useAutoriserPesee()
  const peutAutoriser = peutAutoriserPesee(useAppStore((s) => s.role))
  const r = useReferentielLookup()
  const camion = commande ? r.camion(commande.camionId) : undefined

  useEffect(() => () => services.pesee.arreterSimulation(), [])
  useEffect(() => {
    if (!confirmee || !commandeChargee) return
    if (
      confirmee.statut !== commandeChargee.statut ||
      confirmee.bonDeChargement?.numero !== commandeChargee.bonDeChargement?.numero
    ) {
      setConfirmee(null)
    }
  }, [commandeChargee, confirmee])

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

  const entete = <CommandePeseeResume commande={commande} />

  if (confirmee?.bonDeChargement && confirmee.peseeEntree) {
    return (
      <PageShell title="Bon de chargement" subtitle="Tare enregistrée — le camion est dans l'usine">
        {entete}
        <SuiteEtape commande={confirmee} masquerLien />
        <p className="text-muted">
          Tare enregistrée : {formatKg(confirmee.peseeEntree.poidsKg)} sur {confirmee.peseeEntree.pont}. Bon de
          chargement {confirmee.bonDeChargement.numero}. L’impression reste une action séparée.
        </p>
        <div className="admin-card">
          <DocumentPreview type="BC" commande={confirmee} />
        </div>
        <div className="btn-row">
          <Link to="/usine" className="btn-primary">
            Voir les camions dans l'usine
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
        <SuiteEtape commande={commande} masquerLien />
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
              commande.statut === 'Creee' && peutAutoriser ? (
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
      <ConsoleEntree
        commande={commande}
        tareReference={camion?.tareReferenceKg}
        immatriculation={camion?.immatriculation}
        onConfirmee={setConfirmee}
      />
    </PageShell>
  )
}

function ConsoleEntree({
  commande,
  tareReference,
  immatriculation,
  onConfirmee,
}: {
  commande: Commande
  tareReference?: number
  immatriculation?: string
  onConfirmee: (commande: Commande) => void
}) {
  const poids = useAppStore((s) => s.poids)
  const validerTare = useValiderTare()
  const [cible, setCible] = useState<number>(tareReference ?? TARE_PAR_DEFAUT_KG)
  const envoi = useRef(false)
  const motif = motifValidation(
    poids,
    `La tare ${formatKg(poids.lectureKg)} sur ${poids.pont} sera enregistrée. L’impression du bon se fait ensuite, à part.`,
  )

  const valider = () => {
    if (envoi.current || validerTare.isPending || !poids.stable) return
    envoi.current = true
    validerTare.mutate(commande.id, {
      onSuccess: (suivante) => onConfirmee(suivante),
      onSettled: () => {
        envoi.current = false
      },
    })
  }

  return (
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
          lecturesIdentiques={poids.lecturesIdentiques}
        />
        <div className="pesee-action">
          <Button
            size="lg"
            loading={validerTare.isPending}
            disabled={!poids.stable}
            aria-describedby="motif-tare"
            onClick={valider}
          >
            <FiCheck aria-hidden="true" /> Enregistrer la tare
          </Button>
          <p id="motif-tare" className="text-muted pesee-action__hint">
            {motif}
          </p>
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
              Référence camion {immatriculation} : {tareReference ? formatNombre(tareReference) : '—'} kg
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
  )
}
