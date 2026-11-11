import { describe, expect, it } from 'vitest'
import type { AccountInfo } from '@azure/msal-browser'
import { deduireRole, identiteDepuisCompte, ROLE_PAR_DEFAUT } from './token'

function compte(claims: Record<string, unknown>): AccountInfo {
  return {
    homeAccountId: 'h',
    environment: 'login.microsoftonline.com',
    tenantId: 't',
    username: 'y.elfassi@cimar.ma',
    localAccountId: 'l',
    name: 'Compte MSAL',
    idTokenClaims: claims,
  } as AccountInfo
}

describe('rôles Entra', () => {
  it('Admin prime sur Guichet et PontBascule', () => {
    expect(deduireRole(['PontBascule', 'Admin', 'Guichet'])).toBe('Admin')
    expect(deduireRole(['Guichet', 'PontBascule'])).toBe('Guichet')
    expect(deduireRole(['PontBascule'])).toBe('PontBascule')
  })

  it('aucun app role → rôle le moins privilégié', () => {
    expect(deduireRole(undefined)).toBe(ROLE_PAR_DEFAUT)
    expect(deduireRole(['Lecteur'])).toBe(ROLE_PAR_DEFAUT)
  })

  it('identité : name / preferred_username / roles du jeton', () => {
    const id = identiteDepuisCompte(
      compte({ name: 'Yasmine EL FASSI', preferred_username: 'yef@cimar.ma', roles: ['Guichet'] }),
    )
    expect(id).toEqual({
      nom: 'Yasmine EL FASSI',
      email: 'yef@cimar.ma',
      role: 'Guichet',
      roles: ['Guichet'],
    })
  })

  it('identité : repli sur le compte quand les claims manquent', () => {
    const id = identiteDepuisCompte(compte({}))
    expect(id.nom).toBe('Compte MSAL')
    expect(id.email).toBe('y.elfassi@cimar.ma')
    expect(id.role).toBe(ROLE_PAR_DEFAUT)
  })
})
