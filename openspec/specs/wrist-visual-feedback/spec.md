## MODIFIED Requirements

### Requirement: Yellow dashed line on deviation
The system SHALL render a yellow dashed line from the wrist anchor to the MCP position when `wristRailIsBlue` is `false` in the store. The line represents the "broken" segment of the rail, showing where the hand has departed from the forearm axis.

#### Scenario: Deviation above deadzone
- **WHEN** `state.wristRailIsBlue` is `false`
- **THEN** a yellow dashed line is drawn from wrist to MCP, with intensity scaling based on `wristRailAngleDeg`

#### Scenario: Within deadzone
- **WHEN** `state.wristRailIsBlue` is `true`
- **THEN** the yellow break line is NOT rendered; the continuous blue rail line is shown instead

### Requirement: No visual clutter in correct state
When `wristRailIsBlue` is `true`, the system SHALL render the complete rail line (forearm extension + hand segment) and the sapphire anchor. The rail line provides continuous orientation feedback.

#### Scenario: Perfect posture
- **WHEN** `state.wristRailIsBlue` is `true` throughout a session segment
- **THEN** the rail line (grey forearm extension + blue hand line) and sapphire anchor are visible
- **AND** no yellow break lines or warning indicators are shown

### Requirement: Hand segment styling
The hand segment (Wrist→MCP) SHALL render as a solid blue line (sapphire color) when `wristRailIsBlue` is `true`, and as a yellow dashed line when `wristRailIsBlue` is `false`.

#### Scenario: Correct hand position
- **WHEN** `state.wristRailIsBlue` is `true`
- **THEN** the hand segment renders as solid sapphire-blue (#5b9bd5) at 3px width

#### Scenario: Deviated hand position
- **WHEN** `state.wristRailIsBlue` is `false`
- **THEN** the hand segment renders as dashed yellow (#F5C842) with intensity based on `wristRailAngleDeg`

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
