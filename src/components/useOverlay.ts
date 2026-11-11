import { useEffect, useRef, type RefObject } from 'react'

/** Pile des overlays ouverts : seul le dernier ouvert réagit à Échap. */
const pile: symbol[] = []

/**
 * Comportement commun Modal / Drawer : focus à l'ouverture, Échap pour fermer
 * (uniquement l'overlay du dessus), focus rendu au déclencheur à la fermeture.
 * `onClose` est lu via une ref : un parent qui passe une nouvelle fonction à
 * chaque rendu ne relance pas l'effet (sinon le focus saute à chaque frappe).
 */
export function useOverlay(open: boolean, onClose: () => void, ref: RefObject<HTMLElement>) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const jeton = Symbol('overlay')
    pile.push(jeton)
    const precedent = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pile[pile.length - 1] === jeton) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      pile.splice(pile.indexOf(jeton), 1)
      precedent?.focus()
    }
  }, [open, ref])
}
