## ADDED Requirements

### Requirement: Gradual Z-Boost ramp
The system SHALL apply Z-Boost as a linear ramp instead of a binary threshold. When `zDelta` (absolute difference between filtered MCP-Z and Wrist-Z) is between `threshold` and `threshold × 3`, the boost SHALL scale linearly from 0 to `boostDeg`. Below `threshold`, no boost is applied. Above `threshold × 3`, the full `boostDeg` is applied.

#### Scenario: Z-delta below threshold
- **WHEN** `zDelta` is 0.01 and `threshold` is 0.02
- **THEN** the Z-Boost contribution SHALL be 0° and `effectiveAngleDiff` SHALL equal `baselineCorrected`

#### Scenario: Z-delta in ramp zone
- **WHEN** `zDelta` is 0.04 (midpoint of ramp: threshold=0.02, 3×threshold=0.06)
- **AND** `baselineCorrected` is 1°
- **THEN** the Z-Boost contribution SHALL be approximately 2° (50% of boostDeg=4) and `effectiveAngleDiff` SHALL be 2°

#### Scenario: Z-delta above full ramp
- **WHEN** `zDelta` is 0.08 (above 3×threshold=0.06)
- **AND** `baselineCorrected` is 1°
- **THEN** the Z-Boost SHALL apply the full `boostDeg` (4°) and `effectiveAngleDiff` SHALL be 4°

#### Scenario: 2D angle already above 3°
- **WHEN** `baselineCorrected` is 5°
- **THEN** the Z-Boost SHALL NOT be applied regardless of `zDelta`, and `effectiveAngleDiff` SHALL equal `baselineCorrected`

### Requirement: EMA post-smoothing on effective angle
The system SHALL apply an exponential moving average (EMA) filter with `alpha = 0.25` to `effectiveAngleDiff` after Z-Boost computation. This eliminates residual micro-jumps from frame-to-frame noise.

#### Scenario: Stable input produces stable output
- **WHEN** `effectiveAngleDiff` is constant at 3° for 10 consecutive frames
- **THEN** the EMA-smoothed output SHALL converge to 3° (within 0.1°)

#### Scenario: Single-frame spike is dampened
- **WHEN** the EMA state is at 2° and a single frame reports 6°
- **THEN** the EMA output for that frame SHALL be approximately 3° (2 × 0.75 + 6 × 0.25)
- **AND** subsequent frames at 2° SHALL return to 2° within 4–5 frames

#### Scenario: Reset on recalibration
- **WHEN** the user recalibrates
- **THEN** the EMA state SHALL be reset to 0 so that the new calibration starts clean

### Requirement: Tightened Z-filter parameters
The One-Euro filters for wrist Z-values SHALL use `minCutoff = 0.3` and `beta = 0.001` (previously 0.6 and 0.003). This provides stronger noise suppression at rest with minimal additional latency.

#### Scenario: Stationary hand Z-noise
- **WHEN** the hand is stationary and MediaPipe Z-values fluctuate by ±0.015
- **THEN** the filtered Z-values SHALL fluctuate by less than ±0.005

#### Scenario: Intentional depth movement
- **WHEN** the user moves their hand 5cm toward the camera over 500ms
- **THEN** the filtered Z-value SHALL track the movement with less than 100ms additional delay compared to the previous filter settings
