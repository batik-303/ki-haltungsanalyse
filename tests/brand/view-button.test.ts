import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Knöpfe in der Knopf-Zeile (#111, Entscheidungen aus #105).
 *
 * - Ansicht-Knopf als Text mit dem **Ziel**: im Spiegel „Flow", im Flow
 *   „Spiegel". 🌊-Knopf (Handy) und zweiteiliger Umschalter (Tablet/Laptop)
 *   entfallen — auf allen Geräten gleich.
 * - Speicher-Knopf überall „Haltung speichern" (früher am Handy „Speichern").
 * - Kein Layer-Blau am Bedienelement: Sapphire `#2196F3` ist die Flow-Farbe
 *   auf dem Canvas, ein Knopf darin läse sich wie ein Haltungssignal (#29).
 *
 * Reiner Test: liest die Komponentendatei als Text — kein DOM, kein React.
 */

const source = readFileSync(
  fileURLToPath(new URL('../../src/components/screens/session-screen.tsx', import.meta.url)),
  'utf8',
)

/** Der Block der Knopf-Zeile. */
function controlRowSource(): string {
  const start = source.indexOf('Knopf-Zeile (#104')
  expect(start).toBeGreaterThan(-1)
  return source.slice(start, source.indexOf('Hinweis-Zeile unter den Knöpfen', start))
}

describe('Ansicht-Knopf — Text mit dem Ziel', () => {
  it('heißt im Spiegel „Flow" und im Flow „Spiegel"', () => {
    expect(controlRowSource()).toMatch(/>Flow</)
    expect(controlRowSource()).toMatch(/>Spiegel</)
    expect(controlRowSource()).not.toMatch(/>Analyse</)
  })

  it('kein 🌊-Knopf und kein zweiteiliger Umschalter mehr', () => {
    expect(source).not.toMatch(/🌊/)
    expect(source).not.toMatch(/ViewToggle/)
  })

  it('trägt kein Layer-Blau', () => {
    expect(controlRowSource()).not.toMatch(/bg-sapphire(?![\w-])/)
  })
})

describe('Speicher-Knopf — überall „Haltung speichern"', () => {
  it('kein verkürztes „Speichern" nur fürs Handy', () => {
    expect(controlRowSource()).toMatch(/Haltung speichern/)
    expect(controlRowSource()).not.toMatch(/>Speichern</)
  })
})
