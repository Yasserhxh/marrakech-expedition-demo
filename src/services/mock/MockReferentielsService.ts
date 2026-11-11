import type { NouvelElement, ReferentielsService } from '@/services/types'
import { useAppStore } from '@/store/useAppStore'
import type { ReferentielKind, Referentiels } from '@/types'

const PREFIXES: Record<ReferentielKind, string> = {
  clients: 'c',
  chantiers: 'ch',
  produits: 'p',
  transporteurs: 't',
  camions: 'v',
  chauffeurs: 'd',
}

export const mockReferentielsService: ReferentielsService = {
  ajouter<K extends ReferentielKind>(kind: K, element: NouvelElement<K>) {
    const st = useAppStore.getState()
    const liste = st.referentiels[kind] as Referentiels[K]
    const id = `${PREFIXES[kind]}${liste.length + 1}-${Date.now().toString(36)}`
    const nouveau = { ...element, id } as Referentiels[K][number]
    st.setReferentiels({ ...st.referentiels, [kind]: [...liste, nouveau] })
    st.pousserToast('success', 'Élément ajouté au référentiel (mémoire uniquement)')
  },
}
