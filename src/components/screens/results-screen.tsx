import { usePoseStore } from '@/store/pose-store'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { loadAllSessions } from '@/core/persistence/session-db'
import { computeResultsView } from '@/core/session/results-view'
import {
  computePracticeTotals,
  formatHoursMinutes,
  type PracticeTotals,
} from '@/core/session/practice-totals'
import { cn } from '@/lib/utils'

// Schlichte Ergebnis-Seite (Variante D, #127/#128): blauer Anker-Kreis mit der
// Zeit im Anker in Worten, darunter nur „Diese Übung". Alles Weitere wartet
// zugeklappt unter „Mehr anzeigen". Keine Prozente, kein Ruhe-Satz.
export function ResultsScreen() {
  const lastStats = usePoseStore((s) => s.lastSessionStats)
  const focusMode = usePoseStore((s) => s.focusMode)
  const practiceAgain = usePoseStore((s) => s.practiceAgain)
  const goHome = usePoseStore((s) => s.goHome)

  const [showMore, setShowMore] = useState(false)

  // Übungszeit je Zeitraum aus den lokal gespeicherten Übungen (nur dieses Gerät).
  const [totals, setTotals] = useState<PracticeTotals | null>(null)
  useEffect(() => {
    loadAllSessions()
      .then((sessions) => setTotals(computePracticeTotals(sessions, new Date())))
      .catch(console.error)
  }, [])

  if (!lastStats) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Keine Session-Daten vorhanden</p>
        <Button onClick={goHome}>Hauptmenü</Button>
      </div>
    )
  }

  const view = computeResultsView(lastStats, focusMode)
  const { anchorTime } = view

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-12">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-8 text-center">
        {/* Modus klein oben */}
        <div className="font-label text-sm text-muted-foreground">{view.modeLabel}</div>

        {/* Blauer Anker-Kreis: Zeit im Anker in Worten */}
        <div
          className="grid place-items-center rounded-full text-white"
          style={{
            width: 'min(72vw, 300px)',
            height: 'min(72vw, 300px)',
            background:
              'radial-gradient(circle at 35% 30%, var(--color-sapphire-light), var(--color-sapphire) 45%, var(--color-sapphire-deep))',
            boxShadow: '0 0 60px 10px color-mix(in srgb, var(--color-sapphire) 35%, transparent)',
          }}
        >
          <div className="flex flex-col items-center">
            <div className="font-headline leading-none">
              <span className="font-light tabular-nums tracking-[-0.03em] text-[clamp(3.5rem,18vw,5.5rem)]">
                {anchorTime.big}
              </span>
              <span className="ml-1.5 text-[clamp(1.25rem,6vw,1.9rem)]">{anchorTime.unit}</span>
            </div>
            {anchorTime.rest && (
              <div className="mt-1 font-headline text-[clamp(1.1rem,5vw,1.5rem)] opacity-90">
                {anchorTime.rest}
              </div>
            )}
            <div className="mt-2 font-label text-sm opacity-85">im Anker</div>
          </div>
        </div>

        {/* Diese Übung — bewusst als Zahl (Nebenangabe) */}
        <div className="font-label text-sm text-muted-foreground">
          Diese Übung
          <div className="font-mono text-lg text-foreground">{view.totalDurationStr} min</div>
        </div>

        {/* Aktionen */}
        <div className="flex w-full flex-col items-center gap-2">
          <Button
            className="h-12 w-full gap-2 rounded-full text-base font-semibold"
            onClick={practiceAgain}
          >
            <RotateCcw className="size-[18px]" />
            Neue Übung starten
          </Button>
          {/* Navigations-Affordanz aus #30/#34 erhalten: zurück ins Hauptmenü. */}
          <Button
            variant="link"
            className="h-auto text-sm font-normal text-muted-foreground"
            onClick={goHome}
          >
            Zum Hauptmenü
          </Button>
        </div>

        {/* Mehr anzeigen: Serie, Ankerpunkte, Übungszeit je Zeitraum */}
        <button
          type="button"
          aria-expanded={showMore}
          className="flex items-center gap-1 font-label text-sm text-muted-foreground"
          onClick={() => setShowMore((open) => !open)}
        >
          {showMore ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          <ChevronDown className={cn('size-4 transition-transform', showMore && 'rotate-180')} />
        </button>
        {showMore && (
          <div className="flex w-full flex-col gap-4 text-left">
            <dl className="grid grid-cols-2 gap-3">
              <InfoTile label="Längste Serie" value={`${view.streakStr} min`} />
              <InfoTile label="Ankerpunkte" value={String(view.anchorPoints ?? 0)} />
            </dl>
            {totals && (
              <div>
                <div className="mb-2 font-label text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  Geübt mit Blue Anchor
                </div>
                <dl className="grid grid-cols-3 gap-3">
                  <InfoTile label="Diese Woche" value={formatHoursMinutes(totals.weekMs)} small />
                  <InfoTile label="Dieser Monat" value={formatHoursMinutes(totals.monthMs)} small />
                  <InfoTile label="Insgesamt" value={formatHoursMinutes(totals.totalMs)} small />
                </dl>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Kleines Info-Kästchen unter „Mehr anzeigen". */
function InfoTile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className={cn('rounded-xl bg-secondary py-3', small ? 'px-3' : 'px-4')}>
      <dt className="font-label text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-mono text-foreground', small ? 'text-sm' : 'text-base')}>{value}</dd>
    </div>
  )
}
