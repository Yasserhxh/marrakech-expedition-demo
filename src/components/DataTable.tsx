import { useMemo, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { FiArrowDown, FiArrowUp, FiMinus } from 'react-icons/fi'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right'
  width?: string
}

type Direction = 'asc' | 'desc'

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  caption: string
  onRowClick?: (row: T) => void
  rowLabel?: (row: T) => string
  selectedKey?: string | number | null
  empty?: ReactNode
  className?: string
  /** Premier chargement, sans lignes à conserver. */
  loading?: boolean
  /** Rafraîchissement pendant que les lignes restent affichées. */
  refreshing?: boolean
  /** Erreur affichée seulement s'il n'y a aucune ligne. */
  error?: ReactNode
  defaultSort?: { key: string; direction: Direction }
  maxHeight?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  onRowClick,
  rowLabel,
  selectedKey,
  empty,
  loading = false,
  refreshing = false,
  error,
  className,
  defaultSort,
  maxHeight,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: Direction } | null>(defaultSort ?? null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const sv = col.sortValue
    const facteur = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = sv(a)
      const vb = sv(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * facteur
      return String(va).localeCompare(String(vb), 'fr') * facteur
    })
  }, [rows, sort, columns])

  const basculerTri = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const estControle = (cible: EventTarget | null) =>
    cible instanceof Element && Boolean(cible.closest('button, a, input, select, textarea, label'))

  const ariaSort = (key: string): 'ascending' | 'descending' | 'none' => {
    if (!sort || sort.key !== key) return 'none'
    return sort.direction === 'asc' ? 'ascending' : 'descending'
  }

  const vide = sorted.length === 0
  const enChargement = loading && vide && !error
  const enErreur = Boolean(error) && vide
  const enActualisation = refreshing && !vide

  return (
    <div
      className={clsx('docs-table-wrapper', className, enActualisation && 'is-refreshing')}
      style={maxHeight ? { maxHeight } : undefined}
      aria-busy={enChargement || enActualisation || undefined}
    >
      {enChargement ? (
        <span className="visually-hidden" role="status">
          Chargement des données
        </span>
      ) : null}
      {enActualisation ? (
        <span className="visually-hidden" role="status" aria-label="Actualisation du tableau">
          Actualisation du tableau
        </span>
      ) : null}
      <table className="docs-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => {
              const triable = Boolean(col.sortValue)
              const etat = ariaSort(col.key)
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx(triable && 'is-sortable', col.align === 'right' && 'cell-right')}
                  style={col.width ? { width: col.width } : undefined}
                  aria-sort={triable ? etat : undefined}
                >
                  {triable ? (
                    <button
                      type="button"
                      className={clsx(etat !== 'none' && 'is-sorted')}
                      onClick={() => basculerTri(col.key)}
                      aria-label={`Trier par ${col.header}`}
                    >
                      {col.header}
                      {etat === 'ascending' ? (
                        <FiArrowUp aria-hidden="true" />
                      ) : etat === 'descending' ? (
                        <FiArrowDown aria-hidden="true" />
                      ) : (
                        <FiMinus aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {enChargement ? (
            Array.from({ length: 4 }, (_, index) => (
              <tr key={`squelette-${index}`} className="is-skeleton" aria-hidden="true">
                {columns.map((col) => (
                  <td key={col.key}>
                    <span className="table-skeleton" />
                  </td>
                ))}
              </tr>
            ))
          ) : enErreur ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="table-state" role="alert">
                  {error}
                </div>
              </td>
            </tr>
          ) : vide ? (
            <tr>
              <td colSpan={columns.length}>
                {empty ?? <span className="text-muted">Aucune ligne.</span>}
              </td>
            </tr>
          ) : (
            sorted.map((row) => {
              const key = rowKey(row)
              const cliquable = Boolean(onRowClick)
              return (
                <tr
                  key={key}
                  className={clsx(cliquable && 'is-clickable', selectedKey === key && 'is-selected')}
                  tabIndex={cliquable ? 0 : undefined}
                  aria-label={cliquable && rowLabel ? rowLabel(row) : undefined}
                  onClick={
                    cliquable
                      ? (e) => {
                          if (estControle(e.target)) return
                          onRowClick?.(row)
                        }
                      : undefined
                  }
                  onKeyDown={
                    cliquable
                      ? (e) => {
                          if (e.target !== e.currentTarget) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onRowClick?.(row)
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td key={col.key} className={clsx(col.align === 'right' && 'cell-right')}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
