export function verifierSignal(signal?: AbortSignal) {
  if (!signal?.aborted) return
  const raison = signal.reason
  if (raison instanceof Error) throw raison
  throw new DOMException('Aborted', 'AbortError')
}
