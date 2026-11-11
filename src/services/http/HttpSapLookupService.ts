import type { SapLookupService } from '@/services/types'
import type { CamionSap, ChantierSap, ClientSap, ResultatLookup, TransporteurSap } from '@/types'
import { estApiError, type ApiClient } from './apiClient'
import type {
  CamionSapDto,
  ChantierSapDto,
  ClientSapDto,
  ItemLookupDto,
  ListeLookupDto,
  TransporteurSapDto,
} from './dto'
import {
  versCamionSap,
  versChantierSap,
  versClientSap,
  versItemLookup,
  versListeLookup,
  versTransporteurSap,
} from './mappers'

/** `^\d{1,10}$` : tous les codes SAP font au plus 10 chiffres (décision 11/11) ; l'API renvoie 400 sinon. */
export const CODE_SAP_REGEX = /^\d{1,10}$/

const AUCUN: ResultatLookup<never> = { source: 'Cache', items: [] }

/** 404 = code inconnu : résultat vide (l'écran laisse le code libre), toute autre erreur remonte. */
async function itemOuVide<D, T>(
  appel: Promise<ItemLookupDto<D>>,
  mapper: (d: D) => T,
): Promise<ResultatLookup<T>> {
  try {
    return versItemLookup(await appel, mapper)
  } catch (e) {
    if (estApiError(e) && e.status === 404) return AUCUN
    throw e
  }
}

export function creerHttpSapLookupService(api: ApiClient): SapLookupService {
  return {
    async rechercherClients(prefixe): Promise<ResultatLookup<ClientSap>> {
      if (!CODE_SAP_REGEX.test(prefixe)) return AUCUN
      return versListeLookup(
        await api.get<ListeLookupDto<ClientSapDto>>('/sap/clients', { query: { prefixe } }),
        versClientSap,
      )
    },

    async chantiersDuClient(codeClient): Promise<ResultatLookup<ChantierSap>> {
      if (!CODE_SAP_REGEX.test(codeClient)) return AUCUN
      return versListeLookup(
        await api.get<ListeLookupDto<ChantierSapDto>>(
          `/sap/clients/${encodeURIComponent(codeClient)}/chantiers`,
        ),
        versChantierSap,
      )
    },

    transporteur(code): Promise<ResultatLookup<TransporteurSap>> {
      if (!CODE_SAP_REGEX.test(code)) return Promise.resolve(AUCUN)
      return itemOuVide(
        api.get<ItemLookupDto<TransporteurSapDto>>(`/sap/transporteurs/${encodeURIComponent(code)}`, {
          silencieux: true,
        }),
        versTransporteurSap,
      )
    },

    camion(code): Promise<ResultatLookup<CamionSap>> {
      if (!CODE_SAP_REGEX.test(code)) return Promise.resolve(AUCUN)
      return itemOuVide(
        api.get<ItemLookupDto<CamionSapDto>>(`/sap/camions/${encodeURIComponent(code)}`, {
          silencieux: true,
        }),
        versCamionSap,
      )
    },
  }
}
