## ADDED Requirements

### Requirement: Foreshortening correction of the knick
The system SHALL correct the 2D collinearity angle for forearm foreshortening: `r = forearmLength2D / calibArmLength2D` (both aspect-corrected, pose 13 → 15) and `knick = acos(cos(angle2D) · r² + (1 − r²))`, with `r` clamped to [0, 1]. The correction MUST NOT use estimated depth (z) and MUST NOT increase the value above `angle2D`. It is implemented as `computeCorrectedKnick` and applied per frame by `createKnickTracker` (ADR 0003).

#### Scenario: No foreshortening
- **WHEN** the current 2D forearm length equals or exceeds the calibrated length (r ≥ 1)
- **THEN** the knick SHALL equal the 2D collinearity angle

#### Scenario: Forearm half as long
- **WHEN** r = 0.5 and the 2D angle is 90°
- **THEN** the knick SHALL be acos(0.75) ≈ 41.4°

#### Scenario: Small length noise at rest
- **WHEN** r fluctuates by 2 % around 1 and the 2D angle is 10°
- **THEN** the knick SHALL change by less than 0.5°

#### Scenario: Known limit — rotation about the forearm long axis
- **WHEN** the arm rotates only about its own long axis (no 2D shortening)
- **THEN** the knick SHALL equal the uncorrected 2D angle, so a real knick may appear smaller (towards blue, not a false yellow)

#### Scenario: Known limit — no sign
- **WHEN** the calibrated posture is already bent (e.g. 10°) and the hand bends through the straight line to the same magnitude on the other side
- **THEN** the deviation SHALL be 0 (documented limit, tracked in #85)

## MODIFIED Requirements

### Requirement: Calibration stores flex-only angle
The WristMasterPrint SHALL store the knick baselines in the same unit as the runtime measurement. At calibration r = 1, so the baseline equals the 2D collinearity angle. The stored `flexAngle` remains for backward compatibility.

#### Scenario: Wrist calibration capture
- **WHEN** the user holds the correct wrist position and calibration triggers
- **THEN** the system stores `flexAngle`, `flexBendDir`, `calibArmLength2D` (aspect-corrected), `calibKnick` (2D angle pose elbow → hand wrist → hand middle MCP, aspect-corrected) and `calibKnickFallback` (2D angle from pose world landmarks, else image landmarks) in the MasterPrint

## REMOVED Requirements

### Requirement: Z-boost for neck-direction detection
**Reason**: Estimated depth (z) is too noisy at rest and made the anchor flicker (#82, ADR 0003). The Z-Boost was also orientation-dependent.
**Migration**: None. Bends hidden by arm rotation are handled by the foreshortening correction.
