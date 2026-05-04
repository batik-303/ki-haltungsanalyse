## Why

Nach der Kalibrierung im Handgelenk-Modus springt die Verbindungslinie zwischen Handgelenk und Arm sofort auf Gelb, obwohl der Musiker seine Position nicht verändert hat. Mikrobewegungen beim Drücken der Speichern-Taste und ein fehlender absoluter Nullpunkt verursachen falsches Feedback direkt nach der Kalibrierung. Zusätzlich flackert die Linie an der Grenzzone zwischen Blau und Gelb, weil ohne Hysterese jede minimale Schwankung den Farbstatus wechselt.

## What Changes

- **Baseline-normalisierte Abweichung**: Die 2D-Kollinearität bei der Kalibrierung wird als `calib2DAngle` im Master-Print gespeichert. Alle späteren Abweichungen werden relativ zu diesem Wert berechnet, sodass die Kalibrierungsposition exakt 0° darstellt.
- **Grace Buffer (2°)**: In den ersten 500 ms nach Kalibrierung wird ein Puffer von 2° auf die Deadzone addiert, um Mikrobewegungen beim Tastendrücken abzufangen.
- **Sticky-Blue-Hysterese**: Neuer zustandsbehafteter Farbschalter: Die Linie wechselt erst bei ≥ 8° auf Gelb, kehrt aber erst unter 5° zurück auf Blau. Der asymmetrische Schwellenwert verhindert Flackern an der Grenzzone.
- **Store-Felder für Farbstatus**: `wristRailIsBlue` und `wristRailAngleDeg` werden im Zustand geführt und vom Renderer konsumiert statt lokaler Deadzone-Checks.

## Capabilities

### New Capabilities
- `wrist-baseline-stability`: Baseline-Normalisierung, Grace Buffer und Sticky-Blue-Hysterese für stabile Farbdarstellung der Handgelenk-Linie nach Kalibrierung

### Modified Capabilities
- `wrist-visual-feedback`: Renderer liest `wristRailIsBlue` aus dem Store statt eigene Deadzone-Berechnung

## Impact

- `src/core/types.ts` — `WristMasterPrint.calib2DAngle` wird Pflichtfeld (bereits optional vorhanden)
- `src/core/calibration/master-print.ts` — Speichert `calib2DAngle` bei Kalibrierung
- `src/core/analysis/wrist-analyzer.ts` — Neue Factory `createWristRailColor()` für Sticky-Blue-Logik
- `src/hooks/use-pose-detection.ts` — Nutzt Baseline-Offset + Grace Buffer + Rail-Color-Closure
- `src/store/pose-store.ts` — Neue Felder `wristRailIsBlue`, `wristRailAngleDeg`, `lastCalibrationAt`
- `src/rendering/wrist-lines.ts` — Konsumiert `wristRailIsBlue` statt eigener `DEADZONE_DEG`-Logik
- `src/rendering/wrist-side-view.ts` — Analog: Konsumiert `wristRailIsBlue`
- Tests: Neue Unit-Tests für `createWristRailColor` und Integration mit Grace Buffer
