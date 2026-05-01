## ADDED Requirements

### Requirement: Yellow dashed line on deviation
The system SHALL render a yellow dashed line from the wrist anchor to the MCP position when the flexion angle deviates beyond the deadzone threshold.

#### Scenario: Deviation above deadzone
- **WHEN** flexion angleDiff exceeds the deadzone (10°)
- **THEN** a yellow dashed line is drawn from wrist to MCP on the canvas overlay

#### Scenario: Within deadzone
- **WHEN** flexion angleDiff is within the deadzone (≤10°)
- **THEN** no yellow line is rendered; only the anchor is visible

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
When the wrist is within the deadzone, the system SHALL render only the sapphire anchor with no additional lines or indicators.

#### Scenario: Perfect posture
- **WHEN** wrist is within deadzone throughout a session segment
- **THEN** only the pulsing sapphire anchor is visible on the hand

### Requirement: Synchronized peripheral side-view
The peripheral side-view (left screen edge) SHALL display a simplified representation showing the same elements as the main overlay: arm line, anchor, and angled hand line with matching deviation direction.

#### Scenario: Deviation shown in both views
- **WHEN** the main overlay shows a yellow dashed line at 15° inward
- **THEN** the side-view shows a hand line angled at 15° in the same direction with yellow color

#### Scenario: Anchor glow synchronized
- **WHEN** the main overlay anchor glows on return
- **THEN** the side-view anchor glows simultaneously with the same intensity

### Requirement: Side-view abstraction level
The side-view SHALL use a fixed vertical arm line with the anchor at center and an angled hand line above, rendered within a semi-transparent pill background. It SHALL NOT attempt to replicate exact pixel positions from the main view.

#### Scenario: Visual consistency
- **WHEN** the side-view renders
- **THEN** it shows: vertical arm (bottom), sapphire anchor (center), angled hand line (top), within a rounded pill background
