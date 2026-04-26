## ADDED Requirements

### Requirement: Multi-command voice dispatcher
The voice control hook SHALL accept a command map of keyword-to-callback pairs and invoke the matching callback when a keyword is recognized in speech.

#### Scenario: Command matching
- **WHEN** the user says "Kalibrieren" and a command map entry exists for `"kalibrieren"`
- **THEN** the corresponding callback is invoked

### Requirement: German language recognition
The speech recognition SHALL use `lang: 'de-DE'` for German language processing.

#### Scenario: German speech recognized
- **WHEN** the user speaks German words
- **THEN** the speech recognition processes them correctly as German

### Requirement: Calibration voice command
The keyword `"kalibrieren"` or `"calibrate"` SHALL trigger the calibration callback.

#### Scenario: Voice calibration trigger
- **WHEN** the user says "Kalibrieren"
- **THEN** the calibration countdown starts

### Requirement: Start session voice command
The keywords `"start"` or `"los"` SHALL trigger the session start callback.

#### Scenario: Voice start trigger
- **WHEN** the user says "Start" after calibration
- **THEN** the tracked session begins

### Requirement: Stop session voice command
The keywords `"stop"`, `"stopp"`, or `"ende"` SHALL trigger the session stop callback.

#### Scenario: Voice stop trigger
- **WHEN** the user says "Stop" during an active session
- **THEN** the session ends and transitions to the results screen

### Requirement: Recalibrate voice command
The keywords `"neu"` or `"nochmal"` SHALL trigger the recalibration callback.

#### Scenario: Voice recalibrate trigger
- **WHEN** the user says "Neu" during a session
- **THEN** recalibration starts

### Requirement: Voice activation on session screen
Voice recognition SHALL automatically activate when the session screen is entered and deactivate when leaving.

#### Scenario: Auto-activate on session entry
- **WHEN** the user navigates to the session screen
- **THEN** voice recognition starts listening

#### Scenario: Auto-deactivate on session exit
- **WHEN** the user navigates away from the session screen
- **THEN** voice recognition stops

### Requirement: Graceful fallback when unsupported
If the browser does not support the Web Speech API, voice commands SHALL be silently unavailable. Manual button fallbacks SHALL remain functional.

#### Scenario: No speech API available
- **WHEN** `window.SpeechRecognition` and `window.webkitSpeechRecognition` are both undefined
- **THEN** voice recognition does not activate and no error is shown to the user
