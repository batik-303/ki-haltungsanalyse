## ADDED Requirements

### Requirement: Live mode switching via keyboard
The system SHALL support switching between posture check modes by pressing keys 0–5 during the live video feed without restarting the application.

- Key `0`: All checks active (default mode)
- Key `1`: Kopfneigung only
- Key `2`: Schulter-Asymmetrie only
- Key `3`: Handgelenk links only
- Key `4`: Ellbogen rechts only
- Key `5`: Schulter-Protraktion only

#### Scenario: Switch to single-check mode
- **WHEN** user presses key `3` during live feed
- **THEN** only the Handgelenk links check runs and only its warnings are displayed

#### Scenario: Return to all-checks mode
- **WHEN** user presses key `0` while in single-check mode
- **THEN** all 5 posture checks run and all warnings are displayed

#### Scenario: Default mode on startup
- **WHEN** the application starts
- **THEN** all checks are active (mode 0)

### Requirement: Current mode indicator on screen
The system SHALL display the currently active mode name on the video feed so the user always knows which check is selected.

#### Scenario: Mode label visible in single-check mode
- **WHEN** user is in mode 3 (Handgelenk links)
- **THEN** the text "Modus: Handgelenk links" is displayed on the warning panel

#### Scenario: Mode label in all-checks mode
- **WHEN** user is in mode 0
- **THEN** the text "Modus: Alle Checks" is displayed on the warning panel

### Requirement: Single-check mode dims irrelevant skeleton segments
When a single check is selected, the skeleton SHALL show all joints but dim segments not relevant to the active check to gray. Only the joints involved in the active check SHALL be rendered in full color.

#### Scenario: Relevant joints highlighted in single-check mode
- **WHEN** mode is 4 (Ellbogen rechts)
- **THEN** right shoulder, right elbow, and right wrist joints and their connecting lines are rendered in full color, and all other skeleton segments are rendered in gray

#### Scenario: All segments full color in all-checks mode
- **WHEN** mode is 0
- **THEN** all skeleton segments are rendered in their normal body-region colors
