import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FiLoader, FiMapPin } from 'react-icons/fi'
import { useAuth } from '@/auth/useAuth'
import { estModeApi } from '@/config'
import { useAppStore } from '@/store/useAppStore'

export function ConnexionPage() {
  const { connecte, enCours, seConnecter } = useAuth()
  const pousserToast = useAppStore((s) => s.pousserToast)
  const navigate = useNavigate()
  const location = useLocation()
  const [clic, setClic] = useState(false)

  if (connecte) {
    const destination = (location.state as { from?: string } | null)?.from ?? '/commandes'
    return <Navigate to={destination} replace />
  }

  const connexionEnCours = clic || enCours

  const onConnecter = async () => {
    setClic(true)
    try {
      await seConnecter()
      if (!estModeApi) {
        const destination = (location.state as { from?: string } | null)?.from ?? '/commandes'
        navigate(destination, { replace: true })
      }
    } catch (e) {
      setClic(false)
      pousserToast('error', e instanceof Error ? e.message : 'Connexion impossible')
    }
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
        <button
          type="button"
          className="btn-microsoft"
          onClick={() => void onConnecter()}
          disabled={connexionEnCours}
        >
          {connexionEnCours ? (
            <FiLoader aria-hidden="true" />
          ) : (
            <span className="ms-logo" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
          )}
          {connexionEnCours ? 'Connexion en cours…' : 'Se connecter avec Microsoft'}
        </button>
        <p style={{ fontSize: 13 }}>
          {estModeApi
            ? 'Connexion Microsoft Entra ID (redirection vers login.microsoftonline.com).'
            : "Maquette : la connexion Microsoft Entra ID est simulée, aucune donnée n'est envoyée."}
        </p>
      </section>
      <aside className="login-hero" aria-hidden="true">
        <div>
          <h2>Continuer à expédier, même sans SAP</h2>
          <p>
            Commandes locales, bons de chargement et de livraison, puis synchronisation
            automatique dès le retour de SAP.
          </p>
        </div>
      </aside>
    </div>
  )
}
