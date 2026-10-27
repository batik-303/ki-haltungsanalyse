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
import { StraightWristTip } from '@/components/straight-wrist-tip'
import { selectSessionPhase, selectPhaseHint, selectIsFlowRail } from '@/store/selectors'
import { saveSession, addHoldMilestones } from '@/core/persistence/session-db'
import { Badge } from '@/components/ui/badge'
import { Home } from 'lucide-react'
import type { StoredSession, ViewMode } from '@/core/types'
import { cn } from '@/lib/utils'
import { computeSessionFrame } from '@/core/layout/session-frame'
import { computeControlRow } from '@/core/layout/control-row'

const MODE_LABELS: Record<string, string> = {
  violin: '🎻 Geige',
  wrist: '🤚 Handgelenk',
  shoulder: '💪 Schulter',
}

export function SessionScreen() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)

  // Rahmen-Maße (#114): freier Bereich zwischen Kopf- und Knopf-Zeile plus
  // Videogröße — daraus `computeSessionFrame`. Videogröße kann sich ändern
  // (Handy drehen), deshalb auch auf `resize` des Videos hören.
  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 })
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setAreaSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(area)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const update = () => setVideoSize({ width: video.videoWidth, height: video.videoHeight })
    video.addEventListener('loadedmetadata', update)
    video.addEventListener('resize', update)
    return () => {
      video.removeEventListener('loadedmetadata', update)
      video.removeEventListener('resize', update)
    }
  }, [])

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
  // Flow-Leiste (#77/#99, #114): ohne Kopfzeile und Rahmen, das Canvas füllt
  // den Bereich über der Knopf-Zeile.
  const isFlowRail = usePoseStore(selectIsFlowRail)
  const readinessArmed = usePoseStore((s) => s.readinessArmed)
  const setReadinessArmed = usePoseStore((s) => s.setReadinessArmed)

  const { resetAnalysisState, armReadiness, landmarkerRef, handLandmarkerRef, calibKnickSamplesRef, startTracking, stopTracking } = usePoseDetection(videoRef, canvasRef)

  const { startCountdown } = useCalibration({
    videoRef,
    canvasRef,
    handLandmarkerRef,
    calibKnickSamplesRef,
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
  // „neu" heißt „neu speichern" (#101): direkt wieder auslösen wie „bereit" —
  // der Countdown startet von selbst, sobald der Abstand passt.
  const handleRecalibrate = useCallback(() => {
    const store = usePoseStore.getState()
    if (store.isCalibrating) return
    store.recalibrate()
    resetAnalysisState()
    armReadiness()
  }, [resetAnalysisState, armReadiness])

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
    // „Development": Entwickler-Ansicht (Punkte, Linien, Gradzahl) an/aus.
    development: () => usePoseStore.getState().toggleDebugLandmarks(),
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

  const row = computeControlRow({ phase, viewMode, calibrating: calState !== null })
  const frame = computeSessionFrame({
    videoWidth: videoSize.width,
    videoHeight: videoSize.height,
    areaWidth: areaSize.width,
    areaHeight: areaSize.height,
  })

  return (
    <div data-theme="dark" className="fixed inset-0 flex flex-col bg-black">
      {/* ═══ Kopfzeile über dem Rahmen (#114): Hauptmenü + Modus-Schild, im Flow aus.
          „Hauptmenü" (ohne Auswertung) steht damit weit weg von „Beenden". ═══ */}
      {!isFlow && (
        <header className="flex shrink-0 items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2">
          <ExitButton onClick={handleAbort} withLabel />
          <Badge variant="secondary" className="text-xs px-2 py-0.5 sm:text-sm sm:px-3 sm:py-1 bg-background/60 backdrop-blur">
            {MODE_LABELS[focusMode] ?? focusMode}
          </Badge>
        </header>
      )}

      {/* ═══ Freier Bereich zwischen Kopf- und Knopf-Zeile ═══ */}
      <div ref={areaRef} className="relative min-h-0 flex-1">
        {/* Rahmen = genau das ganze Kamerabild, kein Zoom (#104, Entscheidung 1).
            Im Flow-Wrist kein Rahmen: das Canvas füllt den Bereich über der
            Knopf-Zeile, die Leiste steht mittig (computeFlowRailLayout). */}
        <div
          className={cn(
            'absolute overflow-hidden',
            isFlowRail ? 'inset-0' : 'rounded-xl',
            !isFlow && 'ring-1 ring-white/15',
          )}
          style={isFlowRail ? undefined : { left: frame.left, top: frame.top, width: frame.width, height: frame.height }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={cn(
              'absolute inset-0 h-full w-full object-contain scale-x-[-1] saturate-[0.4] brightness-[0.85]',
              isFlow && 'opacity-0',
            )}
          />

          <canvas
            ref={canvasRef}
            className={cn(
              'absolute inset-0 z-[2] h-full w-full scale-x-[-1]',
              isFlowRail ? 'object-cover' : 'object-contain',
            )}
          />

          {/* Randglühen am Innenrand des Rahmens (#104, Entscheidung 6) — hinter dem Overlay aus */}
          {!calState && <DistanceGlow />}

          {/* Kärtchen oben mittig im Rahmen: Abstand, Bereitschaft, Tipp (#101) */}
          {!calState && <DistanceHint />}
          {!calState && <ReadinessHint />}
          {!calState && !isFlowRail && <StraightWristTip />}
        </div>

        {/* Kalibrier-Overlay — Variante C „Minimal HUD"; Status-Kärtchen oben im Rahmen */}
        {calState && (
          <CalibrationOverlay
            phase={calState}
            modeLabel={MODE_LABELS[focusMode] ?? focusMode}
            topInset={isFlowRail ? 0 : frame.top}
            onRecalibrate={() => { setCalState(null); handleArm() }}
          />
        )}
      </div>

      {/* ═══ Knopf-Zeile (#104, Entscheidung 4): feste Plätze [🎤] [Hauptknopf] [Ansicht],
          auf allen Geräten gleich; im Flow an derselben Stelle, nur farblos.
          Timer & Spannungsleiste bleiben bewusst weg (Canvas führt). ═══ */}
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-2">
        <div className="flex justify-end">
          {row.mic && <MicToggle status={voiceStatus} discreet={row.discreet} onClick={handleToggleMic} />}
        </div>
        <div className="flex min-h-[44px] justify-center">
          {row.main === 'save' && (
            <RowButton onClick={handleArm} primary>
              <span className="sm:hidden">Speichern</span>
              <span className="hidden sm:inline">Haltung speichern</span>
            </RowButton>
          )}
          {row.main === 'stop' && (
            <RowButton onClick={handleStop} primary={!row.discreet} discreet={row.discreet}>Beenden</RowButton>
          )}
        </div>
        <div className="flex justify-start">
          {row.view === 'to-mirror' && <RowButton onClick={handleToggleView} discreet>Analyse</RowButton>}
          {row.view === 'to-flow' && (
            <>
              <button
                onClick={handleToggleView}
                aria-label="Zur Flow-Ansicht wechseln"
                className="sm:hidden min-h-[44px] px-2.5 rounded-lg text-xs font-medium transition-all backdrop-blur active:scale-95 bg-sapphire/80 text-white hover:bg-sapphire"
              >
                🌊
              </button>
              <div className="hidden sm:block">
                <ViewToggle viewMode={viewMode} onToggle={handleToggleView} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ Hinweis-Zeile unter den Knöpfen — feste Höhe, damit der Rahmen nicht
          springt. Inhalt stellt #111 um; im Flow leer. ═══ */}
      <div className="flex h-8 shrink-0 items-center justify-center px-4 pb-safe box-content">
        {!isFlow && !calState && (
          <p className="truncate font-label text-xs text-white/80">{micLabel(voiceStatus, voiceError, hint)}</p>
        )}
      </div>
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

function RowButton({ onClick, children, primary, discreet }: { onClick: () => void; children: React.ReactNode; primary?: boolean; discreet?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'min-h-[44px] rounded-lg px-4 text-xs font-medium transition-all backdrop-blur active:scale-95 sm:px-6 sm:text-sm',
        discreet
          // Flow-Modus: farbloses, diskretes Kärtchen — nur weißer Text
          ? 'bg-white/10 border border-white/25 text-white hover:bg-white/20'
          : primary
          // Geigenholz-Gold-CTA: sofort als Hauptaktion erkennbar
          ? 'font-semibold bg-accent text-accent-foreground shadow-lg shadow-black/30 ring-1 ring-accent/60 hover:bg-accent/90'
          : 'bg-background/40 border border-border/50 text-foreground/80 hover:bg-background/60 hover:text-foreground',
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

// Mikro-Platz links in der Knopf-Zeile: zeigt, ob die Sprache zuhört. Im Flow
// farblos wie die anderen Knöpfe.
function MicToggle({ status, discreet, onClick }: { status: VoiceStatus; discreet: boolean; onClick: () => void }) {
  const isProblem = status === 'error' || status === 'unsupported'
  return (
    <button
      onClick={onClick}
      aria-label="Sprachsteuerung umschalten"
      className={cn(
        'min-h-[44px] min-w-[44px] rounded-lg px-2 text-sm font-medium transition-all backdrop-blur active:scale-95',
        discreet
          ? 'bg-white/10 border border-white/25 text-white hover:bg-white/20'
          : status === 'listening'
            ? 'bg-background/75 border border-white/25 text-white'
            : isProblem
              // Kein Rot: Amber lädt zum Antippen (Neustart per Geste) ein.
              ? 'bg-amber-500/85 text-amber-950'
              : 'bg-sapphire/80 text-white hover:bg-sapphire',
      )}
    >
      {status === 'listening' ? '🎤' : isProblem ? '⚠️' : '🔇'}
    </button>
  )
}

// Beobachtbarer Zustand statt blindem „aktiv" — ein stiller Ausfall wird sichtbar.
function micLabel(status: VoiceStatus, error: string | null, hint: string): string {
  return status === 'listening' ? `🎤 ${hint}`
    : status === 'starting' ? '🎤 startet …'
    : status === 'error' || status === 'unsupported' ? `🎤 ${error ?? 'Mikro aus — tippen'}`
    : '🎤 Aus — tippen zum Aktivieren'
}
