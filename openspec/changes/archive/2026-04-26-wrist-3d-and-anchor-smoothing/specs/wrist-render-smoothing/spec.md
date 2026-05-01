## ADDED Requirements

### Requirement: Smoothed landmark positions for wrist rendering
The system SHALL apply One-Euro filtering to all wrist-mode landmark positions (elbow, wrist, index finger) before rendering.

#### Scenario: Stationary hand produces stable anchor
- **WHEN** the player holds their hand still
- **THEN** the Sapphire anchor and wrist lines SHALL remain visually stable with no perceptible jitter

#### Scenario: Fast hand movement has minimal lag
- **WHEN** the player moves their hand quickly
- **THEN** the rendered anchor and lines SHALL follow the movement with no perceptible lag (One-Euro adaptive cutoff)

#### Scenario: Filter state resets on mode or calibration change
- **WHEN** the user recalibrates or switches focus mode
- **THEN** the render filters SHALL reset to avoid stale filter state affecting new positions

### Requirement: Analysis uses raw landmarks
The wrist analysis pipeline SHALL continue to use unfiltered landmark positions. Filtering SHALL only apply to the rendering pipeline.

#### Scenario: Tension reacts immediately to movement
- **WHEN** the player moves their wrist
- **THEN** the tension computation SHALL use raw landmark values, not smoothed render values
