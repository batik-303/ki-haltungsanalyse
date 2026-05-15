## ADDED Requirements

### Requirement: Präzisere visuelle Rückmeldung durch stabilisierten Anker
Die visuelle Rückmeldung für das Handgelenk (Wrist) SHALL die durch die Offset-Korrektur stabilisierte Ankerposition verwenden, um auch in tiefen Lagen eine konsistente und anatomisch sinnvolle Darstellung zu gewährleisten.

#### Scenario: Feedback in tiefer Lage
- **WHEN** der Nutzer spielt in tiefer Lage und die Offset-Korrektur greift
- **THEN** wird die visuelle Rückmeldung (z.B. Anker-Glow, Linien) auf Basis der korrigierten Ankerposition berechnet

#### Scenario: Feedback in normaler Haltung
- **WHEN** die Offset-Korrektur nicht aktiv ist
- **THEN** bleibt die visuelle Rückmeldung unverändert zur bisherigen Implementierung
