## ADDED Requirements

### Requirement: Yellow dashed line on deviation
The system SHALL render a yellow dashed line from the wrist anchor to the MCP position when the effective angle deviation exceeds the deadzone threshold. The line represents the "broken" segment of the rail, showing where the hand has departed from the forearm axis.

#### Scenario: Deviation above deadzone
- **WHEN** the effective angleDiff exceeds the deadzone
- **THEN** a yellow dashed line is drawn from wrist to MCP, with intensity scaling from subtle (at deadzone boundary) to strong (at 30°+)

#### Scenario: Within deadzone
- **WHEN** the effective angleDiff is within the deadzone
- **THEN** the yellow break line is NOT rendered; the continuous rail line is shown instead

### Requirement: Line follows hand movement
All visual markings (anchor, lines) SHALL be rendered at the tracked landmark positions, following the hand as the musician moves.

#### Scenario: Musician shifts position
- **WHEN** the user moves their arm to a different position on camera
- **THEN** anchor and feedback lines move with the tracked wrist/MCP landmarks in real-time

### Requirement: Anchor glow on return
The sapphire anchor SHALL emit a glow effect when the user returns from a deviation to the correct position.

#### Scenario: Return to correct posture
- **WHEN** the user corrects their wrist angle back within deadzone after a deviation
- **THEN** the anchor emits a sapphire glow flash that decays over 350ms

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

### Requirement: Side-view abstraction level
The side-view SHALL use a fixed vertical arm line with the anchor at center and an angled hand line above, rendered within a semi-transparent pill background. It SHALL NOT attempt to replicate exact pixel positions from the main view.

#### Scenario: Visual consistency
- **WHEN** the side-view renders
- **THEN** it shows: vertical arm (bottom), sapphire anchor (center), angled hand line (top), within a rounded pill background

### Requirement: Always-visible rail line
The system SHALL render the forearm-extension rail line at all times when in wrist mode, including when the wrist is in the correct position. This provides continuous spatial reference for the player.

#### Scenario: Rail visible in correct state
- **WHEN** the wrist angleDiff is within deadzone
- **THEN** the rail line extends backward from the wrist along the smoothed forearm direction, rendered in grey (α=0.3, 2.5px)

#### Scenario: Rail visible during deviation
- **WHEN** the wrist angleDiff exceeds the deadzone
- **THEN** the rail line extends backward from the wrist as a ghost reference, and the hand segment renders as a yellow break line

### Requirement: Forearm extension styling
The forearm extension line (backward from wrist) SHALL be rendered as a solid grey line with low opacity (α=0.3) and 2.5px width, extending 2.5× the arm segment length in the smoothed forearm direction.

#### Scenario: Extension length
- **WHEN** the arm segment (Elbow→Wrist) is L pixels long
- **THEN** the extension line from the wrist extends 2.5×L in the opposite direction of the Elbow→Wrist vector

### Requirement: Hand segment styling
The hand segment (Wrist→MCP) SHALL render as a solid blue line (sapphire color) when within deadzone, and as a yellow dashed line when deviating.

#### Scenario: Correct hand position
- **WHEN** the angleDiff is within deadzone
- **THEN** the hand segment renders as solid sapphire-blue (#3B82F6) at 3px width

#### Scenario: Deviated hand position
- **WHEN** the angleDiff exceeds deadzone
- **THEN** the hand segment renders as dashed yellow (#FACC15) at 2.5px width with dash pattern [6,4]

### Requirement: Rail-break perpendicular indicator
When the wrist deviates, the system SHALL draw a perpendicular line from MCP to the nearest point on the rail line, showing the distance of departure from the ideal axis.

#### Scenario: Break indicator on deviation
- **WHEN** the angleDiff exceeds deadzone
- **THEN** a thin line (1px, rgba(250,204,21,0.4)) is drawn from MCP perpendicular to the rail line, with a small endpoint dot

#### Scenario: No break indicator in correct state
- **WHEN** the angleDiff is within deadzone
- **THEN** no perpendicular indicator is rendered

### Requirement: Golden flash on sapphire anchor
The sapphire anchor SHALL emit a golden flash when a hold milestone is achieved (railSuccessGlow > 0). The flash SHALL render exclusively on the anchor — not on the hand/rail line.

#### Scenario: Milestone success triggers flash
- **WHEN** railSuccessGlow > 0
- **THEN** the anchor renders with a golden (#FFD700) glow ring whose alpha equals railSuccessGlow

#### Scenario: Flash decay
- **WHEN** the success event occurred and no new success fires
- **THEN** railSuccessGlow decays from 1.0 to 0.0 over 600ms

#### Scenario: No golden flash on hand line
- **WHEN** a milestone is achieved
- **THEN** the hand/rail line in `drawWristLines()` SHALL NOT render any golden glow effect

### Requirement: Side-view always shows alignment
The wrist side-view SHALL always render the arm line and hand line, including in the correct state. Previously the side-view only rendered during deviation.

#### Scenario: Correct posture side-view
- **WHEN** the wrist is within deadzone
- **THEN** the side-view renders a vertical blue arm line and a straight blue hand line above the anchor

#### Scenario: Deviation side-view with ghost rail
- **WHEN** the wrist deviates beyond deadzone
- **THEN** the side-view renders a grey dashed ghost rail (straight vertical) alongside the yellow angled hand line
