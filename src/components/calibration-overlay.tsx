import { computeCalibrationView, type CalibrationPhase, type CalibrationTone } from '@/core/calibration/overlay-view'

/**
 * Kalibrier-Overlay — Variante C „Minimal HUD" (Ticket #28, Karte #15).
 *
 * Keine Karte: ein großer, frei über dem dunklen Kamerabild schwebender
 * Countdown-Zähler (nur die reine Zahl, kein Ring — T4 #60) als Mittelpunkt,
 * Titel/Hinweis als heller Text mit Scrim, kompakte CTA am unteren Rand,
 * Status-Pill oben. Folgt dem Projektgrundsatz „Canvas ist primär, Chrome
 * minimal und am Rand".
 *
 * Rein präsentational: Phase/Countdown kommen als Props aus `session-screen.tsx`,
 * die Ansichtslogik aus der reinen Funktion `computeCalibrationView`. Kein
 * Store-Zugriff, kein imperatives DOM mehr (löst die alte `updateCalibrationUI`
 * ab). Farben sind literale Glas-Töne über dem dunklen Kamerabild, konsistent
 * mit den #25-Tokens (sapphire-Ring, Amber, Tiefsee-Blau).
 */

// Glas-Farben über dem dunklen Kamerabild (literal, analog zu den Canvas-Indikatoren).
// `success` bleibt im geteilten Ton-Typ (Bereitschafts-Tor #36); das Overlay
// selbst zeigt seit #58 nur noch sapphire (Countdown) und amber (Nochmal versuchen).
const SAPPHIRE = '#2196F3'
const SUCCESS = '#2ecc71'
const AMBER = '#ffb800'
const AMBER_FG = '#3d2c00'
const PRIMARY = '#002b49'

const ARC_COLOR: Record<CalibrationTone, string> = {
  sapphire: SAPPHIRE,
  success: SUCCESS,
  amber: AMBER,
}

interface CalibrationOverlayProps {
  phase: CalibrationPhase
  /** Beschriftung des aktiven Fokus-Modus für die Status-Pill (z. B. „🎻 Geige"). */
  modeLabel: string
  /** CTA „Erneut versuchen" (weiche Erfassung → neu einladen). */
  onRecalibrate: () => void
}

export function CalibrationOverlay({ phase, modeLabel, onRecalibrate }: CalibrationOverlayProps) {
  const view = computeCalibrationView(phase)
  const arc = ARC_COLOR[view.tone]

  const handleCta = () => {
    if (view.ctaAction === 'recalibrate') onRecalibrate()
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
      {/* Status-Pill oben */}
      <div className="absolute top-[clamp(12px,3vh,24px)] left-1/2 -translate-x-1/2">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 font-label text-[13px] shadow-[0_4px_16px_rgba(0,43,73,0.18)] backdrop-blur">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: SAPPHIRE, boxShadow: `0 0 0 3px ${SAPPHIRE}33` }}
          />
          <span className="font-semibold" style={{ color: PRIMARY }}>Live Spiegel</span>
          <span className="text-neutral-500">· {modeLabel} aktiv</span>
        </div>
      </div>

      {/* Großer, klarer Zähler + Titel/Hinweis — zentriert (T4 #60: nur die Zahl, kein Ring) */}
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <CountdownGlyph glyph={view.glyph} color={arc} />
        <div style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
          <div className="font-headline text-2xl font-extrabold text-white sm:text-[26px]">{view.title}</div>
          <div className="mt-1.5 font-sans text-[15px] text-white/85">{view.hint}</div>
        </div>
      </div>

      {/* CTA + Sprachhinweis — unten */}
      <div className="absolute bottom-[clamp(20px,5vh,40px)] left-0 right-0 flex flex-col items-center gap-3 px-6">
        <button
          onClick={handleCta}
          disabled={view.ctaBusy}
          className="inline-flex h-[52px] min-w-[220px] items-center justify-center gap-2.5 rounded-2xl px-6 font-headline text-base font-bold transition-[background,opacity] active:scale-[0.98] disabled:cursor-default disabled:opacity-70"
          style={{
            background: AMBER,
            color: AMBER_FG,
            boxShadow: '0 8px 24px rgba(255,184,0,0.4)',
          }}
        >
          <span className="text-lg leading-none">{view.ctaIcon}</span>
          {view.cta}
        </button>
        <div className="flex items-center gap-1.5 font-label text-[13px] text-white/85">
          <span>🎤 Oder sag</span>
          <span className="font-semibold">„bereit“</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Großer, klarer Zähler (T4 #60, Variante A „Randglühen"): nur die reine Zahl
 * (bzw. der Wiederhol-Pfeil), **kein** Ring und **kein** Rahmen. Ein weicher
 * Schlagschatten hebt die Ziffer vom dunklen Kamerabild ab.
 */
function CountdownGlyph({ glyph, color }: { glyph: string; color: string }) {
  return (
    <div
      className="font-headline font-extrabold leading-none tabular-nums drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
      style={{ color, fontSize: 'clamp(96px, 26vw, 168px)' }}
    >
      {glyph}
    </div>
  )
}
