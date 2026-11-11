import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { queryClient } from '@/app/queryClient'
import '@/app/cacheDemo'
import { jeuDemo } from '@/services/mock/jeuDemo'
import { useAppStore } from '@/store/useAppStore'
import type { Pont } from '@/types'

const POIDS_INITIAL = {
  pont: 'PB22' as Pont,
  lectureKg: 0,
  stable: false,
  derniereLectureUtc: null,
  connecte: true,
  enCours: false,
}

beforeEach(() => {
  useAppStore.setState({
    utilisateur: null,
    role: 'Guichet',
    sapOnline: false,
    toasts: [],
    poids: { ...POIDS_INITIAL },
    compteurToast: 1,
  })
  queryClient.clear()
  jeuDemo.reinitialiser()
})

afterEach(() => {
  cleanup()
})
