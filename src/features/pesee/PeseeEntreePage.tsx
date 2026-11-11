import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { ABSENT, formatNombre, formatTonnes } from '@/utils/format'
import { PontDeconnecte, usePesee } from './usePesee'

const TARE_PAR_DEFAUT_KG = 16000

export function PeseeEntreePage() {
  const { id } = useParams()
  const commandeId = Number(id)
  const navigate = useNavigate()
  const commande = useAppStore((s) => s.commandes.find((c) => c.id === commandeId))
  const poids = useAppStore((s) => s.poids)
  const autoriserPesee = useAppStore((s) => s.autoriserPesee)
  const r = useReferentielLookup()
  const camion = commande ? r.camion(commande) : undefined
  const [cible, setCible] = useState<number>(camion?.tareReferenceKg ?? TARE_PAR_DEFAUT_KG)
  const [bcEmis, setBcEmis] = useState(false)
  const { exploitable, envoi, valider } = usePesee(commandeId, 'tare')

  useEffect(() => {
    if (commande?.pontBascule && commande.pontBascule !== poids.pont)
      services.pesee.selectionnerPont(commande.pontBascule)
    // Le pont est choisi à l'autorisation ; on ne resynchronise qu'au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const client = r.client(commande)
  const chantier = r.chantier(commande)
  const produit = r.produit(commande)
  const chauffeur = r.chauffeur(commande)

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

  if (bcEmis && commande.bonDeChargement) {
    return (
      <PageShell title="Bon de chargement" subtitle="Tare enregistrée — le camion peut entrer dans l'usine">
        {entete}
        <div className="admin-card">
          <DocumentPreview type="BC" commande={commande} />
        </div>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <Link to="/usine" className="btn-primary btn-lg">
            Terminer — voir « Dans l'usine » <FiArrowRight aria-hidden="true" />
          </Link>
          <Link to="/commandes" className="btn-ghost btn-lg">
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
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void autoriserPesee(commande.id)}
                >
                  <FiCheck aria-hidden="true" /> Autoriser la pesée (guichet)
                </button>
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
      <PontDeconnecte poids={poids} />
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
            etat={poids.etat}
          />
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn-primary btn-lg btn-block"
              disabled={!exploitable || envoi}
              onClick={() => void valider().then((ok) => ok && setBcEmis(true))}
            >
              <FiCheck aria-hidden="true" />{' '}
              {envoi ? 'Enregistrement…' : 'Valider la tare et imprimer le Bon de chargement'}
            </button>
            {!exploitable ? (
              <p className="text-muted" style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                Le bouton s'active dès que le pont renvoie une lecture stable et récente (≥ 2 000 kg).
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
                  Référence camion {camion?.immatriculation} :{' '}
                  {camion?.tareReferenceKg ? formatNombre(camion.tareReferenceKg) : '—'} kg
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
            Le poids provient du fichier <span className="mono">C:\Scales\{poids.pont}.txt</span> écrit par
            Databridge (5 lectures/s), relayé par l'agent du pont. La règle de stabilité est identique à
            Temara ; l'API vérifie le poids contre sa propre lecture avant d'enregistrer.
          </Notice>
        </div>
      </div>
    </PageShell>
  )
}
