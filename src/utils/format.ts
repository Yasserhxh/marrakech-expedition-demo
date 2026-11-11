const FR = 'fr-FR'
const KG_PAR_TONNE = 1000

export const ABSENT = '—'

export function formatKg(kg: number | undefined | null): string {
  if (kg === undefined || kg === null) return ABSENT
  return `${Math.round(kg).toLocaleString(FR)} kg`
}

export function formatTonnes(t: number | undefined | null, digits = 1): string {
  if (t === undefined || t === null) return ABSENT
  return `${t.toLocaleString(FR, { minimumFractionDigits: 0, maximumFractionDigits: digits })} t`
}

/** Format BL : tonnes avec virgule et 3 décimales (ex. 43 160 kg → « 43,160 »). */
export function formatPoidsBl(kg: number | undefined | null): string {
  if (kg === undefined || kg === null) return ABSENT
  return (kg / KG_PAR_TONNE).toLocaleString(FR, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

export function formatPourcentage(ratio: number, digits = 1): string {
  const signe = ratio > 0 ? '+' : ''
  return `${signe}${(ratio * 100).toLocaleString(FR, { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`
}

export function formatNombre(n: number): string {
  return n.toLocaleString(FR)
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return ABSENT
  return new Date(iso).toLocaleString(FR, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return ABSENT
  return new Date(iso).toLocaleDateString(FR, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatHeure(iso: string | undefined | null, secondes = false): string {
  if (!iso) return ABSENT
  return new Date(iso).toLocaleTimeString(FR, {
    hour: '2-digit',
    minute: '2-digit',
    second: secondes ? '2-digit' : undefined,
  })
}

export function minutesEcoulees(depuisIso: string, maintenant: Date): number {
  return Math.max(0, Math.floor((maintenant.getTime() - new Date(depuisIso).getTime()) / 60000))
}

export function formatDuree(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return `${h} h ${m.toString().padStart(2, '0')} min`
}

export function padNumero(n: number, longueur: number): string {
  return n.toString().padStart(longueur, '0')
}
