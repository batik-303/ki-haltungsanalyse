## ADDED Requirements

### Requirement: Semi-transparent dark panel behind warnings
All warning text and correction hints SHALL be rendered on a semi-transparent dark panel (~60% opacity) positioned in the top-left of the video frame, ensuring readability on any background.

#### Scenario: Warnings readable on bright background
- **WHEN** warnings are displayed and the camera shows a bright/white scene
- **THEN** the dark panel behind the text provides sufficient contrast for all text to be clearly readable

#### Scenario: Panel size adapts to content
- **WHEN** there are 3 active warnings
- **THEN** the dark panel extends vertically to fit all warning text and correction hints

#### Scenario: Panel when no warnings
- **WHEN** all posture checks pass
- **THEN** the panel still shows the "Haltung OK" status and current mode indicator

### Requirement: Mode indicator in warning panel
The warning panel SHALL always display the currently selected check mode at the top of the panel.

#### Scenario: Mode displayed above warnings
- **WHEN** warnings exist and mode is set
- **THEN** the mode name appears as the first line in the panel, above any warnings

### Requirement: Status bar with dark background
The bottom status bar SHALL use a solid colored background (green/orange/red based on severity) as it does today, but the text SHALL be rendered with sufficient padding and sizing for readability.

#### Scenario: Status bar color reflects worst severity
- **WHEN** at least one "stark" warning exists
- **THEN** the status bar background is red
