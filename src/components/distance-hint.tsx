import { usePoseStore } from '@/store/pose-store'
import { computeDistanceGuidance } from '@/core/calibration/distance-guidance'
import { HintCard } from '@/components/hint-card'

/**
 * Kärtchen zur Kamera-Distanz vor der Kalibrierung (App-Test, Punkt 2; #115).
 *
 * Erklärt das Randglühen (`DistanceGlow`): gelber Punkt mit Richtung
 * („näher"/„zurück"/„mittig ins Bild"), solange der Abstand nicht passt; blauer
 * Punkt und „Abstand passt", sobald er passt. Positive Sprache, kein Rot. Steht
 * oben mittig im Rahmen (#114), nicht am Bildschirmrand.
 *
 * Erscheint nur, solange noch nicht kalibriert ist und der Auslöser **noch nicht
 * scharf/wartend** ist (`readinessPhase === 'idle'`). Sobald bewusst ausgelöst
 * wurde, übernimmt der `ReadinessHint` denselben oberen Platz — so gibt es nie
 * zwei Kärtchen gleichzeitig.
 */
export function DistanceHint() {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const status = usePoseStore((s) => s.distanceStatus)
  const readinessPhase = usePoseStore((s) => s.readinessPhase)

  if (masterPrint) return null
  if (readinessPhase !== 'idle') return null

  const guidance = computeDistanceGuidance(status)
  if (!guidance.show) return null

  return <HintCard tone={guidance.tone} message={guidance.message} detail={guidance.detail} />
}
