import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Guardrail für den Ansicht-Umschalter (Analyse ⇄ Flow): das aktive Segment
 * trägt **nicht** das Sapphire `#2196F3`.
 *
 * Sapphire ist zugleich `--color-layer-flow`, die Farbe der Flow-Semantik auf
 * dem Canvas. Ein Bedienelement in Layer-Blau liest sich wie ein
 * Haltungssignal — derselbe Fehler, den #29 für Warn-Amber am CTA behoben hat.
 * Der Umschalter nutzt daher das ruhigere `sapphire-deep`.
 *
 * Reiner Test: liest die Komponentendatei als Text — kein DOM, kein React.
 */

const source = readFileSync(
  fileURLToPath(new URL('../../src/components/screens/session-screen.tsx', import.meta.url)),
  'utf8',
)

/** Der Rumpf der `ViewToggle`-Komponente. */
function viewToggleSource(): string {
  const start = source.indexOf('function ViewToggle')
  expect(start).toBeGreaterThan(-1)
  const rest = source.slice(start)
  const end = rest.indexOf('\n}\n')
  return rest.slice(0, end)
}

describe('Ansicht-Umschalter — kein Layer-Blau am Bedienelement', () => {
  it('hebt das aktive Segment nicht in der Flow-Layer-Farbe hervor', () => {
    expect(viewToggleSource()).not.toMatch(/bg-sapphire(?![\w-])/)
  })

  it('nutzt das ruhigere sapphire-deep für das aktive Segment', () => {
    expect(viewToggleSource()).toMatch(/bg-sapphire-deep/)
  })
})
