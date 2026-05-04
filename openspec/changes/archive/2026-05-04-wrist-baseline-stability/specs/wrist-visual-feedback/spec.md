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
The peripheral side-view SHALL read `wristRailIsBlue` from the store to determine hand line color, synchronized with the main overlay.

#### Scenario: Correct posture in side-view
- **WHEN** `state.wristRailIsBlue` is `true`
- **THEN** the side-view shows a straight vertical arm line, anchor at center, and straight blue hand line above

#### Scenario: Deviation shown in both views
- **WHEN** `state.wristRailIsBlue` is `false`
- **THEN** the side-view shows a hand line angled by `wristRailAngleDeg` with yellow color
