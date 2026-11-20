import { useEffect, useRef, useState } from 'react'
import {
  createHintPresenceState,
  HINT_OK_HOLD_MS,
  stepHintPresence,
  type HintPresence,
} from '@/core/calibration/hint-presence'

/**
 * #147: Ist das Einrichtungs-Kärtchen gerade zu sehen oder weggeglitten?
 * Ablauf-Zustand im `useRef`; ein Timer stößt nach `HINT_OK_HOLD_MS` den
 * nächsten Schritt an, damit das Kärtchen auch ohne neue Messung weggleitet.
 */
export function useHintPresence(ok: boolean): HintPresence {
  const stateRef = useRef(createHintPresenceState())
  const [presence, setPresence] = useState<HintPresence>(stateRef.current.presence)

  useEffect(() => {
    const step = () => {
      stateRef.current = stepHintPresence(stateRef.current, ok, performance.now())
      setPresence(stateRef.current.presence)
    }
    step()
    if (!ok || stateRef.current.presence === 'away') return
    const id = window.setTimeout(step, HINT_OK_HOLD_MS)
    return () => window.clearTimeout(id)
  }, [ok])

  return presence
}
