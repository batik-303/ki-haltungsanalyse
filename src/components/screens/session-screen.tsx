import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { usePoseStore } from '@/store/pose-store'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { useCalibration } from '@/hooks/use-calibration'
import { useVoiceCommands, type VoiceCommandMap, type VoiceStatus } from '@/hooks/use-voice-control'
import { CalibrationOverlay } from '@/components/calibration-overlay'
import type { CalibrationPhase } from '@/core/calibration/overlay-view'
import { DistanceGlow } from '@/components/distance-glow'
import { ReadinessHint } from '@/components/readiness-hint'
import { selectSessionPhase, selectPhaseHint, selectSessionDuration, selectStatusColor, selectHudFaded } from '@/store/selectors'
import { saveSession, addHoldMilestones } from '@/core/persistence/session-db'
import { Badge } from '@/components/ui/badge'
import { Home } from 'lucide-react'
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
  const goHome = usePoseStore((s) => s.goHome)
  const viewMode = usePoseStore((s) => s.viewMode)
  const hudFaded = usePoseStore(selectHudFaded)
  const readinessArmed = usePoseStore((s) => s.readinessArmed)
  const setReadinessArmed = usePoseStore((s) => s.setReadinessArmed)

  const { resetAnalysisState, armReadiness, landmarkerRef, handLandmarkerRef, startTracking, stopTracking } = usePoseDetection(videoRef, canvasRef)

  const { startCountdown } = useCalibration({
    videoRef,
    canvasRef,
    handLandmarkerRef,
    onCalibrated: resetAnalysisState,
  })

  // Interner Countdown-Läufer. Wird **nicht** direkt vom Nutzer aufgerufen,
  // sondern vom Auslöse-Tor (`readinessArmed`-Effekt), sobald der bewusste
  // Auslöser + der passende Abstand zusammenkommen (#59).
  const handleCalibrate = useCallback(() => {
    const landmarker = landmarkerRef.current
    if (!landmarker) return

    setCalState({ kind: 'counting', count: 3 })

    startCountdown(
      3,
      landmarker,
      (remaining) => setCalState({ kind: 'counting', count: remaining }),
      (success, reason) => {
        if (success) {
          // Erfolg geht direkt in die Analyse über (#58): keine „gespeichert"-
          // Bestätigung. Der Store hat die Session bereits gestartet
          // (calibrate → sessionActive); hier wird der frisch zurückgesetzte
          // Session-Tracker (rAF-Loop-Ref) scharf geschaltet und das Overlay
          // ausgeblendet — die Analyse läuft sofort weiter.
          startTracking()
          setCalState(null)
        } else {
          // Weiche Erfassung (#59): nichts gespeichert → Tor zurück auf idle,
          // damit der Nutzer ruhig neu auslösen kann (kein Wiederholzwang).
          resetAnalysisState()
          setCalState({ kind: 'retry', reason })
        }
      },
    )
  }, [landmarkerRef, startCountdown, resetAnalysisState, startTracking])

  // Bewusster Kalibrier-Auslöser (#59): „bereit"/„Haltung speichern" (T4) und
  // der Rückfall-Knopf laufen hierüber. Kein Sofort-Countdown mehr — das
  // Distanz-Gate feuert automatisch, sobald der Abstand passt.
  const handleArm = useCallback(() => {
    armReadiness()
  }, [armReadiness])

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

  // Bewusstes „Neu kalibrieren" (#35): der einzige Punkt, an dem eine erhaltene
  // Kalibrierung verworfen wird. Der Store-`recalibrate` räumt masterPrint,
  // Schulterbreite, Zeitstempel und das Bereitschafts-Tor auf; danach müssen
  // auch die rAF-Loop-Refs zurückgesetzt werden (Triple-State-System).
  const handleRecalibrate = useCallback(() => {
    const store = usePoseStore.getState()
    if (store.isCalibrating) return
    store.recalibrate()
    resetAnalysisState()
  }, [resetAnalysisState])

  // „Home" = Abbruch ohne Auswertung (Trichtermodell): Sitzung verwerfen, Kamera
  // freigeben und zurück ins Hauptmenü — kein results-Screen. Siehe CONTEXT.md → „Home".
  const handleAbort = useCallback(() => {
    stopTracking()
    goHome()
  }, [stopTracking, goHome])

  const voiceCommands: VoiceCommandMap = useMemo(() => ({
    // #59: „kalibrieren"/„bereit" armiert das Distanz-Gate (kein Sofort-
    // Countdown). #58: der „start"-Befehl entfällt — es gibt keinen Start-Schritt.
    kalibrieren: handleArm,
    stop: handleStop,
    neu: handleRecalibrate,
    flow: () => usePoseStore.getState().setViewMode('flow'),
    analyse: () => usePoseStore.getState().setViewMode('analyse'),
  }), [handleArm, handleStop, handleRecalibrate])

  const { startListening, stopListening, status: voiceStatus, error: voiceError } = useVoiceCommands(voiceCommands, true)
  const [calState, setCalState] = useState<CalibrationPhase | null>(null)

  // Auto-start mic on mount — runs after first user interaction (camera permission).
  // Der sichtbare Zustand kommt jetzt aus `voiceStatus` (nicht mehr optimistisch).
  useEffect(() => {
    startListening()
  }, [startListening])

  // Auto-Start bei erhaltener Kalibrierung (#35 + #58): Wird die Session mit
  // bereits gültigem MasterPrint betreten („Nochmal üben" / Wiedereintritt),
  // läuft die Analyse sofort — es gibt keinen „Start"-Schritt. Der Store hat
  // sessionActive dabei schon gesetzt; hier wird der frisch gemountete
  // Session-Tracker (rAF-Loop-Ref) genau einmal scharf geschaltet. Eine frische
  // Kalibrierung startet den Tracker stattdessen im Kalibrier-Erfolgszweig.
  const didAutoStartRef = useRef(false)
  useEffect(() => {
    if (didAutoStartRef.current) return
    const store = usePoseStore.getState()
    if (store.masterPrint && store.sessionActive) {
      didAutoStartRef.current = true
      startTracking()
    }
  }, [startTracking])

  // Auslöse-Tor scharf (#59): der Countdown startet, sobald der bewusste
  // Auslöser (via `handleArm`) mit passendem Abstand zusammenkommt — das
  // Distanz-Gate hat schon gewartet, hier fällt nur noch die Kante. Sie wird
  // sofort quittiert, damit sie nur einmal feuert.
  useEffect(() => {
    if (!readinessArmed) return
    setReadinessArmed(false)
    if (phase === 'ready-to-calibrate' && !calState) {
      handleCalibrate()
    }
  }, [readinessArmed, phase, calState, handleCalibrate, setReadinessArmed])

  // Mikro-Knopf: läuft die Erkennung, schaltet ein Tipp sie aus. Ist sie aus oder
  // in einem Fehlerzustand (z. B. Mikro nicht freigegeben), ist der Tipp eine
  // echte Nutzergeste — genau das, was manche Browser (Safari) zum Neustart der
  // Spracherkennung verlangen. So heilt ein stiller Ausfall per Tipp.
  const handleToggleMic = useCallback(() => {
    if (voiceStatus === 'listening' || voiceStatus === 'starting') {
      stopListening()
    } else {
      startListening()
    }
  }, [voiceStatus, startListening, stopListening])

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

      {/* Kalibrier-Overlay — Variante C „Minimal HUD" (alle Größen) */}
      {calState && (
        <CalibrationOverlay
          phase={calState}
          modeLabel={MODE_LABELS[focusMode] ?? focusMode}
          onRecalibrate={() => { setCalState(null); handleArm() }}
        />
      )}

      {/* Distanz-Rand-Führung „Randglühen" (vor Kalibrierung) — hinter dem Overlay aus */}
      {!calState && <DistanceGlow />}

      {/* Bereitschafts-Tor: dezenter Hinweis + Halte-Fortschritt am oberen Rand (#36) */}
      {!calState && <ReadinessHint />}

      {/* ═══════════════════════════════════════════
          DESKTOP / TABLET HUD (≥480px)
          ═══════════════════════════════════════════ */}

      {/* HUD: Home-Abbruch + Mode badge — top left */}
      <div className={cn(
        "hidden sm:flex items-center gap-2 absolute top-[clamp(8px,2vh,16px)] left-[clamp(8px,2vh,16px)] z-10 transition-opacity duration-700",
        hudFaded && "opacity-20"
      )}>
        <button
          onClick={handleAbort}
          aria-label="Hauptmenü"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            'bg-background/40 backdrop-blur border border-border/50 text-foreground/80',
            'hover:bg-background/60 hover:text-foreground active:scale-95',
          )}
        >
          <Home className="size-4" />
          Home
        </button>
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
      {!calState && phase === 'tracking' && (
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

      {/* HUD: Mikrofon-Hinweis — im Tracking unten rechts */}
      {!calState && phase === 'tracking' && (
        <div className={cn(
          "hidden sm:block absolute bottom-[clamp(16px,4vh,80px)] right-[clamp(8px,2vh,16px)] z-10 transition-opacity duration-700",
          hudFaded && "opacity-20"
        )}>
          <MicButton status={voiceStatus} error={voiceError} hint={hint} onClick={handleToggleMic} />
        </div>
      )}

      {/* HUD: Einstieg — zentrierter Stapel: Gold-Knopf oben, Sprach-Hinweis darunter */}
      {!calState && phase === 'ready-to-calibrate' && (
        <div className={cn(
          "hidden sm:flex flex-col items-center gap-3 absolute bottom-[clamp(24px,6vh,96px)] left-1/2 -translate-x-1/2 z-10 transition-opacity duration-300",
          hudFaded && "opacity-20"
        )}>
          <FallbackButton onClick={handleArm} primary>Haltung speichern</FallbackButton>
          <MicButton status={voiceStatus} error={voiceError} hint={hint} onClick={handleToggleMic} />
        </div>
      )}

      {/* HUD: Tracking-Steuerung — bottom center */}
      {!calState && phase === 'tracking' && (
        <div className={cn(
          "hidden sm:flex absolute bottom-[clamp(8px,2vh,16px)] left-1/2 -translate-x-1/2 z-10 gap-3 transition-opacity duration-300",
          hudFaded && "opacity-20"
        )}>
          <FallbackButton onClick={handleStop}>Stop</FallbackButton>
          <FallbackButton onClick={handleRecalibrate}>Neu kalibrieren</FallbackButton>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PHONE HUD (<480px)
          ═══════════════════════════════════════════ */}

      {/* Top bar: Mode badge + Timer */}
      <div className={cn(
        "sm:hidden absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-4 pt-safe py-2",
        hudFaded && "opacity-20"
      )}>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAbort}
            aria-label="Hauptmenü"
            className={cn(
              'flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg transition-all',
              'bg-background/40 backdrop-blur border border-border/50 text-foreground/80 active:scale-95',
            )}
          >
            <Home className="size-4" />
          </button>
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-background/60 backdrop-blur">
            {MODE_LABELS[focusMode] ?? focusMode}
          </Badge>
        </div>
        {phase === 'tracking' && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-background/60 backdrop-blur font-mono tabular-nums">
            {duration}
          </Badge>
        )}
      </div>

      {/* Bottom bar: Tension + Controls — Kalibrierung läuft im Overlay */}
      {!calState && (phase === 'ready-to-calibrate' || phase === 'tracking') && (
        <div className={cn(
          "sm:hidden absolute bottom-0 left-0 right-0 z-10 flex flex-row items-center gap-2 bg-surface/80 p-2 pb-safe backdrop-blur transition-all duration-300",
          hudFaded && "opacity-15"
        )}>
          {/* Compact tension bar */}
          {phase === 'tracking' && (
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
              aria-label="Sprachsteuerung umschalten"
              className={cn(
                'px-2 py-2 min-h-[44px] rounded-lg text-xs font-medium transition-all backdrop-blur active:scale-95',
                voiceStatus === 'listening'
                  ? 'bg-background/75 border border-white/25 text-white'
                  : voiceStatus === 'error' || voiceStatus === 'unsupported'
                    // Kein Rot: Amber lädt zum Antippen (Neustart per Geste) ein.
                    ? 'bg-amber-500/85 text-amber-950'
                    : 'bg-sapphire/80 text-white hover:bg-sapphire',
              )}
            >
              {voiceStatus === 'listening' ? '🎤' : voiceStatus === 'error' || voiceStatus === 'unsupported' ? '⚠️' : '🔇'}
            </button>

            {phase === 'ready-to-calibrate' && (
              <PhoneButton onClick={handleArm} primary>Speichern</PhoneButton>
            )}
            {phase === 'tracking' && (
              <>
                <PhoneButton onClick={handleStop}>Stop</PhoneButton>
                <PhoneButton onClick={handleRecalibrate}>↻</PhoneButton>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PhoneButton({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'min-h-[44px] rounded-lg text-xs font-medium transition-all backdrop-blur active:scale-95',
        primary
          // Geigenholz-Gold-CTA: sofort als Hauptaktion erkennbar
          ? 'px-4 py-3 font-semibold bg-accent text-accent-foreground shadow-lg shadow-black/30 ring-1 ring-accent/60 hover:bg-accent/90'
          : 'px-3 py-3 bg-background/40 border border-border/50 text-foreground/80 hover:bg-background/60 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function MicButton({
  status,
  error,
  hint,
  onClick,
}: {
  status: VoiceStatus
  error: string | null
  hint: string
  onClick: () => void
}) {
  // Beobachtbarer Zustand statt blindem „aktiv" — ein stiller Ausfall wird sichtbar.
  const label =
    status === 'listening' ? `🎤 ${hint}`
    : status === 'starting' ? '🎤 startet …'
    : status === 'error' || status === 'unsupported' ? `🎤 ${error ?? 'Mikro aus — tippen'}`
    : '🎤 Aus — tippen zum Aktivieren'

  const isProblem = status === 'error' || status === 'unsupported'

  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-xs font-medium transition-all max-w-[min(80vw,420px)] truncate',
        'backdrop-blur text-white active:scale-95',
        status === 'listening'
          ? 'bg-background/75 border border-white/25 text-white hover:bg-background/85'
          : isProblem
            // Kein Rot (Feedback-Grundsatz): Amber lädt zum Antippen ein, statt zu tadeln.
            ? 'bg-amber-500/85 text-amber-950 border border-amber-300/40 hover:bg-amber-500'
            : 'bg-sapphire/80 hover:bg-sapphire',
      )}
    >
      {label}
    </button>
  )
}

function FallbackButton({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg font-medium transition-all backdrop-blur',
        primary
          // Geigenholz-Gold-CTA: sofort als Hauptaktion erkennbar
          ? 'px-6 py-2.5 text-sm font-semibold bg-accent text-accent-foreground shadow-lg shadow-black/30 ring-1 ring-accent/60 hover:bg-accent/90 active:scale-95'
          : 'px-4 py-2 text-xs bg-background/40 border border-border/50 text-foreground/80 hover:bg-background/60 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
