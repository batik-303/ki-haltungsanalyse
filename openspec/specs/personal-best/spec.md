## ADDED Requirements

### Requirement: Personal best streak persisted in IndexedDB
The system SHALL store `maxFlowStreak` (in seconds) as part of the `StoredSession` record in IndexedDB. The personal best is derived by querying the maximum `maxFlowStreak` across all stored sessions.

#### Scenario: Max streak saved with session
- **WHEN** a session ends and stats are saved to IndexedDB
- **THEN** the `StoredSession` record SHALL include a `maxFlowStreak` field with the session's highest streak value in seconds

#### Scenario: Personal best derived from stored sessions
- **WHEN** the app queries for the personal best streak
- **THEN** it SHALL return the maximum `maxFlowStreak` value across all `StoredSession` records

#### Scenario: No sessions stored yet
- **WHEN** no sessions exist in IndexedDB
- **THEN** the personal best SHALL be 0

### Requirement: Record celebration at session end
The system SHALL detect when a session's max streak exceeds the previous personal best and trigger a celebration effect. The celebration SHALL only appear on the results screen, never during active playing.

#### Scenario: New personal best detected
- **WHEN** a session ends and `maxFlowStreak` exceeds the previous personal best across all other stored sessions
- **THEN** a gold anchor flash animation SHALL play on the results screen

#### Scenario: No new record
- **WHEN** a session ends and `maxFlowStreak` does not exceed the previous personal best
- **THEN** no celebration effect SHALL be triggered

#### Scenario: Celebration never during session
- **WHEN** the user is on the session screen (actively playing)
- **THEN** no record celebration SHALL be displayed regardless of streak status
