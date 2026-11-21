import { useEffect, useRef, useState } from 'react'
import {
  computeDeviceTiltDeg,
  createDeviceTiltHintState,
  normalizeScreenAngle,
  stepDeviceTiltHint,
  type DeviceTiltPermission,
  type DeviceTiltView,
} from '@/core/calibration/device-tilt'
import { reportTiltPermission, reportTiltSample, reportTiltOutcome } from '@/lib/diagnostic-logger'

export interface DeviceTiltHint {
  view: DeviceTiltView
  /** Darf der Abstands-Hinweis erscheinen? Zuerst kommt das Gerät-Kärtchen. */
  distanceAllowed: boolean
}

const INACTIVE: DeviceTiltHint = { view: 'hidden', distanceAllowed: true }

/** Nachtakt, falls der Sensor bei ruhigem Gerät keine Ereignisse schickt. */
const TICK_MS = 250

interface OrientationEventWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/**
 * Stand der iOS-Erlaubnis über Bildschirme hinweg: gefragt wird im Start-Tippen
 * (Home), ausgewertet in der Session. Ohne Frage (Android, Desktop) `granted`.
 */
let permission: DeviceTiltPermission = 'granted'

/**
 * iOS verlangt eine Erlaubnis für den Lagesensor, und zwar innerhalb eines
 * Tippens (#210). Wird im Start-Klick aufgerufen. Solange die Antwort offen
 * ist, wartet der Hinweis; Ablehnung oder Fehler → kein Kärtchen, Abstand sofort.
 */
export function requestDeviceOrientationPermission(): void {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return
  const ctor = window.DeviceOrientationEvent as unknown as OrientationEventWithPermission
  // Erkennung über die Methode, nicht über den User-Agent: iPadOS meldet sich als Mac (#215).
  if (typeof ctor.requestPermission !== 'function') {
    if (__DIAGNOSE__) reportTiltPermission(false, 'none')
    return
  }
  permission = 'pending'
  // Direkt im Tipp-Handler, vor jedem await/State-Update (transiente Aktivierung).
  ctor
    .requestPermission()
    .then((result) => {
      permission = result === 'granted' ? 'granted' : 'denied'
      if (__DIAGNOSE__) reportTiltPermission(true, permission)
    })
    .catch(() => {
      permission = 'denied'
      if (__DIAGNOSE__) reportTiltPermission(true, 'error')
    })
}

/** Hochkant und quer; ältere Safari-Versionen kennen nur `window.orientation` (#215). */
function screenAngle(): number {
  const orientationAngle = typeof screen !== 'undefined' ? screen.orientation?.angle : undefined
  const legacy = (window as Window & { orientation?: number }).orientation
  return normalizeScreenAngle(orientationAngle, typeof legacy === 'number' ? legacy : undefined)
}

/**
 * Liefert den Zustand des „Gerät steht gerade"-Kärtchens (#210) und ob der
 * Abstands-Hinweis schon dran ist. Ablauf-Zustand liegt im `useRef`;
 * React-State ändert sich nur, wenn sich die Anzeige ändert.
 * `active = false` → Sensor wird nicht abgehört, nichts angezeigt, Abstand frei.
 */
export function useDeviceTiltHint(active: boolean): DeviceTiltHint {
  const [hint, setHint] = useState<DeviceTiltHint>({ view: 'hidden', distanceAllowed: false })
  const stateRef = useRef(createDeviceTiltHintState())
  const tiltRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      stateRef.current = { ...stateRef.current, view: 'hidden', distanceAllowed: true, done: true }
      setHint(INACTIVE)
      return
    }

    const step = () => {
      stateRef.current = stepDeviceTiltHint(stateRef.current, tiltRef.current, performance.now(), permission)
      const { view, distanceAllowed, doneReason } = stateRef.current
      if (__DIAGNOSE__ && doneReason) reportTiltOutcome(doneReason, screenAngle())
      setHint((prev) =>
        prev.view === view && prev.distanceAllowed === distanceAllowed ? prev : { view, distanceAllowed },
      )
    }
    const onOrientation = (e: DeviceOrientationEvent) => {
      tiltRef.current = computeDeviceTiltDeg({ beta: e.beta, gamma: e.gamma }, screenAngle())
      if (__DIAGNOSE__) reportTiltSample(e.beta, e.gamma, screenAngle())
      step()
    }

    window.addEventListener('deviceorientation', onOrientation)
    const timer = window.setInterval(step, TICK_MS)
    return () => {
      window.removeEventListener('deviceorientation', onOrientation)
      window.clearInterval(timer)
    }
  }, [active])

  return active ? hint : INACTIVE
}
