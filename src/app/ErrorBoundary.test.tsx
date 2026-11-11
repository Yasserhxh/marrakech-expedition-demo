import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Explosif({ exploser }: { exploser: boolean }) {
  if (exploser) throw new Error('Rendu impossible')
  return <p>Contenu rendu</p>
}

function Hote() {
  const [exploser, setExploser] = useState(true)
  return (
    <ErrorBoundary>
      <button type="button" onClick={() => setExploser(false)}>
        désamorcer
      </button>
      <Explosif exploser={exploser} />
    </ErrorBoundary>
  )
}

describe('ErrorBoundary', () => {
  it('affiche la page d’erreur avec un ID de corrélation puis « Réessayer » relance le rendu', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<Hote />)
    expect(screen.getByRole('alert')).toHaveTextContent('Une erreur est survenue')
    expect(screen.getByText('Rendu impossible')).toBeInTheDocument()
    const chip = screen.getByRole('alert').querySelector('.code-chip')
    expect(chip?.textContent).toMatch(/^[0-9a-f-]{36}$/)

    // Réessayer sans corriger : l'erreur revient (nouvel ID).
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/ }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('rend les enfants quand tout va bien', () => {
    render(
      <ErrorBoundary>
        <Explosif exploser={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Contenu rendu')).toBeInTheDocument()
  })
})
