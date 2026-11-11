import { create } from 'zustand'
import type { Pont, Role, Toast, ToastTone, Utilisateur } from '@/types'

export interface PoidsState {
  pont: Pont
  lectureKg: number
  stable: boolean
  derniereLectureUtc: string | null
  connecte: boolean
  enCours: boolean
}

export interface AppState {
  utilisateur: Utilisateur | null
  role: Role
  sapOnline: boolean
  demoBarOuverte: boolean
  sidebarRepliee: boolean
  toasts: Toast[]
  poids: PoidsState
  compteurToast: number

  connecter: (u: Utilisateur) => void
  deconnecter: () => void
  setRole: (r: Role) => void
  setSapOnline: (v: boolean) => void
  toggleDemoBar: () => void
  toggleSidebar: () => void
  /** Remet la pesée simulée et les toasts. Ne touche pas à la session ni au rôle. */
  reinitialiserInterface: () => void

  setPoids: (patch: Partial<PoidsState>) => void
  pousserToast: (tone: ToastTone, message: string) => void
  fermerToast: (id: number) => void
}

const POIDS_INITIAL: PoidsState = {
  pont: 'PB22',
  lectureKg: 0,
  stable: false,
  derniereLectureUtc: null,
  connecte: true,
  enCours: false,
}

export const useAppStore = create<AppState>()((set, get) => ({
  utilisateur: null,
  role: 'Guichet',
  sapOnline: false,
  demoBarOuverte: true,
  sidebarRepliee: false,
  toasts: [],
  poids: { ...POIDS_INITIAL },
  compteurToast: 1,

  connecter: (utilisateur) => set({ utilisateur }),
  deconnecter: () => set({ utilisateur: null }),
  setRole: (role) => set({ role }),
  setSapOnline: (sapOnline) => set({ sapOnline }),
  toggleDemoBar: () => set((s) => ({ demoBarOuverte: !s.demoBarOuverte })),
  toggleSidebar: () => set((s) => ({ sidebarRepliee: !s.sidebarRepliee })),
  reinitialiserInterface: () => set({ toasts: [], compteurToast: 1, poids: { ...POIDS_INITIAL } }),

  setPoids: (patch) => set((s) => ({ poids: { ...s.poids, ...patch } })),

  pousserToast: (tone, message) => {
    const id = get().compteurToast
    set((s) => ({
      toasts: [...s.toasts, { id, tone, message }],
      compteurToast: id + 1,
    }))
    const duree = tone === 'error' ? 9000 : tone === 'warning' ? 6500 : 4500
    window.setTimeout(() => get().fermerToast(id), duree)
  },
  fermerToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
