import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiCheck, FiLoader, FiPlus } from 'react-icons/fi'
import { PageShell } from '@/components/PageShell'
import { CodeSapLookup, type LigneLookup } from '@/components/CodeSapLookup'
import { Combobox } from '@/components/Combobox'
import { Notice } from '@/components/Notice'
import { ConditionnementBadge } from '@/components/StatusBadge'
import { estModeApi } from '@/config'
import { services } from '@/services'
import { estApiError } from '@/services/http/apiClient'
import { versErreursFormulaire } from '@/services/http/mappers'
import { useAppStore } from '@/store/useAppStore'
import type { CamionSap, ChantierSap, ClientSap, Incoterm, ResultatLookup, TransporteurSap } from '@/types'
import { INCOTERM_LABELS } from '@/types'
import { formatNombre, formatTonnes } from '@/utils/format'
import {
  CODE_SAP_REGEX,
  FORMULAIRE_VIDE,
  normaliserImmatriculation,
  parserQuantite,
  QUANTITE_MAX_T,
  validerNouvelleCommande,
  type ErreursFormulaire,
  type FormulaireCommande,
} from './validation'

const KG_PAR_TONNE = 1000
/** Un code exact (transporteur, camion) n'est cherché qu'à partir de 5 chiffres pour limiter les appels. */
const MIN_CHIFFRES_CODE_EXACT = 5
const MIN_CHIFFRES_CLIENT = 3

type LigneClient = ClientSap & LigneLookup
type LigneChantier = ChantierSap & LigneLookup
type LigneTransporteur = TransporteurSap & LigneLookup
type LigneCamion = CamionSap & LigneLookup

interface ChampTexteProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  help?: string
  required?: boolean
  mono?: boolean
  placeholder?: string
  list?: string
  maxLength?: number
  inputMode?: 'decimal' | 'text'
}

function ChampTexte({
  id,
  label,
  value,
  onChange,
  error,
  help,
  required,
  mono,
  placeholder,
  list,
  maxLength,
  inputMode,
}: ChampTexteProps) {
  const erreurId = `${id}-err`
  return (
    <div className="form-field">
      <label className="form-label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        className={mono ? 'form-input mono' : 'form-input'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? erreurId : undefined}
        placeholder={placeholder}
        list={list}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete="off"
      />
      {error ? (
        <span className="form-error" id={erreurId}>
          <FiAlertCircle aria-hidden="true" /> {error}
        </span>
      ) : help ? (
        <span className="form-help">{help}</span>
      ) : null}
    </div>
  )
}

const rechercherClients = async (prefixe: string): Promise<ResultatLookup<LigneClient>> => {
  const r = await services.sapLookup.rechercherClients(prefixe)
  return { source: r.source, items: r.items.map((c) => ({ ...c, sub: c.ville })) }
}

const rechercherTransporteur = async (code: string): Promise<ResultatLookup<LigneTransporteur>> =>
  services.sapLookup.transporteur(code)

const rechercherCamion = async (code: string): Promise<ResultatLookup<LigneCamion>> => {
  const r = await services.sapLookup.camion(code)
  return {
    source: r.source,
    items: r.items.map((c) => ({
      ...c,
      nom: c.immatriculation ?? 'immatriculation inconnue',
      sub: c.transporteurCode,
    })),
  }
}

export function NouvelleCommandePage() {
  const sapOnline = useAppStore((s) => s.sapOnline)
  const ref = useAppStore((s) => s.referentiels)
  const creerCommande = useAppStore((s) => s.creerCommande)
  const signalerErreur = useAppStore((s) => s.signalerErreur)
  const navigate = useNavigate()
  const ids = useId()
  const [f, setF] = useState<FormulaireCommande>(FORMULAIRE_VIDE)
  const [chantiers, setChantiers] = useState<ResultatLookup<LigneChantier> | null>(null)
  const [soumis, setSoumis] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreursServeur, setErreursServeur] = useState<ErreursFormulaire>({})
  const [erreursGenerales, setErreursGenerales] = useState<string[]>([])

  const maj = useCallback((patch: Partial<FormulaireCommande>) => {
    setF((prev) => ({ ...prev, ...patch }))
    // Une correction locale efface l'erreur serveur du champ concerné.
    setErreursServeur((prev) => {
      const suivant = { ...prev }
      for (const k of Object.keys(patch) as (keyof FormulaireCommande)[]) delete suivant[k]
      return suivant
    })
  }, [])

  // Chantiers (partenaires WE) du client dès que son code est complet ; repli « Cache » hors ligne, vide si inconnu.
  useEffect(() => {
    if (f.clientCode.length < MIN_CHIFFRES_CLIENT || !CODE_SAP_REGEX.test(f.clientCode)) {
      setChantiers(null)
      return
    }
    let actif = true
    services.sapLookup
      .chantiersDuClient(f.clientCode)
      .then((r) => {
        if (!actif) return
        setChantiers({
          source: r.source,
          items: r.items.map((c) => ({ ...c, sub: c.parDefaut ? 'par défaut' : undefined })),
        })
      })
      .catch((e: unknown) => {
        if (!actif) return
        setChantiers(null)
        signalerErreur(e, 'Chantiers du client indisponibles')
      })
    return () => {
      actif = false
    }
  }, [f.clientCode, signalerErreur])

  const camionsSuggeres = useMemo(
    () =>
      f.transporteurCode ? ref.camions.filter((c) => c.transporteurId === f.transporteurCode) : ref.camions,
    [ref.camions, f.transporteurCode],
  )
  const produit = ref.produits.find((p) => p.id === f.produitId)
  const quantite = parserQuantite(f.quantiteT)
  const sacs =
    produit?.conditionnement === 'SAC' && produit.poidsSacKg && quantite > 0
      ? Math.round((quantite * KG_PAR_TONNE) / produit.poidsSacKg)
      : undefined

  const erreursLocales = validerNouvelleCommande(f, chantiers)
  const valide = Object.keys(erreursLocales).length === 0
  const err = (k: keyof FormulaireCommande) => erreursServeur[k] ?? (soumis ? erreursLocales[k] : undefined)

  const choisirChauffeur = (nom: string) => {
    const connu = ref.chauffeurs.find((c) => c.nom.localeCompare(nom, 'fr', { sensitivity: 'base' }) === 0)
    maj({ chauffeurNom: nom, ...(connu && !f.chauffeurCin ? { chauffeurCin: connu.cin } : {}) })
  }

  const choisirCamion = (code: string, item?: LigneCamion) => {
    maj({
      camionCodeSap: code,
      ...(item?.immatriculation && !f.immatriculation ? { immatriculation: item.immatriculation } : {}),
      ...(item?.transporteurCode && !f.transporteurCode ? { transporteurCode: item.transporteurCode } : {}),
    })
  }

  const creer = async () => {
    setSoumis(true)
    setErreursGenerales([])
    if (!valide) return
    setEnvoi(true)
    try {
      await creerCommande({
        clientCode: f.clientCode,
        clientNom: f.clientNom || undefined,
        chantierCode: f.chantierCode,
        chantierNom: f.chantierNom || undefined,
        produitId: f.produitId,
        quantiteT: quantite,
        incoterm: f.incoterm,
        transporteurCode: f.transporteurCode || undefined,
        transporteurNom: f.transporteurNom || undefined,
        camionCodeSap: f.camionCodeSap || undefined,
        immatriculation: normaliserImmatriculation(f.immatriculation),
        immatriculationLibre: f.immatriculationLibre,
        chauffeurNom: f.chauffeurNom.trim(),
        chauffeurCin: f.chauffeurCin.trim() || undefined,
        reference: f.reference.trim() || undefined,
      })
      navigate('/commandes')
    } catch (e) {
      if (estApiError(e) && e.status === 400) {
        const mappees = versErreursFormulaire(e.errors)
        setErreursServeur(mappees.parChamp as ErreursFormulaire)
        const generales = mappees.generales.length > 0 ? mappees.generales : e.detail ? [e.detail] : []
        setErreursGenerales([...generales, `ID de corrélation ${e.correlationId}`])
      } else {
        signalerErreur(e, 'Création impossible')
      }
    } finally {
      setEnvoi(false)
    }
  }

  const codeEtNom = (code: string, nom: string) =>
    code ? (nom ? `${code} — ${nom}` : `${code} (code non vérifié)`) : '—'

  const listeCamionsId = `${ids}-camions`
  const listeChauffeursId = `${ids}-chauffeurs`

  return (
    <PageShell
      title="Nouvelle commande locale"
      subtitle="Création au guichet pendant une indisponibilité SAP — la commande sera synchronisée automatiquement"
    >
      {sapOnline ? (
        <Notice tone="warning">
          SAP est en ligne : les commandes doivent être créées dans SAP. Ce formulaire n'est utilisable qu'en
          mode dégradé
          {estModeApi ? '.' : ' (basculez SAP « Hors ligne » dans la barre de démonstration).'}
        </Notice>
      ) : (
        <Notice tone="info">
          SAP est hors ligne : saisissez les <strong>codes SAP</strong> du client, du chantier, du
          transporteur et du camion. Les noms connus du cache local sont proposés ; un code absent du cache
          est accepté tel quel et sera vérifié à la synchronisation.
        </Notice>
      )}
      {erreursGenerales.length > 0 ? (
        <Notice tone="danger">
          <strong>L'API a refusé la commande.</strong>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {erreursGenerales.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <div className="form-layout">
        <form
          className="admin-card"
          onSubmit={(e) => {
            e.preventDefault()
            void creer()
          }}
          noValidate
        >
          <h3 className="form-section-title">
            <span className="form-step">1</span> Client et chantier
          </h3>
          <div className="form-grid">
            <CodeSapLookup<LigneClient>
              id={`${ids}-client`}
              label="Client (code SAP)"
              required
              value={f.clientCode}
              nomSelectionne={f.clientNom || undefined}
              sapOnline={sapOnline}
              minChiffres={MIN_CHIFFRES_CLIENT}
              rechercher={rechercherClients}
              onChange={(code, item) =>
                maj({ clientCode: code, clientNom: item?.nom ?? '', chantierCode: '', chantierNom: '' })
              }
              placeholder="Premiers chiffres du code SAP…"
              error={err('clientCode')}
              help={`Tapez au moins ${MIN_CHIFFRES_CLIENT} chiffres pour interroger SAP`}
            />
            <CodeSapLookup<LigneChantier>
              id={`${ids}-chantier`}
              label="Chantier (code SAP)"
              required
              value={f.chantierCode}
              nomSelectionne={f.chantierNom || undefined}
              sapOnline={sapOnline}
              minChiffres={1}
              options={chantiers ?? undefined}
              rechercher={async () => chantiers ?? { source: 'Cache', items: [] }}
              onChange={(code, item) => maj({ chantierCode: code, chantierNom: item?.nom ?? '' })}
              placeholder={f.clientCode ? 'Chantier du client…' : 'Saisissez d’abord le client'}
              disabled={!f.clientCode}
              error={err('chantierCode')}
              help={
                chantiers
                  ? `${chantiers.items.length} chantier(s) rattaché(s) à ce client (${chantiers.source === 'Sap' ? 'SAP' : 'cache local'})`
                  : undefined
              }
            />
          </div>

          <h3 className="form-section-title" style={{ marginTop: 24 }}>
            <span className="form-step">2</span> Produit et quantité
          </h3>
          <div className="form-grid">
            <Combobox
              label="Produit"
              required
              options={ref.produits.map((p) => ({
                value: p.id,
                label: `${p.libelle} (${p.conditionnement})`,
                sub: p.codeSap,
              }))}
              value={f.produitId}
              onChange={(v) => maj({ produitId: v })}
              placeholder="Vrac ou sac…"
              error={err('produitId')}
            />
            <ChampTexte
              id={`${ids}-quantite`}
              label="Quantité (t)"
              required
              mono
              inputMode="decimal"
              value={f.quantiteT}
              onChange={(v) => maj({ quantiteT: v })}
              error={err('quantiteT')}
              help={
                sacs
                  ? `${formatNombre(sacs)} sacs de ${produit?.poidsSacKg} kg calculés automatiquement`
                  : `Maximum ${QUANTITE_MAX_T} t, 3 décimales`
              }
            />
            <fieldset className="form-field span-2" style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="form-label">Incoterm *</legend>
              <div className="btn-row">
                {(['Depart', 'Rendu'] as Incoterm[]).map((i) => (
                  <label key={i} className="btn-ghost" style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="incoterm"
                      value={i}
                      checked={f.incoterm === i}
                      onChange={() => maj({ incoterm: i })}
                    />
                    {INCOTERM_LABELS[i]}
                    <span className="text-muted" style={{ fontWeight: 400 }}>
                      {i === 'Depart' ? '(EXW) — enlèvement par le client' : '(CFR) — livraison par CIMAR'}
                    </span>
                  </label>
                ))}
              </div>
              {err('incoterm') ? (
                <span className="form-error">
                  <FiAlertCircle aria-hidden="true" /> {err('incoterm')}
                </span>
              ) : null}
            </fieldset>
          </div>

          <h3 className="form-section-title" style={{ marginTop: 24 }}>
            <span className="form-step">3</span> Transport
          </h3>
          <div className="form-grid">
            <CodeSapLookup<LigneTransporteur>
              id={`${ids}-transporteur`}
              label="Transporteur (code SAP)"
              required={f.incoterm === 'Rendu'}
              value={f.transporteurCode}
              nomSelectionne={f.transporteurNom || undefined}
              sapOnline={sapOnline}
              minChiffres={MIN_CHIFFRES_CODE_EXACT}
              rechercher={rechercherTransporteur}
              onChange={(code, item) => maj({ transporteurCode: code, transporteurNom: item?.nom ?? '' })}
              placeholder={
                f.incoterm === 'Rendu' ? 'Code SAP du transporteur…' : 'Facultatif en Départ (EXW)'
              }
              error={err('transporteurCode')}
            />
            <CodeSapLookup<LigneCamion>
              id={`${ids}-camion`}
              label="Camion (code SAP)"
              value={f.camionCodeSap}
              sapOnline={sapOnline}
              minChiffres={MIN_CHIFFRES_CODE_EXACT}
              rechercher={rechercherCamion}
              onChange={choisirCamion}
              placeholder="Code SAP du camion (facultatif)…"
              error={err('camionCodeSap')}
              help="Partenaire camion envoyé à SAP ; l'immatriculation est remplie si SAP la connaît"
            />
            <div>
              <ChampTexte
                id={`${ids}-immat`}
                label="Camion (immatriculation)"
                required
                mono
                value={f.immatriculation}
                onChange={(v) => maj({ immatriculation: v })}
                placeholder="12345-A-6"
                list={listeCamionsId}
                error={err('immatriculation')}
                help={
                  f.immatriculationLibre
                    ? 'Format libre accepté (camion étranger / plaque temporaire)'
                    : 'Format marocain 12345-A-6 ; camion inconnu créé automatiquement'
                }
              />
              <datalist id={listeCamionsId}>
                {camionsSuggeres.map((c) => (
                  <option key={c.id} value={c.immatriculation} />
                ))}
              </datalist>
              <label className="form-check" style={{ marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={f.immatriculationLibre}
                  onChange={(e) => maj({ immatriculationLibre: e.target.checked })}
                />
                Immatriculation libre (format non standard)
              </label>
            </div>
            <div>
              <ChampTexte
                id={`${ids}-chauffeur`}
                label="Chauffeur (nom)"
                required
                value={f.chauffeurNom}
                onChange={choisirChauffeur}
                placeholder="Nom et prénom"
                list={listeChauffeursId}
                maxLength={100}
                error={err('chauffeurNom')}
                help="Chauffeur inconnu créé automatiquement"
              />
              <datalist id={listeChauffeursId}>
                {ref.chauffeurs.map((c) => (
                  <option key={c.id} value={c.nom}>
                    {c.cin ? `CIN ${c.cin}` : undefined}
                  </option>
                ))}
              </datalist>
            </div>
            <ChampTexte
              id={`${ids}-cin`}
              label="CIN du chauffeur"
              mono
              value={f.chauffeurCin}
              onChange={(v) => maj({ chauffeurCin: v })}
              placeholder="E903412"
              maxLength={20}
              error={err('chauffeurCin')}
            />
            <ChampTexte
              id={`${ids}-ref`}
              label="Référence client"
              value={f.reference}
              onChange={(v) => maj({ reference: v })}
              placeholder="N° de bon de commande client (facultatif)"
              maxLength={200}
              error={err('reference')}
            />
          </div>

          <div className="btn-row" style={{ marginTop: 28, justifyContent: 'flex-end' }}>
            <Link to="/commandes" className="btn-ghost">
              Annuler
            </Link>
            <button type="submit" className="btn-primary btn-lg" disabled={sapOnline || envoi}>
              {envoi ? <FiLoader aria-hidden="true" /> : <FiPlus aria-hidden="true" />}{' '}
              {envoi ? 'Création en cours…' : 'Créer la commande'}
            </button>
          </div>
        </form>

        <aside className="admin-card form-recap" aria-label="Récapitulatif">
          <h2 style={{ marginBottom: 12 }}>Récapitulatif</h2>
          <dl className="detail-list" style={{ gridTemplateColumns: '1fr' }}>
            <div>
              <dt>Origine</dt>
              <dd>
                <span className="badge badge--pending">Locale</span> · statut « Créée » · synchro « En attente
                »
              </dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd className="mono">{codeEtNom(f.clientCode, f.clientNom)}</dd>
            </div>
            <div>
              <dt>Chantier</dt>
              <dd className="mono">{codeEtNom(f.chantierCode, f.chantierNom)}</dd>
            </div>
            <div>
              <dt>Produit</dt>
              <dd>
                {produit ? (
                  <>
                    {produit.libelle} <ConditionnementBadge conditionnement={produit.conditionnement} />
                    <span className="cell-sub mono">{produit.codeSap}</span>
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Quantité</dt>
              <dd>
                {Number.isFinite(quantite) && quantite > 0 ? formatTonnes(quantite, 3) : '—'}
                {sacs ? <span className="cell-sub">{formatNombre(sacs)} sacs</span> : null}
              </dd>
            </div>
            <div>
              <dt>Incoterm</dt>
              <dd>{INCOTERM_LABELS[f.incoterm]}</dd>
            </div>
            <div>
              <dt>Transporteur</dt>
              <dd className="mono">
                {f.transporteurCode
                  ? codeEtNom(f.transporteurCode, f.transporteurNom)
                  : f.incoterm === 'Depart'
                    ? 'Sans (enlèvement client)'
                    : '—'}
              </dd>
            </div>
            <div>
              <dt>Camion</dt>
              <dd className="mono">
                {normaliserImmatriculation(f.immatriculation) || '—'}
                {f.camionCodeSap ? <span className="cell-sub mono">Code SAP {f.camionCodeSap}</span> : null}
              </dd>
            </div>
            <div>
              <dt>Chauffeur</dt>
              <dd>
                {f.chauffeurNom.trim() || '—'}
                {f.chauffeurCin.trim() ? (
                  <span className="cell-sub mono">CIN {f.chauffeurCin.trim()}</span>
                ) : null}
              </dd>
            </div>
          </dl>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 14, display: 'inline-flex', gap: 6 }}>
            <FiCheck aria-hidden="true" />{' '}
            {valide ? 'Formulaire complet, prêt à créer.' : 'Complétez les champs obligatoires (*).'}
          </p>
        </aside>
      </div>
    </PageShell>
  )
}
