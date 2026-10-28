// ─────────────────────────────────────────────────────────────
//  SPRACHBEFEHLE — gehörter Text → Befehl
// ─────────────────────────────────────────────────────────────

// Kurze Wortstämme, damit gebeugte Formen („kalibriere", „speichere") passen.
// Regel aus #105: Knopf-Wort = Sprach-Wort. Sichtbar sind „speichern",
// „Beenden", „Spiegel", „Flow"; „bereit", „kalibrieren", „Analyse" und „Kamera"
// funktionieren still weiter.
// Reihenfolge zählt: „neu" steht vor „speichern", damit „neu speichern" neu
// speichert (#101) und nicht einfach speichert.
// „los" ist raus (#111): alter Start-Befehl, löste in Sätzen wie „also los" aus.
// „Development" schaltet die Entwickler-Ansicht um; Wortstamm „develop", weil die
// deutsche Erkennung das englische Wort unterschiedlich schreibt.
const COMMAND_KEYWORDS: Record<string, string[]> = {
  neu: ['neu', 'nochmal', 'erneut'],
  kalibrieren: ['speicher', 'bereit', 'kalibrier', 'calibrat'],
  start: ['start'],
  stop: ['stop', 'stopp', 'ende'],
  flow: ['flow'],
  analyse: ['spiegel', 'analyse', 'analys', 'kamera'],
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
