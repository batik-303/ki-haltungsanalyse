import { useState } from 'react'
import { usePoseStore } from '@/store/pose-store'
import type { FocusMode } from '@/core/types'
import { FOCUS_MODES } from '@/core/config/focus-modes'
import { INSTRUMENTS } from '@/core/config/instruments'
import { AnchorLockup } from '@/components/brand/anchor-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

// Home = 2-Schritte-Wizard im Stitch-Layout „Willkommen & Ausrichtung" (#49,
// Referenz docs/design/design.md). Ziel: beide Schritte passen „above the fold"
// (kein Scrollen auf Laptop). Schritt 1 = Instrument + Branding, Schritt 2 =
// Fokus + Start. Farben und Fonts weiter aus den bestehenden Token (ADR 0001).
// Der Gold-CTA startet den bestehenden Session-/Kalibrier-Flow (enterSession,
// Bereitschafts-Tor #36) direkt. Der Wizard-Schritt ist lokaler UI-Zustand
// (useState) — keine Analyse- und keine App-Navigation, gehört nicht in den Store.

// Home-lokaler Sky-Verlauf (kein Token — nur Home nutzt ihn, design.md §1).
const SKY_GRADIENT =
  'linear-gradient(to bottom, #E0F2FE 0%, #EDF7FF 50%, #F8FAFC 100%)'

// Gold-CTA-Verlauf aus der Gold-Dark-Familie (design.md §1/§4): Mittelton ist
// das bestehende Token --color-gold-dark (#B8860B); die helleren/dunkleren
// Verlauf-Enden sind Home-lokale Stitch-Töne ohne Token-Entsprechung. Dunkle
// Schrift (--ui-accent-foreground) erfüllt AA (#29).
const CTA_GRADIENT =
  'linear-gradient(180deg, #C99718 0%, var(--color-gold-dark) 55%, #946905 100%)'

type WizardStep = 1 | 2

// Dunkler Haken-Kreis für die aktive Auswahl (design.md §4, --ui-primary).
function ActiveCheck() {
  return (
    <span
      className="grid size-7 flex-none place-items-center rounded-full bg-primary text-primary-foreground shadow-sm"
      aria-hidden
    >
      <Check className="size-4" strokeWidth={3} />
    </span>
  )
}

export function HomeScreen() {
  const focusMode = usePoseStore((s) => s.focusMode)
  const setFocusMode = usePoseStore((s) => s.setFocusMode)
  const enterSession = usePoseStore((s) => s.enterSession)

  const [step, setStep] = useState<WizardStep>(1)

  return (
    // h-[100dvh] + overflow-hidden: beide Schritte bleiben „above the fold".
    <div
      className="h-[100dvh] overflow-hidden text-foreground"
      style={{ background: SKY_GRADIENT }}
    >
      <div className="mx-auto flex h-full w-full max-w-sm flex-col px-4 pt-safe pb-safe">
        <h1 className="sr-only">Blue Anchor Music</h1>

        {step === 1 ? (
          <StepOne onNext={() => setStep(2)} />
        ) : (
          <StepTwo
            focusMode={focusMode}
            setFocusMode={setFocusMode}
            onBack={() => setStep(1)}
            onStart={() => enterSession('violin')}
          />
        )}
      </div>
    </div>
  )
}

// --- Schritt 1: Branding + Instrumentenauswahl -----------------------------

function StepOne({ onNext }: { onNext: () => void }) {
  // Ein einziger, vertikal zentrierter Block (justify-center) mit ausgewogenen
  // Abständen: Hero → (Abstand) → Instrument → (mt-6) → Weiter-Button. Der
  // Button lebt bewusst im Fluss direkt unter der Karte, nicht am Bildschirmrand.
  return (
    // justify-center zentriert den Inhalt exakt vertikal; gap-16 gibt eine
    // großzügige Trennung zwischen Marken-Header und Interaktion, sodass oben
    // und unten gleich viel Luft bleibt (kein „geklatschtes" Layout).
    <main className="flex flex-1 flex-col items-center justify-center gap-16 py-8">
      {/* Präsenter Marken-Header: große Marke + Wortmarke als eigener, ruhig
          atmender Block. */}
      <div className="flex w-full flex-col items-center gap-4 text-center">
        {/* Gestapelt + zentriert: Anker oben, Wortmarke darunter auf einer
            Mittelachse. */}
        <div aria-hidden>
          <AnchorLockup markSize={80} stacked />
        </div>
      </div>

      {/* Instrument + Weiter-Button als zusammengehörige Gruppe. */}
      <div className="w-full">
        {/* 1. Instrument — eine Karte, als gewählt markiert (V1: nur Geige). */}
        <section className="space-y-3">
          {INSTRUMENTS.map((instrument) => (
            <div
              key={instrument.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <span
                className="grid size-12 flex-none place-items-center rounded-xl bg-muted text-2xl"
                aria-hidden
              >
                {instrument.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{instrument.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {instrument.description}
                </span>
              </span>
              <ActiveCheck />
            </div>
          ))}
        </section>

        {/* Weiter zu Schritt 2 (Sapphire-Primary-CTA), moderat unter der Karte. */}
        <Button
          onClick={onNext}
          className="mt-6 h-14 w-full gap-2 rounded-2xl text-base font-bold shadow-md"
        >
          Weiter zur Fokus-Auswahl
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </main>
  )
}

// --- Schritt 2: Fokus + Start ----------------------------------------------

function StepTwo({
  focusMode,
  setFocusMode,
  onBack,
  onStart,
}: {
  focusMode: FocusMode
  setFocusMode: (v: FocusMode) => void
  onBack: () => void
  onStart: () => void
}) {
  return (
    <>
      {/* Kompakter Header mit Zurück-Weg. */}
      <header className="flex items-center gap-3 py-5">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 font-label text-sm font-semibold text-foreground/60 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4 flex-none" />
          Zurück
        </button>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-6 py-2">
        {/* 2. Fokus — drei Modi bleiben wählbar (Q6, Analyzer-/Render-Dispatch). */}
        <section className="space-y-3">
          <div className="space-y-3">
            {FOCUS_MODES.map((mode) => {
              const selected = focusMode === mode.value
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFocusMode(mode.value)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    selected ? 'border-primary' : 'border-border hover:border-primary/40',
                  )}
                >
                  <span
                    className="grid size-12 flex-none place-items-center rounded-xl bg-secondary text-2xl"
                    aria-hidden
                  >
                    {mode.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{mode.label}</span>
                    <span className="block text-sm text-muted-foreground">
                      {mode.description}
                    </span>
                  </span>
                  {selected ? (
                    <ActiveCheck />
                  ) : (
                    <span
                      className="size-7 flex-none rounded-full border border-border"
                      aria-hidden
                    />
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </main>

      {/* Footer: Gold-CTA (design.md §4). */}
      <footer className="space-y-3 pb-6">
        {/* Gold-CTA auf dem shadcn-Button-Primitive (Fokus-Ring/Press aus
            components.instructions.md); Gold-Verlauf via Inline-Style, der
            die Basis-`bg-primary`-Fläche überschreibt. */}
        <Button
          onClick={onStart}
          style={{ background: CTA_GRADIENT, color: 'var(--ui-accent-foreground)' }}
          className="h-14 w-full gap-2 rounded-2xl text-base font-bold shadow-md hover:brightness-[1.04]"
        >
          Kamera starten &amp; Kalibrieren
          <ArrowRight className="size-5" />
        </Button>
      </footer>
    </>
  )
}
