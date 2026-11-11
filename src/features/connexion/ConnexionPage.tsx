import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FiLoader, FiMapPin } from 'react-icons/fi'
import { useAppStore } from '@/store/useAppStore'

const DELAI_CONNEXION_SIMULEE_MS = 700

export function ConnexionPage() {
  const utilisateur = useAppStore((s) => s.utilisateur)
  const connecter = useAppStore((s) => s.connecter)
  const navigate = useNavigate()
  const location = useLocation()
  const [enCours, setEnCours] = useState(false)

  if (utilisateur) return <Navigate to="/commandes" replace />

  const seConnecter = () => {
    setEnCours(true)
    window.setTimeout(() => {
      connecter({ nom: 'Yasmine EL FASSI', email: 'y.elfassi@cimar.ma' })
      const destination = (location.state as { from?: string } | null)?.from ?? '/commandes'
      navigate(destination, { replace: true })
    }, DELAI_CONNEXION_SIMULEE_MS)
  }

  return (
    <div className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <img src="/media/CIMAR_LOGO_Horizontal.svg" alt="CIMAR" />
        <span className="login-site">
          <FiMapPin aria-hidden="true" /> Usine M102 · Marrakech
        </span>
        <h1 id="login-title">Marrakech Expédition</h1>
        <p>
          Guichet, pont-bascule et synchronisation SAP pour l'expédition ciment, y compris lorsque SAP est
          indisponible.
        </p>
        <button type="button" className="btn-microsoft" onClick={seConnecter} disabled={enCours}>
          {enCours ? (
            <FiLoader aria-hidden="true" />
          ) : (
            <span className="ms-logo" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
          )}
          {enCours ? 'Connexion en cours…' : 'Se connecter avec Microsoft'}
        </button>
        <p style={{ fontSize: 13 }}>
          Maquette : la connexion Microsoft Entra ID est simulée, aucune donnée n'est envoyée.
        </p>
      </section>
      <aside className="login-hero" aria-hidden="true">
        <div>
          <h2>Continuer à expédier, même sans SAP</h2>
          <p>
            Commandes locales, bons de chargement et de livraison provisoires, puis synchronisation automatique
            dès le retour de SAP.
          </p>
        </div>
      </aside>
    </div>
  )
}
