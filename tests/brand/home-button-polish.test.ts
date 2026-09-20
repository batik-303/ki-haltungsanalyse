import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Guardrail für die Ausstiegs-Affordanz im Session-HUD.
 *
 * Der Knopf bleibt bewusst **diskret**: ein Klick verwirft Sitzung *und*
 * Kalibrierung (CONTEXT.md → „Home", Verwerf-Punkt 3). Er soll nicht
 * einladen — aber auch nicht nach Prototyp aussehen.
 *
 * Geprüft wird, was dafür messbar ist: deutsche Beschriftung, sichtbarer
 * Tastaturfokus und ein Touch-Ziel, das man trifft.
 *
 * Reiner Test: liest die Komponentendatei als Text — kein DOM, kein React.
 */

const source = readFileSync(
  fileURLToPath(new URL('../../src/components/screens/session-screen.tsx', import.meta.url)),
  'utf8',
)

/** Der Rumpf der gemeinsamen Ausstiegs-Knopf-Komponente. */
function exitButtonSource(): string {
  const start = source.indexOf('function ExitButton')
  expect(start).toBeGreaterThan(-1)
  const rest = source.slice(start)
  return rest.slice(0, rest.indexOf('\n}\n'))
}

describe('Ausstiegs-Knopf — deutsche Beschriftung', () => {
  it('zeigt kein englisches „Home" als sichtbaren Text', () => {
    // Das Icon darf `Home` heißen (Bezeichner bleiben englisch) — der
    // sichtbare Text nicht.
    expect(source).not.toMatch(/>\s*Home\s*</)
    expect(source).not.toMatch(/^\s*Home\s*$/m)
  })

  it('beschriftet den Knopf mit dem Begriff aus CONTEXT.md', () => {
    expect(exitButtonSource()).toMatch(/Hauptmenü/)
  })
})

describe('Ausstiegs-Knopf — Politur statt Prototyp', () => {
  it('macht den Tastaturfokus sichtbar', () => {
    expect(exitButtonSource()).toMatch(/focus-visible:/)
  })

  it('bietet ein Touch-Ziel von mindestens 44px', () => {
    const sizes = [...exitButtonSource().matchAll(/min-h-\[(\d+)px\]/g)].map((m) => Number(m[1]))
    expect(sizes.length).toBeGreaterThan(0)
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44)
  })

  it('bleibt diskret — kein Accent- oder Sapphire-Anstrich', () => {
    const body = exitButtonSource()
    expect(body).not.toMatch(/bg-accent/)
    expect(body).not.toMatch(/bg-sapphire/)
  })

  it('definiert den Knopf einmal statt getrennt für Desktop und Telefon', () => {
    expect(source.match(/aria-label="Hauptmenü"/g) ?? []).toHaveLength(1)
  })
})
