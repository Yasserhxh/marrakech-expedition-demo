export const referentielKeys = {
  all: ['referentiels'] as const,
  lists: () => [...referentielKeys.all, 'list'] as const,
}
