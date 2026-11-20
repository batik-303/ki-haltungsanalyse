import { useEffect, useRef, useState } from 'react'
import {
  computeDeviceTiltDeg,
  createDeviceTiltHintState,
  stepDeviceTiltHint,
  type DeviceTiltView,
} from '@/core/calibration/device-tilt'

/** Nachtakt, falls der Sensor bei ruhigem Gerät keine Ereignisse schickt. */
const TICK_MS = 250

interface OrientationEventWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/**
 * iOS verlangt eine Erlaubnis für den Lagesensor, und zwar innerhalb eines
 * Tippens (#210). Wird im Start-Klick aufgerufen; Ablehnung oder Fehler werden
 * still geschluckt — dann kommen einfach keine Werte und nichts wird angezeigt.
 */
export function requestDeviceOrientationPermission(): void {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return
  const ctor = window.DeviceOrientationEvent as unknown as OrientationEventWithPermission
  if (typeof ctor.requestPermission !== 'function') return
  ctor.requestPermission().catch(() => {})
}

function screenAngle(): number {
  return typeof screen !== 'undefined' && screen.orientation ? screen.orientation.angle : 0
}

/**
 * Liefert den Zustand des „Gerät steht gerade"-Kärtchens (#210). Ablauf-Zustand
 * liegt im `useRef`; React-State ändert sich nur, wenn sich die Anzeige ändert.
 * `active = false` → Sensor wird nicht abgehört, nichts angezeigt.
 */
export function useDeviceTiltHint(active: boolean): DeviceTiltView {
  const [view, setView] = useState<DeviceTiltView>('hidden')
  const stateRef = useRef(createDeviceTiltHintState())
  const tiltRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return

    const step = () => {
      stateRef.current = stepDeviceTiltHint(stateRef.current, tiltRef.current, performance.now())
      setView(stateRef.current.view)
    }
    const onOrientation = (e: DeviceOrientationEvent) => {
      tiltRef.current = computeDeviceTiltDeg({ beta: e.beta, gamma: e.gamma }, screenAngle())
      step()
    }

    window.addEventListener('deviceorientation', onOrientation)
    const timer = window.setInterval(step, TICK_MS)
    return () => {
      window.removeEventListener('deviceorientation', onOrientation)
      window.clearInterval(timer)
    }
  }, [active])

  return active ? view : 'hidden'
}
