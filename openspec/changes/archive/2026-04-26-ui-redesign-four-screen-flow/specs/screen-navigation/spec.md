## ADDED Requirements

### Requirement: App screen state type
The system SHALL define an `AppScreen` type as a union of `'home' | 'setup' | 'session' | 'results'`.

#### Scenario: Type definition exists
- **WHEN** the app is compiled
- **THEN** the `AppScreen` type is available in `src/core/types.ts`

### Requirement: Store tracks current screen
The Zustand store SHALL contain an `appScreen` field of type `AppScreen`, initialized to `'home'`.

#### Scenario: Initial app load
- **WHEN** the app loads for the first time
- **THEN** `appScreen` is `'home'`

### Requirement: Navigation actions in store
The store SHALL provide navigation actions: `goToSetup(instrument)`, `goToSession()`, `goToResults(stats)`, and `goHome()`.

#### Scenario: Navigate from home to setup
- **WHEN** `goToSetup('violin')` is called
- **THEN** `appScreen` becomes `'setup'` and the selected instrument is stored

#### Scenario: Navigate from setup to session
- **WHEN** `goToSession()` is called
- **THEN** `appScreen` becomes `'session'` and analysis state is reset

#### Scenario: Navigate from session to results
- **WHEN** `goToResults(stats)` is called with session stats
- **THEN** `appScreen` becomes `'results'` and session stats are available for display

#### Scenario: Navigate home from any screen
- **WHEN** `goHome()` is called
- **THEN** `appScreen` becomes `'home'` and all transient state (masterPrint, session, tension) is reset

### Requirement: App renders screen based on store state
`App.tsx` SHALL render exactly one screen component based on the current `appScreen` value.

#### Scenario: Screen rendering
- **WHEN** `appScreen` is `'home'`
- **THEN** the HomeScreen component is rendered
- **WHEN** `appScreen` is `'setup'`
- **THEN** the SetupScreen component is rendered
- **WHEN** `appScreen` is `'session'`
- **THEN** the SessionScreen component is rendered
- **WHEN** `appScreen` is `'results'`
- **THEN** the ResultsScreen component is rendered

### Requirement: Back navigation from setup
The setup screen SHALL provide a back button that calls `goHome()`.

#### Scenario: User goes back from setup
- **WHEN** user clicks the back button on the setup screen
- **THEN** `appScreen` becomes `'home'`
