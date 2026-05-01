## ADDED Requirements

### Requirement: View mode state
The system SHALL maintain a `viewMode` state with values `flow` or `analyse`. The default value SHALL be `analyse`.

#### Scenario: Default view mode
- **WHEN** the app starts or a new session begins
- **THEN** the view mode SHALL be `analyse`

#### Scenario: View mode persists during session
- **WHEN** the user switches view mode during an active session
- **THEN** the session, analysis, and tension tracking SHALL continue uninterrupted

### Requirement: Voice command switching
The system SHALL support voice commands "Flow" and "Analyse" to switch between view modes during an active session.

#### Scenario: Switch to flow via voice
- **WHEN** the user says "Flow" during an active session
- **THEN** the view mode SHALL change to `flow`

#### Scenario: Switch to analyse via voice
- **WHEN** the user says "Analyse" during an active session
- **THEN** the view mode SHALL change to `analyse`

#### Scenario: Voice commands respect cooldown
- **WHEN** the user says the same view mode command within the existing cooldown period
- **THEN** the command SHALL be ignored (existing cooldown behavior)

### Requirement: Mode indicator
The system SHALL display a small mode indicator so the user knows which view mode is active.

#### Scenario: Indicator visible in both modes
- **WHEN** a session is active in either view mode
- **THEN** a small label ("Flow" or "Analyse") SHALL be visible at the screen edge
