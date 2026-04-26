import { usePoseStore } from '../store/pose-store'

interface Props {
  onCalibrate: () => void
}

export function CalibrateControls({ onCalibrate }: Props) {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const isCalibrating = usePoseStore((s) => s.isCalibrating)
  const distanceOk = usePoseStore((s) => s.distanceOk)
  const endSession = usePoseStore((s) => s.endSession)

  const handleEndSession = () => endSession(null)

  if (!masterPrint) {
    return (
      <button
        onClick={onCalibrate}
        disabled={isCalibrating || !distanceOk}
        className="px-5 py-2.5 rounded-xl border-2 border-sapphire bg-sapphire/15 text-sapphire-light text-base font-semibold transition-all hover:bg-sapphire/25 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        🔵 Kalibrieren
      </button>
    )
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={onCalibrate}
        disabled={isCalibrating}
        className="px-4 py-2 rounded-lg border border-border bg-secondary/30 text-secondary-foreground text-sm transition-all hover:bg-secondary/50 disabled:opacity-40"
      >
        🔄 Neu kalibrieren
      </button>
      <button
        onClick={handleEndSession}
        className="px-4 py-2 rounded-lg border border-border bg-secondary/30 text-secondary-foreground text-sm transition-all hover:bg-secondary/50"
      >
        🛑 Session beenden
      </button>
    </div>
  )
}
