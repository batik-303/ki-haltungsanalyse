import { useEffect, useRef, useState } from 'react'
import {
  computeDeviceTiltDeg,
  createDeviceTiltHintState,
  initialDeviceTiltPermission,
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

function orientationCtor(): OrientationEventWithPermission | null {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return null
  return window.DeviceOrientationEvent as unknown as OrientationEventWithPermission
}

/**
 * Stand der iOS-Erlaubnis über Sitzungen hinweg. Erkennung über die Methode,
 * nicht über den User-Agent: iPadOS meldet sich als Mac (#215). Mit Frage
 * startet sie bei `prompt` (Kärtchen lädt zum Tippen ein), sonst `granted`.
 */
let permission: DeviceTiltPermission = initialDeviceTiltPermission(
  typeof orientationCtor()?.requestPermission === 'function',
)

/**
 * iOS verlangt eine Erlaubnis für den Lagesensor, und zwar innerhalb eines
 * Tippens. #215: Nicht im Start-Tippen (dort fragen Kamera + Mikro, iPadOS
 * lehnt die Sensor-Frage dann still ab), sondern im eigenen Tipp aufs
 * Gerät-Kärtchen, wenn Kamera und Mikro schon laufen. Synchron im Handler,
 * vor jedem await/State-Update. Ablehnung oder Fehler → Kärtchen weg, Abstand frei.
 */
export function requestDeviceOrientationPermission(): void {
  const ctor = orientationCtor()
  if (!ctor || typeof ctor.requestPermission !== 'function') {
    if (__DIAGNOSE__) reportTiltPermission(false, 'none')
    return
  }
  if (permission !== 'prompt') return
  permission = 'pending'
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

/** Bildschirm-Winkel nur fürs Diagnose-Log; ältere Safari kennen nur `window.orientation`. */
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
      // #215: ohne Bildschirm-Winkel (iPad meldet hochkant 90°)
      tiltRef.current = computeDeviceTiltDeg({ beta: e.beta, gamma: e.gamma })
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
