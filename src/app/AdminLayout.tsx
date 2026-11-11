import clsx from 'clsx'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'
import { DemoBar } from './DemoBar'
import { ToastHost } from '@/components/ToastHost'
import { useAppStore } from '@/store/useAppStore'

export function AdminLayout() {
  const repliee = useAppStore((s) => s.sidebarRepliee)
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className={clsx('admin-content', repliee && 'is-collapsed')} id="contenu">
        <DemoBar />
        <Outlet />
      </main>
      <ToastHost />
    </div>
  )
}
