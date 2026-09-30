import { describe, it, expect } from 'vitest'
import { createKnickTracker } from '../../src/core/analysis/knick-tracker'
import { createSlideShield } from '../../src/core/analysis/slide-shield'
import { computeSignedKnick2D, createWristRailColor } from '../../src/core/analysis/wrist-analyzer'
import { createMasterPrint } from '../../src/core/calibration/master-print'
import type { Landmark, WristMasterPrint } from '../../src/core/types'

// Sichert den mit Geige abgenommenen Stand von #82 (ADR 0003) über den ganzen
// Ablauf pro Frame: „Haltung speichern" → Knick-Messung → Pfadwechsel →
// Glättung → Farbe. Szenarien entsprechen dem Geigen-Test der Nutzerin:
// Stillstand ruhig blau, Armdrehung (Lagenwechsel) blau, bewusster Knick gelb.

type P = { x: number; y: number; z: number }

// Reproduzierbares Rauschen (mulberry32).
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rotate(p: P, axis: P, deg: number): P {
  const m = Math.hypot(axis.x, axis.y, axis.z)
  const k = { x: axis.x / m, y: axis.y / m, z: axis.z / m }
  const t = (deg * Math.PI) / 180
  const c = Math.cos(t), s = Math.sin(t)
  const dot = k.x * p.x + k.y * p.y + k.z * p.z
  return {
    x: p.x * c + (k.y * p.z - k.z * p.y) * s + k.x * dot * (1 - c),
    y: p.y * c + (k.z * p.x - k.x * p.z) * s + k.y * dot * (1 - c),
    z: p.z * c + (k.x * p.y - k.y * p.x) * s + k.z * dot * (1 - c),
  }
}

const Y = { x: 0, y: 1, z: 0 }
const Z = { x: 0, y: 0, z: 1 }

interface Pose {
  knickDeg: number // Knick gegenüber der gespeicherten Haltung, in der Bildebene
  armTurn?: { axis: P; deg: number } // Drehung des ganzen Arms vor der Kamera
  calibDeg?: number // natürliche Beugung der gespeicherten Haltung (Standard CALIB_KNICK)
  shift?: { x: number; y: number } // Verschiebung des ganzen Arms im Bild (Rutschen)
}

interface Frame {
  pose: Landmark[]
  world: Landmark[]
  hand: Landmark[] | null
}

const CENTER = { x: 0.5, y: 0.5, z: 0 }
const CALIB_KNICK = 10 // natürliche Beugung in der gespeicherten Spielhaltung

/**
 * Starre Arm+Hand im Bild (aspect = 1): Unterarm entlang +x, Handgelenk in der
 * Bildmitte. `noise` verrauscht x/y (Pixelzittern) und z (geschätzte Tiefe).
 */
function makeFrame(p: Pose, opts: { noise?: () => number; zNoise?: () => number; withHand?: boolean } = {}): Frame {
  const n = opts.noise ?? (() => 0)
  const zn = opts.zNoise ?? (() => 0)
  const turn = (q: P) => (p.armTurn ? rotate(q, p.armTurn.axis, p.armTurn.deg) : q)
  const mcpDir = rotate({ x: 0.085, y: 0, z: 0 }, Z, (p.calibDeg ?? CALIB_KNICK) + p.knickDeg)
  const local: Record<string, P> = {
    elbow: { x: -0.25, y: 0, z: 0 },
    wrist: { x: 0, y: 0, z: 0 },
    mcp: mcpDir,
    index: { x: mcpDir.x, y: mcpDir.y - 0.02, z: 0 },
    pinky: { x: mcpDir.x, y: mcpDir.y + 0.02, z: 0 },
  }
  const toLm = (q: P): Landmark => {
    const r = turn(q)
    const sx = p.shift?.x ?? 0, sy = p.shift?.y ?? 0
    return { x: CENTER.x + r.x + sx + n(), y: CENTER.y + r.y + sy + n(), z: r.z + zn(), visibility: 1 }
  }
  const filler: Landmark = { x: 0.5, y: 0.5, z: 0, visibility: 1 }
  const pose = Array.from({ length: 33 }, () => filler)
  pose[13] = toLm(local.elbow!)
  pose[15] = toLm(local.wrist!)
  pose[17] = toLm(local.pinky!)
  pose[19] = toLm(local.index!)
  const world = pose.map((l) => ({ ...l, x: l.x - 0.5, y: l.y - 0.5 }))
  const hand = Array.from({ length: 21 }, () => filler)
  hand[0] = toLm(local.wrist!)
  hand[5] = toLm(local.index!)
  hand[9] = toLm(local.mcp!)
  hand[17] = toLm(local.pinky!)
  return { pose, world, hand: opts.withHand === false ? null : hand }
}

function calibrate(calibDeg = CALIB_KNICK): WristMasterPrint {
  const f = makeFrame({ knickDeg: 0, calibDeg })
  const mp = createMasterPrint('wrist', f.pose, { handLandmarks: f.hand, aspect: 1, worldLandmarks: f.world })
  if (mp?.mode !== 'wrist') throw new Error('Kalibrierung fehlgeschlagen')
  return mp
}

/** Spielt Frames ab und liefert pro Frame Knick-Abweichung und Farbe. */
function play(frames: Frame[], masterPrint = calibrate()) {
  const tracker = createKnickTracker()
  const color = createWristRailColor()
  return frames.map((f) => {
    const r = tracker.update({ pose: f.pose, world: f.world, hand: f.hand, aspect: 1, masterPrint })
    return { deviation: r.effectiveKnickDiff, blue: color(r.effectiveKnickDiff), path: r.path }
  })
}

function repeat(n: number, make: (i: number) => Frame): Frame[] {
  return Array.from({ length: n }, (_, i) => make(i))
}

describe('createKnickTracker — Stillstand', () => {
  it('bleibt bei gespeicherter Haltung mit Pixelzittern 10 s lang blau', () => {
    const r = rng(1)
    const jitter = () => (r() - 0.5) * 0.006 // ±0,3 % Bildbreite
    const out = play(repeat(300, () => makeFrame({ knickDeg: 0 }, { noise: jitter })))
    expect(out.every((o) => o.blue)).toBe(true)
  })

  it('Tiefenwerte (z) beeinflussen den Knick nicht (ADR 0003)', () => {
    const r = rng(2)
    const wildZ = () => (r() - 0.5) * 0.2
    const flat = play(repeat(60, (i) => makeFrame({ knickDeg: i % 30 })))
    const noisyZ = play(repeat(60, (i) => makeFrame({ knickDeg: i % 30 }, { zNoise: wildZ })))
    expect(noisyZ.map((o) => o.deviation)).toEqual(flat.map((o) => o.deviation))
  })
})

describe('createKnickTracker — Seite nah an der Geraden (#91, Lehre aus #85)', () => {
  for (const calibDeg of [0, 2, 4, 6]) {
    it(`gespeicherte Haltung ${calibDeg}°: Stillstand mit starkem Zittern bleibt 10 s blau`, () => {
      const r = rng(10 + calibDeg)
      const jitter = () => (r() - 0.5) * 0.01 // ±0,5 % Bildbreite
      const mp = calibrate(calibDeg)
      const out = play(repeat(300, () => makeFrame({ knickDeg: 0, calibDeg }, { noise: jitter })), mp)
      expect(out.every((o) => o.blue)).toBe(true)
    })
  }
})

describe('createKnickTracker — gemittelte Kalibrierung (#91)', () => {
  // Ausreißer genau im Erfassungs-Frame: in Wahrheit 4° gebeugt, gemessen −5°
  // (andere Seite). Aus einem einzigen Frame verschiebt das die Null
  // dauerhaft. Vermutete Ursache für Dauer-Gelb in #85.
  const calibDeg = 4
  const r = rng(42)
  const jitter = () => (r() - 0.5) * 0.006
  const samples = repeat(30, () => makeFrame({ knickDeg: 0, calibDeg }, { noise: jitter })).map((f) =>
    computeSignedKnick2D(f.pose[13]!, f.hand![0]!, f.hand![9]!, 1),
  )
  const outlier = makeFrame({ knickDeg: -9, calibDeg })
  const mp = createMasterPrint('wrist', outlier.pose, {
    handLandmarks: outlier.hand,
    aspect: 1,
    worldLandmarks: outlier.world,
    knickSamples: samples,
  })
  if (mp?.mode !== 'wrist') throw new Error('Kalibrierung fehlgeschlagen')

  it('Seite und Beugung der gespeicherten Haltung kommen aus dem Mittel der Countdown-Frames', () => {
    expect(mp.calibKnickSide).toBe(1)
    expect(Math.abs(mp.calibKnick - calibDeg)).toBeLessThan(1.5)
  })

  it('Stillstand nach „Haltung speichern" bleibt trotz Ausreißer 10 s blau', () => {
    const out = play(repeat(300, () => makeFrame({ knickDeg: 0, calibDeg }, { noise: jitter })), mp)
    expect(out.every((o) => o.blue)).toBe(true)
  })

  it('nah an der Geraden gespeichert (< 2°): Seite unbekannt, Messung wie bisher ohne Seite', () => {
    const near = repeat(30, () => makeFrame({ knickDeg: 0, calibDeg: 0.5 })).map((f) =>
      computeSignedKnick2D(f.pose[13]!, f.hand![0]!, f.hand![9]!, 1),
    )
    const f = makeFrame({ knickDeg: 0, calibDeg: 0.5 })
    const nearMp = createMasterPrint('wrist', f.pose, { handLandmarks: f.hand, aspect: 1, worldLandmarks: f.world, knickSamples: near })
    if (nearMp?.mode !== 'wrist') throw new Error('Kalibrierung fehlgeschlagen')
    expect(nearMp.calibKnickSide).toBe(0)
  })
})

describe('createKnickTracker — Armdrehung (Lagenwechsel)', () => {
  for (const [name, axis] of [['senkrechte Achse', Y], ['schräge Achse', { x: 1, y: 1, z: 0.5 }]] as const) {
    it(`gute Haltung bleibt blau, wenn sich der Arm um die ${name} bis 70° hin und zurück dreht`, () => {
      const sweep = (i: number) => 70 * Math.sin((Math.PI * i) / 120) // 0 → 70° → 0 in 4 s
      const out = play(repeat(120, (i) => makeFrame({ knickDeg: 3, armTurn: { axis, deg: sweep(i) } })))
      expect(out.every((o) => o.blue)).toBe(true)
    })
  }
})

describe('createKnickTracker — bewusster Knick', () => {
  it('wird bei 20° Knick gelb und nach dem Zurückgehen wieder blau', () => {
    const frames = [
      ...repeat(30, () => makeFrame({ knickDeg: 0 })),
      ...repeat(60, () => makeFrame({ knickDeg: 20 })),
      ...repeat(60, () => makeFrame({ knickDeg: 0 })),
    ]
    const out = play(frames)
    expect(out.slice(0, 30).every((o) => o.blue)).toBe(true)
    expect(out[89]!.blue).toBe(false)
    expect(out[149]!.blue).toBe(true)
  })

  it('erkennt den Knick in Richtung der gespeicherten Beugung', () => {
    const out = play(repeat(60, () => makeFrame({ knickDeg: 20 })))
    expect(out.at(-1)!.blue).toBe(false)
  })

  it('erkennt den Knick durch die Gerade hindurch in Gegenrichtung (#91)', () => {
    // Gespeicherte Haltung 10° gebeugt, dann 20° in Gegenrichtung → −10°.
    // Gleicher Bildwinkel wie gespeichert, aber die Seite ist eine andere.
    const out = play(repeat(60, () => makeFrame({ knickDeg: -20 })))
    expect(out.at(-1)!.deviation).toBeCloseTo(20, 1)
    expect(out.at(-1)!.blue).toBe(false)
  })
})

describe('createKnickTracker — keine „nur-steigen"-Sperre', () => {
  it('stark verkürzter Unterarm hält kein Gelb fest', () => {
    // Gelb durch echten Knick, dann Arm stark zur Kamera gedreht (Verhältnis
    // < 0,7, früher Sperre) und Hand wieder gerade → muss blau werden.
    const turned = { axis: Y, deg: 60 }
    const frames = [
      ...repeat(60, () => makeFrame({ knickDeg: 25 })),
      ...repeat(60, () => makeFrame({ knickDeg: 0, armTurn: turned })),
    ]
    const out = play(frames)
    expect(out[59]!.blue).toBe(false)
    expect(out.at(-1)!.blue).toBe(true)
  })
})

describe('createKnickTracker — Pfadwechsel Hand ↔ Pose', () => {
  it('nutzt den Pose-Fallback, wenn die Hand fehlt, und bleibt bei gespeicherter Haltung blau', () => {
    const frames = repeat(90, (i) => makeFrame({ knickDeg: 0 }, { withHand: i % 10 !== 0 }))
    const out = play(frames)
    expect(out.some((o) => o.path === 'pose-fallback')).toBe(true)
    expect(out.every((o) => o.blue)).toBe(true)
  })

  it('begrenzt den Sprung im ersten Frame nach einem Wechsel auf 3°', () => {
    const mp = calibrate()
    // Fallback-Baseline absichtlich weit weg → roher Sprung wäre groß.
    const skewed = { ...mp, calibKnickFallback: mp.calibKnickFallback + 40 }
    const frames = [...repeat(30, () => makeFrame({ knickDeg: 0 })), makeFrame({ knickDeg: 0 }, { withHand: false })]
    const out = play(frames, skewed)
    expect(Math.abs(out[30]!.deviation - out[29]!.deviation)).toBeLessThanOrEqual(3 + 1e-9)
  })

  it('reset() setzt Glättung und Pfad zurück', () => {
    const mp = calibrate()
    const tracker = createKnickTracker()
    const knick = makeFrame({ knickDeg: 30 })
    for (let i = 0; i < 30; i++) tracker.update({ ...knick, aspect: 1, masterPrint: mp })
    tracker.reset()
    const first = tracker.update({ ...makeFrame({ knickDeg: 0 }, { withHand: false }), aspect: 1, masterPrint: mp })
    expect(first.justSwitchedPath).toBe(false)
    expect(first.effectiveKnickDiff).toBeCloseTo(0, 6)
  })
})

// ── Vergleich alt ↔ neu (#91): nichts, was vorher gut war, wird schlechter ──
// „Alt" = gespeicherte Haltung ohne Seite (calibKnickSide 0) — rechnet exakt
// wie main vor #91. Farbe wie in der Laufzeit: mit Rutsch-Schutz.

/** Wie `play`, aber mit Rutsch-Schutz auf dem Pose-Handgelenk (30 fps), verdrahtet wie im Hook. */
function playShielded(frames: Frame[], masterPrint: WristMasterPrint) {
  const tracker = createKnickTracker()
  const shield = createSlideShield()
  const color = createWristRailColor()
  return frames.map((f) => {
    const factor = shield.update(f.pose[15]!, 1 / 30)
    const r = tracker.update({ pose: f.pose, world: f.world, hand: f.hand, aspect: 1, masterPrint })
    return { deviation: r.effectiveKnickDiff, blue: color(r.effectiveKnickDiff, 0, factor) }
  })
}

function oldAndNew(calibDeg: number) {
  const neu = calibrate(calibDeg)
  return { alt: { ...neu, calibKnickSide: 0 as const }, neu }
}

describe('Knick-Seite (#91) — Seite der gespeicherten Haltung misst wie vorher', () => {
  it('Knick weiter in die gespeicherte Beugung: gleiche Abweichung wie ohne Seite', () => {
    const { alt, neu } = oldAndNew(10)
    for (const knickDeg of [-6, 3, 8, 20]) {
      const frames = repeat(60, () => makeFrame({ knickDeg }))
      expect(play(frames, neu).at(-1)!.deviation).toBeCloseTo(play(frames, alt).at(-1)!.deviation, 9)
    }
    expect(play(repeat(60, () => makeFrame({ knickDeg: 8 })), neu).at(-1)!.deviation).toBeCloseTo(8, 1)
  })
})

describe('Knick-Seite (#91) — Vibrato und Lagenwechsel bleiben blau', () => {
  const HZ = 6 // Vibrato-Frequenz
  // Vibrato: Hand schaukelt, Handgelenk wandert leicht mit. Pendel ±6° um die
  // gespeicherte Haltung — bei kleiner Beugung also durch die Gerade hindurch.
  const vibrato = (calibDeg: number, wristAmp: number) =>
    repeat(300, (i) => {
      const ph = Math.sin((2 * Math.PI * HZ * i) / 30 + 0.3)
      return makeFrame({ knickDeg: 6 * ph, calibDeg, shift: { x: wristAmp * ph, y: 0 } })
    })
  // Lagenwechsel: Arm rutscht 0,08 Bildbreite in 0,4 s hin und zurück, dabei
  // ±4° Knick-Schwankung und leichte Armdrehung.
  const shifts = (calibDeg: number) =>
    repeat(300, (i) => {
      const t = (i % 60) / 60 // alle 2 s ein Wechsel
      const move = t < 0.2 ? Math.sin((Math.PI * t) / 0.2) : 0
      return makeFrame({
        knickDeg: 4 * Math.sin(2 * Math.PI * t * 3),
        calibDeg,
        shift: { x: 0.08 * move, y: 0.02 * move },
        armTurn: { axis: Y, deg: 15 * move },
      })
    })

  for (const calibDeg of [0, 3, 6]) {
    it(`Vibrato mit Handgelenk-Bewegung, gespeichert ${calibDeg}°: blau wie vorher`, () => {
      const { alt, neu } = oldAndNew(calibDeg)
      expect(playShielded(vibrato(calibDeg, 0.01), alt).every((o) => o.blue)).toBe(true)
      expect(playShielded(vibrato(calibDeg, 0.01), neu).every((o) => o.blue)).toBe(true)
    })
    it(`Vibrato fast ohne Handgelenk-Bewegung (kein Rutsch-Schutz), gespeichert ${calibDeg}°: blau wie vorher`, () => {
      const { alt, neu } = oldAndNew(calibDeg)
      expect(playShielded(vibrato(calibDeg, 0.001), alt).every((o) => o.blue)).toBe(true)
      expect(playShielded(vibrato(calibDeg, 0.001), neu).every((o) => o.blue)).toBe(true)
    })
    it(`Lagenwechsel, gespeichert ${calibDeg}°: blau wie vorher`, () => {
      const { alt, neu } = oldAndNew(calibDeg)
      expect(playShielded(shifts(calibDeg), alt).every((o) => o.blue)).toBe(true)
      expect(playShielded(shifts(calibDeg), neu).every((o) => o.blue)).toBe(true)
    })
  }
})

describe('Rutsch-Schutz — Korrektur pendelt nicht (Geigen-Test 29.09.)', () => {
  it('kleine Rucke beim Korrigieren, Hand noch geknickt (≥ 10°): bleibt ruhig gelb', () => {
    const mp = calibrate(6)
    const frames: Frame[] = repeat(45, () => makeFrame({ knickDeg: 15, calibDeg: 6 }))
    let x = 0
    for (let k = 0; k < 150; k++) {
      if (k % 30 < 5) x += 0.3 / 30 // alle 1 s ein kurzer Ruck, schneller als die Rutsch-Schwelle
      frames.push(makeFrame({ knickDeg: Math.max(10, 15 - k * 0.1), calibDeg: 6, shift: { x, y: 0 } }))
    }
    const out = playShielded(frames, mp).slice(45)
    expect(out.every((o) => !o.blue)).toBe(true)
  })

  it('echte Korrektur mit Bewegung zurück in die Haltung wird blau und bleibt blau', () => {
    const mp = calibrate(6)
    const frames: Frame[] = repeat(45, () => makeFrame({ knickDeg: 15, calibDeg: 6 }))
    let x = 0
    for (let k = 0; k < 150; k++) {
      if (k < 10) x += 0.3 / 30
      frames.push(makeFrame({ knickDeg: Math.max(0, 15 - k * 1.5), calibDeg: 6, shift: { x, y: 0 } }))
    }
    const out = playShielded(frames, mp).slice(45)
    const firstBlue = out.findIndex((o) => o.blue)
    expect(firstBlue).toBeGreaterThanOrEqual(0)
    expect(firstBlue).toBeLessThan(20) // < 0,7 s nach Beginn der Korrektur
    expect(out.slice(firstBlue).every((o) => o.blue)).toBe(true)
  })
})
