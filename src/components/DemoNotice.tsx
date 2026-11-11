import { Notice } from './Notice'
import { estModeApi } from '@/config'

/**
 * Bandeau « Démonstration » : en mode api, signale les écrans encore simulés
 * (pesées = phase 3, synchronisation = phase 5). Invisible en mode mock (tout est simulé).
 */
export function DemoNotice({ sujet }: { sujet: string }) {
  if (!estModeApi) return null
  return (
    <Notice tone="info">
      <strong>Démonstration</strong> — {sujet} : cet écran reste simulé en mémoire et n'appelle pas l'API
      (phase 5 du projet). Les commandes affichées proviennent bien de l'API.
    </Notice>
  )
}
