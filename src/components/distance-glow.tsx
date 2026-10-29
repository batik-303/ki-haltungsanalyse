import { usePoseStore } from '../store/pose-store'
import { computeDistanceGlowShadow, computeDistanceGlowTone } from '@/core/calibration/distance-glow'

/**
 * Ambiente Distanz-Rand-Führung — „Randglühen" (T4 #60, Karte #56,
 * Variante A aus T1 #57; Farben und Stärke #115).
 *
 * Gleiche Farb-Regel wie beim Anker: Gelb **führt**, solange der Abstand nicht
 * passt; Blau bestätigt „passt". Kein Grün, kein Rot. Das Kärtchen oben im
 * Rahmen (`DistanceHint`) erklärt die Farbe mit einem Punkt im selben Ton. Der
 * Ton-Wechsel läuft weich (langsame Transition) — kein hektisches Blinken.
 *
 * Bewusst als `pointer-events-none` DOM-Overlay über dem ganzen Rahmen (nicht
 * auf dem gespiegelten Canvas): es leuchtet am Innenrand des Rahmens (#114),
 * braucht keine Koordinaten-Mathematik und bleibt vom Spiegel unberührt.
 */
export function DistanceGlow() {
  const distanceOk = usePoseStore((s) => s.distanceOk)
  const masterPrint = usePoseStore((s) => s.masterPrint)

  // Nur vor der Kalibrierung — danach führt die Analyse selbst.
  if (masterPrint) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{
        boxShadow: computeDistanceGlowShadow(computeDistanceGlowTone(distanceOk)),
        transition: 'box-shadow 600ms ease',
      }}
    />
  )
}
