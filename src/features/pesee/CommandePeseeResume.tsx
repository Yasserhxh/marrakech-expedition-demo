import { StatutBadge } from '@/components/StatusBadge'
import { InfoValue } from '@/components/InfoValue'
import { useReferentielLookup } from '@/features/referentiels/hooks/useReferentiels'
import type { Commande } from '@/types'
import { numeroAffiche } from '@/utils/commande'
import { ABSENT, formatNombre, formatTonnes } from '@/utils/format'

export function CommandePeseeResume({ commande }: { commande: Commande }) {
  const r = useReferentielLookup()
  const client = r.client(commande.clientId)
  const chantier = r.chantier(commande.chantierId)
  const produit = r.produit(commande.produitId)
  const camion = r.camion(commande.camionId)
  const chauffeur = r.chauffeur(commande.chauffeurId)

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <h2 className="pesee-order__title">
          Commande <span className="code-chip">{numeroAffiche(commande)}</span>
        </h2>
        <StatutBadge statut={commande.statut} />
      </div>
      <dl className="detail-list cols-3">
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
          <dt>Produit</dt>
          <dd>
            <InfoValue meta={produit?.codeSap} metaMono>
              {produit?.libelle ?? ABSENT}
            </InfoValue>
          </dd>
        </div>
        <div>
          <dt>Quantité</dt>
          <dd>
            <InfoValue meta={commande.nombreSacs ? `${formatNombre(commande.nombreSacs)} sacs` : undefined}>
              {formatTonnes(commande.quantiteT)}
            </InfoValue>
          </dd>
        </div>
        <div>
          <dt>Camion</dt>
          <dd>
            <InfoValue mono>{camion?.immatriculation ?? ABSENT}</InfoValue>
          </dd>
        </div>
        <div>
          <dt>Chauffeur</dt>
          <dd>
            <InfoValue meta={chauffeur ? `CIN ${chauffeur.cin}` : undefined} metaMono>
              {chauffeur?.nom ?? ABSENT}
            </InfoValue>
          </dd>
        </div>
      </dl>
    </div>
  )
}
