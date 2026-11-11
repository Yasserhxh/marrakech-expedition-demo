export const monitoringKeys = {
  all: ['monitoring'] as const,
  /** Le booléen distingue les instantanés simulés SAP en ligne / hors ligne. */
  snapshot: (sapEnLigne: boolean) => [...monitoringKeys.all, 'snapshot', sapEnLigne] as const,
}
