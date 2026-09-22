import { describe, it, expect } from 'vitest'
import { resolveWristAnchor } from '../../src/core/analysis/wrist-anchor'

/**
 * #79 — Wrist-Anker durchgehend auf handLandmarks[0].
 * Reine Positions-Logik: init exakt auf Hand-0, danach EMA, bei Handverlust
 * einfrieren, kein Pose-15-Seed (kein Anker, solange nie eine Hand da war).
 */
describe('#79 resolveWristAnchor', () => {
  const alpha = 0.6

  it('erste Hand-0: Anker sitzt exakt auf hand0 (kein Nachlauf beim Init)', () => {
    const r = resolveWristAnchor(null, { x: 100, y: 200 }, alpha)
    expect(r.pos).toEqual({ x: 100, y: 200 })
    expect(r.hasEverSeenHand).toBe(true)
  })

  it('hand0 = null bevor je eine Hand da war: kein Anker, kein Pose-15-Seed', () => {
    const r = resolveWristAnchor(null, null, alpha)
    expect(r.pos).toBeNull()
    expect(r.hasEverSeenHand).toBe(false)
  })

  it('hand0 = null nach erster Hand: Position eingefroren (springt nicht)', () => {
    const prev = { x: 100, y: 200 }
    const r = resolveWristAnchor(prev, null, alpha)
    expect(r.pos).toEqual(prev)
    expect(r.hasEverSeenHand).toBe(true)
  })

  it('EMA mit alpha=0.6 folgt schneller als 0.25 (kleinere Nachlauf-Distanz nach n Frames)', () => {
    const target = { x: 100, y: 0 }
    let fast: { x: number; y: number } | null = { x: 0, y: 0 }
    let slow: { x: number; y: number } | null = { x: 0, y: 0 }
    for (let i = 0; i < 5; i++) {
      fast = resolveWristAnchor(fast, target, 0.6).pos
      slow = resolveWristAnchor(slow, target, 0.25).pos
    }
    const distFast = Math.abs(target.x - fast!.x)
    const distSlow = Math.abs(target.x - slow!.x)
    expect(distFast).toBeLessThan(distSlow)
  })

  it('EMA mischt korrekt: prev + alpha*(hand0-prev)', () => {
    const r = resolveWristAnchor({ x: 0, y: 0 }, { x: 100, y: 50 }, 0.6)
    expect(r.pos!.x).toBeCloseTo(60, 6)
    expect(r.pos!.y).toBeCloseTo(30, 6)
  })
})
