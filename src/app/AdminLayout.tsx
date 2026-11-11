import { useEffect } from 'react'
import clsx from 'clsx'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'
import { DemoBar } from './DemoBar'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastHost } from '@/components/ToastHost'
import { estModeApi } from '@/config'
import { useAppStore } from '@/store/useAppStore'

/** Période de sonde `/sap/statut` (l'API met le résultat en cache 30 s). */
export const PERIODE_SONDE_SAP_MS = 30_000

/** Mode api : chargement initial des données puis sonde SAP périodique → pastille « SAP en ligne ». */
function ChargementInitialApi() {
  const refresh = useAppStore((s) => s.refresh)
  const rafraichirSapStatut = useAppStore((s) => s.rafraichirSapStatut)

  useEffect(() => {
    void refresh()
    void rafraichirSapStatut()
    const minuteur = window.setInterval(() => void rafraichirSapStatut(), PERIODE_SONDE_SAP_MS)
    return () => window.clearInterval(minuteur)
  }, [refresh, rafraichirSapStatut])

  return null
}

export function AdminLayout() {
  const repliee = useAppStore((s) => s.sidebarRepliee)
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className={clsx('admin-content', repliee && 'is-collapsed')} id="contenu">
        {estModeApi ? <ChargementInitialApi /> : null}
        <DemoBar />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <ToastHost />
    </div>
  )
}
