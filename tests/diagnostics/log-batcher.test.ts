import { describe, expect, it } from 'vitest'
import { createLogBatcher } from '../../src/core/diagnostics/log-batcher'

const bytes = (text: string): number => new TextEncoder().encode(text).length

describe('createLogBatcher – Sendungen unter der Größengrenze', () => {
  it('teilt viele Einträge auf mehrere Sendungen auf, keine über der Grenze, nichts geht verloren', () => {
    const batcher = createLogBatcher(1024)
    for (let i = 0; i < 40; i++) batcher.add({ kind: 'error', n: i, message: 'ä'.repeat(50) })
    const bodies = batcher.drain()
    expect(bodies.length).toBeGreaterThan(1)
    for (const body of bodies) expect(bytes(body)).toBeLessThanOrEqual(1024)
    const all = bodies.flatMap((b) => JSON.parse(b) as { n: number }[])
    expect(all.map((e) => e.n)).toEqual(Array.from({ length: 40 }, (_, i) => i))
  })

  it('ist nach dem Leeren leer', () => {
    const batcher = createLogBatcher(1024)
    batcher.add({ kind: 'fps', fps: 30 })
    expect(batcher.drain()).toHaveLength(1)
    expect(batcher.drain()).toEqual([])
  })

  it('verwirft einen einzelnen Eintrag, der allein zu groß wäre', () => {
    const batcher = createLogBatcher(100)
    batcher.add({ kind: 'error', message: 'x'.repeat(200) })
    batcher.add({ kind: 'fps', fps: 30 })
    expect(batcher.drain()).toEqual(['[{"kind":"fps","fps":30}]'])
  })
})
