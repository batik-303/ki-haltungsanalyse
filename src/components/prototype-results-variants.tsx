// PROTOTYP (#127) — Wegwerf-Code, nie nach main.
// Drei Varianten der Ergebnis-Seite, umschaltbar über ?variant=A|B|C und die
// schwebende Leiste unten. ?demo=kurz|lang füllt Beispiel-Daten ein, damit die
// Seite ohne echte Übung direkt aufgeht.
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnchorMark } from '@/components/brand/anchor-mark'
import { usePoseStore } from '@/store/pose-store'
import type { SessionStats } from '@/core/types'
import type { ResultsView } from '@/core/session/results-view'
import { cn } from '@/lib/utils'

export const VARIANTS = ['D', 'A', 'B', 'C', 'Jetzt'] as const
type VariantKey = (typeof VARIANTS)[number]
const VARIANT_NAMES: Record<VariantKey, string> = {
  D: 'Anker-Kreis + diese Übung + „Mehr“',
  A: 'Nur der Anker',
  B: 'Zeit in Worten + kleine Zeile',
  C: 'Blaues Band + „Mehr“',
  Jetzt: 'heutige Seite (zum Vergleich)',
}

// ---------- URL-Helfer ----------
function readParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name)
}
function writeParam(name: string, value: string) {
  const url = new URL(window.location.href)
  url.searchParams.set(name, value)
  window.history.replaceState(null, '', url)
}

export function readVariant(): VariantKey {
  const v = readParam('variant')
  return (VARIANTS as readonly string[]).includes(v ?? '') ? (v as VariantKey) : 'D'
}

// ---------- Beispiel-Daten ----------
function demoStats(kind: 'kurz' | 'lang'): SessionStats {
  const durationMs = kind === 'kurz' ? 75_000 : 725_000
  const flow = kind === 'kurz' ? 55 : 74
  return {
    durationMs,
    durationMinutes: Math.floor(durationMs / 60000),
    durationSeconds: Math.floor((durationMs % 60000) / 1000),
    totalFrames: 0,
    zones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 } as SessionStats['zones'],
    zonePercentages: { flow, bewusst: 100 - flow, achtung: 0, limit: 0 },
    tensionTimeline: [],
    maxFlowStreak: kind === 'kurz' ? 22 : 194,
    anchorPoints: kind === 'kurz' ? 8 : 107,
  }
}

/** Beispiel: Übungszeit mit der App je Zeitraum (Sekunden). Echt später aus gespeicherten Übungen. */
function demoPeriods(): { week: number; month: number; total: number } {
  return readParam('demo') === 'kurz'
    ? { week: 25 * 60, month: 25 * 60, total: 25 * 60 }
    : { week: 70 * 60, month: 165 * 60, total: 200 * 60 }
}
/** „3 Std. 20 Min." bzw. „25 Min." */
function hoursMinutes(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`
}

/** Beim Laden mit ?demo= direkt auf die Ergebnis-Seite springen. */
export function bootPrototypeDemo() {
  const demo = readParam('demo')
  if (demo !== 'kurz' && demo !== 'lang') return
  usePoseStore.setState({ appScreen: 'results', lastSessionStats: demoStats(demo) })
}

// ---------- Zeit-Formate ----------
function anchorSeconds(stats: SessionStats) {
  return Math.floor((stats.durationMs / 1000) * (stats.zonePercentages.flow / 100))
}
/** „4 Min. 30 Sek." bzw. „40 Sek." */
function inWords(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return { big: `${s}`, unit: 'Sek.', rest: '' }
  return { big: `${m}`, unit: 'Min.', rest: s > 0 ? `${s} Sek.` : '' }
}

interface VariantProps {
  view: ResultsView
  stats: SessionStats
  onAgain: () => void
  onHome: () => void
}

function Actions({ onAgain, onHome }: Pick<VariantProps, 'onAgain' | 'onHome'>) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <Button className="h-12 w-full gap-2 rounded-full text-base font-semibold" onClick={onAgain}>
        <RotateCcw className="size-[18px]" />
        Neue Übung starten
      </Button>
      <Button
        variant="link"
        className="h-auto text-sm font-normal text-muted-foreground"
        onClick={onHome}
      >
        Zum Hauptmenü
      </Button>
    </div>
  )
}

// ---------- Variante A: Nur der Anker ----------
// Ein großer, leuchtender blauer Ankerpunkt; die Zeit steht IM Punkt.
// Sonst nur ein ruhiger Satz und der Knopf. Alles andere fällt weg.
function VariantA({ view, onAgain, onHome }: VariantProps) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-between px-5 pt-14 pb-24">
      <div className="font-label text-sm text-muted-foreground">{view.modeLabel}</div>

      <div className="flex flex-col items-center gap-6">
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
            <div className="font-headline font-light tabular-nums leading-none text-[clamp(3.5rem,18vw,5.5rem)] tracking-[-0.03em]">
              {view.anchorDurationStr}
            </div>
            <div className="mt-1 font-label text-sm opacity-85">Minuten im Anker</div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[420px]">
        <Actions onAgain={onAgain} onHome={onHome} />
      </div>
    </div>
  )
}

// ---------- Variante B: Zeit in Worten + kleine Zeile ----------
// Logo-Anker oben, Zeit groß in Worten („4 Min. 30 Sek."). Darunter EINE
// kleine, ruhige Zeile mit Serie und Gesamtzeit. Prozent und Punkte fallen weg.
function VariantB({ view, stats, onAgain, onHome }: VariantProps) {
  const t = inWords(anchorSeconds(stats))
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center px-5 pt-12 pb-24">
      <div className="w-full max-w-[520px] flex flex-col items-center gap-8 text-center">
        <AnchorMark size={56} />
        <div className="flex flex-col items-center gap-2">
          <div className="font-label text-[0.78rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Du warst im blauen Anker
          </div>
          <div className="font-headline text-primary leading-none">
            <span className="font-light tabular-nums text-[clamp(4.5rem,24vw,8rem)] tracking-[-0.03em]">
              {t.big}
            </span>
            <span className="ml-2 text-[clamp(1.5rem,7vw,2.4rem)] font-normal">{t.unit}</span>
          </div>
          {t.rest && (
            <div className="font-headline text-[clamp(1.5rem,7vw,2.4rem)] text-primary/80">{t.rest}</div>
          )}
        </div>

        <div className="flex w-full justify-center gap-6 border-y border-border py-4 font-label text-sm text-muted-foreground">
          <div>
            Längste Serie
            <div className="font-mono text-base text-foreground">{view.streakStr} min</div>
          </div>
          <div className="w-px bg-border" />
          <div>
            Geübt insgesamt
            <div className="font-mono text-base text-foreground">{view.totalDurationStr} min</div>
          </div>
        </div>

        <Actions onAgain={onAgain} onHome={onHome} />
      </div>
    </div>
  )
}

// ---------- Variante C: Blaues Band + „Mehr" ----------
// Oben ein breites blaues Band mit der Zeit (wie ein großer Anker-Bereich).
// Darunter der Knopf. Alle weiteren Zahlen sind eingeklappt hinter „Mehr anzeigen".
function VariantC({ view, onAgain, onHome }: VariantProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div
        className="flex flex-col items-center px-5 pt-14 pb-12 text-white"
        style={{
          background: 'linear-gradient(170deg, var(--color-sapphire), var(--color-sapphire-deep))',
          borderBottomLeftRadius: '2.5rem',
          borderBottomRightRadius: '2.5rem',
        }}
      >
        <div className="font-label text-sm opacity-85">{view.modeLabel}</div>
        <div className="mt-6 font-label text-[0.78rem] uppercase tracking-[0.12em] opacity-85">Im Anker</div>
        <div className="font-headline font-light tabular-nums leading-[0.95] tracking-[-0.03em] text-[clamp(5rem,26vw,9rem)]">
          {view.anchorDurationStr}
          <span className="ml-[0.1em] text-[0.3em] font-normal tracking-normal opacity-80">min</span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-6 px-5 pt-8 pb-24 text-center">

        <Actions onAgain={onAgain} onHome={onHome} />

        <button
          className="flex items-center gap-1 font-label text-sm text-muted-foreground"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <dl className="grid w-full grid-cols-2 gap-3 text-left">
            {[
              ['Geübt insgesamt', `${view.totalDurationStr} min`],
              ['Längste Serie', `${view.streakStr} min`],
              ['Ankerpunkte', `${view.anchorPoints ?? 0}`],
              ['Anteil ruhig', `${view.flowPercent} %`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-secondary px-4 py-3">
                <dt className="font-label text-xs text-muted-foreground">{k}</dt>
                <dd className="font-mono text-base text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}

// ---------- Variante D: Anker-Kreis + Übungszeit + „Mehr" (Wunsch 02.11.) ----------
// Kreis aus A, darunter sichtbar nur „Diese Übung“. Unter „Mehr“: Serie,
// Ankerpunkte und Übungszeit Woche/Monat/insgesamt. Kein Prozent, kein Ruhe-Satz.
function VariantD({ view, stats, onAgain, onHome }: VariantProps) {
  const [open, setOpen] = useState(false)
  const t = inWords(anchorSeconds(stats))
  const periods = demoPeriods()
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center px-5 pt-12 pb-24">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-8 text-center">
        <div className="font-label text-sm text-muted-foreground">{view.modeLabel}</div>

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
              <span className="font-light tabular-nums text-[clamp(3.5rem,18vw,5.5rem)] tracking-[-0.03em]">
                {t.big}
              </span>
              <span className="ml-1.5 text-[clamp(1.25rem,6vw,1.9rem)]">{t.unit}</span>
            </div>
            {t.rest && <div className="mt-1 font-headline text-[clamp(1.1rem,5vw,1.5rem)] opacity-90">{t.rest}</div>}
            <div className="mt-2 font-label text-sm opacity-85">im Anker</div>
          </div>
        </div>

        <div className="font-label text-sm text-muted-foreground">
          Diese Übung
          <div className="font-mono text-lg text-foreground">{view.totalDurationStr} min</div>
        </div>

        <Actions onAgain={onAgain} onHome={onHome} />

        <button
          className="flex items-center gap-1 font-label text-sm text-muted-foreground"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="flex w-full flex-col gap-4 text-left">
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Längste Serie', `${view.streakStr} min`],
                ['Ankerpunkte', `${view.anchorPoints ?? 0}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-secondary px-4 py-3">
                  <dt className="font-label text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-mono text-base text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="mb-2 font-label text-xs uppercase tracking-[0.08em] text-muted-foreground">
                Geübt mit Blue Anchor
              </div>
              <dl className="grid grid-cols-3 gap-3">
                {[
                  ['Diese Woche', periods.week],
                  ['Dieser Monat', periods.month],
                  ['Insgesamt', periods.total],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-secondary px-3 py-3">
                    <dt className="font-label text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-mono text-sm text-foreground">{hoursMinutes(Number(v))}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const VARIANT_COMPONENTS: Record<Exclude<VariantKey, 'Jetzt'>, (p: VariantProps) => JSX.Element> = {
  D: VariantD,
  A: VariantA,
  B: VariantB,
  C: VariantC,
}

export function PrototypeResults({ current, ...props }: VariantProps & { current: JSX.Element }) {
  const [variant, setVariant] = useState<VariantKey>(readVariant)

  const go = (dir: 1 | -1) => {
    setVariant((cur) => {
      const i = VARIANTS.indexOf(cur)
      const next = VARIANTS[(i + dir + VARIANTS.length) % VARIANTS.length] ?? 'D'
      writeParam('variant', next)
      return next
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const demo = readParam('demo')
  const switchDemo = () => {
    const next = demo === 'kurz' ? 'lang' : 'kurz'
    writeParam('demo', next)
    usePoseStore.setState({ lastSessionStats: demoStats(next) })
    window.location.reload()
  }

  return (
    <>
      {variant === 'Jetzt' ? current : (() => { const Comp = VARIANT_COMPONENTS[variant]; return <Comp {...props} /> })()}
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-neutral-900 px-2 py-1.5 text-sm text-white shadow-lg">
        <button className="rounded-full p-1.5 hover:bg-white/15" onClick={() => go(-1)} aria-label="Vorherige Variante">
          <ChevronLeft className="size-5" />
        </button>
        <span className="min-w-[13rem] text-center">
          <b>{variant}</b> · {VARIANT_NAMES[variant]}
        </span>
        <button className="rounded-full p-1.5 hover:bg-white/15" onClick={() => go(1)} aria-label="Nächste Variante">
          <ChevronRight className="size-5" />
        </button>
        {demo && (
          <button className="ml-1 rounded-full bg-white/15 px-2.5 py-1 text-xs" onClick={switchDemo}>
            Daten: {demo}
          </button>
        )}
      </div>
    </>
  )
}
