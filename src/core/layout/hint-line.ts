import type { ViewMode } from '../types'

// ─────────────────────────────────────────────────────────────
//  HINWEIS-ZEILE UNTER DER KNOPF-ZEILE (#111, Entscheidungen 9/10 aus #105)
// ─────────────────────────────────────────────────────────────
//  Sprache ist eine Abkürzung, nie der einzige Weg — die Zeile erinnert
//  leise daran: vor dem Speichern „Oder sag ‚speichern'", nach dem Speichern
//  kurz „was auf den Knöpfen steht", danach ruhig. Im Flow nie.
//  Hört das Mikro nicht zu, sagt die Zeile das ehrlich (tippen = Neustart).
// ─────────────────────────────────────────────────────────────

/** So lange steht der Sprach-Hinweis nach dem Speichern, dann wird es ruhig. */
export const VOICE_TIP_DURATION_MS = 8000

const VOICE_TIP_AFTER_SAVE = 'Du kannst auch sagen, was auf den Knöpfen steht.'

export interface HintLineInput {
  /** Abgeleitete Session-Phase (`selectSessionPhase`). */
  phase: 'positioning' | 'ready-to-calibrate' | 'calibrating' | 'tracking'
  /** Text zur Phase (`selectPhaseHint`). */
  phaseHint: string
  viewMode: ViewMode
  /** Kalibrier-Kärtchen (Countdown/„Erneut versuchen") ist sichtbar. */
  calibrating: boolean
  /** Zustand der Spracherkennung (`useVoiceCommands`). */
  voiceStatus: 'off' | 'starting' | 'listening' | 'error' | 'unsupported'
  voiceError: string | null
  /** Zeitpunkt des letzten Speicherns (`performance.now()`), sonst `null`. */
  calibratedAt: number | null
  now: number
}

/** Text der Hinweis-Zeile — oder `null`, wenn es ruhig bleiben soll. */
export function computeHintLine(input: HintLineInput): string | null {
  const { phase, phaseHint, viewMode, calibrating, voiceStatus, voiceError, calibratedAt, now } = input
  if (viewMode === 'flow' || calibrating) return null

  if (voiceStatus === 'error' || voiceStatus === 'unsupported') return `🎤 ${voiceError ?? 'Mikro aus — tippen'}`
  if (voiceStatus === 'off') return '🎤 Aus — tippen zum Aktivieren'
  if (voiceStatus === 'starting') return '🎤 startet …'

  if (phase === 'tracking') {
    const justSaved = calibratedAt !== null && now - calibratedAt < VOICE_TIP_DURATION_MS
    return justSaved ? `🎤 ${VOICE_TIP_AFTER_SAVE}` : null
  }
  return `🎤 ${phaseHint}`
}
