## MODIFIED Requirements

### Requirement: Baseline-normalized deviation
The system SHALL compute the effective wrist deviation as `|knick − calibKnick|` (hand path) or `|knick − calibKnickFallback|` (pose fallback), where `knick` is the foreshortening-corrected 2D angle (see `wrist-flexion-tracking`) and the baselines are stored in the same unit at calibration. The calibration posture SHALL represent 0° deviation. After EMA post-smoothing, the final value SHALL be used for all downstream consumers (rail color, tension, rendering). The measurement MUST NOT use estimated depth (z).

#### Scenario: Immediately after calibration
- **WHEN** the master print is saved and the user holds the same posture with pixel jitter of ±0.3 % image width for 10 seconds
- **THEN** the anchor SHALL stay blue for the whole time

#### Scenario: Deviation from calibrated posture
- **WHEN** the user bends their wrist 20° from the calibrated posture in the image plane
- **THEN** the effective deviation SHALL exceed the yellow threshold and the anchor SHALL turn yellow, and return to blue once the posture is restored

#### Scenario: Arm rotation does not create deviation
- **WHEN** the user keeps a good posture (knick ≤ 5° from calibration) and the whole arm turns up to 70–80° in front of the camera (e.g. during a position shift)
- **THEN** the effective deviation SHALL stay at or below 8° and the anchor SHALL stay blue

#### Scenario: Depth values have no influence
- **WHEN** the z-values of all landmarks change arbitrarily while x and y stay the same
- **THEN** the effective deviation SHALL be identical
