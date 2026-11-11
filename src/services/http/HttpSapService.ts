import type { SapService } from '@/services/types'
import type { ApiClient } from './apiClient'
import type { SapStatutDto } from './dto'
import { versSapStatut } from './mappers'

export function creerHttpSapService(api: ApiClient): SapService {
  return {
    async statut() {
      return versSapStatut(await api.get<SapStatutDto>('/sap/statut'))
    },
  }
}
