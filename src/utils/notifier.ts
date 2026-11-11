import { useAppStore } from '@/store/useAppStore'
import type { ToastTone } from '@/types'
import { estAnnulation, messageErreur } from '@/utils/erreurs'

export function notifier(tone: ToastTone, message: string) {
  useAppStore.getState().pousserToast(tone, message)
}

export function notifierEchec(erreur: unknown) {
  if (estAnnulation(erreur)) return
  const message = messageErreur(erreur)
  if (message) notifier('error', message)
}
