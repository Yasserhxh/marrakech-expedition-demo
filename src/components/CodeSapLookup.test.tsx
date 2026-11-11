import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ResultatLookup } from '@/types'
import { AIDE_CODE_NON_VERIFIE, CodeSapLookup, DEBOUNCE_MS, type LigneLookup } from './CodeSapLookup'

const CLIENTS: ResultatLookup<LigneLookup> = {
  source: 'Sap',
  items: [
    { code: '10045812', nom: 'SOCIÉTÉ ATLAS BÉTON', sub: 'Marrakech' },
    { code: '10046120', nom: 'BENJELLOUN TRAVAUX' },
  ],
}

function Harnais({
  rechercher,
  sapOnline = true,
  onChange = () => undefined,
}: {
  rechercher: (p: string) => Promise<ResultatLookup<LigneLookup>>
  sapOnline?: boolean
  onChange?: (code: string, item?: LigneLookup) => void
}) {
  const [code, setCode] = useState('')
  const [nom, setNom] = useState<string | undefined>()
  return (
    <CodeSapLookup
      label="Client"
      value={code}
      nomSelectionne={nom}
      sapOnline={sapOnline}
      rechercher={rechercher}
      onChange={(c, item) => {
        setCode(c)
        setNom(item?.nom)
        onChange(c, item)
      }}
    />
  )
}

describe('CodeSapLookup', () => {
  it('attend 3 chiffres puis 300 ms avant d’interroger, affiche « code — nom » et le badge SAP', async () => {
    const user = userEvent.setup()
    const rechercher = vi.fn(async () => CLIENTS)
    render(<Harnais rechercher={rechercher} />)

    const champ = screen.getByRole('combobox', { name: 'Client' })
    await user.type(champ, '10')
    await new Promise((r) => setTimeout(r, DEBOUNCE_MS + 50))
    expect(rechercher).not.toHaveBeenCalled()

    await user.type(champ, '0')
    await waitFor(() => expect(rechercher).toHaveBeenCalledWith('100'))
    expect(rechercher).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('option', { name: /10045812 — SOCIÉTÉ ATLAS BÉTON/ })).toBeInTheDocument()
    expect(screen.getByText('SAP')).toBeInTheDocument()
  })

  it('ne conserve que les chiffres (10 max)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harnais rechercher={async () => CLIENTS} onChange={onChange} />)

    await user.type(screen.getByRole('combobox', { name: 'Client' }), '1a2b')

    expect(onChange).toHaveBeenLastCalledWith('12', undefined)
  })

  it('clavier : flèche bas + Entrée choisit la ligne et remonte l’élément', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harnais rechercher={async () => CLIENTS} onChange={onChange} />)

    const champ = screen.getByRole('combobox', { name: 'Client' })
    await user.type(champ, '100')
    await screen.findByRole('listbox')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenLastCalledWith(
      '10046120',
      expect.objectContaining({ nom: 'BENJELLOUN TRAVAUX' }),
    )
    expect(champ).toHaveValue('10046120')
    expect(screen.getByText('BENJELLOUN TRAVAUX')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('réponse « Cache » : badge Cache local', async () => {
    const user = userEvent.setup()
    render(<Harnais rechercher={async () => ({ ...CLIENTS, source: 'Cache' })} />)

    await user.type(screen.getByRole('combobox', { name: 'Client' }), '100')

    expect(await screen.findByText('Cache local')).toBeInTheDocument()
  })

  it('SAP hors ligne : le code tapé est accepté tel quel avec l’aide « non vérifié »', async () => {
    const user = userEvent.setup()
    const rechercher = vi.fn(
      async (): Promise<ResultatLookup<LigneLookup>> => ({ source: 'Cache', items: [] }),
    )
    render(<Harnais rechercher={rechercher} sapOnline={false} />)

    const champ = screen.getByRole('combobox', { name: 'Client' })
    await user.type(champ, '1004')

    expect(champ).toHaveValue('1004')
    expect(screen.getByText(AIDE_CODE_NON_VERIFIE)).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('liste vide alors que SAP est en ligne : même repli « non vérifié »', async () => {
    const user = userEvent.setup()
    render(<Harnais rechercher={async () => ({ source: 'Sap', items: [] })} />)

    await user.type(screen.getByRole('combobox', { name: 'Client' }), '999')

    expect(await screen.findByText(AIDE_CODE_NON_VERIFIE)).toBeInTheDocument()
  })
})
