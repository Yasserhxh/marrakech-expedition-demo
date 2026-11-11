import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/styles/tokens.scss'
import '@/styles/global.scss'
import '@/styles/components.scss'
import '@/styles/print.scss'

const racine = document.getElementById('root')
if (!racine) throw new Error('Élément #root introuvable')

/** La configuration est validée avant tout rendu : en mode api, une variable manquante bloque le démarrage. */
async function demarrer() {
  try {
    const { config, estModeApi } = await import('@/config')
    const { App } = await import('@/app/App')
    if (estModeApi) {
      const { creerRapporteur, installerRapportErreurs } = await import('@/monitoring/clientLogs')
      const { obtenirApiClient } = await import('@/services')
      installerRapportErreurs(
        creerRapporteur({
          envoyer: (corps) => obtenirApiClient().post('/client-logs', corps, { silencieux: true }),
        }),
      )
    }
    console.info(`[Marrakech Expédition] mode ${config.mode}`)
    ReactDOM.createRoot(racine as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[Marrakech Expédition] démarrage impossible', e)
    ReactDOM.createRoot(racine as HTMLElement).render(
      <div className="error-page" role="alert">
        <div className="error-page__card">
          <h1>Configuration invalide</h1>
          <p>{message}</p>
          <p className="text-muted">
            Copiez `.env.example` vers `.env` et renseignez les variables, puis relancez.
          </p>
        </div>
      </div>,
    )
  }
}

void demarrer()
