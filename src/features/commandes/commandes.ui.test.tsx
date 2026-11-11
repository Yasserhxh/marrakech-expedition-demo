import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { queryClient } from '@/app/queryClient'
import { CommandesPage } from '@/features/commandes/CommandesPage'
import { NouvelleCommandePage } from '@/features/commandes/NouvelleCommandePage'
import { services } from '@/services'
import { useAppStore } from '@/store/useAppStore'
import { renderApp } from '@/test/render'

function choisir(libelle: RegExp, texte: string, option: RegExp) {
  const champ = screen.getByRole('combobox', { name: libelle })
  fireEvent.focus(champ)
  fireEvent.change(champ, { target: { value: texte } })
  fireEvent.mouseDown(screen.getByRole('option', { name: option }))
}

describe('commandes du jour', () => {
  it('aligne les indicateurs sur les commandes chargées', async () => {
    const commandes = await services.commandes.lister()
    renderApp(<CommandesPage />)
    expect(screen.getByRole('button', { name: /À peser/ })).toHaveTextContent(
      String(commandes.filter((c) => c.statut === 'Creee' || c.statut === 'EntreeAutorisee').length),
    )
    expect(screen.getByRole('button', { name: /Dans l'usine/ })).toHaveTextContent(
      String(commandes.filter((c) => c.statut === 'DansUsine' || c.statut === 'SortieAutorisee').length),
    )
  })

  it('filtre par origine, trie, vide la recherche et réinitialise', async () => {
    const total = (await services.commandes.lister()).length
    const locales = (await services.commandes.lister()).filter((c) => c.origine === 'Locale').length
    const nom = (n: number) => (n > 1 ? 'commandes' : 'commande')
    renderApp(<CommandesPage />)

    fireEvent.change(screen.getByLabelText('Origine'), { target: { value: 'Locale' } })
    expect(screen.getByText(`${locales} ${nom(locales)} sur ${total}`)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Trier par Client' }))
    expect(screen.getByRole('columnheader', { name: 'Client' })).toHaveAttribute('aria-sort', 'ascending')

    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'zzzz-introuvable' } })
    expect(screen.getByText('Aucune commande ne correspond')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Effacer la recherche' }))
    expect(screen.getByLabelText('Rechercher')).toHaveValue('')

    const reinitialiser = screen.getAllByRole('button', { name: 'Réinitialiser les filtres' })[0]
    expect(reinitialiser).toBeDefined()
    fireEvent.click(reinitialiser as HTMLElement)
    expect(screen.getByText(`${total} commandes`)).toBeInTheDocument()
  })

  it('ouvre le détail au clavier et rend le focus', () => {
    renderApp(<CommandesPage />)
    const cellule = screen.getByText(/EL OUAFI/i)
    const ligne = cellule.closest('tr')
    expect(ligne).toBeTruthy()
    ligne?.focus()
    fireEvent.keyDown(ligne as HTMLElement, { key: 'Enter' })
    expect(screen.getByRole('dialog', { name: /Commande/ })).toBeInTheDocument()
    expect(screen.getByText('Synchronisation')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(ligne).toHaveFocus()
  })

  it('conserve les lignes visibles pendant un rafraîchissement', async () => {
    renderApp(<CommandesPage />)
    expect(screen.getByText('12 commandes')).toBeInTheDocument()
    await queryClient.invalidateQueries()
    await waitFor(() => expect(screen.getByText('12 commandes')).toBeInTheDocument())
    expect(screen.getByText(/EL OUAFI/i)).toBeInTheDocument()
  })

  it('sépare le nom, le chantier et le chauffeur de leurs identifiants', () => {
    renderApp(<CommandesPage />)
    const ligne = screen.getAllByRole('row').find((tr) => {
      const texte = tr.textContent ?? ''
      return texte.includes('SOCIÉTÉ ATLAS BÉTON') && texte.includes('Sidi Ghanem')
    })
    expect(ligne).toBeTruthy()
    fireEvent.click(ligne as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: /Commande/ })
    const client = within(dialog).getByText('SOCIÉTÉ ATLAS BÉTON')
    expect(client).toHaveClass('info-value__primary')
    expect(client.textContent).not.toContain('0010045812')
    expect(within(dialog).getByText('SAP 0010045812')).toHaveClass('info-value__meta')
    const chantier = within(dialog).getByText('Centrale à béton Sidi Ghanem')
    expect(chantier.textContent).not.toContain('Marrakech')
    expect(chantier.parentElement?.querySelector('.info-value__meta')).toHaveTextContent('Marrakech')
    const chauffeur = within(dialog).getByText('Mohamed AIT BRAHIM')
    expect(chauffeur.textContent).not.toContain('EE412367')
    expect(chauffeur.parentElement?.querySelector('.info-value__meta')).toHaveTextContent('CIN EE412367')
  })
})

describe('création de commande locale', () => {
  it('signale les champs invalides sans créer de commande', async () => {
    renderApp(<NouvelleCommandePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Créer la commande' }))
    expect(screen.getByText('Sélectionnez un client')).toBeInTheDocument()
    expect(document.activeElement).toHaveAttribute('id', 'champ-client')
    fireEvent.change(screen.getByLabelText(/Quantité/), { target: { value: '99' } })
    expect(screen.getByLabelText(/Quantité/)).toHaveValue('99')
    expect(screen.getByText('Maximum 40 t par camion')).toBeInTheDocument()
    expect(await services.commandes.lister()).toHaveLength(12)
  })

  it('conserve la saisie si la création échoue, puis réussit une seule fois', async () => {
    const original = services.commandes.creerLocale
    services.commandes.creerLocale = () => Promise.reject(new Error('Enregistrement impossible'))
    try {
      renderApp(<NouvelleCommandePage />)
      choisir(/^Client/, 'benjelloun', /BENJELLOUN TRAVAUX/)
      choisir(/^Chantier/, 'targa', /Villas Targa/)
      choisir(/^Produit/, 'cpj 45 vrac', /CPJ 45 vrac/)
      choisir(/^Transporteur/, 'tensift', /STM TENSIFT/)
      choisir(/^Camion/, '12345', /12345-A-6/)
      choisir(/^Chauffeur/, 'rachid', /Rachid EL MOUDDEN/)

      fireEvent.click(screen.getByRole('button', { name: 'Créer la commande' }))
      expect(await screen.findByText('Enregistrement impossible')).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /^Client/ })).toHaveValue('BENJELLOUN TRAVAUX')
      expect(await services.commandes.lister()).toHaveLength(12)

      services.commandes.creerLocale = original
      fireEvent.click(screen.getByRole('button', { name: 'Créer la commande' }))
      await waitFor(async () => {
        expect(await services.commandes.lister()).toHaveLength(13)
      })
      expect(useAppStore.getState().toasts.filter((t) => t.tone === 'success')).toHaveLength(1)
    } finally {
      services.commandes.creerLocale = original
    }
  })

  it('bloque la création lorsque SAP est en ligne', async () => {
    useAppStore.setState({ sapOnline: true })
    renderApp(<NouvelleCommandePage />)
    expect(screen.getByRole('button', { name: 'Créer la commande' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Créer la commande' }))
    expect(await services.commandes.lister()).toHaveLength(12)
  })
})
