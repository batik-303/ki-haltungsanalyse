import { usePoseStore } from '@/store/pose-store'
import { computeDistanceGuidance } from '@/core/calibration/distance-guidance'
import { HintCard } from '@/components/hint-card'
import { useHintPresence } from '@/hooks/use-hint-presence'
import { DISTANCE_OK_HOLD_MS } from '@/core/calibration/hint-presence'

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
 *
 * #210: Erst nach dem Gerät-Kärtchen (`allowed`). Bleibt das Gerät-Kärtchen
 * sichtbar, rutscht dieses eine Zeile tiefer (`placement = 'below'`).
 */
export function DistanceHint({
  allowed = true,
  placement = 'top',
}: {
  allowed?: boolean
  placement?: 'top' | 'below'
}) {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const status = usePoseStore((s) => s.distanceStatus)
  const readinessPhase = usePoseStore((s) => s.readinessPhase)
  const guidance = computeDistanceGuidance(status)
  // #147: passt der Abstand, gleitet das Kärtchen nach 3 s weg (Zeile zur Spielhaltung lesen)
  const presence = useHintPresence(status === 'good', DISTANCE_OK_HOLD_MS)

  if (masterPrint) return null
  if (readinessPhase !== 'idle') return null
  if (!allowed) return null

  if (!guidance.show) return null

  return (
    <HintCard
      tone={guidance.tone}
      message={guidance.message}
      detail={guidance.detail}
      placement={placement}
      away={presence === 'away'}
    />
  )
}
