# Capability Spec: wrist-horizontal-feedback

## Purpose

Stabiles, waagerechtes Feedback für das Handgelenk im Wrist-Side-View. Die Feedback-Linie bleibt immer exakt waagerecht und mittig, unabhängig von kleinen Landmark-Schwankungen oder Filterverzögerungen.

## Requirements

- Die Handlinie im Wrist-Side-View ist immer waagerecht (horizontal) und mittig.
- Die Linie zeigt nur „gerade“ oder „nicht gerade“ (keine Zwischenwinkel).
- Die Deadzone-Logik beeinflusst nur Farbe/Glow, nicht die Richtung der Linie.
- Die Logik ist modular, um spätere Erweiterungen zu erleichtern.
- Keine Auswirkungen auf andere Modi (Violin, Shoulder).

## Out of Scope

- Richtungsglow, Fehlerfarben, Animationen (separate Changes)
- Änderungen an Arm-Linie oder Sapphire Anchor
