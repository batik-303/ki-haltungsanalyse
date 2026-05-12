## ADDED Requirements

### Requirement: Anchor-only main view in wrist analyse-mode
The system SHALL render only the sapphire anchor point at the wrist position in wrist analyse-mode. No rail lines, knick lines, ghost rails, perpendicular indicators, or endpoint dots SHALL be rendered in the main view.

#### Scenario: Wrist analyse-mode rendering
- **WHEN** the user is in wrist mode with analyse view and calibration is complete
- **THEN** the main view SHALL show the silhouette and a single sapphire anchor at the wrist position
- **AND** no rail lines or directional indicators SHALL be drawn on the body

### Requirement: Anchor color reflects deviation severity
The anchor point color SHALL change based on wrist deviation state. Blue when `wristRailIsBlue` is true (correct posture). Yellow when `wristRailIsBlue` is false and `wristRailAngleDeg` is below 15 degrees. Lilac when `wristRailIsBlue` is false and `wristRailAngleDeg` is at or above 15 degrees.

#### Scenario: Correct posture
- **WHEN** `wristRailIsBlue` is `true`
- **THEN** the anchor SHALL render in sapphire blue (default color)

#### Scenario: Warning deviation
- **WHEN** `wristRailIsBlue` is `false` AND `wristRailAngleDeg` is less than 15
- **THEN** the anchor SHALL render with yellow tint (#F5C842)

#### Scenario: Correction deviation
- **WHEN** `wristRailIsBlue` is `false` AND `wristRailAngleDeg` is 15 or greater
- **THEN** the anchor SHALL render with lilac tint (#9B59B6)
