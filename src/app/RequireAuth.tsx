import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'

export function RequireAuth({ children }: { children: ReactNode }) {
  const utilisateur = useAppStore((s) => s.utilisateur)
  const location = useLocation()
  if (!utilisateur) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
