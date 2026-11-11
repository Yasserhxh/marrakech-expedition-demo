import { Link } from 'react-router-dom'
import type { Commande } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { etapeCourante, lienPourRole } from '@/utils/parcours'

export function SuiteEtape({ commande, masquerLien }: { commande: Commande; masquerLien?: boolean }) {
  const role = useAppStore((s) => s.role)
  const etape = etapeCourante(commande)
  const lien = masquerLien ? undefined : lienPourRole(etape.lien, role)

  return (
    <div className="suite-etape" role="status">
      <div>
        <p className="suite-etape__titre">{etape.titre}</p>
        {etape.explication ? <p className="suite-etape__detail">{etape.explication}</p> : null}
      </div>
      {lien ? (
        <Link to={lien.vers} className="btn-ghost btn-sm">
          {lien.libelle}
        </Link>
      ) : null}
    </div>
  )
}
