## ADDED Requirements

### Requirement: Video fills the viewport
The session screen SHALL render the video feed and canvas overlay to fill the entire browser viewport.

#### Scenario: Fullscreen video
- **WHEN** the session screen renders
- **THEN** the video element and canvas overlay cover the full viewport width and height

### Requirement: HUD elements are edge-docked and translucent
All UI elements on the session screen SHALL be absolutely positioned at viewport edges with semi-transparent backgrounds. They SHALL NOT block the center of the video.

#### Scenario: HUD positioning
- **WHEN** the session screen is active
- **THEN** the mode badge is at the top-left, session timer at the top-right, tension bar at the bottom-left, and voice hint at the bottom-right

### Requirement: Session phase display
The session screen SHALL show context-appropriate hints based on the current phase.

#### Scenario: Positioning phase
- **WHEN** masterPrint is null and distanceOk is false
- **THEN** the voice hint shows "Positioniere dich vor der Kamera"

#### Scenario: Ready to calibrate phase
- **WHEN** masterPrint is null and distanceOk is true
- **THEN** the voice hint shows "Sage 'Kalibrieren' wenn bereit"

#### Scenario: Calibrating phase
- **WHEN** isCalibrating is true
- **THEN** a countdown overlay is displayed

#### Scenario: Ready to start phase
- **WHEN** masterPrint exists and sessionActive is false
- **THEN** the voice hint shows "Sage 'Start' um die Session zu starten"

#### Scenario: Tracking phase
- **WHEN** sessionActive is true
- **THEN** the session timer runs, the voice hint shows "Sage 'Stop' zum Beenden"

### Requirement: Mode badge displays current focus mode
A badge in the top-left corner SHALL show the current focus mode icon and name.

#### Scenario: Violin mode badge
- **WHEN** focusMode is `'violin'`
- **THEN** the badge shows "🎻 Geige"

### Requirement: Session timer in tracking phase
A timer in the top-right corner SHALL display elapsed session time in `M:SS` format during the tracking phase.

#### Scenario: Timer display
- **WHEN** sessionActive is true and 90 seconds have elapsed
- **THEN** the timer shows "1:30"

#### Scenario: Timer hidden before tracking
- **WHEN** sessionActive is false
- **THEN** the timer is not displayed

### Requirement: Tension progress bar
A progress indicator at the bottom-left SHALL show the current tension score as a colored bar.

#### Scenario: Tension display
- **WHEN** tensionScore is 35
- **THEN** the progress bar shows approximately 35% fill with the appropriate layer color

### Requirement: Manual button fallbacks
The session screen SHALL display translucent fallback buttons at the bottom edge for each available voice command in the current phase.

#### Scenario: Fallback buttons in ready-to-calibrate phase
- **WHEN** distanceOk is true and masterPrint is null
- **THEN** a translucent "Kalibrieren" button is visible

#### Scenario: Fallback buttons in tracking phase
- **WHEN** sessionActive is true
- **THEN** translucent "Stop" and "Neu kalibrieren" buttons are visible
