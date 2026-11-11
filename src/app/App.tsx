import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './AdminLayout'
import { ErrorBoundary } from './ErrorBoundary'
import { RequireAuth } from './RequireAuth'
import { AuthProvider } from '@/auth/AuthProvider'
import { ConnexionPage } from '@/features/connexion/ConnexionPage'
import { CommandesPage } from '@/features/commandes/CommandesPage'
import { NouvelleCommandePage } from '@/features/commandes/NouvelleCommandePage'
import { PeseeEntreePage } from '@/features/pesee/PeseeEntreePage'
import { PeseeSortiePage } from '@/features/pesee/PeseeSortiePage'
import { UsinePage } from '@/features/usine/UsinePage'
import { SynchronisationPage } from '@/features/synchronisation/SynchronisationPage'
import { ReferentielsPage } from '@/features/referentiels/ReferentielsPage'
import { MonitoringPage } from '@/features/monitoring/MonitoringPage'

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/connexion" element={<ConnexionPage />} />
            <Route
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/commandes" replace />} />
              <Route path="/commandes" element={<CommandesPage />} />
              <Route path="/commandes/nouvelle" element={<NouvelleCommandePage />} />
              <Route path="/pesee/entree/:id" element={<PeseeEntreePage />} />
              <Route path="/pesee/sortie/:id" element={<PeseeSortiePage />} />
              <Route path="/usine" element={<UsinePage />} />
              <Route path="/synchronisation" element={<SynchronisationPage />} />
              <Route path="/referentiels" element={<ReferentielsPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="*" element={<Navigate to="/commandes" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
