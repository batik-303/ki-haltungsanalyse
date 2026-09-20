import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { usePoseStore } from '@/store/pose-store'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { useCalibration } from '@/hooks/use-calibration'
import { useVoiceCommands, type VoiceCommandMap, type VoiceStatus } from '@/hooks/use-voice-control'
import { CalibrationOverlay } from '@/components/calibration-overlay'
import type { CalibrationPhase } from '@/core/calibration/overlay-view'
import { DistanceGlow } from '@/components/distance-glow'
import { DistanceHint } from '@/components/distance-hint'
import { ReadinessHint } from '@/components/readiness-hint'
import { selectSessionPhase, selectPhaseHint } from '@/store/selectors'
import { saveSession, addHoldMilestones } from '@/core/persistence/session-db'
import { Badge } from '@/components/ui/badge'
import { Home } from 'lucide-react'
import type { StoredSession, ViewMode } from '@/core/types'
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
  const goToResults = usePoseStore((s) => s.goToResults)
  const goHome = usePoseStore((s) => s.goHome)
  const viewMode = usePoseStore((s) => s.viewMode)
  // Die HUD wird NICHT mehr an die Haltung gekoppelt aus-/eingeblendet: das
  // koppelte das Sichtbarwerden an eine zappelnde Spannungs-Kennzahl und flackerte
  // beim Spielen. Stattdessen ist die Steuerung immer sichtbar — im Analyse-Modus
  // farbig, im Flow-Modus bewusst diskret (weißer Text, ohne Farbe), damit die
  // periphere Ansicht ruhig bleibt und „Beenden" trotzdem jederzeit greifbar ist.
  const isFlow = viewMode === 'flow'
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

  // Ansicht umschalten: Analyse (volles Bild + Skelett) ⇄ Flow (ruhige, ambiente
  // Ansicht). Bisher nur per Sprache („flow"/„analyse") erreichbar — jetzt auch als
  // sichtbarer Knopf, damit der Flow-Modus überhaupt auffindbar ist.
  const handleToggleView = useCallback(() => {
    const store = usePoseStore.getState()
    store.setViewMode(store.viewMode === 'flow' ? 'analyse' : 'flow')
  }, [])

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

  // Freihändiger Start: `useVoiceCommands(…, true)` lässt die Erkennung von selbst
  // anlaufen (siehe Hook). Kein separater Mount-Effekt mehr — der hatte mit dem
  // Auto-Stopp des Hooks um den Start gerennt und ihn im Dev (StrictMode) tot gelegt.

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

      {/* Distanz-Richtungshinweis („näher"/„zurück") vor der Kalibrierung (Punkt 2) */}
      {!calState && <DistanceHint />}

      {/* Bereitschafts-Tor: dezenter Hinweis + Halte-Fortschritt am oberen Rand (#36) */}
      {!calState && <ReadinessHint />}

      {/* ═══════════════════════════════════════════
          DESKTOP / TABLET HUD (≥480px)
          ═══════════════════════════════════════════ */}

      {/* HUD: Home-Abbruch + Mode badge — top left */}
      <div className="hidden sm:flex items-center gap-2 absolute top-[clamp(8px,2vh,16px)] left-[clamp(8px,2vh,16px)] z-10">
        <ExitButton onClick={handleAbort} withLabel />
        <Badge variant="secondary" className="text-sm px-3 py-1 bg-background/60 backdrop-blur">
          {MODE_LABELS[focusMode] ?? focusMode}
        </Badge>
      </div>

      {/* Timer & Spannungsleiste bewusst entfernt: der Timer stresst und widerspricht
          der ruhigen Philosophie (Übungsdauer erscheint stattdessen am Ende auf der
          Ergebnis-Seite). Die Spannung führt ohnehin der Canvas selbst über Glühen/
          Farbe — die Prozentleiste war redundant. */}

      {/* HUD: Einstieg — zentrierter Stapel: Gold-Knopf oben, Sprach-Hinweis darunter */}
      {!calState && phase === 'ready-to-calibrate' && (
        <div className="hidden sm:flex flex-col items-center gap-3 absolute bottom-[clamp(24px,6vh,96px)] left-1/2 -translate-x-1/2 z-10">
          <FallbackButton onClick={handleArm} primary>Haltung speichern</FallbackButton>
          <MicButton status={voiceStatus} error={voiceError} hint={hint} onClick={handleToggleMic} />
        </div>
      )}

      {/* HUD: Tracking-Steuerung — zentrierter Stapel: [Beenden] [Flow⇄Analyse] oben,
          Sprach-Hinweis mittig darunter (analog zum Einstieg-Stapel). „Neu kalibrieren"
          entfällt in V0.1 (bleibt per Sprache „neu" erreichbar); Home liegt oben links. */}
      {!calState && phase === 'tracking' && (
        <div className="hidden sm:flex flex-col items-center gap-3 absolute bottom-[clamp(24px,6vh,96px)] left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-3">
            {isFlow ? (
              // Flow-Modus: diskrete, farblose Kärtchen (nur weißer Text), damit die
              // periphere Ansicht ruhig bleibt. Statt des segmentierten Umschalters
              // ein schlichter Rückweg „Analyse".
              <>
                <FallbackButton onClick={handleStop} discreet>Beenden</FallbackButton>
                <FallbackButton onClick={handleToggleView} discreet>Analyse</FallbackButton>
              </>
            ) : (
              // Analyse-Modus: farbige Hauptaktion + segmentierter Ansicht-Umschalter.
              <>
                <FallbackButton onClick={handleStop} primary>Beenden</FallbackButton>
                <ViewToggle viewMode={viewMode} onToggle={handleToggleView} />
              </>
            )}
          </div>
          <MicButton status={voiceStatus} error={voiceError} hint={hint} onClick={handleToggleMic} />
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PHONE HUD (<480px)
          ═══════════════════════════════════════════ */}

      {/* Top bar: Home + Mode badge */}
      <div className="sm:hidden absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-4 pt-safe py-2">
        <div className="flex items-center gap-2">
          <ExitButton onClick={handleAbort} />
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-background/60 backdrop-blur">
            {MODE_LABELS[focusMode] ?? focusMode}
          </Badge>
        </div>
      </div>

      {/* Bottom bar: Controls — Kalibrierung läuft im Overlay */}
      {!calState && (phase === 'ready-to-calibrate' || phase === 'tracking') && (
        <div className={cn(
          "sm:hidden absolute bottom-0 left-0 right-0 z-10 flex flex-row items-center justify-center gap-2 p-2 pb-safe",
          // Flow-Modus: keine Balken-Fläche, nur schwebende diskrete Knöpfe (ruhig).
          !isFlow && "bg-surface/80 backdrop-blur",
        )}>
          {/* Controls — Spannungsleiste bewusst entfernt (Canvas führt) */}
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
                {/* Flow-Modus: diskretes, farbloses „Beenden" + Rückweg „Analyse"
                    (weißer Text). Analyse-Modus: farbiger CTA + Umschalt-Icon. */}
                <PhoneButton onClick={handleStop} primary={!isFlow} discreet={isFlow}>Beenden</PhoneButton>
                {isFlow ? (
                  <PhoneButton onClick={handleToggleView} discreet>Analyse</PhoneButton>
                ) : (
                <button
                  onClick={handleToggleView}
                  aria-label="Zur Flow-Ansicht wechseln"
                  className="min-h-[44px] px-2.5 rounded-lg text-xs font-medium transition-all backdrop-blur active:scale-95 bg-sapphire/80 text-white hover:bg-sapphire"
                >
                  🌊
                </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Ausstiegs-Affordanz im Session-HUD (CONTEXT.md → „Home").
 *
 * Bewusst **diskret**: ein Klick verwirft die Sitzung *ohne* Auswertung und
 * löscht die Kalibrierung (Verwerf-Punkt 3) — der Knopf darf nicht einladen.
 * Deshalb kein Accent, kein Sapphire und keine Marke: der Ankerpunkt ist in
 * Analyse und Flow bereits auf dem Canvas zu sehen, ein zweiter im HUD läse
 * sich als Haltungssignal.
 *
 * Diskret heißt aber nicht unfertig — der Knopf trägt ein volles Touch-Ziel,
 * sichtbaren Tastaturfokus und eine deutsche Beschriftung.
 *
 * `withLabel` zeigt zusätzlich den Text (Desktop/Tablet); auf dem Telefon
 * bleibt das Icon allein, der Name steht im `aria-label`.
 */
function ExitButton({ onClick, withLabel }: { onClick: () => void; withLabel?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="Hauptmenü"
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center rounded-lg transition-all',
        'bg-background/40 backdrop-blur border border-border/50 text-foreground/80',
        'hover:bg-background/60 hover:text-foreground active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        withLabel ? 'gap-1.5 px-3.5 text-[13px] font-medium' : 'min-w-[44px]',
      )}
    >
      <Home className="size-4" />
      {withLabel && 'Hauptmenü'}
    </button>
  )
}

function PhoneButton({ onClick, children, primary, discreet }: { onClick: () => void; children: React.ReactNode; primary?: boolean; discreet?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'min-h-[44px] rounded-lg text-xs font-medium transition-all backdrop-blur active:scale-95',
        discreet
          // Flow-Modus: farbloses, diskretes Kärtchen — nur weißer Text
          ? 'px-4 py-3 bg-white/10 border border-white/25 text-white hover:bg-white/20'
          : primary
          // Geigenholz-Gold-CTA: sofort als Hauptaktion erkennbar
          ? 'px-4 py-3 font-semibold bg-accent text-accent-foreground shadow-lg shadow-black/30 ring-1 ring-accent/60 hover:bg-accent/90'
          : 'px-3 py-3 bg-background/40 border border-border/50 text-foreground/80 hover:bg-background/60 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

// Segmentierter Ansicht-Umschalter (Desktop/Tablet): der aktive Modus ist im
// tiefen Saphir hervorgehoben. Ein Klick auf das inaktive Segment schaltet um;
// der aktive tut nichts.
//
// Bewusst nicht `sapphire` — das ist `--color-layer-flow`, die Flow-Farbe auf
// dem Canvas. Ein Bedienelement in Layer-Blau liest sich wie ein Haltungssignal
// (dieselbe Trennung, die #29 zwischen CTA-Gold und Warn-Amber zieht).
function ViewToggle({ viewMode, onToggle }: { viewMode: ViewMode; onToggle: () => void }) {
  return (
    <div className="flex items-center rounded-lg overflow-hidden backdrop-blur border border-sapphire-deep/50 text-xs font-medium">
      <button
        onClick={() => viewMode !== 'analyse' && onToggle()}
        aria-pressed={viewMode === 'analyse'}
        className={cn(
          'px-3 py-2 transition-all active:scale-95',
          viewMode === 'analyse'
            ? 'bg-sapphire-deep text-white'
            : 'bg-background/40 text-foreground/70 hover:bg-background/60 hover:text-foreground',
        )}
      >
        Analyse
      </button>
      <button
        onClick={() => viewMode !== 'flow' && onToggle()}
        aria-pressed={viewMode === 'flow'}
        className={cn(
          'px-3 py-2 transition-all active:scale-95',
          viewMode === 'flow'
            ? 'bg-sapphire-deep text-white'
            : 'bg-background/40 text-foreground/70 hover:bg-background/60 hover:text-foreground',
        )}
      >
        Flow
      </button>
    </div>
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

function FallbackButton({ onClick, children, primary, discreet }: { onClick: () => void; children: React.ReactNode; primary?: boolean; discreet?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg font-medium transition-all backdrop-blur active:scale-95',
        discreet
          // Flow-Modus: farbloses, diskretes Kärtchen — nur weißer Text, gleiche Form
          ? 'px-6 py-2.5 text-sm bg-white/10 border border-white/25 text-white hover:bg-white/20'
          : primary
          // Geigenholz-Gold-CTA: sofort als Hauptaktion erkennbar
          ? 'px-6 py-2.5 text-sm font-semibold bg-accent text-accent-foreground shadow-lg shadow-black/30 ring-1 ring-accent/60 hover:bg-accent/90'
          : 'px-4 py-2 text-xs bg-background/40 border border-border/50 text-foreground/80 hover:bg-background/60 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
