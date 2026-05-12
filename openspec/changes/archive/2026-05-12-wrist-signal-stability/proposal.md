## Why

Das Wrist-Feedback flackert stark zwischen Blau und Gelb, selbst bei ruhig gehaltener Hand. Lagenwechsel (vertikale Positionsänderung) lösen Fehlalarme aus, weil die Logik absolute Bildkoordinaten statt reine Winkeländerungen bewertet. Die periphere Side-View reagiert kaum sichtbar, und bei Verdeckung durch die Geige springt der Ankerpunkt weg. Ohne diese Stabilisierung ist die Wrist-Analyse als Übe-Werkzeug nicht nutzbar.

## What Changes

- **Angle-EMA-Smoothing für Farbentscheidung**: Der `wristRailIsBlue`-Schalter bekommt einen eigenen Hysterese-Filter, der mindestens 8 konsistente Frames (≈270ms) verlangt, bevor er den Zustand wechselt. Das eliminiert nervöses Hin-und-Her-Springen.
- **Lagenwechsel-Entkopplung**: Die Winkelberechnung wird gegen die aktuelle Ellenbogen-Position relativiert. Vertikale Verschiebung des gesamten Arms (Lagenwechsel) ändert nur die Position, nicht den gemessenen Winkel. Nur tatsächliche Handgelenks-Beugung (Winkel Elbow→Wrist→MCP) löst Feedback aus.
- **Slide-Shield-Verstärkung**: Der bestehende Slide-Shield (Geschwindigkeits-basierte Unterdrückung bei schnellen Positionswechseln) wird aggressiver konfiguriert, um Lagenwechsel-Artefakte zu absorbieren.
- **Periphere Side-View aktivieren**: Die Side-View zeigt den Winkel proportional an — aktuell ist der visuelle Ausschlag zu klein. Amplifikation und Farbübergang werden so angepasst, dass Abweichungen im peripheren Sehen deutlich wahrnehmbar sind.
- **Okklusions-Robustheit**: Wenn MediaPipe-Landmarks kurzzeitig springen (visibility < Schwelle), wird der letzte stabile Wert gehalten statt den Sprung weiterzugeben. Dazu wird ein Confidence-Gate auf Landmark-Visibility eingeführt.

## Capabilities

### New Capabilities
- `color-hysteresis`: Frame-basierter Hysterese-Filter für den Blau/Gelb-Farbwechsel — verhindert Flackern durch konsistente Frame-Zählung vor Zustandswechsel
- `position-shift-immunity`: Entkopplung von absoluter Arm-Position und Winkelberechnung — Lagenwechsel werden als Positionsänderung erkannt und nicht als Haltungsfehler gewertet
- `occlusion-hold`: Confidence-Gate für Landmark-Visibility — hält letzte stabile Werte wenn Landmarks kurzzeitig durch Instrument verdeckt werden

### Modified Capabilities
- `wrist-visual-feedback`: Side-View-Amplifikation wird erhöht, Farbübergang Blau→Gelb wird weicher und peripherisch besser wahrnehmbar
- `wrist-flexion-tracking`: Slide-Shield-Parameter werden verschärft für bessere Lagenwechsel-Toleranz

## Impact

- `src/hooks/use-pose-detection.ts` — Hysterese-Filter, Slide-Shield-Tuning, Confidence-Gate
- `src/core/analysis/wrist-analyzer.ts` — Position-Shift-Immunity-Logik
- `src/rendering/wrist-side-view.ts` — Amplifikation und Farbübergänge
- `src/rendering/canvas-renderer.ts` — Anchor-Color-Übergang mit Smoothing
- `src/store/pose-store.ts` — ggf. neues Feld für Hysterese-State
- Keine Breaking Changes, keine neuen Dependencies
