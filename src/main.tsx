import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initLayoutSystem } from './core/layout-system'
import './index.css'
import App from './App.tsx'

// Initialise reactive layout (orientation, device class, CSS props)
// before React mounts so all queries see the correct initial values.
initLayoutSystem()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
