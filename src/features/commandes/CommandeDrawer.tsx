import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiFileText, FiLogIn, FiLogOut, FiPrinter, FiXCircle } from 'react-icons/fi'
import { Drawer } from '@/components/Drawer'
import { Modal } from '@/components/Modal'
import { Notice } from '@/components/Notice'
import { DocumentPreview } from '@/components/DocumentPreview'
import { ConditionnementBadge, OrigineBadge, StatutBadge, SynchroBadge } from '@/components/StatusBadge'
import { estModeApi } from '@/config'
import { useAppStore, useReferentielLookup, numeroAffiche } from '@/store/useAppStore'
import { INCOTERM_LABELS } from '@/types'
import { ABSENT, formatDateTime, formatKg, formatNombre, formatTonnes } from '@/utils/format'

interface CommandeDrawerProps {
  commandeId: number | null
  onClose: () => void
}

export function CommandeDrawer({ commandeId, onClose }: CommandeDrawerProps) {
  const commande = useAppStore((s) => s.commandes.find((c) => c.id === commandeId))
  const autoriserPesee = useAppStore((s) => s.autoriserPesee)
  const autoriserSecondPesage = useAppStore((s) => s.autoriserSecondPesage)
  const annulerCommande = useAppStore((s) => s.annulerCommande)
  const chargerDetail = useAppStore((s) => s.chargerDetail)
  const r = useReferentielLookup()
  const navigate = useNavigate()
  const [apercu, setApercu] = useState<'BC' | 'BL' | null>(null)
  const [confirmerAnnulation, setConfirmerAnnulation] = useState(false)
  const [motif, setMotif] = useState('')
  const [actionEnCours, setActionEnCours] = useState(false)

  // Mode api : la liste ne porte pas les pesées/documents, on relit le détail à l'ouverture.
  useEffect(() => {
    if (estModeApi && commandeId !== null) void chargerDetail(commandeId)
  }, [commandeId, chargerDetail])

  if (!commande) return null

  const client = r.client(commande)
  const chantier = r.chantier(commande)
  const produit = r.produit(commande)
  const transporteur = r.transporteur(commande)
  const camion = r.camion(commande)
  const chauffeur = r.chauffeur(commande)

  const executer = async (action: () => Promise<boolean>) => {
    setActionEnCours(true)
    try {
      await action()
    } finally {
      setActionEnCours(false)
    }
  }

  // Contrat : annulation possible depuis « Créée » ou « Entrée autorisée » uniquement (après la tare → procédure manuelle).
  const annulable = commande.statut === 'Creee' || commande.statut === 'EntreeAutorisee'

  const actions = (
    <>
      {commande.statut === 'Creee' ? (
        <button
          type="button"
          className="btn-primary btn-block"
          disabled={actionEnCours}
          onClick={() => void executer(() => autoriserPesee(commande.id))}
        >
          <FiLogIn aria-hidden="true" /> Autoriser la pesée d'entrée
        </button>
      ) : null}
      {commande.statut === 'EntreeAutorisee' ? (
        <button
          type="button"
          className="btn-action btn-block"
          onClick={() => navigate(`/pesee/entree/${commande.id}`)}
        >
          <FiLogIn aria-hidden="true" /> Ouvrir la pesée d'entrée (tare)
        </button>
      ) : null}
      {commande.statut === 'DansUsine' ? (
        <button
          type="button"
          className="btn-primary btn-block"
          disabled={actionEnCours}
          onClick={() => void executer(() => autoriserSecondPesage(commande.id))}
        >
          <FiLogOut aria-hidden="true" /> Autoriser le 2ᵉ pesage
        </button>
      ) : null}
      {commande.statut === 'SortieAutorisee' ? (
        <button
          type="button"
          className="btn-action btn-block"
          onClick={() => navigate(`/pesee/sortie/${commande.id}`)}
        >
          <FiLogOut aria-hidden="true" /> Ouvrir la pesée de sortie (brut)
        </button>
      ) : null}
      {commande.bonDeLivraison ? (
        <button type="button" className="btn-teal btn-block" onClick={() => setApercu('BL')}>
          <FiPrinter aria-hidden="true" /> Réimprimer le Bon de livraison
        </button>
      ) : null}
      {commande.bonDeChargement ? (
        <button type="button" className="btn-ghost btn-block" onClick={() => setApercu('BC')}>
          <FiPrinter aria-hidden="true" /> Réimprimer le Bon de chargement
        </button>
      ) : null}
      {annulable ? (
        <button type="button" className="btn-danger btn-block" onClick={() => setConfirmerAnnulation(true)}>
          <FiXCircle aria-hidden="true" /> Annuler la commande
        </button>
      ) : null}
    </>
  )

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            Commande <span className="code-chip">{numeroAffiche(commande)}</span>
          </span>
        }
        subtitle={
          <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
            <OrigineBadge origine={commande.origine} />
            <StatutBadge statut={commande.statut} />
            <SynchroBadge synchro={commande.synchro} sapNatif={commande.origine === 'Sap'} />
          </span>
        }
        footer={actions}
      >
        {commande.statut === 'ErreurSynchro' ? (
          <Notice tone="danger">
            Synchronisation SAP en erreur. Consultez la page « Synchronisation SAP » pour relancer.
          </Notice>
        ) : null}
        {commande.origine === 'Locale' && commande.synchro === 'EnAttente' ? (
          <Notice tone="warning">
            Commande créée hors ligne : elle sera envoyée à SAP après l'émission du BL, dès que SAP sera
            joignable.
          </Notice>
        ) : null}

        <section>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Client et livraison</h3>
          <dl className="detail-list">
            <div>
              <dt>Client</dt>
              <dd>
                {client?.nom ?? ABSENT}
                <span className="cell-sub mono">{client?.code}</span>
              </dd>
            </div>
            <div>
              <dt>Chantier</dt>
              <dd>
                {chantier?.nom ?? ABSENT}
                <span className="cell-sub">{chantier?.ville}</span>
              </dd>
            </div>
            <div>
              <dt>Produit</dt>
              <dd>
                {produit?.libelle ?? ABSENT}{' '}
                {produit ? <ConditionnementBadge conditionnement={produit.conditionnement} /> : null}
                <span className="cell-sub mono">{produit?.codeSap}</span>
              </dd>
            </div>
            <div>
              <dt>Quantité</dt>
              <dd>
                {formatTonnes(commande.quantiteT)}
                {commande.nombreSacs ? (
                  <span className="cell-sub">{formatNombre(commande.nombreSacs)} sacs</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Incoterm</dt>
              <dd>{INCOTERM_LABELS[commande.incoterm]}</dd>
            </div>
            <div>
              <dt>Transporteur</dt>
              <dd>{transporteur?.nom ?? ABSENT}</dd>
            </div>
            <div>
              <dt>Camion</dt>
              <dd className="mono">{camion?.immatriculation ?? ABSENT}</dd>
            </div>
            <div>
              <dt>Chauffeur</dt>
              <dd>
                {chauffeur?.nom ?? ABSENT}
                <span className="cell-sub mono">CIN {chauffeur?.cin}</span>
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Pesées et documents</h3>
          <dl className="detail-list">
            <div>
              <dt>Créée le</dt>
              <dd>{formatDateTime(commande.creeeLeUtc)}</dd>
            </div>
            <div>
              <dt>N° SAP</dt>
              <dd className="mono">
                {commande.numeroSap ?? ABSENT}
                {commande.numeroLocal ? <span className="cell-sub mono">{commande.numeroLocal}</span> : null}
              </dd>
            </div>
            {commande.reference ? (
              <div>
                <dt>Référence client</dt>
                <dd>{commande.reference}</dd>
              </div>
            ) : null}
            <div>
              <dt>Entrée (tare)</dt>
              <dd>
                {formatKg(commande.peseeEntree?.poidsKg)}
                <span className="cell-sub">
                  {commande.peseeEntree
                    ? `${commande.peseeEntree.pont} · ${formatDateTime(commande.entreeUtc)}`
                    : ''}
                </span>
              </dd>
            </div>
            <div>
              <dt>Sortie (brut)</dt>
              <dd>
                {formatKg(commande.peseeSortie?.poidsKg)}
                <span className="cell-sub">
                  {commande.peseeSortie
                    ? `${commande.peseeSortie.pont} · ${formatDateTime(commande.sortieUtc)}`
                    : ''}
                </span>
              </dd>
            </div>
            <div>
              <dt>Net</dt>
              <dd>{formatKg(commande.bonDeLivraison?.netKg)}</dd>
            </div>
            <div>
              <dt>Bon de chargement</dt>
              <dd className="mono">{commande.bonDeChargement?.numero ?? ABSENT}</dd>
            </div>
            <div className="detail-item span-2">
              <dt>Bon de livraison</dt>
              <dd className="mono">
                {commande.bonDeLivraison
                  ? commande.bonDeLivraison.numeroSap
                    ? `${commande.bonDeLivraison.numeroSap} (SAP)`
                    : `${commande.bonDeLivraison.numeroLocal} (N° SAP à venir)`
                  : ABSENT}
              </dd>
            </div>
          </dl>
        </section>

        <p
          className="text-muted"
          style={{ fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}
        >
          <FiFileText aria-hidden="true" /> Les actions disponibles dépendent du statut de la commande.
        </p>
      </Drawer>

      <Modal
        open={apercu !== null}
        onClose={() => setApercu(null)}
        title={apercu === 'BL' ? 'Réimpression du Bon de livraison' : 'Réimpression du Bon de chargement'}
        wide
      >
        {apercu ? <DocumentPreview type={apercu} commande={commande} /> : null}
      </Modal>

      <Modal
        open={confirmerAnnulation}
        onClose={() => setConfirmerAnnulation(false)}
        title="Annuler la commande ?"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setConfirmerAnnulation(false)}>
              Conserver la commande
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={actionEnCours}
              onClick={() => {
                void executer(async () => {
                  const ok = await annulerCommande(commande.id, motif.trim())
                  if (ok) {
                    setConfirmerAnnulation(false)
                    onClose()
                  }
                  return ok
                })
              }}
            >
              <FiXCircle aria-hidden="true" /> Confirmer l'annulation
            </button>
          </>
        }
      >
        <p>
          La commande <strong>{numeroAffiche(commande)}</strong> ({client?.nom}) sera marquée « Annulée ». Le
          camion ne pourra plus être pesé pour cette commande.
        </p>
        <div className="form-field" style={{ marginTop: 12 }}>
          <label className="form-label" htmlFor="motif-annulation">
            Motif
          </label>
          <input
            id="motif-annulation"
            className="form-input"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. : camion absent, erreur de saisie…"
            maxLength={200}
          />
        </div>
      </Modal>
    </>
  )
}
