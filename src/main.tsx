import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initLayoutSystem } from './core/layout-system'
import './index.css'
import App from './App.tsx'
import { installDiagnosticLogger } from './lib/diagnostic-logger'

// Diagnose-Logger nur im Test-Build (VITE_DIAGNOSE=1); im Produktions-Build
// ist `__DIAGNOSE__` false und der Logger fällt komplett heraus.
if (__DIAGNOSE__) installDiagnosticLogger()

// Initialise reactive layout (orientation, device class, CSS props)
// before React mounts so all queries see the correct initial values.
initLayoutSystem()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
