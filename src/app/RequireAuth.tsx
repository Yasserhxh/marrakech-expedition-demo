import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FiLoader } from 'react-icons/fi'
import { useAuth } from '@/auth/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { connecte, enCours } = useAuth()
  const location = useLocation()
  if (!connecte && enCours) {
    return (
      <div className="auth-pending" role="status" aria-live="polite">
        <FiLoader aria-hidden="true" /> Vérification de la session Microsoft Entra ID…
      </div>
    )
  }
  if (!connecte) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
