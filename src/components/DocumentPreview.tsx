import { useState } from 'react'
import { FiPrinter } from 'react-icons/fi'
import { USINE } from '@/data/mock'
import { useReferentielLookup, numeroAffiche } from '@/store/useAppStore'
import type { Commande } from '@/types'
import { INCOTERM_LABELS } from '@/types'
import { ABSENT, formatDateTime, formatKg, formatNombre, formatPoidsBl, formatTonnes } from '@/utils/format'

const EXEMPLAIRES = ['Client', 'Pont bascule', 'Expédition', 'Commercial', 'Souche'] as const
type Exemplaire = (typeof EXEMPLAIRES)[number]

interface DocumentPreviewProps {
  type: 'BC' | 'BL'
  commande: Commande
  onPrinted?: () => void
}

function Champ({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="sheet__field">
      <span className="k">{k}</span>
      <span className={mono ? 'v mono' : 'v'}>{v}</span>
    </div>
  )
}

export function DocumentPreview({ type, commande, onPrinted }: DocumentPreviewProps) {
  const [exemplaire, setExemplaire] = useState<Exemplaire>('Client')
  const r = useReferentielLookup()
  const client = r.client(commande)
  const chantier = r.chantier(commande)
  const produit = r.produit(commande)
  const transporteur = r.transporteur(commande)
  const camion = r.camion(commande)
  const chauffeur = r.chauffeur(commande)

  const bc = commande.bonDeChargement
  const bl = commande.bonDeLivraison
  const estBl = type === 'BL'
  // Même règle que le BL Temara : le numéro SAP s'il existe, sinon l'ID de la commande, toujours étiqueté « N° ».
  const numero = estBl ? (bl?.numeroSap ?? bl?.numeroLocal ?? String(commande.id)) : (bc?.numero ?? ABSENT)
  const numeroSap = estBl ? bl?.numeroSap : commande.numeroSap
  const date = estBl ? bl?.dateUtc : bc?.dateUtc

  const imprimer = () => {
    window.print()
    onPrinted?.()
  }

  return (
    <div className="doc-preview">
      <div className="doc-preview__tools print-hide">
        <div className="copy-tabs" role="group" aria-label="Exemplaire à imprimer">
          {EXEMPLAIRES.map((ex) => (
            <button key={ex} type="button" aria-pressed={exemplaire === ex} onClick={() => setExemplaire(ex)}>
              {ex}
            </button>
          ))}
        </div>
        <button type="button" className="btn-action" onClick={imprimer}>
          <FiPrinter aria-hidden="true" /> Imprimer ({exemplaire})
        </button>
      </div>

      <article className="print-sheet" aria-label={estBl ? 'Bon de livraison' : 'Bon de chargement'}>
        <header className="sheet__head">
          <div>
            <img src="/media/CIMAR_LOGO_Horizontal.svg" alt="CIMAR" />
            <div className="sheet__company">
              {USINE.societe} · {USINE.nom} ({USINE.code})
            </div>
          </div>
          <div className="sheet__title">
            <h2>{estBl ? 'BON DE LIVRAISON' : 'BON DE CHARGEMENT'}</h2>
            <div className="sheet__number">N° {numero}</div>
            <span className="sheet__copy">Exemplaire {exemplaire}</span>
          </div>
        </header>

        <div className="sheet__grid">
          <Champ k="Date" v={formatDateTime(date)} />
          <Champ k="Commande" v={numeroAffiche(commande)} mono />
          <Champ k="Client" v={client ? `${client.code} — ${client.nom}` : ABSENT} />
          <Champ k="Chantier" v={chantier ? `${chantier.nom}, ${chantier.ville}` : ABSENT} />
          <Champ k="Produit" v={produit ? `${produit.codeSap} — ${produit.libelle}` : ABSENT} />
          <Champ
            k="Quantité commandée"
            v={`${formatTonnes(commande.quantiteT)}${commande.nombreSacs ? ` (${formatNombre(commande.nombreSacs)} sacs)` : ''}`}
          />
          <Champ k="Incoterm" v={INCOTERM_LABELS[commande.incoterm]} />
          <Champ k="Transporteur" v={transporteur?.nom ?? ABSENT} />
          <Champ k="Matricule" v={camion?.immatriculation ?? ABSENT} mono />
          <Champ k="Chauffeur" v={chauffeur ? `${chauffeur.nom} — CIN ${chauffeur.cin}` : ABSENT} />
          {estBl ? (
            <>
              <Champ k="Bon de chargement" v={bc?.numero ?? ABSENT} mono />
              <Champ k="Pont bascule" v={commande.peseeSortie?.pont ?? ABSENT} />
            </>
          ) : (
            <>
              <Champ k="Pont bascule" v={commande.peseeEntree?.pont ?? ABSENT} />
              <Champ k="Tare" v={formatKg(commande.peseeEntree?.poidsKg)} mono />
            </>
          )}
        </div>

        {estBl && bl ? (
          <div className="sheet__weights">
            <div className="w">
              <div className="k">Poids brut (t)</div>
              <div className="v">{formatPoidsBl(bl.brutKg)}</div>
            </div>
            <div className="w">
              <div className="k">Tare (t)</div>
              <div className="v">{formatPoidsBl(bl.tareKg)}</div>
            </div>
            <div className="w is-net">
              <div className="k">Poids net (t)</div>
              <div className="v">{formatPoidsBl(bl.netKg)}</div>
            </div>
          </div>
        ) : null}

        <div className="sheet__signatures">
          <div>Chauffeur</div>
          <div>Pont bascule</div>
          <div>{estBl ? 'Réception client' : 'Expédition'}</div>
        </div>

        <footer className="sheet__footer">
          <span>
            {estBl ? 'BL' : 'BC'} {numero} · {USINE.code} · Édité le{' '}
            {formatDateTime(new Date().toISOString())}
          </span>
          {numeroSap ? <span>N° SAP {numeroSap}</span> : null}
        </footer>
      </article>
    </div>
  )
}
