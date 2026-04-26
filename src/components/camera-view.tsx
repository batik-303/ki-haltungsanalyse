import { useRef } from 'react'
import { usePoseDetection } from '../hooks/use-pose-detection'
import { useCalibration } from '../hooks/use-calibration'
import { updateCalibrationUI } from './calibration-overlay'
import { FocusModeSelector } from './focus-mode-selector'
import { SensitivitySelector } from './sensitivity-selector'
import { CalibrationOverlay } from './calibration-overlay'
import { CalibrateControls } from './calibrate-controls'
import { StatusBar } from './status-bar'
import { InfoPanel } from './info-panel'
import { SessionStats } from './session-stats'
import { DistanceIndicator } from './distance-indicator'
import { Instructions } from './instructions'

export function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { resetAnalysisState, landmarkerRef } = usePoseDetection(videoRef, canvasRef)

  const { startCountdown, cancelCountdown } = useCalibration({
    videoRef,
    onCalibrated: resetAnalysisState,
  })

  const handleCalibrate = () => {
    const landmarker = landmarkerRef.current
    if (!landmarker) return

    startCountdown(
      3,
      landmarker,
      (remaining) => updateCalibrationUI(remaining, 'Halte deine optimale Spielhaltung...'),
      (success) => {
        if (!success) {
          updateCalibrationUI(0, 'Kalibrierung fehlgeschlagen — erneut versuchen', '#e74c3c')
        }
      },
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <FocusModeSelector />

      <div className="relative w-[640px] h-[480px] rounded-2xl overflow-hidden border-2 border-muted shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute top-0 left-0 w-full h-full scale-x-[-1] saturate-[0.4] brightness-[0.85]"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full scale-x-[-1] z-[2]"
        />
        <DistanceIndicator />
        <CalibrationOverlay />
      </div>

      <StatusBar />
      <CalibrateControls onCalibrate={handleCalibrate} />
      <SensitivitySelector />
      <InfoPanel />
      <SessionStats />
      <Instructions />
    </div>
  )
}
