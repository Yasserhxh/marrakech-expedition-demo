import { useQuery } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { queryClient } from '@/app/queryClient'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { commandeKeys } from '@/features/commandes/api/keys'
import { useCommandes } from '@/features/commandes/hooks/useCommandes'
import { renderApp } from '@/test/render'

function Compte() {
  const commandes = useCommandes()
  return <span>{commandes.data?.length ?? 'vide'}</span>
}

function Double() {
  useCommandes()
  useCommandes()
  return null
}

function Panne() {
  const requete = useQuery({
    queryKey: ['panne-test'],
    queryFn: () => Promise.reject(new Error('Client bloqué crédit (SAP: KI-123)')),
    retry: false,
  })
  if (requete.isError) return <p>{requete.error.message}</p>
  return <p>chargement</p>
}

describe('architecture des requêtes', () => {
  it('fournit les commandes simulées', async () => {
    renderApp(
      <QueryProvider>
        <Compte />
      </QueryProvider>,
    )
    expect(await screen.findByText('12')).toBeInTheDocument()
  })

  it('réutilise une seule entrée de cache pour la liste', () => {
    renderApp(<Double />)
    expect(queryClient.getQueryCache().findAll({ queryKey: commandeKeys.all })).toHaveLength(1)
  })

  it("l'invalidation relit la source simulée", async () => {
    renderApp(<Compte />)
    expect(await screen.findByText('12')).toBeInTheDocument()
    queryClient.setQueryData(commandeKeys.lists(), [])
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument())
    await queryClient.invalidateQueries({ queryKey: commandeKeys.lists() })
    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument())
  })

  it('expose le message métier d’une requête en échec', async () => {
    renderApp(<Panne />)
    expect(await screen.findByText('Client bloqué crédit (SAP: KI-123)')).toBeInTheDocument()
  })

  it('ne rejoue pas automatiquement les mutations', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false)
  })
})
