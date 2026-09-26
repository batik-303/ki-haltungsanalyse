## MODIFIED Requirements

### Requirement: EMA post-smoothing on effective angle
The system SHALL apply an exponential moving average (EMA) filter with `alpha = 0.25` directly to the knick deviation (`|knick − calibKnick|`, see `wrist-baseline-stability`). There SHALL be no Z-Boost step before the EMA. The system MUST NOT hold or latch the smoothed value when the foreshortening confidence is low ("only-rise" lock removed, #82); poor visibility is to be shown as a grey anchor (#74), not as a held yellow.

#### Scenario: Stable input produces stable output
- **WHEN** the knick deviation is constant at 3° for 10 consecutive frames
- **THEN** the EMA-smoothed output SHALL converge to 3° (within 0.1°)

#### Scenario: Single-frame spike is dampened
- **WHEN** the EMA state is at 2° and a single frame reports 6°
- **THEN** the EMA output for that frame SHALL be approximately 3° (2 × 0.75 + 6 × 0.25)
- **AND** subsequent frames at 2° SHALL return to 2° within 4–5 frames

#### Scenario: No latch at low foreshortening confidence
- **WHEN** the anchor is yellow from a real knick and the forearm then turns strongly toward the camera (2D length ratio < 0.7) while the wrist straightens
- **THEN** the smoothed deviation SHALL fall and the anchor SHALL return to blue

#### Scenario: Reset on recalibration
- **WHEN** the user recalibrates
- **THEN** the EMA state SHALL be reset to 0 so that the new calibration starts clean

## REMOVED Requirements

### Requirement: Gradual Z-Boost ramp
**Reason**: The knick no longer uses estimated depth (z). MediaPipe z is estimated from a single image and made the anchor jump between blue and yellow even at rest (#82, ADR 0003). The Z-Boost also depended on arm orientation.
**Migration**: None needed. The foreshortening correction (`wrist-flexion-tracking`) replaces the purpose of detecting bends hidden by the 2D projection.

### Requirement: Tightened Z-filter parameters
**Reason**: The One-Euro z-filters only fed the Z-Boost, which was removed (#82, ADR 0003).
**Migration**: None. The z-filters and their refs were removed from `use-pose-detection.ts`.
