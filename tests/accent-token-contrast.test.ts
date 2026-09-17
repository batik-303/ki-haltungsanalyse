import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Guardrail für Ticket #29 (Karte #15): Der helle Accent-Ton ist das
 * „Geigenholz-Gold" und die Button-Beschriftung darauf erfüllt WCAG AA.
 *
 * Reiner Test: liest die Roh-Token aus `src/index.css` und rechnet den
 * Kontrast nach — kein DOM, kein React.
 */

const cssPath = fileURLToPath(new URL('../src/index.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')

/** Liest einen Token-Wert aus dem ersten `:root { … }`-Block (Hell-Chrome). */
function readRootToken(name: string): string {
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)
  const body = rootBlock?.[1] ?? ''
  const match = body.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})`))
  if (!match?.[1]) throw new Error(`Token --${name} nicht in :root gefunden`)
  return match[1].toLowerCase()
}

/** Relative Luminanz nach WCAG 2.1. */
function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const channel = (v: number): number => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const r = channel(parseInt(h.slice(0, 2), 16))
  const g = channel(parseInt(h.slice(2, 4), 16))
  const b = channel(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Kontrastverhältnis (1–21) zweier Hex-Farben nach WCAG. */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

describe('Heller Accent-Ton (#29 Geigenholz-Gold)', () => {
  it('nutzt das dunklere Geigenholz-Gold statt des grellen Amber #ffb800', () => {
    const accent = readRootToken('ui-accent')
    expect(accent).toBe('#b07a24')
    expect(accent).not.toBe('#ffb800')
  })

  it('setzt eine dunkle Textfarbe, die WCAG AA (4.5:1) auf dem Button erfüllt', () => {
    const accent = readRootToken('ui-accent')
    const foreground = readRootToken('ui-accent-foreground')
    expect(foreground).toBe('#2b1a00')
    expect(contrastRatio(accent, foreground)).toBeGreaterThanOrEqual(4.5)
  })
})
