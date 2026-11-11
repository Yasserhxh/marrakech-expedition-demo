export const commandeKeys = {
  all: ['commandes'] as const,
  lists: () => [...commandeKeys.all, 'list'] as const,
}
