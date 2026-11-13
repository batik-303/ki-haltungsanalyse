import { describe, expect, it } from 'vitest'
import { selectPhaseHint, selectSessionPhase } from '../../src/store/selectors'
import type { PoseState } from '../../src/store/pose-store'

/**
 * #168: Restliche Selektor-Tests. `selectIsFlowRail` und die meisten Fälle von
 * `selectPhaseHint` sind schon in eigenen Dateien abgedeckt; hier die reine
 * Phasen-Ableitung inkl. „calibrating“.
 */
const state = (over: Partial<PoseState>): PoseState =>
  ({ isCalibrating: false, masterPrint: null, distanceOk: false, ...over }) as unknown as PoseState

const someMasterPrint = { mode: 'shoulder', earShoulderDist: 0.2 } as PoseState['masterPrint']

describe('selectSessionPhase', () => {
  it('ist „positioning“ ohne MasterPrint und ohne passenden Abstand', () => {
    expect(selectSessionPhase(state({}))).toBe('positioning')
  })

  it('ist „ready-to-calibrate“ ohne MasterPrint bei passendem Abstand', () => {
    expect(selectSessionPhase(state({ distanceOk: true }))).toBe('ready-to-calibrate')
  })

  it('ist „tracking“, sobald ein MasterPrint existiert (Abstand egal)', () => {
    expect(selectSessionPhase(state({ masterPrint: someMasterPrint }))).toBe('tracking')
    expect(selectSessionPhase(state({ masterPrint: someMasterPrint, distanceOk: true }))).toBe('tracking')
  })

  it('ist „calibrating“ während der Kalibrierung, auch mit MasterPrint', () => {
    expect(selectSessionPhase(state({ isCalibrating: true }))).toBe('calibrating')
    expect(selectSessionPhase(state({ isCalibrating: true, masterPrint: someMasterPrint }))).toBe('calibrating')
  })
})

describe('selectPhaseHint', () => {
  it('zeigt während der Kalibrierung „Einen Moment …“', () => {
    expect(selectPhaseHint(state({ isCalibrating: true }))).toBe('Einen Moment …')
  })
})
