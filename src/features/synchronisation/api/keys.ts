export const syncKeys = {
  all: ['sync'] as const,
  lists: () => [...syncKeys.all, 'list'] as const,
  clientsBloques: () => [...syncKeys.all, 'clientsBloques'] as const,
  ping: (sapEnLigne: boolean) => [...syncKeys.all, 'ping', sapEnLigne] as const,
}
