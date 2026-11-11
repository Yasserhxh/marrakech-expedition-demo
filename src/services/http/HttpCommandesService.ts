import type { CommandesService, FiltreCommandes, ListeCommandes } from '@/services/types'
import type { Chauffeur, Commande, Pont } from '@/types'
import type { ApiClient } from './apiClient'
import type { CommandeDetailDto, CommandeDto, PageDto, SyntheseDto } from './dto'
import {
  versCommande,
  versCommandeDetail,
  versCreerCommandeRequest,
  versSynthese,
  versSyncOperation,
} from './mappers'

/** Taille de page unique : l'écran « Commandes du jour » n'est pas paginé (un jour ≈ < 200 commandes). */
export const TAILLE_PAGE = 200

export interface HttpCommandesDeps {
  api: ApiClient
  /** Référentiel chauffeurs courant, pour relier `chauffeur`/`chauffeurCin` à un id. */
  chauffeurs: () => Chauffeur[]
}

function estCommandeDto(x: unknown): x is CommandeDto {
  return typeof x === 'object' && x !== null && 'id' in x && 'statut' in x && 'clientCode' in x
}

export function creerHttpCommandesService({ api, chauffeurs }: HttpCommandesDeps): CommandesService {
  const obtenir = async (commandeId: number): Promise<Commande> => {
    const dto = await api.get<CommandeDetailDto>(`/commandes/${commandeId}`)
    return versCommandeDetail(dto, chauffeurs())
  }

  /** Les actions renvoient la commande si l'API la fournit, sinon on relit le détail. */
  const posterPuisRelire = async (commandeId: number, chemin: string, body: unknown): Promise<Commande> => {
    const reponse = await api.post<unknown>(`/commandes/${commandeId}/${chemin}`, body)
    return estCommandeDto(reponse) ? versCommande(reponse, chauffeurs()) : obtenir(commandeId)
  }

  return {
    async lister(filtre: FiltreCommandes = {}): Promise<ListeCommandes> {
      const page = await api.get<PageDto<CommandeDto>>('/commandes', {
        query: {
          date: filtre.date,
          statut: filtre.statut,
          origine: filtre.origine,
          q: filtre.q,
          page: 1,
          pageSize: TAILLE_PAGE,
        },
      })
      const refChauffeurs = chauffeurs()
      return {
        commandes: page.items.map((dto) => versCommande(dto, refChauffeurs)),
        syncOps: page.items
          .map(versSyncOperation)
          .filter((op): op is NonNullable<typeof op> => op !== undefined),
        total: page.total,
      }
    },

    obtenir,

    async creerLocale(input) {
      const dto = await api.post<CommandeDto>('/commandes', versCreerCommandeRequest(input))
      return versCommande(dto, chauffeurs())
    },

    autoriserPesee: (commandeId, pont: Pont) =>
      posterPuisRelire(commandeId, 'autoriser-entree', { pontBascule: pont }),

    autoriserSecondPesage: (commandeId, pont: Pont) =>
      posterPuisRelire(commandeId, 'autoriser-sortie', { pontBascule: pont }),

    annuler: (commandeId, motif) => posterPuisRelire(commandeId, 'annuler', { motif }),

    async synthese() {
      return versSynthese(await api.get<SyntheseDto>('/commandes/synthese'))
    },
  }
}
