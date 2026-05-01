## ADDED Requirements

### Requirement: HUD elements fade during flow state
All HUD overlay elements on the session screen (badges, buttons, tension bar, timer) SHALL reduce to 20% opacity when the musician is in a sustained flow state, minimizing visual distraction.

#### Scenario: HUD fades when tension is low
- **WHEN** `tensionScore < 5` for more than 2 seconds
- **THEN** all HUD elements SHALL transition to `opacity: 0.2` over 700ms

#### Scenario: HUD returns when tension rises
- **WHEN** `tensionScore >= 5` after being in a faded state
- **THEN** all HUD elements SHALL transition back to full opacity over 300ms (faster restore than fade)

#### Scenario: HUD visible during calibration phase
- **WHEN** the session is in `pre-calibration` or `ready-to-start` phase
- **THEN** HUD elements SHALL remain at full opacity regardless of tension score

#### Scenario: HUD visible when session not active
- **WHEN** no `masterPrint` is calibrated
- **THEN** HUD elements SHALL remain at full opacity
