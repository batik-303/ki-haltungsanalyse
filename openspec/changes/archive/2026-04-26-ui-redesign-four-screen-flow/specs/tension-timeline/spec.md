## ADDED Requirements

### Requirement: Session tracker records tension timeline
The session tracker SHALL sample `{ t, tension, layer }` at approximately 1Hz (once per second) during an active session.

#### Scenario: Timeline sampling during session
- **WHEN** a session is active for 10 seconds
- **THEN** approximately 10 timeline entries are recorded

### Requirement: Timeline entry data shape
Each timeline entry SHALL contain: `t` (seconds since session start, number), `tension` (tension score 0-100, number), and `layer` (current layer classification, Layer type).

#### Scenario: Entry structure
- **WHEN** a timeline entry is recorded at 5 seconds with tension 23 in flow layer
- **THEN** the entry is `{ t: 5, tension: 23, layer: 'flow' }`

### Requirement: Timeline included in session stats
When the session ends, the `SessionStats` type SHALL include a `tensionTimeline` field containing the recorded array.

#### Scenario: Stats include timeline
- **WHEN** a 5-minute session ends
- **THEN** `SessionStats.tensionTimeline` contains approximately 300 entries

### Requirement: Timeline available in store during session
The store SHALL expose the current tension timeline array so the results screen can access it after session end.

#### Scenario: Timeline accessible
- **WHEN** `goToResults(stats)` is called
- **THEN** the stats object passed includes the tension timeline

### Requirement: Sampling does not degrade performance
Timeline sampling at 1Hz SHALL NOT add measurable overhead to the per-frame analysis loop (which runs at ~30Hz).

#### Scenario: Minimal overhead
- **WHEN** the analysis loop runs at 30fps
- **THEN** only 1 out of every ~30 frames triggers a timeline push, with negligible cost
