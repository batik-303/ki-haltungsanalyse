import { describe, it, expect } from 'vitest'
import { createWristRepairStatus } from '../src/core/analysis/wrist-analyzer'

describe('createWristRepairStatus', () => {
  it('should not be repaired if never in deadzone', () => {
    const repair = createWristRepairStatus(10, 200)
    let now = 0
    let result = repair(15, now)
    expect(result.repaired).toBe(false)
    now += 100
    result = repair(12, now)
    expect(result.repaired).toBe(false)
    now += 150
    result = repair(11, now)
    expect(result.repaired).toBe(false)
  })

  it('should become repaired after 200ms in deadzone', () => {
    const repair = createWristRepairStatus(10, 200)
    let now = 0
    let result = repair(9, now)
    expect(result.repaired).toBe(false)
    now += 100
    result = repair(8, now)
    expect(result.repaired).toBe(false)
    now += 100
    result = repair(7, now)
    expect(result.repaired).toBe(true)
  })

  it('should reset repaired if leaving deadzone', () => {
    const repair = createWristRepairStatus(10, 200)
    let now = 0
    repair(8, now)
    now += 100
    repair(7, now)
    now += 120
    let result = repair(6, now)
    expect(result.repaired).toBe(true)
    // leave deadzone
    now += 10
    result = repair(15, now)
    expect(result.repaired).toBe(false)
    // re-enter, timer resets
    now += 10
    result = repair(8, now)
    expect(result.repaired).toBe(false)
  })
})
