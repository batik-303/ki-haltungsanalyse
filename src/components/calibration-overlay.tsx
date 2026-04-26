import { usePoseStore } from '../store/pose-store'

export function CalibrationOverlay() {
  const isCalibrating = usePoseStore((s) => s.isCalibrating)

  if (!isCalibrating) return null

  return (
    <div className="absolute inset-0 z-10 bg-background/85 flex flex-col items-center justify-center">
      <div className="text-7xl font-bold text-success drop-shadow-[0_0_30px_rgba(46,204,113,0.5)]" id="calCountdown">
        3
      </div>
      <div className="text-base text-secondary-foreground mt-3" id="calText">
        Halte deine optimale Spielhaltung...
      </div>
    </div>
  )
}

/**
 * Update the calibration overlay imperatively (called from hook).
 */
export function updateCalibrationUI(countdown: number, text: string, color?: string) {
  const countdownEl = document.getElementById('calCountdown')
  const textEl = document.getElementById('calText')
  if (countdownEl) {
    countdownEl.textContent = String(countdown)
    if (color) countdownEl.style.color = color
  }
  if (textEl) textEl.textContent = text
}
