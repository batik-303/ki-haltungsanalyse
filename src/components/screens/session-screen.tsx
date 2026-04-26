import { useRef, useState, useCallback, useMemo } from 'react'
import { usePoseStore } from '@/store/pose-store'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { useCalibration } from '@/hooks/use-calibration'
import { useVoiceCommands, type VoiceCommandMap } from '@/hooks/use-voice-control'
import { CalibrationOverlay, updateCalibrationUI } from '@/components/calibration-overlay'
import { DistanceIndicator } from '@/components/distance-indicator'
import { selectSessionPhase, selectPhaseHint, selectSessionDuration, selectStatusColor } from '@/store/selectors'
import { saveSession } from '@/core/persistence/session-db'
import { Badge } from '@/components/ui/badge'
import type { StoredSession } from '@/core/types'
import { cn } from '@/lib/utils'

const MODE_LABELS: Record<string, string> = {
  violin: '🎻 Geige',
  wrist: '🤚 Handgelenk',
  shoulder: '💪 Schulter',
}

export function SessionScreen() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const focusMode = usePoseStore((s) => s.focusMode)
  const phase = usePoseStore(selectSessionPhase)
  const hint = usePoseStore(selectPhaseHint)
  const duration = usePoseStore(selectSessionDuration)
  const tensionScore = usePoseStore((s) => s.tensionScore)
  const statusColor = usePoseStore(selectStatusColor)
  const goToResults = usePoseStore((s) => s.goToResults)
  const startSession = usePoseStore((s) => s.startSession)

  const { resetAnalysisState, landmarkerRef, startTracking, stopTracking } = usePoseDetection(videoRef, canvasRef)

  const { startCountdown } = useCalibration({
    videoRef,
    onCalibrated: resetAnalysisState,
  })

  const handleCalibrate = useCallback(() => {
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
  }, [landmarkerRef, startCountdown])

  const handleStart = useCallback(() => {
    const store = usePoseStore.getState()
    if (!store.masterPrint || store.sessionActive) return
    startTracking()
    startSession()
  }, [startSession, startTracking])

  const handleStop = useCallback(async () => {
    const store = usePoseStore.getState()
    if (!store.sessionActive) return

    // Stop tracker FIRST to capture stats before any state reset
    const trackerStats = stopTracking()

    if (trackerStats) {
      // Save to IndexedDB
      const stored: StoredSession = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        instrument: store.selectedInstrument ?? 'violin',
        focusMode: store.focusMode,
        sensitivity: store.sensitivity,
        durationMs: trackerStats.durationMs,
        zones: trackerStats.zones,
        zonePercentages: trackerStats.zonePercentages,
        tensionTimeline: trackerStats.tensionTimeline,
      }
      saveSession(stored).catch(console.error)

      store.endSession(trackerStats)
      goToResults(trackerStats)
    } else {
      // Session too short (<30 frames)
      store.endSession(null)
      goToResults({
        durationMs: 0,
        durationMinutes: 0,
        durationSeconds: 0,
        totalFrames: 0,
        zones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
        zonePercentages: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
        tensionTimeline: [],
      })
    }
  }, [goToResults, stopTracking])

  const handleRecalibrate = useCallback(() => {
    const store = usePoseStore.getState()
    if (store.isCalibrating) return
    usePoseStore.setState({ masterPrint: null, sessionActive: false })
    resetAnalysisState()
  }, [resetAnalysisState])

  const voiceCommands: VoiceCommandMap = useMemo(() => ({
    kalibrieren: handleCalibrate,
    start: handleStart,
    stop: handleStop,
    neu: handleRecalibrate,
  }), [handleCalibrate, handleStart, handleStop, handleRecalibrate])

  const { startListening } = useVoiceCommands(voiceCommands, true)
  const [micActive, setMicActive] = useState(false)

  const handleActivateMic = useCallback(() => {
    startListening()
    setMicActive(true)
  }, [startListening])

  return (
    <div className="fixed inset-0 bg-black">
      {/* Video feed — fills viewport */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] saturate-[0.4] brightness-[0.85]"
      />

      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-[2]"
      />

      {/* Calibration overlay */}
      <CalibrationOverlay />

      {/* Distance indicator (pre-calibration) */}
      <DistanceIndicator />

      {/* HUD: Mode badge — top left */}
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="secondary" className="text-sm px-3 py-1 bg-background/60 backdrop-blur">
          {MODE_LABELS[focusMode] ?? focusMode}
        </Badge>
      </div>

      {/* HUD: Session timer — top right */}
      {phase === 'tracking' && (
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="secondary" className="text-sm px-3 py-1 bg-background/60 backdrop-blur tabular-nums">
            {duration}
          </Badge>
        </div>
      )}

      {/* HUD: Tension bar — bottom left */}
      {(phase === 'ready-to-start' || phase === 'tracking') && (
        <div className="absolute bottom-20 left-4 z-10 w-48">
          <div className="bg-background/60 backdrop-blur rounded-lg px-3 py-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Spannung</span>
              <span>{Math.round(tensionScore)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(tensionScore, 100)}%`,
                  backgroundColor: statusColor,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* HUD: Voice hint / mic activation — bottom right */}
      <div className="absolute bottom-20 right-4 z-10">
        {micActive ? (
          <div className="bg-background/60 backdrop-blur rounded-lg px-3 py-2 text-xs text-muted-foreground">
            🎤 {hint}
          </div>
        ) : (
          <button
            onClick={handleActivateMic}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-medium transition-all',
              'bg-sapphire/80 backdrop-blur text-white',
              'hover:bg-sapphire active:scale-95',
              'animate-pulse',
            )}
          >
            🎤 Mikrofon aktivieren
          </button>
        )}
      </div>

      {/* Fallback buttons — bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        {phase === 'ready-to-calibrate' && (
          <FallbackButton onClick={handleCalibrate}>Kalibrieren</FallbackButton>
        )}
        {phase === 'ready-to-start' && (
          <>
            <FallbackButton onClick={handleStart}>Start</FallbackButton>
            <FallbackButton onClick={handleRecalibrate}>Neu kalibrieren</FallbackButton>
          </>
        )}
        {phase === 'tracking' && (
          <>
            <FallbackButton onClick={handleStop}>Stop</FallbackButton>
            <FallbackButton onClick={handleRecalibrate}>Neu kalibrieren</FallbackButton>
          </>
        )}
      </div>
    </div>
  )
}

function FallbackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-xs font-medium transition-all',
        'bg-background/40 backdrop-blur border border-border/50 text-foreground/80',
        'hover:bg-background/60 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
