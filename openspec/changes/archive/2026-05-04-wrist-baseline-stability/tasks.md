## 1. Typen & Master-Print

- [x] 1.1 `calib2DAngle` im `WristMasterPrint` als Pflichtfeld belassen (bereits optional vorhanden) und in `createMasterPrint()` bei Kalibrierung setzen (`computeCollinearityAngle2D`)
- [x] 1.2 Store-Felder `lastCalibrationAt`, `wristRailIsBlue`, `wristRailAngleDeg` in `PoseState`, `FrameUpdate` und allen Reset-Pfaden ergänzen

## 2. Sticky-Blue Factory

- [x] 2.1 `createWristRailColor(blueToYellowDeg, yellowToBlueDeg)` als Factory-Closure in `src/core/analysis/wrist-analyzer.ts` implementieren
- [x] 2.2 Unit-Tests für `createWristRailColor`: Initialisierung, Blue→Yellow, Hysterese-Band, Yellow→Blue, Grace-Buffer-Interaktion

## 3. Analysis-Hook Integration

- [x] 3.1 In `use-pose-detection.ts`: `wristRailColorRef` als `useRef(createWristRailColor())` anlegen und in `resetAnalysisState` zurücksetzen
- [x] 3.2 Baseline-Normalisierung: `effectiveAngleDiff` als `Math.abs(currentAngle2D - masterPrint.calib2DAngle)` berechnen (statt rohem `angleDiff2D`)
- [x] 3.3 Grace-Buffer: wenn `now - store.lastCalibrationAt < 500` → `graceBuffer = 2`, sonst `0`; an `wristRailColorRef.current(effectiveAngleDiff, graceBuffer)` übergeben
- [x] 3.4 `wristRailIsBlue` und `wristRailAngleDeg` in `updateFrame()` schreiben

## 4. Renderer-Anpassung

- [x] 4.1 `wrist-lines.ts`: `drawWristLines()` erhält `isBlue: boolean` statt eigenem `DEADZONE_DEG`-Check; alle `inDeadzone`-Logik durch Parameter ersetzen
- [x] 4.2 `wrist-side-view.ts`: `drawWristSideView()` erhält `isBlue: boolean`; interne `DEADZONE_DEG`-Variable und `inDeadzone`-Berechnung entfernen
- [x] 4.3 `canvas-renderer.ts`: `state.wristRailIsBlue` und `state.wristRailAngleDeg` aus Store lesen und an Render-Funktionen durchreichen

## 5. Validierung

- [x] 5.1 Bestehende Tests (`wrist-rail.test.ts`, `wrist-repair-status.test.ts`, `wrist-flexion.test.ts`) laufen grün
- [x] 5.2 `npm run build` erfolgreich (keine TypeScript-Fehler)
- [x] 5.3 Manueller Smoke-Test: Nach Kalibrierung im Wrist-Modus ist die Linie sofort Blau und bleibt bei ruhiger Hand stabil Blau

## 6. Bugfix: Gelb statt Blau nach Kalibrierung

- [x] 6.1 `computeZBoost` in `wrist-analyzer.ts`: `boostDeg` Default von 8 auf 4 senken, damit Z-Boost allein nie den Gelb-Schwellwert (8°) erreicht
- [x] 6.2 `createWristRailColor`: `>=` → `>` im Blue→Yellow-Vergleich, damit exakt 8° noch Blau bleibt
- [x] 6.3 Unit-Tests für `createWristRailColor` anpassen: Boundary-Test auf `>` statt `>=` aktualisieren
- [x] 6.4 Bestehende Tests grün, `tsc --noEmit` clean
