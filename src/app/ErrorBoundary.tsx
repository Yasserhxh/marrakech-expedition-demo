import { Component, type ErrorInfo, type ReactNode } from 'react'
import { FiAlertTriangle, FiRefreshCw, FiRotateCcw } from 'react-icons/fi'
import { obtenirRapporteur } from '@/monitoring/clientLogs'

interface Props {
  children: ReactNode
}

interface State {
  erreur: Error | null
  correlationId: string | null
}

/** Page d'erreur dans la charte, avec l'ID de corrélation transmis à `/api/client-logs` (mode api). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erreur: null, correlationId: null }

  static getDerivedStateFromError(erreur: Error): Partial<State> {
    return { erreur, correlationId: crypto.randomUUID() }
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    const pile = `${erreur.stack ?? ''}\n--- composants ---${info.componentStack ?? ''}`
    obtenirRapporteur().signaler(
      'Error',
      `${erreur.name}: ${erreur.message}`,
      pile,
      this.state.correlationId ?? undefined,
    )
  }

  reessayer = () => this.setState({ erreur: null, correlationId: null })

  render() {
    const { erreur, correlationId } = this.state
    if (!erreur) return this.props.children
    return (
      <div className="error-page" role="alert">
        <div className="error-page__card">
          <span className="error-page__icon" aria-hidden="true">
            <FiAlertTriangle />
          </span>
          <h1>Une erreur est survenue</h1>
          <p>
            L'écran n'a pas pu s'afficher. Réessayez ; si le problème persiste, communiquez l'identifiant
            ci-dessous au support.
          </p>
          <dl className="error-page__meta">
            <div>
              <dt>ID de corrélation</dt>
              <dd>
                <span className="code-chip">{correlationId}</span>
              </dd>
            </div>
            <div>
              <dt>Détail technique</dt>
              <dd className="mono">{erreur.message || erreur.name}</dd>
            </div>
          </dl>
          <div className="btn-row">
            <button type="button" className="btn-primary" onClick={this.reessayer}>
              <FiRotateCcw aria-hidden="true" /> Réessayer
            </button>
            <button type="button" className="btn-ghost" onClick={() => window.location.reload()}>
              <FiRefreshCw aria-hidden="true" /> Recharger la page
            </button>
          </div>
        </div>
      </div>
    )
  }
}
