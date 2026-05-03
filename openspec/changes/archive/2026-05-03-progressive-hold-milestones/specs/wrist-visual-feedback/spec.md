## MODIFIED Requirements

### Requirement: Golden flash on sapphire anchor
The sapphire anchor SHALL emit a golden flash when a hold milestone is achieved (railSuccessGlow > 0). The flash SHALL render exclusively on the anchor — not on the hand/rail line.

#### Scenario: Milestone success triggers flash
- **WHEN** railSuccessGlow > 0
- **THEN** the anchor renders with a golden (#FFD700) glow ring whose alpha equals railSuccessGlow

#### Scenario: Flash decay
- **WHEN** the success event occurred and no new success fires
- **THEN** railSuccessGlow decays from 1.0 to 0.0 over 600ms

#### Scenario: No golden flash on hand line
- **WHEN** a milestone is achieved
- **THEN** the hand/rail line in `drawWristLines()` SHALL NOT render any golden glow effect
