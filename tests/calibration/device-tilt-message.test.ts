import { describe, expect, it } from 'vitest'
import { computeDeviceTiltMessage } from '../../src/core/calibration/device-tilt'

/** #147: Gerät-Kärtchen groß und kurz, mit Häkchen, sobald es passt. */
describe('computeDeviceTiltMessage', () => {
  it('gerade: „Gerät gerade ✓“', () => {
    expect(computeDeviceTiltMessage('level')).toBe('Gerät gerade ✓')
  })

  it('schief: kurze Bitte „Gerät gerade stellen“', () => {
    expect(computeDeviceTiltMessage('tilted')).toBe('Gerät gerade stellen')
  })
})
