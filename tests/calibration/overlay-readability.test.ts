import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Guardrail für das Kalibrier-Overlay: der CTA trägt den Marken-Accent
 * (Geigenholz-Gold), **nicht** die Warn-Amber, und die begleitenden Texte
 * sind über dem bewegten Kamerabild lesbar.
 *
 * Hintergrund (#29 / CONTEXT.md): Amber `#ffb800` ist der Ton der
 * Haltungs-Warnung. Ein Bedienknopf in diesem Ton liest sich wie ein
 * Haltungssignal — der CTA muss den Accent nutzen.
 *
 * Reiner Test: liest die Komponentendatei als Text — kein DOM, kein React.
 */

const source = readFileSync(
  fileURLToPath(new URL('../../src/components/calibration-overlay.tsx', import.meta.url)),
  'utf8',
)

/** Alle `text-[Npx]`-Größen der Datei in Pixeln. */
function pixelFontSizes(): number[] {
  return [...source.matchAll(/text-\[(\d+)px\]/g)].map((m) => Number(m[1]))
}

describe('Kalibrier-Overlay — CTA trägt den Marken-Accent', () => {
  it('färbt den CTA-Knopf nicht mehr mit der Warn-Amber #ffb800', () => {
    const ctaBlock = source.match(/<button[\s\S]*?<\/button>/)?.[0] ?? ''
    expect(ctaBlock).not.toMatch(/#ffb800/i)
    expect(ctaBlock).not.toMatch(/\bAMBER\b/)
  })

  it('nutzt für den CTA das Accent-Token statt einer literalen Farbe', () => {
    const ctaBlock = source.match(/<button[\s\S]*?<\/button>/)?.[0] ?? ''
    expect(ctaBlock).toMatch(/background: ACCENT/)
    expect(ctaBlock).toMatch(/color: ACCENT_FG/)
    // …und die Konstanten zeigen wirklich auf die Token, nicht auf einen Literalwert.
    expect(source).toMatch(/const ACCENT = 'var\(--ui-accent\)'/)
    expect(source).toMatch(/const ACCENT_FG = 'var\(--ui-accent-foreground\)'/)
  })
})

describe('Kalibrier-Overlay — Lesbarkeit über dem Kamerabild', () => {
  it('setzt keine Schriftgröße unter 15px', () => {
    const sizes = pixelFontSizes()
    expect(sizes.length).toBeGreaterThan(0)
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(15)
  })

  it('zeigt Hinweis und Sprachhinweis in voller Deckkraft statt white/85', () => {
    expect(source).not.toMatch(/text-white\/85/)
  })

  it('begrenzt die Hinweisbreite, damit der Text umbricht statt abgeschnitten zu werden', () => {
    expect(source).toMatch(/max-w-/)
  })
})
