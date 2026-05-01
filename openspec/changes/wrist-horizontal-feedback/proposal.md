## Why

Das aktuelle Handgelenk-Feedback (wrist-side-view) zeigt eine geneigte Linie, die auf kleine Landmark-Schwankungen und Filterverzögerungen reagiert. Das führt zu Unruhe und Ablenkung, besonders bei minimalen Bewegungen. Für pädagogisch wirksames Feedback ist maximale Ruhe und Klarheit entscheidend.

## What Changes

- Die Feedback-Linie im Wrist-Side-View wird immer exakt waagerecht und mittig dargestellt, unabhängig von kleinen Schwankungen oder Filtern.
- Die Linie zeigt nur noch „gerade“ oder „nicht gerade“ – keine Zwischenwinkel.
- Optional: Die Logik für die Linie wird modularisiert, um spätere Erweiterungen (z.B. Richtungsglow) zu erleichtern.

## Capabilities

### New Capabilities
- `wrist-horizontal-feedback`: Stabiles, waagerechtes Feedback für das Handgelenk, unabhängig von Landmark-Rauschen.

### Modified Capabilities


## Impact

- src/rendering/wrist-side-view.ts (Rendering-Logik)
- Möglicherweise zentrale Config für Feedback-Parameter
- Keine Auswirkungen auf andere Modi (Violin, Shoulder)
