import type { NouvelElement, ReferentielsService } from '@/services/types'
import { jeuDemo } from '@/services/mock/jeuDemo'
import { verifierSignal } from '@/services/mock/signal'
import type { ReferentielKind } from '@/types'

const PREFIXES: Record<ReferentielKind, string> = {
  clients: 'c',
  chantiers: 'ch',
  produits: 'p',
  transporteurs: 't',
  camions: 'v',
  chauffeurs: 'd',
}

export const mockReferentielsService: ReferentielsService = {
  async lister(options) {
    verifierSignal(options?.signal)
    return jeuDemo.referentiels()
  },

  async ajouter<K extends ReferentielKind>(kind: K, element: NouvelElement<K>) {
    const liste = jeuDemo.referentiels()[kind]
    const id = `${PREFIXES[kind]}${liste.length + 1}-${Date.now().toString(36)}`
    jeuDemo.ajouterReferentiel(kind, { ...element, id })
  },
}
