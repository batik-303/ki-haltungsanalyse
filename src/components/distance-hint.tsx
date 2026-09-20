import { usePoseStore } from '@/store/pose-store'
import { computeDistanceGuidance } from '@/core/calibration/distance-guidance'

/**
 * Richtungs-Hinweis zur Kamera-Distanz vor der Kalibrierung (App-Test, Punkt 2).
 *
 * Das Randglühen (`DistanceGlow`) zeigt „passt / passt noch nicht", sagt aber
 * nicht **wohin**. Diese ruhige Pille am oberen Rand ergänzt die Richtung
 * („näher"/„zurück"/„mittig ins Bild") — positive Sprache, kein Rot.
 *
 * Erscheint nur, solange noch nicht kalibriert ist und der Auslöser **noch nicht
 * scharf/wartend** ist (`readinessPhase === 'idle'`). Sobald bewusst ausgelöst
 * wurde, übernimmt der `ReadinessHint` denselben oberen Platz — so gibt es nie
 * zwei Pillen gleichzeitig. Bewusst als DOM-Element (der Canvas ist gespiegelt).
 */
export function DistanceHint() {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const status = usePoseStore((s) => s.distanceStatus)
  const readinessPhase = usePoseStore((s) => s.readinessPhase)

  if (masterPrint) return null
  if (readinessPhase !== 'idle') return null

  const guidance = computeDistanceGuidance(status)
  if (!guidance.show) return null

  return (
    <div className="pointer-events-none absolute top-[clamp(12px,3vh,24px)] left-1/2 -translate-x-1/2 z-[6]">
      <div className="inline-flex items-center gap-2.5 rounded-full bg-white/90 px-4 py-2 shadow-[0_4px_16px_rgba(0,43,73,0.18)] backdrop-blur">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: '#2196F3', boxShadow: '0 0 0 3px #2196F333' }}
        />
        <span className="font-label text-[13px] font-semibold" style={{ color: '#002b49' }}>
          {guidance.message}
        </span>
      </div>
    </div>
  )
}
