import type { NouvelElement, ReferentielsService } from '@/services/types'
import type {
  Camion,
  Chantier,
  Chauffeur,
  Client,
  Produit,
  ReferentielKind,
  Referentiels,
  Transporteur,
} from '@/types'
import type { ApiClient } from './apiClient'
import type { CamionDto, ChantierDto, ChauffeurDto, ClientDto, ProduitDto, TransporteurDto } from './dto'
import { versChantier, versConditionnementDto, versReferentiels } from './mappers'

const KG_PAR_TONNE = 1000

export interface HttpReferentielsDeps {
  api: ApiClient
  /** Après un ajout, le store recharge le référentiel. */
  onModification: () => Promise<void>
}

type Nouveau = NouvelElement<ReferentielKind>

/** Corps `POST /referentiels/{kind}` (upsert par clé naturelle, rôle Admin). */
export function versUpsertDto(kind: ReferentielKind, element: Nouveau): unknown {
  switch (kind) {
    case 'clients': {
      const e = element as Omit<Client, 'id'>
      return { code: e.code, nom: e.nom, actif: true }
    }
    case 'chantiers': {
      const e = element as Omit<Chantier, 'id'>
      return { code: e.code, clientCode: e.clientId, nom: e.nom, actif: true }
    }
    case 'produits': {
      const e = element as Omit<Produit, 'id'>
      return {
        code: e.codeSap,
        libelle: e.libelle,
        conditionnement: versConditionnementDto(e.conditionnement),
        sacsParTonne: e.conditionnement === 'SAC' && e.poidsSacKg ? KG_PAR_TONNE / e.poidsSacKg : null,
        actif: true,
      }
    }
    case 'transporteurs': {
      const e = element as Omit<Transporteur, 'id'>
      return { code: e.code, nom: e.nom, actif: true }
    }
    case 'camions': {
      const e = element as Omit<Camion, 'id'>
      return { immatriculation: e.immatriculation, transporteurCode: e.transporteurId || null, actif: true }
    }
    case 'chauffeurs': {
      const e = element as Omit<Chauffeur, 'id'>
      return { nom: e.nom, cin: e.cin || null, actif: true }
    }
  }
}

export function creerHttpReferentielsService({
  api,
  onModification,
}: HttpReferentielsDeps): ReferentielsService {
  return {
    async charger(): Promise<Referentiels> {
      const [clients, produits, transporteurs, camions, chauffeurs] = await Promise.all([
        api.get<ClientDto[]>('/referentiels/clients', { query: { actifs: true } }),
        api.get<ProduitDto[]>('/referentiels/produits', { query: { actifs: true } }),
        api.get<TransporteurDto[]>('/referentiels/transporteurs'),
        api.get<CamionDto[]>('/referentiels/camions'),
        api.get<ChauffeurDto[]>('/referentiels/chauffeurs'),
      ])
      return versReferentiels({ clients, chantiers: [], produits, transporteurs, camions, chauffeurs })
    },

    async chantiersDuClient(clientId) {
      const dtos = await api.get<ChantierDto[]>(
        `/referentiels/clients/${encodeURIComponent(clientId)}/chantiers`,
      )
      return dtos.map(versChantier)
    },

    async ajouter(kind, element) {
      await api.post(`/referentiels/${kind}`, versUpsertDto(kind, element))
      await onModification()
    },
  }
}
