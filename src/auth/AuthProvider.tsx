import { useEffect, type ReactNode } from 'react'
import { InteractionStatus } from '@azure/msal-browser'
import { MsalProvider, useMsal } from '@azure/msal-react'
import { estModeApi } from '@/config'
import { useAppStore } from '@/store/useAppStore'
import { obtenirMsal } from './msalInstance'
import { identiteDepuisCompte } from './token'

/** Reflète le compte Entra actif dans le store (nom, e-mail, rôle issu des app roles). */
function SessionEntra() {
  const { instance, accounts, inProgress } = useMsal()
  const connecter = useAppStore((s) => s.connecter)
  const deconnecter = useAppStore((s) => s.deconnecter)
  const setRole = useAppStore((s) => s.setRole)

  useEffect(() => {
    const compte = instance.getActiveAccount() ?? accounts[0]
    if (compte) {
      if (!instance.getActiveAccount()) instance.setActiveAccount(compte)
      const identite = identiteDepuisCompte(compte)
      connecter({ nom: identite.nom, email: identite.email })
      setRole(identite.role)
    } else if (inProgress === InteractionStatus.None) {
      deconnecter()
    }
  }, [instance, accounts, inProgress, connecter, deconnecter, setRole])

  return null
}

/** `MsalProvider` uniquement en mode api ; en mode mock, la connexion reste simulée. */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!estModeApi) return <>{children}</>
  return (
    <MsalProvider instance={obtenirMsal()}>
      <SessionEntra />
      {children}
    </MsalProvider>
  )
}
