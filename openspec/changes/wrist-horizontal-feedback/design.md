## Context

Aktuell wird im Wrist-Side-View die Handlinie als geneigte Linie entsprechend des gemessenen Knickwinkels dargestellt. Kleine Schwankungen in den Landmarks und Filterverzögerungen führen zu Unruhe und Ablenkung. Ziel ist es, die Linie immer exakt waagerecht und mittig zu halten, um ein ruhiges, klares Feedback zu geben.

## Goals / Non-Goals

**Goals:**
- Die Feedback-Linie bleibt immer waagerecht und mittig, unabhängig von kleinen Bewegungen.
- Keine visuelle Rückmeldung über kleine Winkelabweichungen, sondern nur „gerade“ oder „nicht gerade“.
- Die Logik ist modular, um spätere Erweiterungen (z.B. Richtungsglow) zu erleichtern.

**Non-Goals:**
- Keine Änderung an der Arm-Linie oder am Sapphire Anchor.
- Keine Anpassung anderer Modi (Violin, Shoulder).

## Decisions
- Die Handlinie wird immer von (wx, wy) nach (wx, wy - handLen) gezogen, unabhängig vom gemessenen Winkel.
- Die Berechnung und das Rendering der Linie werden in eine eigene Funktion ausgelagert, um spätere Erweiterungen zu erleichtern.
- Die Deadzone-Logik bleibt erhalten, aber beeinflusst nur Farbe/Glow, nicht mehr die Richtung der Linie.

## Risks / Trade-offs
- [Risk] Nutzer mit sehr schiefem Handgelenk bekommen kein direktes Feedback mehr über die Richtung → [Mitigation] Später durch Richtungsglow oder Fehlerfarben ergänzen.
- [Trade-off] Weniger „technisches“ Feedback, aber mehr Ruhe und Klarheit für die Zielgruppe.
