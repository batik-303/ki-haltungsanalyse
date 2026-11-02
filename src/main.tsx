import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initLayoutSystem } from './core/layout-system'
import { bootPrototypeDemo } from './components/prototype-results-variants'
import './index.css'
import App from './App.tsx'

// Initialise reactive layout (orientation, device class, CSS props)
// before React mounts so all queries see the correct initial values.
initLayoutSystem()
bootPrototypeDemo() // PROTOTYP #127: ?demo=kurz|lang öffnet die Ergebnis-Seite

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
