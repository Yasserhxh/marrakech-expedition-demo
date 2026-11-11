import { InteractionRequiredAuthError, type AccountInfo } from '@azure/msal-browser'
import { estModeApi } from '@/config'
import { obtenirMsal } from './msalInstance'
import { requeteConnexion, scopesApi } from './msalConfig'
import type { Role } from '@/types'

const PRIORITE_ROLES: Role[] = ['Admin', 'Guichet', 'PontBascule']
/** Sans app role dans le jeton : accès le moins privilégié (menu réduit), l'API refusera de toute façon (403). */
export const ROLE_PAR_DEFAUT: Role = 'PontBascule'

export interface IdentiteJeton {
  nom: string
  email: string
  role: Role
  roles: string[]
}

export function deduireRole(roles: readonly string[] | undefined): Role {
  return PRIORITE_ROLES.find((r) => roles?.includes(r)) ?? ROLE_PAR_DEFAUT
}

export function identiteDepuisCompte(compte: AccountInfo): IdentiteJeton {
  const claims = (compte.idTokenClaims ?? {}) as {
    name?: string
    preferred_username?: string
    roles?: string[]
  }
  const roles = Array.isArray(claims.roles) ? claims.roles : []
  return {
    nom: claims.name ?? compte.name ?? compte.username,
    email: claims.preferred_username ?? compte.username,
    role: deduireRole(roles),
    roles,
  }
}

function compteActif(): AccountInfo | null {
  const msal = obtenirMsal()
  const actif = msal.getActiveAccount()
  if (actif) return actif
  const premier = msal.getAllAccounts()[0]
  if (premier) msal.setActiveAccount(premier)
  return premier ?? null
}

/** Jeton d'accès pour l'API (silencieux, sinon redirection interactive). `null` en mode mock. */
export async function obtenirTokenApi(): Promise<string | null> {
  if (!estModeApi) return null
  const msal = obtenirMsal()
  const account = compteActif()
  if (!account) {
    await msal.acquireTokenRedirect(requeteConnexion())
    return null
  }
  try {
    const resultat = await msal.acquireTokenSilent({ scopes: scopesApi(), account })
    return resultat.accessToken
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await msal.acquireTokenRedirect({ scopes: scopesApi(), account })
      return null
    }
    throw e
  }
}

export async function demanderConnexion(): Promise<void> {
  if (!estModeApi) return
  await obtenirMsal().loginRedirect(requeteConnexion())
}

export async function demanderDeconnexion(): Promise<void> {
  if (!estModeApi) return
  const msal = obtenirMsal()
  await msal.logoutRedirect({ account: msal.getActiveAccount() ?? undefined })
}
