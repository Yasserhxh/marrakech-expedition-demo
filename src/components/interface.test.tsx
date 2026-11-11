import { useState } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/Button'
import { DataTable } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { renderApp } from '@/test/render'

describe('Button', () => {
  it('affiche la variante et ignore le clic pendant le chargement', () => {
    const onClick = vi.fn()
    renderApp(
      <Button variant="danger" size="sm" loading onClick={onClick}>
        Supprimer
      </Button>,
    )
    const bouton = screen.getByRole('button', { name: 'Supprimer' })
    expect(bouton).toHaveClass('btn-danger', 'btn-sm', 'is-loading')
    expect(bouton).toBeDisabled()
    expect(bouton).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(bouton)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('nomme un bouton sans texte visible', () => {
    renderApp(
      <Button variant="ghost" aria-label="Fermer le panneau">
        ×
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Fermer le panneau' })).toHaveClass('btn-quiet')
  })
})

describe('DataTable', () => {
  const columns = [
    {
      key: 'nom',
      header: 'Nom',
      render: (row: { nom: string; kg: number }) => row.nom,
      sortValue: (row: { nom: string }) => row.nom,
    },
    {
      key: 'kg',
      header: 'Poids',
      align: 'right' as const,
      render: (row: { kg: number }) => row.kg,
      sortValue: (row: { kg: number }) => row.kg,
    },
  ]

  it('trie les lignes', () => {
    renderApp(
      <DataTable
        caption="Essai"
        columns={columns}
        rows={[
          { nom: 'Bravo', kg: 2 },
          { nom: 'Alpha', kg: 1 },
        ]}
        rowKey={(row) => row.nom}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Trier par Nom' }))
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent('Alpha')
  })

  it('conserve les lignes pendant une actualisation', () => {
    renderApp(
      <DataTable
        caption="Essai"
        columns={columns}
        rows={[{ nom: 'Alpha', kg: 1 }]}
        rowKey={(row) => row.nom}
        refreshing
      />,
    )
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Actualisation du tableau' })).toBeInTheDocument()
  })

  it('n’ouvre pas la ligne lorsqu’un bouton interne est activé', () => {
    const onRowClick = vi.fn()
    renderApp(
      <DataTable
        caption="Essai"
        columns={[
          {
            key: 'nom',
            header: 'Nom',
            render: (row: { nom: string }) => <button type="button">Détail {row.nom}</button>,
          },
        ]}
        rows={[{ nom: 'Alpha' }]}
        rowKey={(row) => row.nom}
        onRowClick={onRowClick}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Détail Alpha' }))
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('affiche une erreur lorsqu’il n’y a aucune ligne', () => {
    renderApp(
      <DataTable
        caption="Essai"
        columns={columns}
        rows={[]}
        rowKey={(row: { nom: string }) => row.nom}
        error="Impossible de charger les commandes"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible de charger les commandes')
  })
})

function DialogueEssai() {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOuvert(true)}>
        Ouvrir
      </button>
      <Modal open={ouvert} title="Confirmer" dismissible={false} onClose={() => setOuvert(false)}>
        <button type="button">Conserver</button>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('piège le focus, se ferme avec Échap et le rend au déclencheur', () => {
    renderApp(<DialogueEssai />)
    const ouvrir = screen.getByRole('button', { name: 'Ouvrir' })
    ouvrir.focus()
    fireEvent.click(ouvrir)

    const fermer = screen.getByRole('button', { name: 'Fermer' })
    const conserver = screen.getByRole('button', { name: 'Conserver' })
    expect(fermer).toHaveFocus()

    conserver.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(fermer).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(ouvrir).toHaveFocus()
  })
})
