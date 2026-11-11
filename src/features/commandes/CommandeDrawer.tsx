import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiFileText, FiLogIn, FiLogOut, FiPrinter, FiXCircle } from 'react-icons/fi'
import { Drawer } from '@/components/Drawer'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { DocumentPreview } from '@/components/DocumentPreview'
import { InfoValue } from '@/components/InfoValue'
import { ConditionnementBadge, StatutBadge, SynchroBadge } from '@/components/StatusBadge'
import { useCommande } from '@/features/commandes/hooks/useCommandes'
import {
  useAnnulerCommande,
  useAutoriserPesee,
  useAutoriserSecondPesage,
} from '@/features/commandes/hooks/useCommandeMutations'
import { useReferentielLookup } from '@/features/referentiels/hooks/useReferentiels'
import { INCOTERM_LABELS } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { numeroAffiche } from '@/utils/commande'
import { peutAutoriserPesee } from '@/utils/parcours'
import { ABSENT, formatDateTime, formatKg, formatNombre, formatTonnes } from '@/utils/format'

interface CommandeDrawerProps {
  commandeId: number | null
  onClose: () => void
}

export function CommandeDrawer({ commandeId, onClose }: CommandeDrawerProps) {
  const { data: commande } = useCommande(commandeId)
  const autoriserEntree = useAutoriserPesee()
  const autoriserSortie = useAutoriserSecondPesage()
  const annulerCommande = useAnnulerCommande()
  const r = useReferentielLookup()
  const navigate = useNavigate()
  const peutAutoriser = peutAutoriserPesee(useAppStore((s) => s.role))
  const [apercu, setApercu] = useState<'BC' | 'BL' | null>(null)
  const [confirmerAnnulation, setConfirmerAnnulation] = useState(false)

  if (!commande) return null

  const client = r.client(commande.clientId)
  const chantier = r.chantier(commande.chantierId)
  const produit = r.produit(commande.produitId)
  const transporteur = r.transporteur(commande.transporteurId)
  const camion = r.camion(commande.camionId)
  const chauffeur = r.chauffeur(commande.chauffeurId)

  const annulable = !commande.bonDeLivraison && commande.statut !== 'Annulee'

  const actions = (
    <>
      {annulable ? (
        <Button variant="danger" className="drawer-action--aside" onClick={() => setConfirmerAnnulation(true)}>
          <FiXCircle aria-hidden="true" /> Annuler la commande
        </Button>
      ) : null}
      {commande.bonDeChargement ? (
        <Button variant="outline" onClick={() => setApercu('BC')}>
          <FiPrinter aria-hidden="true" /> Bon de chargement
        </Button>
      ) : null}
      {commande.bonDeLivraison ? (
        <Button variant="outline" onClick={() => setApercu('BL')}>
          <FiPrinter aria-hidden="true" /> Bon de livraison
        </Button>
      ) : null}
      {commande.statut === 'Creee' && peutAutoriser ? (
        <Button loading={autoriserEntree.isPending} onClick={() => autoriserEntree.mutate(commande.id)}>
          <FiLogIn aria-hidden="true" /> Autoriser la pesée d'entrée
        </Button>
      ) : null}
      {commande.statut === 'EntreeAutorisee' ? (
        <Button variant="secondary" onClick={() => navigate(`/pesee/entree/${commande.id}`)}>
          <FiLogIn aria-hidden="true" /> Pesée d'entrée
        </Button>
      ) : null}
      {commande.statut === 'DansUsine' && peutAutoriser ? (
        <Button loading={autoriserSortie.isPending} onClick={() => autoriserSortie.mutate(commande.id)}>
          <FiLogOut aria-hidden="true" /> Autoriser le 2ᵉ pesage
        </Button>
      ) : null}
      {commande.statut === 'SortieAutorisee' ? (
        <Button variant="secondary" onClick={() => navigate(`/pesee/sortie/${commande.id}`)}>
          <FiLogOut aria-hidden="true" /> Pesée de sortie
        </Button>
      ) : null}
    </>
  )

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={
          <span className="drawer-title">
            <span>Commande</span>
            <span className="code-chip">{numeroAffiche(commande)}</span>
            <StatutBadge statut={commande.statut} />
          </span>
        }
        subtitle={commande.origine === 'Locale' ? 'Origine locale' : 'Origine SAP'}
        footer={actions}
      >
        {commande.statut === 'ErreurSynchro' ? (
          <Notice tone="danger">
            Synchronisation SAP en erreur. Consultez la page « Synchronisation SAP » pour relancer.
          </Notice>
        ) : null}
        {(commande.statut === 'Creee' || commande.statut === 'DansUsine') && !peutAutoriser ? (
          <Notice tone="info">
            {commande.statut === 'Creee'
              ? 'La pesée d’entrée doit être autorisée par le guichet.'
              : 'Le second pesage doit être autorisé par le guichet.'}
          </Notice>
        ) : null}
        {commande.origine === 'Locale' && commande.synchro === 'EnAttente' ? (
          <Notice tone="warning">
            Commande créée hors ligne : elle sera envoyée à SAP après l'émission du BL, dès que SAP sera joignable.
          </Notice>
        ) : null}

        <section className="drawer-section">
          <h3>Client et livraison</h3>
          <dl className="detail-list">
            <div>
              <dt>Client</dt>
              <dd>
                <InfoValue meta={client ? `SAP ${client.code}` : undefined} metaMono>
                  {client?.nom ?? ABSENT}
                </InfoValue>
              </dd>
            </div>
            <div>
              <dt>Chantier</dt>
              <dd>
                <InfoValue meta={chantier?.ville}>{chantier?.nom ?? ABSENT}</InfoValue>
              </dd>
            </div>
            <div>
              <dt>Incoterm</dt>
              <dd>{INCOTERM_LABELS[commande.incoterm]}</dd>
            </div>
            <div>
              <dt>Créée le</dt>
              <dd className="num">{formatDateTime(commande.creeeLeUtc)}</dd>
            </div>
          </dl>
        </section>

        <section className="drawer-section">
          <h3>Produit et quantité</h3>
          <dl className="detail-list">
            <div>
              <dt>Produit</dt>
              <dd>
                <InfoValue meta={produit?.codeSap} metaMono>
                  {produit?.libelle ?? ABSENT}
                </InfoValue>
              </dd>
            </div>
            <div>
              <dt>Conditionnement</dt>
              <dd>{produit ? <ConditionnementBadge conditionnement={produit.conditionnement} /> : ABSENT}</dd>
            </div>
            <div>
              <dt>Quantité</dt>
              <dd>
                <InfoValue meta={commande.nombreSacs ? `${formatNombre(commande.nombreSacs)} sacs` : undefined}>
                  {formatTonnes(commande.quantiteT)}
                </InfoValue>
              </dd>
            </div>
          </dl>
        </section>

        <section className="drawer-section">
          <h3>Transport</h3>
          <dl className="detail-list">
            <div>
              <dt>Transporteur</dt>
              <dd>{transporteur?.nom ?? ABSENT}</dd>
            </div>
            <div>
              <dt>Camion</dt>
              <dd>
                <InfoValue mono>{camion?.immatriculation ?? ABSENT}</InfoValue>
              </dd>
            </div>
            <div className="detail-item span-2">
              <dt>Chauffeur</dt>
              <dd>
                <InfoValue meta={chauffeur ? `CIN ${chauffeur.cin}` : undefined} metaMono>
                  {chauffeur?.nom ?? ABSENT}
                </InfoValue>
              </dd>
            </div>
          </dl>
        </section>

        <section className="drawer-section">
          <h3>Pesées et documents</h3>
          <dl className="detail-list">
            <div>
              <dt>Entrée (tare)</dt>
              <dd>
                <InfoValue
                  meta={
                    commande.peseeEntree
                      ? `${commande.peseeEntree.pont} · ${formatDateTime(commande.entreeUtc)}`
                      : undefined
                  }
                >
                  {formatKg(commande.peseeEntree?.poidsKg)}
                </InfoValue>
              </dd>
            </div>
            <div>
              <dt>Sortie (brut)</dt>
              <dd>
                <InfoValue
                  meta={
                    commande.peseeSortie
                      ? `${commande.peseeSortie.pont} · ${formatDateTime(commande.sortieUtc)}`
                      : undefined
                  }
                >
                  {formatKg(commande.peseeSortie?.poidsKg)}
                </InfoValue>
              </dd>
            </div>
            <div>
              <dt>Net</dt>
              <dd className="num">{formatKg(commande.bonDeLivraison?.netKg)}</dd>
            </div>
            <div>
              <dt>Bon de chargement</dt>
              <dd>
                <InfoValue mono>{commande.bonDeChargement?.numero ?? ABSENT}</InfoValue>
              </dd>
            </div>
            <div className="detail-item span-2">
              <dt>Bon de livraison</dt>
              <dd>
                {commande.bonDeLivraison ? (
                  <InfoValue
                    mono
                    meta={commande.bonDeLivraison.numeroSap ? 'Numéro SAP' : 'Provisoire'}
                  >
                    {commande.bonDeLivraison.numeroSap ?? commande.bonDeLivraison.numeroProvisoire}
                  </InfoValue>
                ) : (
                  ABSENT
                )}
              </dd>
            </div>
            {commande.commentaire ? (
              <div className="detail-item span-2">
                <dt>Commentaire</dt>
                <dd>{commande.commentaire}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="drawer-section">
          <h3>Synchronisation</h3>
          <dl className="detail-list">
            <div>
              <dt>N° SAP</dt>
              <dd>
                <InfoValue mono>{commande.numeroSap ?? ABSENT}</InfoValue>
              </dd>
            </div>
            <div>
              <dt>État</dt>
              <dd>
                <SynchroBadge synchro={commande.synchro} sapNatif={commande.origine === 'Sap'} />
              </dd>
            </div>
          </dl>
        </section>

        <p className="text-muted" style={{ fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
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
        dismissible={false}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmerAnnulation(false)}>
              Conserver la commande
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                annulerCommande.mutate(commande.id)
                setConfirmerAnnulation(false)
                onClose()
              }}
            >
              <FiXCircle aria-hidden="true" /> Confirmer l'annulation
            </Button>
          </>
        }
      >
        <p>
          La commande <strong>{numeroAffiche(commande)}</strong> ({client?.nom}) sera marquée « Annulée ». Le camion ne
          pourra plus être pesé pour cette commande.
        </p>
      </Modal>
    </>
  )
}
