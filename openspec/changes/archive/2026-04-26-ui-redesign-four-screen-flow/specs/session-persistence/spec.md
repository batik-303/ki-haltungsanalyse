## ADDED Requirements

### Requirement: IndexedDB store for sessions
The system SHALL use IndexedDB (via `idb-keyval` or equivalent) to persist session results with a unique key per session.

#### Scenario: Store initialization
- **WHEN** the app loads
- **THEN** an IndexedDB database named `blue-anchor` is available for read/write

### Requirement: Session result data shape
Each stored session SHALL contain: `id` (UUID), `timestamp`, `instrument`, `focusMode`, `sensitivity`, `durationMs`, `zones` (ZoneCounters), `zonePercentages`, and `tensionTimeline` (array of `{t, tension, layer}` sampled at 1Hz).

#### Scenario: Complete data stored
- **WHEN** a session ends with valid stats
- **THEN** all fields are populated and persisted to IndexedDB

### Requirement: Save session on end
When a tracked session ends (voice "Stop" or manual button), the session result SHALL be saved to IndexedDB before transitioning to the results screen.

#### Scenario: Session saved on stop
- **WHEN** user says "Stop" to end a session
- **THEN** the session result is persisted to IndexedDB and then the results screen loads

### Requirement: Load latest session for results
The results screen SHALL load the most recently saved session from IndexedDB to display.

#### Scenario: Results screen loads data
- **WHEN** the results screen renders
- **THEN** it displays data from the most recently saved session

### Requirement: Storage is local only
All data SHALL remain in the browser's local IndexedDB. No data SHALL be sent to any server.

#### Scenario: No network requests for persistence
- **WHEN** a session is saved or loaded
- **THEN** no HTTP requests are made
