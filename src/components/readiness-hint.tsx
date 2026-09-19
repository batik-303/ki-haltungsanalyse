import { usePoseStore } from '@/store/pose-store'
import { computeReadinessView } from '@/core/calibration/readiness-gate'

/**
 * Dezentes Bereitschafts-Feedback am oberen Canvas-Rand (#36).
 *
 * Zeigt in der Wartephase vor dem Countdown den ehrlichen Hinweis
 * („Jetzt halte dein Instrument in Spielhaltung") plus einen kleinen
 * Fortschrittsring fürs kurze Halten. Bewusst als DOM-Element und **nicht**
 * auf dem Canvas: der Canvas ist per CSS gespiegelt (Selfie-Ansicht), Text
 * darauf wäre unleserlich. Erscheint erst, wenn die Distanz stimmt — davor
 * führt der `DistanceIndicator`.
 *
 * Grundsatz: minimales Chrome am Rand, positive Sprache, kein Rot.
 */

const SAPPHIRE = '#2196F3'
const SUCCESS = '#2ecc71'
const PRIMARY = '#002b49'

export function ReadinessHint() {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const phase = usePoseStore((s) => s.readinessPhase)
  const progress = usePoseStore((s) => s.readinessHoldProgress)
  const timedOut = usePoseStore((s) => s.readinessTimedOut)

  // Nur vor der Kalibrierung und erst ab „posture" (Distanz stimmt).
  if (masterPrint) return null
  if (phase === 'positioning') return null

  const view = computeReadinessView({ phase, holdProgress: progress, timedOut })
  const accent = view.tone === 'success' ? SUCCESS : SAPPHIRE
  const showRing = phase === 'holding' || phase === 'armed'

  return (
    <div className="pointer-events-none absolute top-[clamp(12px,3vh,24px)] left-1/2 -translate-x-1/2 z-[6]">
      <div className="inline-flex items-center gap-2.5 rounded-full bg-white/90 px-4 py-2 shadow-[0_4px_16px_rgba(0,43,73,0.18)] backdrop-blur">
        {showRing ? (
          <ProgressRing progress={view.progress} accent={accent} />
        ) : (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: accent, boxShadow: `0 0 0 3px ${accent}33` }}
          />
        )}
        <span className="font-label text-[13px] font-semibold" style={{ color: PRIMARY }}>
          {view.hint}
        </span>
      </div>
    </div>
  )
}

const RING_SIZE = 20
const RING_STROKE = 3

function ProgressRing({ progress, accent }: { progress: number; accent: string }) {
  const r = (RING_SIZE - RING_STROKE) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="block shrink-0">
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} fill="none" stroke="rgba(0,43,73,0.15)" strokeWidth={RING_STROKE} />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, progress)))}
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        style={{ transition: 'stroke-dashoffset 0.15s linear' }}
      />
    </svg>
  )
}
