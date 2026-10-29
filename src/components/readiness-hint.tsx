import { usePoseStore } from '@/store/pose-store'
import { computeReadinessView } from '@/core/calibration/readiness-gate'
import { HintCard } from '@/components/hint-card'

/**
 * Dezentes Auslöser-Feedback oben mittig im Rahmen (#59, #114).
 *
 * Erscheint erst, wenn bewusst ausgelöst wurde (Stimme „speichern" / Knopf
 * „Haltung speichern") und der Abstand noch nicht passt („waiting") bzw. kurz
 * beim Scharfschalten („armed"). Im ruhigen Ausgangszustand („idle") führt das
 * Abstands-Kärtchen — hier bleibt es still.
 *
 * Grundsatz: minimales Chrome am Rand, positive Sprache, kein Rot. Punkt wie
 * das Randglühen: Gelb führt, Blau bestätigt (#115).
 */
export function ReadinessHint() {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const phase = usePoseStore((s) => s.readinessPhase)
  const timedOut = usePoseStore((s) => s.readinessTimedOut)

  // Nur vor der Kalibrierung und nur, wenn bewusst ausgelöst wurde (nicht idle).
  if (masterPrint) return null
  if (phase === 'idle') return null

  const view = computeReadinessView({ phase, timedOut })

  return <HintCard tone={view.tone} message={view.hint} />
}
