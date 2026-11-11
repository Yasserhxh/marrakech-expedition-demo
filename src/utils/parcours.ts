import type { Commande, Role } from '@/types'

const GUICHET: Role[] = ['Guichet', 'Admin']
const TOUS: Role[] = ['Guichet', 'PontBascule', 'Admin']

export interface LienSuite {
  libelle: string
  vers: string
  roles: Role[]
}

export interface EtapeCourante {
  titre: string
  explication: string
  lien?: LienSuite
}

/** Lecture de l'étape déjà portée par le statut. Ne décide d'aucune transition. */
export function etapeCourante(commande: Commande): EtapeCourante {
  const id = commande.id
  switch (commande.statut) {
    case 'Creee':
      return {
        titre: 'Autorisation d’entrée',
        explication: 'Le guichet doit autoriser la pesée avant l’enregistrement de la tare.',
        lien: { libelle: 'Ouvrir la pesée d’entrée', vers: `/pesee/entree/${id}`, roles: GUICHET },
      }
    case 'EntreeAutorisee':
      return {
        titre: 'Pesée d’entrée',
        explication: 'La tare n’est pas encore enregistrée.',
        lien: { libelle: 'Ouvrir la pesée d’entrée', vers: `/pesee/entree/${id}`, roles: TOUS },
      }
    case 'DansUsine':
      return {
        titre: 'Camion dans l’usine',
        explication: 'Le second pesage doit être autorisé avant la sortie.',
        lien: { libelle: 'Voir dans l’usine', vers: '/usine', roles: TOUS },
      }
    case 'SortieAutorisee':
      return {
        titre: 'Pesée de sortie',
        explication: 'Le poids brut peut être validé au pont.',
        lien: { libelle: 'Ouvrir la pesée de sortie', vers: `/pesee/sortie/${id}`, roles: TOUS },
      }
    case 'Livree':
    case 'Synchronisee': {
      const sapDistincte = commande.synchro === 'EnAttente' || commande.synchro === 'EnCours' || commande.synchro === 'Erreur'
      return {
        titre: 'Pesée terminée',
        explication: sapDistincte
          ? 'La livraison est enregistrée. La synchronisation SAP reste une étape distincte.'
          : 'La livraison est enregistrée.',
        lien: sapDistincte
          ? { libelle: 'Ouvrir la file SAP', vers: '/synchronisation', roles: GUICHET }
          : undefined,
      }
    }
    case 'ErreurSynchro':
      return {
        titre: 'Synchronisation en erreur',
        explication: 'La pesée n’est pas à refaire. La relance se fait dans la file SAP.',
        lien: { libelle: 'Ouvrir la file SAP', vers: '/synchronisation', roles: GUICHET },
      }
    case 'Annulee':
      return {
        titre: 'Commande annulée',
        explication: 'Aucune pesée n’est possible pour cette commande.',
      }
    default:
      return { titre: 'Étape en cours', explication: '' }
  }
}

export function lienPourRole(lien: LienSuite | undefined, role: Role): LienSuite | undefined {
  if (!lien || !lien.roles.includes(role)) return undefined
  return lien
}

export function peutAutoriserPesee(role: Role): boolean {
  return role === 'Guichet' || role === 'Admin'
}
