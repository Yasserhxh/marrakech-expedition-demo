import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WeightDisplay } from '@/components/WeightDisplay'
import { SynchronisationPage } from '@/features/synchronisation/SynchronisationPage'
import { useAppStore } from '@/store/useAppStore'
import { renderApp } from '@/test/render'

describe('présentation de la pesée', () => {
  it('distingue un pont vide d’un poids en cours de stabilisation', () => {
    const { rerender } = renderApp(
      <WeightDisplay
        label="Tare en direct"
        pont="PB22"
        onPontChange={() => undefined}
        lectureKg={0}
        stable={false}
        derniereLectureUtc={null}
        connecte
        enCours={false}
      />,
    )
    expect(screen.getByText(/PB22 · Aucun camion/)).toBeInTheDocument()
    expect(screen.getByText('Aucun camion sur le pont')).toBeInTheDocument()

    rerender(
      <WeightDisplay
        label="Tare en direct"
        pont="PB22"
        onPontChange={() => undefined}
        lectureKg={12000}
        stable={false}
        derniereLectureUtc={null}
        connecte
        enCours
      />,
    )
    expect(screen.getByText(/Stabilisation en cours/)).toBeInTheDocument()
    expect(screen.queryByText(/Aucun camion/)).not.toBeInTheDocument()
  })
})

describe('synchronisation', () => {
  it('laisse la relance inactive tant que SAP est hors ligne', async () => {
    renderApp(<SynchronisationPage />)
    const bouton = await screen.findByRole('button', { name: 'Réessayer' })
    expect(bouton).toBeDisabled()
    useAppStore.setState({ sapOnline: true })
    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeEnabled()
  })
})
