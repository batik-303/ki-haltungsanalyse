## ADDED Requirements

### Requirement: Setup screen shows focus mode selection
The setup screen SHALL display focus mode options as selectable cards: Geige, Handgelenk, Schulter. The default selection SHALL be `'violin'`.

#### Scenario: Mode cards displayed
- **WHEN** the setup screen renders
- **THEN** three mode cards are visible with icons and names: 🎻 Geige, 🤚 Handgelenk, 💪 Schulter

#### Scenario: Select a mode
- **WHEN** user clicks the "Handgelenk" card
- **THEN** that card is visually selected and `focusMode` in the store is updated to `'wrist'`

### Requirement: Setup screen shows sensitivity selection
The setup screen SHALL display sensitivity options: Profi (locker), Standard, Anfänger (streng). Default selection SHALL be `'med'` (Standard).

#### Scenario: Sensitivity options displayed
- **WHEN** the setup screen renders
- **THEN** three sensitivity options are visible as a radio group or segmented control

#### Scenario: Select sensitivity
- **WHEN** user selects "Anfänger (streng)"
- **THEN** `sensitivity` in the store is updated to `'high'`

### Requirement: Setup screen has start session button
The setup screen SHALL display a prominent "Session starten" button that navigates to the session screen.

#### Scenario: Start session
- **WHEN** user clicks "Session starten"
- **THEN** `goToSession()` is called and `appScreen` becomes `'session'`

### Requirement: Setup screen shows selected instrument context
The setup screen SHALL display the selected instrument name in the header area so the user knows which instrument they are configuring.

#### Scenario: Instrument context shown
- **WHEN** the setup screen renders after selecting violin
- **THEN** "Violine" is displayed in the header area

### Requirement: Back navigation to home
The setup screen SHALL have a back button or link that navigates to the home screen.

#### Scenario: Navigate back
- **WHEN** user clicks the back button
- **THEN** `goHome()` is called and `appScreen` becomes `'home'`
