import { QueryClient } from '@tanstack/react-query'

/**
 * Instance unique pour toute la vie de l'application.
 * Ne pas recréer ce client pendant le rendu React.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
