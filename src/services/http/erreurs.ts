export class ErreurHttp extends Error {
  readonly statut: number
  readonly corps: unknown

  constructor(statut: number, message: string, corps?: unknown) {
    super(message)
    this.name = 'ErreurHttp'
    this.statut = statut
    this.corps = corps
  }
}

export class ErreurReseau extends Error {
  constructor(message = 'Réseau indisponible') {
    super(message)
    this.name = 'ErreurReseau'
  }
}

export function httpNonDisponible(operation: string): never {
  throw new Error(
    `Mode HTTP sélectionné (VITE_API_MODE=http) : l'opération « ${operation} » n'est pas encore branchée sur un backend. Aucun repli vers les données simulées.`,
  )
}
