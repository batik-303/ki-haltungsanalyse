import { usePoseStore } from '../store/pose-store'
import { computeDistanceGlowTone } from '@/core/calibration/distance-glow'

/**
 * Ambiente Distanz-Rand-Führung — „Randglühen" (T4 #60, Karte #56,
 * Variante A aus T1 #57). Löst die frühere grüne „✓ Abstand OK"-Pille ab:
 * ein ruhiges Leuchten am Bildrand statt eines mittigen Etiketts.
 *
 * Grundsatz „kein Rot": Sapphire **führt** ruhig, solange der Abstand nicht
 * passt; Grün bestätigt leise „passt". Der Ton-Wechsel läuft weich (langsame
 * Transition) — kein hektisches Blinken, kein Zähler.
 *
 * Bewusst als vollflächiges, `pointer-events-none` DOM-Overlay (nicht auf dem
 * gespiegelten Canvas): ein symmetrischer Rand-Schein braucht keine
 * Koordinaten-Mathematik und bleibt vom Spiegel unberührt.
 */

// Glut-Farben über dem dunklen Kamerabild (literal, analog zu den Overlays).
const SAPPHIRE = '#2196F3'
const SUCCESS = '#2ecc71'

const GLOW_COLOR: Record<'sapphire' | 'success', string> = {
  sapphire: SAPPHIRE,
  success: SUCCESS,
}

export function DistanceGlow() {
  const distanceOk = usePoseStore((s) => s.distanceOk)
  const masterPrint = usePoseStore((s) => s.masterPrint)

  // Nur vor der Kalibrierung — danach führt die Analyse selbst.
  if (masterPrint) return null

  const color = GLOW_COLOR[computeDistanceGlowTone(distanceOk)]

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{
        // Zwei geschichtete Inset-Schatten: ein weicher, breiter Rand-Schein
        // plus eine dezente innere Kontur. Weiche 600-ms-Transition auf Farbe.
        boxShadow: `inset 0 0 140px 28px ${color}44, inset 0 0 48px 6px ${color}2e`,
        transition: 'box-shadow 600ms ease',
      }}
    />
  )
}
