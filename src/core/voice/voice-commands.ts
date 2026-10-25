// ─────────────────────────────────────────────────────────────
//  SPRACHBEFEHLE — gehörter Text → Befehl
// ─────────────────────────────────────────────────────────────

// Use short stems so conjugated forms ("kalibriere", "kalibriert") still match.
// T4 #60: „bereit" ist der sichtbare, primäre Auslöser; „kalibrieren" bleibt nur
// als unsichtbares Synonym in der Voice-Map (kein UI-Text mehr).
// „Development" schaltet die Entwickler-Ansicht um; Wortstamm „develop", weil die
// deutsche Erkennung das englische Wort unterschiedlich schreibt.
const COMMAND_KEYWORDS: Record<string, string[]> = {
  kalibrieren: ['bereit', 'kalibrier', 'calibrat'],
  start: ['start', 'los'],
  stop: ['stop', 'stopp', 'ende'],
  neu: ['neu', 'nochmal', 'erneut'],
  flow: ['flow'],
  analyse: ['analyse', 'analys'],
  development: ['develop'],
}

/** Erster Befehl, dessen Stichwort im gehörten Text vorkommt — sonst `null`. */
export function matchVoiceCommand(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [commandName, keywords] of Object.entries(COMMAND_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return commandName
  }
  return null
}
