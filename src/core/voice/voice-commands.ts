// ─────────────────────────────────────────────────────────────
//  SPRACHBEFEHLE — gehörter Text → Befehl
// ─────────────────────────────────────────────────────────────

// Kurze Wortstämme, damit gebeugte Formen („kalibriere", „speichere") passen.
// Regel aus #105: Knopf-Wort = Sprach-Wort. Sichtbar sind „Start" (#132),
// „Beenden", „Spiegel", „Flow"; „speichern", „bereit", „kalibrieren", „Analyse"
// und „Kamera" funktionieren still weiter.
// „Start" speichert die Haltung (#132): kurz, harte Laute, sicherer erkannt als
// „speichern". Der alte eigene Befehl „start" (ohne Handler seit #58) ist weg.
// Reihenfolge zählt: „neu" steht vor „kalibrieren", damit „neu speichern",
// „neu starten" und „Neustart" neu speichern (#101) und nicht einfach speichern.
// „los" ist raus (#111): alter Start-Befehl, löste in Sätzen wie „also los" aus.
// „Development" schaltet die Entwickler-Ansicht um; Wortstamm „develop", weil die
// deutsche Erkennung das englische Wort unterschiedlich schreibt.
const COMMAND_KEYWORDS: Record<string, string[]> = {
  neu: ['neu', 'nochmal', 'erneut'],
  kalibrieren: ['start', 'speicher', 'bereit', 'kalibrier', 'calibrat'],
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
