import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { usePoseStore } from '@/store/pose-store'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { useCalibration } from '@/hooks/use-calibration'
import { useVoiceCommands, type VoiceCommandMap } from '@/hooks/use-voice-control'
import { CalibrationOverlay, updateCalibrationUI } from '@/components/calibration-overlay'
import { DistanceIndicator } from '@/components/distance-indicator'
import { selectSessionPhase, selectPhaseHint, selectSessionDuration, selectStatusColor, selectHudFaded } from '@/store/selectors'
import { saveSession, addHoldMilestones } from '@/core/persistence/session-db'
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
  const isCalibrating = usePoseStore((s) => s.isCalibrating)
  const statusColor = usePoseStore(selectStatusColor)
  const goToResults = usePoseStore((s) => s.goToResults)
  const startSession = usePoseStore((s) => s.startSession)
  const viewMode = usePoseStore((s) => s.viewMode)
  const hudFaded = usePoseStore(selectHudFaded)

  const { resetAnalysisState, landmarkerRef, handLandmarkerRef, startTracking, stopTracking } = usePoseDetection(videoRef, canvasRef)

  const { startCountdown } = useCalibration({
    videoRef,
    canvasRef,
    handLandmarkerRef,
    onCalibrated: resetAnalysisState,
  })

  const handleCalibrate = useCallback(() => {
    const landmarker = landmarkerRef.current
    if (!landmarker) return

    setCalColor(undefined)

    startCountdown(
      3,
      landmarker,
      (remaining) => {
        updateCalibrationUI(remaining, 'Halte deine optimale Spielhaltung...')
        setCalCountdown(remaining)
        setCalText('Halte deine optimale Spielhaltung...')
      },
      (success, reason) => {
        if (!success) {
          const msg = reason === 'no_hand'
            ? 'Hand nicht erkannt — Hand sichtbar ins Bild halten und erneut versuchen'
            : 'Kalibrierung fehlgeschlagen — erneut versuchen'
          updateCalibrationUI(0, msg, '#e74c3c')
          setCalCountdown(0)
          setCalText(msg)
          setCalColor('#e74c3c')
        } else {
          setCalCountdown(0)
          setCalText('')
        }
      },
    )
  }, [landmarkerRef, handLandmarkerRef, startCountdown])

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
        maxFlowStreak: trackerStats.maxFlowStreak,
        holdMilestones: trackerStats.holdMilestones,
        bestMilestoneLevel: trackerStats.bestMilestoneLevel,
      }
      saveSession(stored).catch(console.error)
      if (trackerStats.holdMilestones && trackerStats.holdMilestones > 0) {
        addHoldMilestones(trackerStats.holdMilestones).catch(console.error)
      }

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
        maxFlowStreak: 0,
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
    flow: () => usePoseStore.getState().setViewMode('flow'),
    analyse: () => usePoseStore.getState().setViewMode('analyse'),
  }), [handleCalibrate, handleStart, handleStop, handleRecalibrate])

  const { startListening, stopListening } = useVoiceCommands(voiceCommands, true)
  const [micActive, setMicActive] = useState(false)
  const [calCountdown, setCalCountdown] = useState(0)
  const [calText, setCalText] = useState('')
  const [calColor, setCalColor] = useState<string | undefined>(undefined)

  // Auto-start mic on mount — runs after first user interaction (camera permission)
  useEffect(() => {
    startListening()
    setMicActive(true)
  }, [startListening])

  const handleToggleMic = useCallback(() => {
    if (micActive) {
      stopListening()
      setMicActive(false)
    } else {
      startListening()
      setMicActive(true)
    }
  }, [micActive, startListening, stopListening])

  return (
    <div data-theme="dark" className="fixed inset-0 bg-black">
      {/* Video feed — fills viewport, hidden in flow mode */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={cn(
          "absolute inset-0 w-full h-full object-contain scale-x-[-1] saturate-[0.4] brightness-[0.85]",
          viewMode === 'flow' && "opacity-0"
        )}
      />

      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain scale-x-[-1] z-[2]"
      />

      {/* Calibration overlay (desktop/tablet only) */}
      <div className="hidden sm:block">
        <CalibrationOverlay />
      </div>

      {/* Distance indicator (pre-calibration) */}
      <DistanceIndicator />

      {/* ═══════════════════════════════════════════
          DESKTOP / TABLET HUD (≥480px)
          ═══════════════════════════════════════════ */}

      {/* HUD: Mode badge — top left */}
      <div className={cn(
        "hidden sm:block absolute top-[clamp(8px,2vh,16px)] left-[clamp(8px,2vh,16px)] z-10 transition-opacity duration-700",
        hudFaded && "opacity-20"
      )}>
        <Badge variant="secondary" className="text-sm px-3 py-1 bg-background/60 backdrop-blur">
          {MODE_LABELS[focusMode] ?? focusMode}
        </Badge>
      </div>

      {/* HUD: Session timer — top right */}
      {phase === 'tracking' && (
        <div className={cn(
          "hidden sm:block absolute top-[clamp(8px,2vh,16px)] right-[clamp(8px,2vh,16px)] z-10 transition-opacity duration-700",
          hudFaded && "opacity-20"
        )}>
          <Badge variant="secondary" className="text-sm px-3 py-1 bg-background/60 backdrop-blur font-mono tabular-nums">
            {duration}
          </Badge>
        </div>
      )}

      {/* HUD: Tension bar — bottom left */}
      {(phase === 'ready-to-start' || phase === 'tracking') && (
        <div className={cn(
          "hidden sm:block absolute bottom-[clamp(16px,4vh,80px)] left-[clamp(8px,2vh,16px)] z-10 w-[clamp(160px,20vw,192px)] transition-opacity duration-700",
          hudFaded && "opacity-20"
        )}>
          <div className="bg-background/60 backdrop-blur rounded-lg px-3 py-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Spannung</span>
              <span className="font-mono tabular-nums">{Math.round(tensionScore)}%</span>
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
      <div className={cn(
        "hidden sm:block absolute bottom-[clamp(16px,4vh,80px)] right-[clamp(8px,2vh,16px)] z-10 transition-opacity duration-700",
        hudFaded && "opacity-20"
      )}>
        <button
          onClick={handleToggleMic}
          className={cn(
            'px-4 py-2 rounded-lg text-xs font-medium transition-all',
            'backdrop-blur text-white active:scale-95',
            micActive
              ? 'bg-background/40 border border-border/50 text-muted-foreground hover:bg-background/60'
              : 'bg-sapphire/80 hover:bg-sapphire',
          )}
        >
          {micActive ? `🎤 ${hint}` : '🎤 Aus'}
        </button>
      </div>

      {/* HUD: Fallback buttons — bottom center */}
      <div className={cn(
        "hidden sm:flex absolute bottom-[clamp(8px,2vh,16px)] left-1/2 -translate-x-1/2 z-10 gap-3 transition-opacity duration-300",
        hudFaded && "opacity-20"
      )}>
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

      {/* ═══════════════════════════════════════════
          PHONE HUD (<480px)
          ═══════════════════════════════════════════ */}

      {/* Top bar: Mode badge + Timer */}
      <div className={cn(
        "sm:hidden absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-4 pt-safe py-2",
        hudFaded && "opacity-20"
      )}>
        <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-background/60 backdrop-blur">
          {MODE_LABELS[focusMode] ?? focusMode}
        </Badge>
        {phase === 'tracking' && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-background/60 backdrop-blur font-mono tabular-nums">
            {duration}
          </Badge>
        )}
      </div>

      {/* Bottom bar: Tension + Controls (+ Calibration expand on phone) */}
      {(phase === 'ready-to-calibrate' || phase === 'ready-to-start' || phase === 'tracking' || isCalibrating) && (
        <div className={cn(
          "sm:hidden absolute bottom-0 left-0 right-0 z-10 bg-surface/80 backdrop-blur transition-all duration-300",
          isCalibrating ? "flex-col gap-1 p-3 pb-safe h-[120px]" : "flex-row items-center gap-2 p-2 pb-safe",
          hudFaded && "opacity-15"
        )}>
          {/* Calibration view (expanded) */}
          {isCalibrating && (
            <>
              <div
                className="text-3xl font-bold drop-shadow-md transition-colors duration-300"
                style={{ color: calColor ?? '#2ecc71' }}
              >
                {calCountdown > 0 ? calCountdown : '✕'}
              </div>
              <div className="text-xs text-muted-foreground text-center">{calText}</div>
              <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(calCountdown / 3) * 100}%`,
                    backgroundColor: calColor ?? '#2ecc71',
                  }}
                />
              </div>
            </>
          )}

          {/* Normal view (compact) */}
          {!isCalibrating && (
            <>
              {/* Compact tension bar */}
              {(phase === 'ready-to-start' || phase === 'tracking') && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                    <span className="shrink-0">Spannung</span>
                    <span className="font-mono tabular-nums">{Math.round(tensionScore)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(tensionScore, 100)}%`,
                        backgroundColor: statusColor,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleToggleMic}
                  className={cn(
                    'px-2 py-2 min-h-[44px] rounded-lg text-xs font-medium transition-all backdrop-blur active:scale-95',
                    micActive
                      ? 'bg-background/40 border border-border/50 text-muted-foreground'
                      : 'bg-sapphire/80 text-white hover:bg-sapphire',
                  )}
                >
                  {micActive ? '🎤' : '🔇'}
                </button>

                {phase === 'ready-to-calibrate' && (
                  <PhoneButton onClick={handleCalibrate}>Kalibrieren</PhoneButton>
                )}
                {phase === 'ready-to-start' && (
                  <>
                    <PhoneButton onClick={handleStart}>Start</PhoneButton>
                    <PhoneButton onClick={handleRecalibrate}>↻</PhoneButton>
                  </>
                )}
                {phase === 'tracking' && (
                  <>
                    <PhoneButton onClick={handleStop}>Stop</PhoneButton>
                    <PhoneButton onClick={handleRecalibrate}>↻</PhoneButton>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PhoneButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-3 min-h-[44px] rounded-lg text-xs font-medium transition-all',
        'bg-background/40 backdrop-blur border border-border/50 text-foreground/80',
        'hover:bg-background/60 hover:text-foreground active:scale-95',
      )}
    >
      {children}
    </button>
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
