import { useEffect, useState } from 'react'
import { usePoseStore } from '@/store/pose-store'
import { computeSaveSequenceView } from '@/core/calibration/save-sequence'
import { computeDistanceGlowShadow, DISTANCE_GLOW_COLORS } from '@/core/calibration/distance-glow'
import { HintCard } from '@/components/hint-card'

/** Wie lange der Puls bei jeder neuen Zahl kräftig bleibt (ms). */
const PULSE_MS = 350

/**
 * Ruhiges Speichern im Rahmen (#118, Prototyp-Variante B aus #116).
 *
 * - Kärtchen oben (dieselbe Stelle wie „Abstand passt“) mit nur Text:
 *   „Halte still – gleich wird gespeichert“ → „… wird gespeichert …“; in der
 *   Pause gelb mit Richtungshinweis.
 * - Nur die Zahl 3 – 2 – 1 groß in der Mitte — bewusste Ausnahme von „keine
 *   zentrale Einblendung“: ≈ 3 s, während man ohnehin still hält.
 * - Randglühen blau (Pause: gelb), pulsiert sanft bei jeder Zahl. Kein Ton.
 */
export function SaveSequenceOverlay() {
  const saveStep = usePoseStore((s) => s.saveStep)
  const count = saveStep?.count ?? null
  const [pulse, setPulse] = useState(false)

  // Jede neue Zahl: kurz kräftig, dann weich zurück auf den ruhigen Grundschein.
  useEffect(() => {
    if (count === null) return
    setPulse(true)
    const id = setTimeout(() => setPulse(false), PULSE_MS)
    return () => clearTimeout(id)
  }, [count])

  if (!saveStep) return null
  const view = computeSaveSequenceView(saveStep)
  const strong = pulse && view.glyph !== null

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          boxShadow: computeDistanceGlowShadow(view.tone, { pulse: strong }),
          transition: strong ? 'box-shadow 120ms ease-out' : 'box-shadow 600ms ease-in',
        }}
      />

      <HintCard tone={view.tone} message={view.message} detail={view.detail} />

      {view.glyph && (
        <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center">
          <span
            className="font-headline font-extrabold leading-none tabular-nums drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            style={{ color: DISTANCE_GLOW_COLORS.blue, fontSize: 'clamp(96px, 26vw, 168px)' }}
          >
            {view.glyph}
          </span>
        </div>
      )}
    </>
  )
}
