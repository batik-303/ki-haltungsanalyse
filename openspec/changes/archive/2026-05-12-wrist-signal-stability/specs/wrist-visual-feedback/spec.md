## MODIFIED Requirements

### Requirement: Synchronized peripheral side-view
The peripheral side-view SHALL read `wristRailIsBlue` from the store to determine hand line color, synchronized with the main overlay. The visual angle SHALL be amplified by factor 2.5× for peripheral visibility, clamped to a maximum visual angle of 45°. The hand line thickness SHALL be 5px. The color transition from blue to yellow SHALL use a linear gradient mapped to the angle range 3°–10° (instead of a hard switch at the deadzone boundary).

#### Scenario: Correct posture in side-view
- **WHEN** `state.wristRailIsBlue` is `true`
- **THEN** the side-view shows a straight vertical arm line, anchor at center, and straight blue hand line above
- **AND** the hand line is rendered at 5px width

#### Scenario: Deviation shown in both views
- **WHEN** `state.wristRailIsBlue` is `false` and `wristRailAngleDeg` is 6°
- **THEN** the side-view shows a hand line angled by 15° (6° × 2.5 amplification) with a blended blue-yellow color
- **AND** the hand line is rendered at 5px width

#### Scenario: Extreme deviation clamped
- **WHEN** `wristRailAngleDeg` is 25°
- **THEN** the visual angle in the side-view SHALL be clamped to 45° (25° × 2.5 = 62.5° → clamped)

#### Scenario: Gradient color in transition zone
- **WHEN** `wristRailAngleDeg` is 6° (midpoint of 3°–10° range)
- **THEN** the hand line color SHALL be approximately 43% yellow, 57% blue (linear interpolation)

#### Scenario: Full yellow beyond transition
- **WHEN** `wristRailAngleDeg` is ≥10°
- **THEN** the hand line color SHALL be fully yellow (#F5C842)
