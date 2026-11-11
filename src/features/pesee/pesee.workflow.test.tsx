import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/app/queryClient'
import { reinitialiserDemonstration } from '@/app/reinitialiserDemo'
import { MonitoringPage } from '@/features/monitoring/MonitoringPage'
import { PeseeEntreePage } from '@/features/pesee/PeseeEntreePage'
import { PeseeSortiePage } from '@/features/pesee/PeseeSortiePage'
import { services } from '@/services'
import { useAppStore } from '@/store/useAppStore'

function afficher(path: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/pesee/entree/:id" element={<PeseeEntreePage />} />
          <Route path="/pesee/sortie/:id" element={<PeseeSortiePage />} />
          <Route path="/commandes" element={<p>Liste des commandes</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('pesée d’entrée', () => {
  it('explique pourquoi la tare ne peut pas être enregistrée', async () => {
    afficher('/pesee/entree/32243')
    const bouton = await screen.findByRole('button', { name: 'Enregistrer la tare' })
    expect(bouton).toBeDisabled()
    expect(bouton).toHaveAttribute('aria-describedby', 'motif-tare')
    expect(screen.getAllByText(/Aucun camion sur le pont/).length).toBeGreaterThan(0)
  })

  it('affiche la tare confirmée puis retire cet écran si la démo est réinitialisée', async () => {
    const spy = vi.spyOn(services.pesee, 'validerTare')
    useAppStore.getState().setPoids({
      lectureKg: 16000,
      stable: true,
      enCours: true,
      connecte: true,
      lecturesIdentiques: 15,
    })
    afficher('/pesee/entree/32243')
    const bouton = await screen.findByRole('button', { name: 'Enregistrer la tare' })
    expect(useAppStore.getState().poids.stable).toBe(true)
    expect(bouton).toBeEnabled()
    fireEvent.click(bouton)
    fireEvent.click(bouton)
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: 'Enregistrer la tare' })).not.toBeInTheDocument()
    const confirmations = await screen.findAllByText(/Tare enregistrée/)
    expect(confirmations.some((el) => /16[\s\u202f\u00a0]000 kg/.test(el.textContent ?? ''))).toBe(true)
    expect(screen.getByText(/Bon de chargement BC-MRK-/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Voir les camions dans l'usine" })).toBeInTheDocument()

    reinitialiserDemonstration()
    expect(await screen.findByRole('button', { name: 'Enregistrer la tare' })).toBeDisabled()
    expect(screen.queryByText(/Tare enregistrée/)).not.toBeInTheDocument()
    expect(useAppStore.getState().toasts.some((t) => t.message.includes('Tare validée'))).toBe(false)
    spy.mockRestore()
  })

  it('n’offre pas l’autorisation de pesée au pont-bascule', async () => {
    useAppStore.getState().setRole('PontBascule')
    afficher('/pesee/entree/32241')
    expect(await screen.findByRole('button', { name: 'Retour aux commandes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Autoriser la pesée/ })).not.toBeInTheDocument()
  })
})

describe('pesée de sortie', () => {
  it('affiche le net calculé à partir de la tare enregistrée', async () => {
    useAppStore.getState().setPoids({
      lectureKg: 40000,
      stable: false,
      enCours: true,
      connecte: true,
      lecturesIdentiques: 4,
    })
    afficher('/pesee/sortie/32246')
    expect(await screen.findByText(/22[\s\u202f\u00a0]880 kg/)).toBeInTheDocument()
    const bouton = screen.getByRole('button', { name: 'Enregistrer le poids brut' })
    expect(bouton).toBeDisabled()
    expect(screen.getAllByText(/Stabilisation en cours — 4 lectures sur 15/).length).toBeGreaterThan(0)
  })

  it('ne propose pas la file SAP au pont-bascule après une pesée hors ligne', async () => {
    useAppStore.getState().setRole('PontBascule')
    useAppStore.getState().setPoids({
      lectureKg: 45120,
      stable: true,
      enCours: true,
      connecte: true,
      lecturesIdentiques: 15,
    })
    afficher('/pesee/sortie/32246')
    fireEvent.click(await screen.findByRole('button', { name: /Enregistrer/ }))
    expect(await screen.findByText(/SAP n’a pas reçu/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /file SAP/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour aux commandes' })).toBeInTheDocument()
  })
})

describe('monitoring', () => {
  it('place les incidents simulés avant le détail technique', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MonitoringPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findAllByText(/télémétrie simulée/i)).not.toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Incidents' })).toBeInTheDocument()
    expect(screen.getByText('8f3c2a1e-6b7d-4f0a-9c21-5e8d7a6b4c3f')).toBeInTheDocument()
    const incident = screen.getByRole('heading', { name: 'Incidents' })
    const latence = screen.getByRole('heading', { name: 'Latence HTTP' })
    expect(incident.compareDocumentPosition(latence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
