import clsx from 'clsx'
import { FiWifi, FiWifiOff } from 'react-icons/fi'
import { useAppStore } from '@/store/useAppStore'

export function SapPill() {
  const sapOnline = useAppStore((s) => s.sapOnline)
  return (
    <span
      className={clsx('sap-pill', sapOnline ? 'is-online' : 'is-offline')}
      role="status"
      aria-live="polite"
      title={sapOnline ? 'Connexion SAP opérationnelle' : 'SAP injoignable : mode dégradé, commandes locales et BL provisoires'}
    >
      <span className="sap-pill__dot" aria-hidden="true" />
      {sapOnline ? <FiWifi size={14} aria-hidden="true" /> : <FiWifiOff size={14} aria-hidden="true" />}
      {sapOnline ? 'SAP en ligne' : 'SAP hors ligne'}
    </span>
  )
}
