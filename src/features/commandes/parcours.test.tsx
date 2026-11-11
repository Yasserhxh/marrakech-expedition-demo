import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoBar } from '@/app/DemoBar'
import { AdminSidebar } from '@/app/AdminSidebar'
import { CommandesPage } from '@/features/commandes/CommandesPage'
import { services } from '@/services'
import { useAppStore } from '@/store/useAppStore'
import { renderApp } from '@/test/render'
import type { NouvelleCommandeInput } from '@/types'

const SAISIE: NouvelleCommandeInput = {
  clientId: 'c2',
  chantierId: 'ch3',
  produitId: 'p1',
  quantiteT: 12,
  incoterm: 'Depart',
  transporteurId: 't2',
  camionId: 'v3',
  chauffeurId: 'd3',
}

describe('parcours commandes', () => {
  it('filtre la liste sans perdre les données', () => {
    renderApp(<CommandesPage />)
    expect(screen.getByText('12 commandes')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'el ouafi' } })
    expect(screen.getByText('1 commande sur 12')).toBeInTheDocument()
    expect(screen.getByText(/EL OUAFI/i)).toBeInTheDocument()
  })

  it('affiche une commande locale dès sa création', async () => {
    renderApp(<CommandesPage />)
    await services.commandes.creerLocale(SAISIE)
    await waitFor(() => expect(screen.getByText('13 commandes')).toBeInTheDocument())
  })
})

describe('démonstration et rôles', () => {
  it('bascule SAP et réinitialise le cache visible', async () => {
    await services.commandes.creerLocale(SAISIE)
    renderApp(
      <>
        <DemoBar />
        <CommandesPage />
      </>,
    )
    expect(screen.getByText('13 commandes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(useAppStore.getState().sapOnline).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Réinitialiser les données/ }))
    await waitFor(() => expect(screen.getByText('12 commandes')).toBeInTheDocument())
    expect(useAppStore.getState().sapOnline).toBe(true)
    expect(await services.commandes.lister()).toHaveLength(12)
  })

  it('masque le monitoring hors rôle admin', () => {
    useAppStore.setState({ role: 'Guichet', utilisateur: { nom: 'Yasmine EL FASSI', email: 'y.elfassi@cimar.ma' } })
    const vue = renderApp(<AdminSidebar />)
    expect(screen.getByText('Synchronisation SAP')).toBeInTheDocument()
    expect(screen.queryByText('Monitoring')).not.toBeInTheDocument()
    vue.unmount()
    useAppStore.setState({ role: 'Admin' })
    renderApp(<AdminSidebar />)
    expect(screen.getByText('Monitoring')).toBeInTheDocument()
  })
})
