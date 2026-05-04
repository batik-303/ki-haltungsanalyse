## ADDED Requirements

### Requirement: Baseline-normalized deviation
The system SHALL subtract the calibrated 2D collinearity angle (`calib2DAngle`) from the current 2D collinearity angle to compute the effective wrist deviation. The calibration posture SHALL represent exactly 0° deviation.

#### Scenario: Immediately after calibration
- **WHEN** the master print is saved and the user holds the same posture
- **THEN** the effective angle deviation SHALL be 0° (± measurement noise)

#### Scenario: Deviation from calibrated posture
- **WHEN** the user bends their wrist 15° from the calibrated posture
- **THEN** the effective angle deviation SHALL be approximately 15°, regardless of the absolute collinearity angle at calibration

### Requirement: Grace buffer after calibration
The system SHALL apply a 2° grace buffer to the blue-to-yellow threshold for 500 ms after calibration. This prevents micro-movements during the save button press from triggering a yellow state.

#### Scenario: Micro-movement during save
- **WHEN** the master print was saved less than 500 ms ago
- **AND** the effective deviation is 9° (below 8° + 2° grace = 10°)
- **THEN** the wrist rail color SHALL remain blue

#### Scenario: Grace buffer expired
- **WHEN** the master print was saved more than 500 ms ago
- **AND** the effective deviation is 9°
- **THEN** the wrist rail color SHALL be yellow (9° ≥ 8° threshold)

#### Scenario: Grace buffer does not affect tension
- **WHEN** the grace buffer is active
- **THEN** the tension score calculation SHALL NOT be affected by the grace buffer

### Requirement: Sticky-blue hysteresis
The system SHALL use asymmetric thresholds for the wrist rail color state: the line SHALL turn yellow at ≥ 8° deviation (blue-to-yellow) but SHALL only return to blue when deviation drops below 5° (yellow-to-blue). The initial state after calibration SHALL be blue.

#### Scenario: Transition from blue to yellow
- **WHEN** the current rail color is blue
- **AND** the effective deviation reaches 8°
- **THEN** the rail color SHALL change to yellow

#### Scenario: Staying yellow in hysteresis band
- **WHEN** the current rail color is yellow
- **AND** the effective deviation is 6° (between 5° and 8°)
- **THEN** the rail color SHALL remain yellow

#### Scenario: Transition from yellow to blue
- **WHEN** the current rail color is yellow
- **AND** the effective deviation drops below 5°
- **THEN** the rail color SHALL change to blue

#### Scenario: Stable blue below threshold
- **WHEN** the current rail color is blue
- **AND** the effective deviation fluctuates between 0° and 7°
- **THEN** the rail color SHALL remain blue throughout

### Requirement: Centralized rail color decision
The wrist rail color (blue/yellow) SHALL be determined in the analysis hook and stored in `wristRailIsBlue`. Renderer modules SHALL read this value from the store instead of computing their own deadzone checks.

#### Scenario: Renderer reads store value
- **WHEN** the wrist-lines renderer draws the hand segment
- **THEN** it SHALL use `state.wristRailIsBlue` to decide between blue and yellow styling

#### Scenario: Side-view reads store value
- **WHEN** the wrist side-view renderer draws the hand line
- **THEN** it SHALL use `state.wristRailIsBlue` to decide between blue and yellow styling

### Requirement: Rail color factory as closure
The sticky-blue hysteresis logic SHALL be implemented as a factory function (`createWristRailColor`) that returns a stateful update function, following the same pattern as `createWristRepairStatus`.

#### Scenario: Factory initialization
- **WHEN** `createWristRailColor()` is called
- **THEN** the returned function's initial state SHALL be blue (returns `true`)

#### Scenario: Reset on recalibration
- **WHEN** the user recalibrates
- **THEN** the rail color factory SHALL be re-created (via `useRef` reset), starting in blue state
