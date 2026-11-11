import clsx from 'clsx'
import { FiChevronDown, FiChevronUp, FiRotateCcw, FiSliders } from 'react-icons/fi'
import { useAppStore } from '@/store/useAppStore'
import { services } from '@/services'
import type { Role } from '@/types'
import { ROLE_LABELS } from '@/types'

const ROLES: Role[] = ['Guichet', 'PontBascule', 'Admin']

export function DemoBar() {
  const ouverte = useAppStore((s) => s.demoBarOuverte)
  const toggle = useAppStore((s) => s.toggleDemoBar)
  const sapOnline = useAppStore((s) => s.sapOnline)
  const setSapOnline = useAppStore((s) => s.setSapOnline)
  const role = useAppStore((s) => s.role)
  const setRole = useAppStore((s) => s.setRole)
  const reinitialiser = useAppStore((s) => s.reinitialiser)
  const pousserToast = useAppStore((s) => s.pousserToast)

  const reset = () => {
    services.pesee.arreterSimulation()
    reinitialiser()
    pousserToast('info', 'Données de démonstration réinitialisées')
  }

  return (
    <div className={clsx('demo-bar', !ouverte && 'is-collapsed')} role="region" aria-label="Barre de démonstration">
      {ouverte ? (
        <>
          <span className="demo-bar__title">
            <FiSliders aria-hidden="true" /> Démonstration
          </span>

          <label className="switch">
            <input type="checkbox" checked={sapOnline} onChange={(e) => setSapOnline(e.target.checked)} />
            <span className="switch__track" aria-hidden="true">
              <span className="switch__thumb" />
            </span>
            SAP : <strong>{sapOnline ? 'En ligne' : 'Hors ligne'}</strong>
          </label>

          <div className="demo-bar__group">
            <label htmlFor="demo-role">Rôle</label>
            <select id="demo-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <span className="demo-bar__spacer" />

          <button type="button" className="btn-ghost btn-sm" onClick={reset}>
            <FiRotateCcw aria-hidden="true" /> Réinitialiser les données
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={toggle} aria-expanded="true">
            <FiChevronUp aria-hidden="true" /> Masquer
          </button>
        </>
      ) : (
        <button type="button" className="btn-ghost btn-sm" onClick={toggle} aria-expanded="false">
          <FiChevronDown aria-hidden="true" /> Barre de démonstration (SAP {sapOnline ? 'en ligne' : 'hors ligne'})
        </button>
      )}
    </div>
  )
}
