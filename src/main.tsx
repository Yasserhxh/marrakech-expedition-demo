import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/app/App'
import '@/styles/tokens.scss'
import '@/styles/global.scss'
import '@/styles/components.scss'
import '@/styles/print.scss'

const racine = document.getElementById('root')
if (!racine) throw new Error('Élément #root introuvable')

ReactDOM.createRoot(racine).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
