import { useEffect, useRef } from 'react'

const SELECTEUR =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** Piège le focus, verrouille le défilement et restaure le focus à la fermeture. */
export function useDialogue(ouvert: boolean, onFermer: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const fermerRef = useRef(onFermer)
  fermerRef.current = onFermer

  useEffect(() => {
    if (!ouvert) return
    const precedent = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const node = ref.current
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>(SELECTEUR) ?? []).filter((el) => !el.hasAttribute('disabled'))

    ;(focusables()[0] ?? node)?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        fermerRef.current()
        return
      }
      if (event.key !== 'Tab' || !node) return
      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        node.focus()
        return
      }
      const debut = items[0]
      const fin = items[items.length - 1]
      if (!debut || !fin) return
      if (event.shiftKey && document.activeElement === debut) {
        event.preventDefault()
        fin.focus()
      } else if (!event.shiftKey && document.activeElement === fin) {
        event.preventDefault()
        debut.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      precedent?.focus()
    }
  }, [ouvert])

  return ref
}
