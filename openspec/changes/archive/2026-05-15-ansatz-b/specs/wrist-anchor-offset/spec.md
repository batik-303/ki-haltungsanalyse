## ADDED Requirements

### Requirement: Wrist-Anker bleibt anatomisch stabil
Die Position des Wrist-Ankerpunkts (LEFT_WRIST, Landmark 15) SHALL durch einen proportionalen Offset entlang des Arms korrigiert werden, wenn die aktuelle 2D-Armlänge die Kalibrierung signifikant übersteigt. Ziel ist es, perspektivische Drift bei gestrecktem Arm zu kompensieren und den Anker möglichst nah am anatomischen Handgelenk zu halten.

#### Scenario: Armverlängerung in tiefer Lage
- **WHEN** der Nutzer streckt den Arm Richtung Schnecke und die 2D-Armlänge überschreitet die Kalibrierung um mehr als 10%
- **THEN** wird der Wrist-Anker um einen konfigurierbaren Prozentsatz (z.B. 3–5%) des Vektors Richtung MCP (Mittelpunkt von Pinky/Index) verschoben

#### Scenario: Normale Spielhaltung
- **WHEN** die 2D-Armlänge liegt im Bereich der Kalibrierung (±10%)
- **THEN** bleibt der Wrist-Anker unverändert auf dem gefilterten LEFT_WRIST-Punkt
