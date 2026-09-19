import { usePoseStore } from '@/store/pose-store'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Medal, RotateCcw, Share2 } from 'lucide-react'
import { getPersonalBestStreak } from '@/core/persistence/session-db'
import { computeResultsView } from '@/core/session/results-view'

// Statischer Ruhe-Impuls (positiv, ohne Wertung — Feedback-Philosophie).
const CALM_MESSAGE =
  'Deine Schultern blieben heute weich. Nimm dieses Gefühl mit — beim nächsten Mal einfach dort weiterspielen.'

export function ResultsScreen() {
  const lastStats = usePoseStore((s) => s.lastSessionStats)
  const focusMode = usePoseStore((s) => s.focusMode)
  const practiceAgain = usePoseStore((s) => s.practiceAgain)
  const goHome = usePoseStore((s) => s.goHome)

  // Bestmarke asynchron laden; bis dahin 0 (kein Rekord fälschlich melden).
  const [personalBest, setPersonalBest] = useState(0)
  useEffect(() => {
    getPersonalBestStreak().then(setPersonalBest)
  }, [])

  if (!lastStats) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Keine Session-Daten vorhanden</p>
        <Button onClick={goHome}>Hauptmenü</Button>
      </div>
    )
  }

  const view = computeResultsView(lastStats, focusMode, personalBest)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[560px] flex flex-col items-center gap-8 text-center">
        {/* Mode-Chip: Instrument · Gesamtdauer */}
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 font-label text-sm font-semibold text-secondary-foreground">
          <span>{view.modeLabel}</span>
          <span className="opacity-50">·</span>
          <span className="font-mono font-medium tabular-nums">{view.totalDurationStr}</span>
        </div>

        {/* Hero: „Im Anker"-Dauer */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="font-label text-[0.78rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Im Anker
          </div>
          <div className="font-headline font-light leading-[0.92] tracking-[-0.03em] tabular-nums text-primary text-[clamp(4.5rem,22vw,8.5rem)]">
            {view.anchorDurationStr}
            <span className="ml-[0.1em] text-[0.32em] font-normal tracking-normal text-muted-foreground">
              min
            </span>
          </div>
          <div className="mt-1.5 text-base text-muted-foreground">
            {view.flowPercent}% der Zeit in ruhiger Haltung
          </div>
        </div>

        {/* Erfolgs-Karte: sanfter Amber-Verlauf, Medaille in accent */}
        <div
          className="flex w-full items-center gap-4 rounded-2xl p-6 text-left shadow-sm"
          style={{ background: 'linear-gradient(160deg, #ffffff, var(--color-accent-soft))' }}
        >
          <div className="grid size-12 flex-none place-items-center rounded-full bg-accent text-accent-foreground shadow-md">
            <Medal className="size-6" />
          </div>
          <div>
            <div className="font-headline text-base font-bold text-foreground">{view.successTitle}</div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              Längste Serie am Stück:{' '}
              <b className="font-mono font-medium text-foreground">{view.streakStr}</b> min
            </div>
          </div>
        </div>

        {/* Ruhe-Impuls-Karte: secondary auf secondary-foreground */}
        <div className="w-full rounded-2xl bg-secondary px-6 py-5 text-left text-secondary-foreground">
          <div className="font-label text-[0.72rem] font-semibold uppercase tracking-[0.08em] opacity-80">
            Ruhe-Impuls
          </div>
          <p className="mt-2 font-headline text-[1.02rem] font-medium leading-relaxed">
            {CALM_MESSAGE}
          </p>
        </div>

        {/* Zähler-Hinweis: Ankerpunkte, Zahl in flow-Blau (mono) */}
        {view.anchorPoints !== undefined && (
          <div className="font-label text-[0.82rem] text-muted-foreground">
            Zähler heute:{' '}
            <b className="font-mono font-medium text-layer-flow">{view.anchorPoints}</b> Ankerpunkte
            · je 5 s ruhig = 1 Punkt
          </div>
        )}

        {/* Aktionen: gestapelt, volle Breite */}
        <div className="flex w-full flex-col gap-3">
          <Button
            className="h-12 w-full gap-2 rounded-full text-base font-semibold"
            onClick={practiceAgain}
          >
            <RotateCcw className="size-[18px]" />
            Neue Übung starten
          </Button>
          {/* „Ergebnis teilen" bleibt Nebel — nur Slot, kein Verhalten (#44). */}
          <Button
            variant="outline"
            className="h-12 w-full gap-2 rounded-full border-[1.5px] text-base font-semibold text-primary"
          >
            <Share2 className="size-[18px]" />
            Ergebnis teilen
          </Button>
          {/* Navigations-Affordanz aus #30/#34 erhalten: zurück ins Hauptmenü. */}
          <Button
            variant="link"
            className="mt-1 h-auto text-sm font-normal text-muted-foreground"
            onClick={goHome}
          >
            Zum Hauptmenü
          </Button>
        </div>
      </div>
    </div>
  )
}
