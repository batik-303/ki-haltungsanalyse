## ADDED Requirements

### Requirement: Frame-count hysteresis for rail color
The `createWristRailColor` closure SHALL track consecutive frames above/below threshold instead of switching immediately. A transition from blue to yellow SHALL require ≥8 consecutive frames where `angleDeg > blueToYellowDeg`. A transition from yellow to blue SHALL require ≥4 consecutive frames where `angleDeg < yellowToBlueDeg`.

#### Scenario: Brief spike does not trigger yellow
- **WHEN** `wristRailIsBlue` is `true` and `angleDeg` exceeds `blueToYellowDeg` for 5 frames, then drops below
- **THEN** the color SHALL remain blue (5 < 8 required frames)

#### Scenario: Sustained deviation triggers yellow
- **WHEN** `wristRailIsBlue` is `true` and `angleDeg` exceeds `blueToYellowDeg` for 8 consecutive frames
- **THEN** the color SHALL transition to yellow on the 8th frame

#### Scenario: Quick return to blue
- **WHEN** `wristRailIsBlue` is `false` and `angleDeg` drops below `yellowToBlueDeg` for 4 consecutive frames
- **THEN** the color SHALL transition to blue on the 4th frame

#### Scenario: Interrupted return resets counter
- **WHEN** `wristRailIsBlue` is `false` and `angleDeg` drops below threshold for 3 frames, then rises above threshold for 1 frame
- **THEN** the blue-return frame counter SHALL reset to 0

### Requirement: Counter reset on recalibration
The frame counters inside `createWristRailColor` SHALL reset to 0 when the closure is re-created (recalibration).

#### Scenario: Recalibration resets hysteresis
- **WHEN** the user recalibrates and `createWristRailColor()` is called again
- **THEN** the new closure SHALL start with `isBlue = true` and both counters at 0
