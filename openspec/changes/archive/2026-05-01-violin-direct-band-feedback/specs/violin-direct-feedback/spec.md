## ADDED Requirements

### Requirement: Blue wrist marker follows hand in real-time
The violin rendering branch SHALL draw a blue circular marker at the current live wrist position (LEFT_WRIST landmark 15, both X and Y axes) every frame. The marker MUST be visible regardless of tension level or deadzone state.

#### Scenario: Marker tracks wrist movement freely
- **WHEN** violin mode is active and calibrated
- **THEN** a blue filled circle (≈8px radius, color `#2196F3`, alpha 0.7) is drawn at the current wrist screen coordinates

#### Scenario: Marker visible in deadzone
- **WHEN** tension is 0 (wrist near calibrated position)
- **THEN** the blue marker is still drawn at the wrist position (overlapping with anchor)

### Requirement: Sapphire anchor remains at calibrated position
The sapphire anchor SHALL be drawn at the calibrated wrist position (`calibWristX`, `calibWristY`) and MUST NOT move during a session. The anchor SHALL glow with streak feedback when tension is in deadzone.

#### Scenario: Anchor glows during good posture
- **WHEN** tension ≤ 10 (deadzone) and flowStreak > 0
- **THEN** the sapphire anchor is drawn with streak-enhanced glow at the calibrated position

#### Scenario: Anchor stops glowing during deviation
- **WHEN** tension > 10
- **THEN** the sapphire anchor is drawn at calibrated position without streak glow

### Requirement: Yellow rubber band connects anchor to wrist marker
When the wrist deviates beyond the deadzone, a yellow elastic band SHALL be drawn from the sapphire anchor to the live wrist marker. The band MUST always be yellow regardless of drift direction (sinking or rising).

#### Scenario: Band appears on deviation
- **WHEN** tension > 10 (outside deadzone)
- **THEN** a yellow band (`#FFD700` core, `#DAA520` glow) is drawn from anchor position to live wrist position

#### Scenario: Band invisible in deadzone
- **WHEN** tension ≤ 10
- **THEN** no band is drawn between anchor and wrist marker

#### Scenario: Band thickness scales with tension
- **WHEN** tension increases from 10 to 100
- **THEN** band lineWidth scales from 3px to 14px proportionally

#### Scenario: Direction arrow at band end
- **WHEN** tension > 10
- **THEN** a directional arrow (▼ for sinking, ▲ for rising) is shown at the wrist-marker end of the band

### Requirement: No scroll (Schnecke) elements
The violin rendering branch SHALL NOT draw any fixed "scroll" or "Schnecke" element. There SHALL be no spiral, no fixed circle at (48, 48), and no `SNAIL_MODE` flag.

#### Scenario: Clean canvas without scroll artifacts
- **WHEN** violin mode is active
- **THEN** no elements are drawn at fixed positions unrelated to wrist landmarks or calibrated anchor

### Requirement: Flow mode uses same feedback elements
In flow mode (black background, no silhouette), the violin branch SHALL render the same three elements (anchor at calibrated position, blue marker at live wrist, yellow band when deviating) without repositioning them to canvas edges.

#### Scenario: Flow mode renders anchor at calibrated position
- **WHEN** violin mode is active and viewMode is 'flow'
- **THEN** the sapphire anchor is drawn at `calibWristX * width`, `calibWristY * height` (not at canvas edge)

#### Scenario: Flow mode shows band on deviation
- **WHEN** violin mode is active, viewMode is 'flow', and tension > 10
- **THEN** yellow band is drawn from anchor to live wrist position on black background
