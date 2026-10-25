import { useEffect, useState } from 'react'
import { usePoseStore } from '@/store/pose-store'
import { computeStraightWristTip, STRAIGHT_WRIST_TIP_DURATION_MS } from '@/core/calibration/straight-wrist-tip'

/**
 * Ruhiger Tipp nach dem Speichern einer deutlich geknickten Haltung (#101).
 *
 * Die Analyse läuft weiter (Weg A): kein Modal, keine Pflicht — die Pille
 * steht ein paar Sekunden oben unter der Kopfzeile (inkl. Notch) und geht von
 * selbst.
 * Farbe `sapphire-deep` mit weißer Schrift wie der Analyse/Flow-Umschalter;
 * bewusst **nicht** das helle Saphir-Blau, das auf dem Canvas „gute Haltung“
 * bedeutet. Als DOM-Element, weil der Canvas gespiegelt ist.
 */
export function StraightWristTip() {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const calibratedAt = usePoseStore((s) => s.lastCalibrationAt)
  const [now, setNow] = useState(() => performance.now())

  // Nach Ablauf einmal neu rendern, damit der Tipp von selbst verschwindet.
  useEffect(() => {
    if (calibratedAt === null) return
    const remaining = calibratedAt + STRAIGHT_WRIST_TIP_DURATION_MS - performance.now()
    if (remaining <= 0) return
    const id = setTimeout(() => setNow(performance.now()), remaining)
    return () => clearTimeout(id)
  }, [calibratedAt])

  const tip = computeStraightWristTip({ masterPrint, calibratedAt, now })
  if (!tip) return null

  return (
    <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top,0px)+64px)] sm:top-[calc(env(safe-area-inset-top,0px)+72px)] left-1/2 -translate-x-1/2 z-[6] w-max max-w-[min(28rem,calc(100vw-32px))]">
      <div className="rounded-2xl bg-sapphire-deep px-4 py-2.5 text-center shadow-[0_4px_16px_rgba(0,43,73,0.25)]">
        <span className="font-label text-[13px] font-semibold leading-snug text-white">{tip}</span>
      </div>
    </div>
  )
}
