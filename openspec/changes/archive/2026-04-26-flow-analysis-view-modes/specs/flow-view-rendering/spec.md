## ADDED Requirements

### Requirement: Black background in flow mode
The system SHALL fill the canvas with a black background in flow mode instead of showing the camera feed.

#### Scenario: Camera feed hidden
- **WHEN** view mode is `flow`
- **THEN** the video element SHALL be visually hidden and the canvas SHALL be filled with black

#### Scenario: Camera feed restored
- **WHEN** view mode switches from `flow` to `analyse`
- **THEN** the video element SHALL be visible again with full camera overlay

### Requirement: Only schematic side-view in flow mode
In flow mode, the system SHALL render only the schematic side-view element and essential feedback indicators (anchor, return glow). Body silhouette, overlay lines, and detail elements SHALL NOT be rendered.

#### Scenario: Wrist mode in flow
- **WHEN** view mode is `flow` and focus mode is `wrist`
- **THEN** only the wrist side-view, sapphire anchor, and return glow SHALL be rendered on the black canvas

#### Scenario: No silhouette in flow
- **WHEN** view mode is `flow`
- **THEN** the body silhouette SHALL NOT be drawn

#### Scenario: No detail lines in flow
- **WHEN** view mode is `flow`
- **THEN** the body-overlay wrist lines (elbow→wrist→index) SHALL NOT be drawn

### Requirement: Modes without side-view fall back gracefully
For focus modes that do not yet have a schematic side-view (shoulder, violin), the system SHALL render a simple tension indicator in flow mode.

#### Scenario: Shoulder mode in flow without side-view
- **WHEN** view mode is `flow` and focus mode is `shoulder`
- **THEN** the system SHALL render the sapphire anchor at a fixed screen position with color reflecting tension

#### Scenario: Violin mode in flow without side-view
- **WHEN** view mode is `flow` and focus mode is `violin`
- **THEN** the system SHALL render the sapphire anchor at a fixed screen position with color reflecting tension

### Requirement: Analysis continues in flow mode
MediaPipe detection and all analysis computations SHALL continue running in flow mode. Only the rendering output changes.

#### Scenario: Tension tracking in flow
- **WHEN** view mode is `flow` and the user moves into bad posture
- **THEN** the tension score SHALL update correctly and the side-view SHALL reflect the tension via color, thickness, and bend angle
