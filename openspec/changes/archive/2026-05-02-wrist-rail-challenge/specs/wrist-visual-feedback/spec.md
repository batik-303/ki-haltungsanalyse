## MODIFIED Requirements

### Requirement: Yellow dashed line on deviation
The system SHALL render a yellow dashed line from the wrist anchor to the MCP position when the effective angle deviation exceeds the deadzone threshold. The line represents the "broken" segment of the rail, showing where the hand has departed from the forearm axis.

#### Scenario: Deviation above deadzone
- **WHEN** the effective angleDiff exceeds the deadzone
- **THEN** a yellow dashed line is drawn from wrist to MCP, with intensity scaling from subtle (at deadzone boundary) to strong (at 30°+)

#### Scenario: Within deadzone
- **WHEN** the effective angleDiff is within the deadzone
- **THEN** the yellow break line is NOT rendered; the continuous rail line is shown instead

### Requirement: No visual clutter in correct state
When the wrist is within the deadzone, the system SHALL render the complete rail line (forearm extension + hand segment) and the sapphire anchor. The rail line provides continuous orientation feedback.

#### Scenario: Perfect posture
- **WHEN** wrist is within deadzone throughout a session segment
- **THEN** the rail line (grey forearm extension + blue hand line) and sapphire anchor are visible
- **AND** no yellow break lines or warning indicators are shown

### Requirement: Synchronized peripheral side-view
The peripheral side-view SHALL always display the arm-hand alignment, including in the correct state. It SHALL show the arm line, anchor, and hand line at all times — not only during deviation.

#### Scenario: Correct posture in side-view
- **WHEN** the wrist is within deadzone
- **THEN** the side-view shows a straight vertical arm line, anchor at center, and straight hand line above (blue/grey)

#### Scenario: Deviation shown in both views
- **WHEN** the main overlay shows a yellow break line at 15° inward
- **THEN** the side-view shows a hand line angled at 15° in the same direction with yellow color

#### Scenario: Anchor glow synchronized
- **WHEN** the main overlay anchor glows on return
- **THEN** the side-view anchor glows simultaneously with the same intensity

## ADDED Requirements

### Requirement: Always-visible rail line
The system SHALL render a continuous rail line after calibration, consisting of two segments: (1) a grey forearm extension line from the wrist backward along the Elbow→Wrist direction, and (2) a blue hand segment from wrist toward MCP along the same axis.

#### Scenario: Rail visible immediately after calibration
- **WHEN** the MasterPrint is captured and tracking begins
- **THEN** the rail line is rendered on the canvas overlay

#### Scenario: Rail follows arm movement
- **WHEN** the player changes arm position (e.g., position change on the instrument)
- **THEN** the rail line follows the wrist position and updates direction based on the smoothed forearm vector

#### Scenario: Rail in analyse mode only
- **WHEN** the view mode is 'flow' (black background)
- **THEN** the rail line is NOT rendered; only the anchor is shown at the screen edge

### Requirement: Forearm extension line styling
The forearm extension segment SHALL be rendered as a subtle grey line extending from the wrist backward along the forearm axis by 0.5× the screen-space forearm length.

#### Scenario: Extension line appearance
- **WHEN** the rail is rendered
- **THEN** the forearm extension is a solid grey line with low opacity (α ≈ 0.3) and line width of 2-3px

### Requirement: Hand segment styling
The hand segment from wrist toward MCP SHALL be rendered as a blue line in the correct state, transitioning to yellow dashed when the hand deviates from the rail.

#### Scenario: Correct state appearance
- **WHEN** angleDiff is within deadzone
- **THEN** the hand segment is a solid sapphire-blue line (matching anchor color) with moderate opacity

#### Scenario: Deviation state appearance
- **WHEN** angleDiff exceeds deadzone
- **THEN** the hand segment becomes yellow dashed, with width and opacity scaling with deviation intensity

### Requirement: Rail-break perpendicular indicator
When the hand deviates, the system SHALL render a subtle perpendicular indicator line from MCP to the rail axis, showing the shortest distance back to correct alignment.

#### Scenario: Perpendicular shown on deviation
- **WHEN** angleDiff exceeds the deadzone
- **THEN** a thin dotted line is drawn from MCP perpendicular to the rail axis line

#### Scenario: Perpendicular hidden when correct
- **WHEN** angleDiff is within deadzone
- **THEN** no perpendicular indicator is rendered

### Requirement: 5-second challenge golden flash on anchor
The sapphire anchor SHALL emit a golden glow when the 5-second challenge timer completes, distinct from the existing sapphire return glow.

#### Scenario: Challenge success flash
- **WHEN** the decay timer reaches 5.0 seconds
- **THEN** the anchor emits a golden flash (#FFD700) decaying over 600ms

#### Scenario: Challenge flash in side-view
- **WHEN** the challenge completes
- **THEN** the side-view anchor also emits the golden flash synchronously

### Requirement: Side-view always shows alignment
The side-view SHALL render the arm line and hand line at all times (not only during deviation), providing continuous peripheral alignment feedback.

#### Scenario: Straight posture in side-view
- **WHEN** the wrist is within deadzone
- **THEN** the side-view renders a straight arm line (bottom), anchor (center), and straight hand line (top) in blue/grey

#### Scenario: Side-view updates direction immediately
- **WHEN** the wrist deviates beyond deadzone
- **THEN** the side-view hand line angles away from straight within 1-2 frames
