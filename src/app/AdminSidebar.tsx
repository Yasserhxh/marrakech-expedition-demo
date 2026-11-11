import clsx from 'clsx'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  FiActivity,
  FiChevronLeft,
  FiChevronRight,
  FiDatabase,
  FiFileText,
  FiLogOut,
  FiRefreshCw,
  FiTruck,
} from 'react-icons/fi'
import { useNombreSyncEnAttente } from '@/features/synchronisation/hooks/useSynchronisation'
import { useAppStore } from '@/store/useAppStore'
import type { Role } from '@/types'
import { ROLE_LABELS } from '@/types'

interface MenuItem {
  id: string
  label: string
  to: string
  icon: JSX.Element
  roles: Role[]
  /** Préfixes de routes qui activent aussi cet élément. */
  alias?: string[]
}

interface MenuGroup {
  id: string
  label: string
  items: MenuItem[]
}

const TOUS: Role[] = ['Guichet', 'PontBascule', 'Admin']

const MENU: MenuGroup[] = [
  {
    id: 'expedition',
    label: 'Expédition',
    items: [
      {
        id: 'commandes',
        label: 'Commandes du jour',
        to: '/commandes',
        icon: <FiFileText aria-hidden="true" />,
        roles: TOUS,
        alias: ['/pesee/entree'],
      },
      {
        id: 'usine',
        label: "Dans l'usine",
        to: '/usine',
        icon: <FiTruck aria-hidden="true" />,
        roles: TOUS,
        alias: ['/pesee/sortie'],
      },
      {
        id: 'synchronisation',
        label: 'Synchronisation SAP',
        to: '/synchronisation',
        icon: <FiRefreshCw aria-hidden="true" />,
        roles: ['Guichet', 'Admin'],
      },
    ],
  },
  {
    id: 'referentiels',
    label: 'Référentiels',
    items: [
      {
        id: 'referentiels',
        label: 'Clients, produits, camions',
        to: '/referentiels',
        icon: <FiDatabase aria-hidden="true" />,
        roles: ['Guichet', 'Admin'],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'monitoring',
        label: 'Monitoring',
        to: '/monitoring',
        icon: <FiActivity aria-hidden="true" />,
        roles: ['Admin'],
      },
    ],
  },
]

export function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const repliee = useAppStore((s) => s.sidebarRepliee)
  const toggle = useAppStore((s) => s.toggleSidebar)
  const role = useAppStore((s) => s.role)
  const utilisateur = useAppStore((s) => s.utilisateur)
  const deconnecter = useAppStore((s) => s.deconnecter)
  const { data: enAttenteSynchro = 0 } = useNombreSyncEnAttente()

  const estActif = (item: MenuItem) =>
    location.pathname === item.to ||
    location.pathname.startsWith(`${item.to}/`) ||
    (item.alias ?? []).some((a) => location.pathname.startsWith(a))

  const seDeconnecter = () => {
    deconnecter()
    navigate('/connexion', { replace: true })
  }

  return (
    <nav className={clsx('admin-sidebar', repliee && 'is-collapsed')} aria-label="Navigation principale">
      <div className="admin-sidebar__header">
        {!repliee ? (
          <button type="button" className="admin-sidebar__toggle" onClick={toggle} aria-label="Replier le menu">
            <FiChevronLeft size={18} aria-hidden="true" />
          </button>
        ) : null}
        <NavLink to="/commandes" className="admin-sidebar__brand" aria-label="Accueil Ecare CIMAR">
          <img src="/media/CIMAR_LOGO_Horizontal.svg" alt="CIMAR" className={repliee ? 'brand--mini' : 'brand--full'} />
        </NavLink>
        {repliee ? (
          <button type="button" className="admin-sidebar__toggle" onClick={toggle} aria-label="Déplier le menu">
            <FiChevronRight size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="admin-sidebar__groups">
        {MENU.map((groupe) => {
          const visibles = groupe.items.filter((i) => i.roles.includes(role))
          if (visibles.length === 0) return null
          return (
            <div key={groupe.id} className="admin-sidebar__group">
              {!repliee ? <div className="admin-sidebar__group-label">{groupe.label}</div> : null}
              {visibles.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={clsx('admin-sidebar__item', estActif(item) && 'is-active')}
                  aria-current={estActif(item) ? 'page' : undefined}
                  title={repliee ? item.label : undefined}
                >
                  <span className="admin-sidebar__icon">{item.icon}</span>
                  {!repliee ? (
                    <span className="admin-sidebar__label">
                      {item.label}
                      {item.id === 'synchronisation' && enAttenteSynchro > 0 ? (
                        <span className="admin-sidebar__badge" aria-label={`${enAttenteSynchro} opérations en attente`}>
                          {enAttenteSynchro}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          )
        })}
      </div>

      <div className="admin-sidebar__footer">
        {!repliee ? (
          <div className="admin-sidebar__user">
            <div className="user-name">{utilisateur?.nom ?? 'Agent'}</div>
            <div className="user-role">
              {ROLE_LABELS[role]} · Usine M102 Marrakech
            </div>
          </div>
        ) : null}
        <button type="button" className="admin-sidebar__logout" onClick={seDeconnecter} aria-label="Déconnexion" title="Déconnexion">
          <FiLogOut size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
