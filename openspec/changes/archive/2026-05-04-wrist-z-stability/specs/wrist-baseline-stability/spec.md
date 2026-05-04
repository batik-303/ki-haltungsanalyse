## MODIFIED Requirements

### Requirement: Baseline-normalized deviation
The system SHALL subtract the calibrated 2D collinearity angle (`calib2DAngle`) from the current 2D collinearity angle to compute the effective wrist deviation. The calibration posture SHALL represent exactly 0° deviation. After Z-Boost and EMA post-smoothing, the final `effectiveAngleDiff` SHALL be used for all downstream consumers (rail color, tension, rendering).

#### Scenario: Immediately after calibration
- **WHEN** the master print is saved and the user holds the same posture
- **THEN** the effective angle deviation SHALL be 0° (± measurement noise)

#### Scenario: Deviation from calibrated posture
- **WHEN** the user bends their wrist 15° from the calibrated posture
- **THEN** the effective angle deviation SHALL be approximately 15°, regardless of the absolute collinearity angle at calibration

#### Scenario: Z-axis deviation from calibrated posture
- **WHEN** the user moves their hand toward the neck (Z-axis only, no 2D angle change)
- **THEN** the effective angle deviation SHALL increase gradually and smoothly, proportional to the depth displacement
