## ADDED Requirements

### Requirement: Home screen displays instrument cards
The home screen SHALL display a card for each available instrument. Currently only violin is available.

#### Scenario: Single instrument displayed
- **WHEN** the home screen renders
- **THEN** a card for "Violine" with a violin icon is visible

### Requirement: Instrument card shows name and description
Each instrument card SHALL display the instrument name, an icon, and a brief description of the analysis capability.

#### Scenario: Violin card content
- **WHEN** the violin card renders
- **THEN** it shows the name "Violine", a violin icon, and a description like "Haltungsanalyse für Geiger"

### Requirement: Clicking an instrument navigates to setup
Clicking an instrument card SHALL call `goToSetup` with the instrument identifier and navigate to the setup screen.

#### Scenario: Select violin
- **WHEN** user clicks the violin instrument card
- **THEN** `appScreen` becomes `'setup'` with instrument set to `'violin'`

### Requirement: Future instruments are extensible
The instrument list SHALL be defined as a data array so new instruments can be added by appending to the array.

#### Scenario: Adding a new instrument
- **WHEN** a developer adds a new entry to the instruments array
- **THEN** a new card appears on the home screen without other code changes

### Requirement: App title and branding on home screen
The home screen SHALL display the "Blue Anchor" brand name and "KI-Haltungsanalyse" subtitle.

#### Scenario: Branding visible
- **WHEN** the home screen renders
- **THEN** "Blue Anchor" and "KI-Haltungsanalyse" are visible as heading elements
