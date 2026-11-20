import { useEffect, useRef, useState } from 'react'
import {
  createHintPresenceState,
  HINT_OK_HOLD_MS,
  stepHintPresence,
  type HintPresence,
} from '@/core/calibration/hint-presence'

/**
 * #147: Ist das Einrichtungs-Kärtchen gerade zu sehen oder weggeglitten?
 * Ablauf-Zustand im `useRef`; ein Timer stößt nach `holdMs` den
 * nächsten Schritt an, damit das Kärtchen auch ohne neue Messung weggleitet.
 */
export function useHintPresence(ok: boolean, holdMs: number = HINT_OK_HOLD_MS): HintPresence {
  const stateRef = useRef(createHintPresenceState())
  const [presence, setPresence] = useState<HintPresence>(stateRef.current.presence)

  useEffect(() => {
    const step = () => {
      stateRef.current = stepHintPresence(stateRef.current, ok, performance.now(), holdMs)
      setPresence(stateRef.current.presence)
    }
    step()
    if (!ok || stateRef.current.presence === 'away') return
    const id = window.setTimeout(step, holdMs)
    return () => window.clearTimeout(id)
  }, [ok, holdMs])

  return presence
}
