/**
 * Ein Zustand blau/gelb/grau für den Wrist-Anker (#88, Entscheidung #75).
 * Anker, periphere Leiste und Statistik lesen denselben Zustand.
 *
 * - Gelb entscheidet der **Durchschnitt** des Knicks über ein Zeitfenster,
 *   nicht der Einzelwert: Vibrato um eine gerade Haltung mittelt sich weg.
 * - Hysterese: rein über `enterDeg`, raus unter `exitDeg`, jeweils erst nach
 *   einer Haltedauer (langsam gelb, schnell zurück blau).
 * - Rutsch-Schutz (#90/#93): Rutscht das Handgelenk (Lagenwechsel, Vibrato),
 *   zählt der Knick auf dem Weg nach Gelb nur gedämpft. Der Weg nach Blau
 *   bleibt ungedämpft — Rutschen hält Blau, macht aber nie Blau.
 * - Grau (Kamera sieht das Handgelenk nicht sicher) hat Vorrang: nach
 *   `toGreyMs` ohne sichere Sicht wird grau. Ohne sichere Sicht wird nicht
 *   gemessen und nicht gezählt — auch kein Knick aus dem Pose-Fallback.
 *   Wieder sichtbar: `remeasureMs` lang nur neue Werte sammeln, dann sofort
 *   die ehrliche Farbe (Durchschnitt ≥ `enterDeg` → gelb, sonst blau), ohne
 *   Haltedauer.
 * - Alle Zeiten in Millisekunden, nicht in Frames.
 */

export type AnchorColor = 'blue' | 'yellow' | 'grey'

export interface AnchorColorConfig {
  /** Durchschnitt darüber → gelb (nach `toYellowMs`). */
  enterDeg: number
  /** Durchschnitt darunter → blau (nach `toBlueMs`). */
  exitDeg: number
  /** Länge des Mittelungsfensters. */
  averageMs: number
  /** Haltedauer bis gelb. */
  toYellowMs: number
  /** Haltedauer bis blau. */
  toBlueMs: number
  /** So lange ohne sichere Sicht, bis grau wird. */
  toGreyMs: number
  /** Nach Grau: so lange nur neue Werte messen, dann ehrliche Farbe. */
  remeasureMs: number
}

export const ANCHOR_COLOR_DEFAULTS: AnchorColorConfig = {
  enterDeg: 8,
  exitDeg: 5,
  averageMs: 500,
  toYellowMs: 500,
  toBlueMs: 150,
  toGreyMs: 250,
  remeasureMs: 150,
}

export interface AnchorColorInput {
  /** Knick-Abweichung von der gespeicherten Haltung in Grad (ungeglättet). */
  knickDiff: number
  /** Sieht die Kamera das Handgelenk sicher genug (`computeAnchorVisibility`)? */
  visible: boolean
  nowMs: number
  /** Rutsch-Schutz-Faktor aus `createSlideShield` (1 = kein Rutschen). */
  slideDamping?: number
}

export function createAnchorColorState(config: Partial<AnchorColorConfig> = {}) {
  const cfg = { ...ANCHOR_COLOR_DEFAULTS, ...config }
  let color: AnchorColor = 'blue'
  // v = Knick, damped = Knick mit Rutsch-Schutz (nur für den Weg nach Gelb).
  let samples: { t: number; v: number; damped: number }[] = []
  // Seit wann die Schwelle ununterbrochen überschritten (bzw. unterschritten) ist.
  let crossedSince: number | null = null
  let hiddenSince: number | null = null
  let visibleSince: number | null = null

  function average(pick: (s: { v: number; damped: number }) => number): number {
    let sum = 0
    for (const s of samples) sum += pick(s)
    return samples.length > 0 ? sum / samples.length : 0
  }

  function update({ knickDiff, visible, nowMs, slideDamping = 1 }: AnchorColorInput): AnchorColor {
    if (!visible) {
      // Nicht messen, nicht zählen: Farbe bleibt stehen, bis grau wird.
      hiddenSince ??= nowMs
      visibleSince = null
      if (nowMs - hiddenSince >= cfg.toGreyMs) {
        color = 'grey'
        samples = []
        crossedSince = null
      }
      return color
    }
    hiddenSince = null

    // Alte Werte vor dem Grau sind verworfen; nur neue Werte zählen.
    samples.push({ t: nowMs, v: knickDiff, damped: knickDiff * slideDamping })
    samples = samples.filter((s) => nowMs - s.t < cfg.averageMs)
    const avg = average((s) => s.v)

    if (color === 'grey') {
      visibleSince ??= nowMs
      if (nowMs - visibleSince >= cfg.remeasureMs) {
        color = avg >= cfg.enterDeg ? 'yellow' : 'blue'
        visibleSince = null
      }
      return color
    }

    const crossed = color === 'blue' ? average((s) => s.damped) > cfg.enterDeg : avg < cfg.exitDeg
    if (!crossed) {
      crossedSince = null
      return color
    }
    crossedSince ??= nowMs
    const holdMs = color === 'blue' ? cfg.toYellowMs : cfg.toBlueMs
    if (nowMs - crossedSince >= holdMs) {
      color = color === 'blue' ? 'yellow' : 'blue'
      crossedSince = null
    }
    return color
  }

  return { update }
}

const ANCHOR_FADE_MS = 200

export interface AnchorColorFadeFrame {
  from: AnchorColor
  to: AnchorColor
  /** 0 = ganz `from`, 1 = ganz `to`. */
  progress: number
}

/**
 * Binärer Farbwechsel mit kurzem Überblenden (Entscheidung #75: kein
 * Sigmoid-Verlauf, nur blau/gelb/grau). Wechselt die Farbe mitten im
 * Überblenden, startet das neue von der gerade überwiegend sichtbaren Farbe.
 */
export function createAnchorColorFade(durationMs = ANCHOR_FADE_MS) {
  let from: AnchorColor | null = null
  let to: AnchorColor | null = null
  let startedAt = 0

  function progressAt(nowMs: number): number {
    return Math.min(1, Math.max(0, (nowMs - startedAt) / durationMs))
  }

  function update(color: AnchorColor, nowMs: number): AnchorColorFadeFrame {
    if (from === null || to === null) {
      from = color
      to = color
      startedAt = nowMs - durationMs
    } else if (color !== to) {
      from = progressAt(nowMs) >= 0.5 ? to : from
      to = color
      startedAt = nowMs
    }
    const progress = from === to ? 1 : progressAt(nowMs)
    return { from, to, progress }
  }

  return { update }
}

// Vorübergehender Test-Schalter (#75/#88): Schwellen und Zeiten versteckt per
// URL einstellbar, z. B. `?knickGelb=10&knickBlau=6`. Kein sichtbarer Regler.
// Wieder ausbauen, sobald die Werte festgelegt sind.
const URL_OVERRIDE_PARAMS: Record<string, keyof AnchorColorConfig> = {
  knickGelb: 'enterDeg',
  knickBlau: 'exitDeg',
  mittelMs: 'averageMs',
  gelbMs: 'toYellowMs',
  blauMs: 'toBlueMs',
}

export function parseAnchorColorOverrides(search: string): Partial<AnchorColorConfig> {
  const params = new URLSearchParams(search)
  const out: Partial<AnchorColorConfig> = {}
  for (const [param, key] of Object.entries(URL_OVERRIDE_PARAMS)) {
    const raw = params.get(param)
    if (raw === null || raw.trim() === '') continue
    const value = Number(raw)
    if (Number.isFinite(value) && value >= 0) out[key] = value
  }
  return out
}
