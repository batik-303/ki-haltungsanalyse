import { usePoseStore } from '@/store/pose-store'
import { computeReadinessView } from '@/core/calibration/readiness-gate'

/**
 * Dezentes Auslöser-Feedback am oberen Canvas-Rand (#59).
 *
 * Erscheint erst, wenn bewusst ausgelöst wurde (Stimme „bereit" / Knopf
 * „Haltung speichern") und der Abstand noch nicht passt („waiting") bzw. kurz
 * beim Scharfschalten („armed"). Im ruhigen Ausgangszustand („idle") führt die
 * Distanz-Ampel — hier bleibt es still. Bewusst als DOM-Element und **nicht**
 * auf dem Canvas: der Canvas ist per CSS gespiegelt (Selfie-Ansicht), Text
 * darauf wäre unleserlich.
 *
 * Grundsatz: minimales Chrome am Rand, positive Sprache, kein Rot. Die Optik
 * überarbeitet T4 (#60, „Randglühen") — hier nur der ehrliche Hinweis.
 */

const SAPPHIRE = '#2196F3'
const SUCCESS = '#2ecc71'
const PRIMARY = '#002b49'

export function ReadinessHint() {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const phase = usePoseStore((s) => s.readinessPhase)
  const timedOut = usePoseStore((s) => s.readinessTimedOut)

  // Nur vor der Kalibrierung und nur, wenn bewusst ausgelöst wurde (nicht idle).
  if (masterPrint) return null
  if (phase === 'idle') return null

  const view = computeReadinessView({ phase, timedOut })
  const accent = view.tone === 'success' ? SUCCESS : SAPPHIRE

  return (
    <div className="pointer-events-none absolute top-[clamp(12px,3vh,24px)] left-1/2 -translate-x-1/2 z-[6]">
      <div className="inline-flex items-center gap-2.5 rounded-full bg-white/90 px-4 py-2 shadow-[0_4px_16px_rgba(0,43,73,0.18)] backdrop-blur">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 0 3px ${accent}33` }}
        />
        <span className="font-label text-[13px] font-semibold" style={{ color: PRIMARY }}>
          {view.hint}
        </span>
      </div>
    </div>
  )
}
