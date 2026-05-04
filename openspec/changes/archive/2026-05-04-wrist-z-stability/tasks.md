## 1. Gradueller Z-Boost

- [x] 1.1 `computeZBoost` in `wrist-analyzer.ts` umbauen: binären `if (zDelta > threshold)` durch linearen Ramp ersetzen (`ramp = clamp((zDelta - threshold) / (threshold * 2), 0, 1)`, `zContribution = boostDeg * ramp`)
- [x] 1.2 Unit-Tests für `computeZBoost`: unter Threshold (0°), Mitte Ramp (~50%), voller Ramp (100%), 2D-Winkel ≥ 3° bypassed Z-Boost

## 2. EMA-Nachglättung

- [x] 2.1 In `use-pose-detection.ts`: `angleDiffEmaRef = useRef(0)` anlegen, nach `computeZBoost` EMA anwenden (`ema = prev * 0.75 + raw * 0.25`), Ergebnis als `effectiveAngleDiff` verwenden
- [x] 2.2 `angleDiffEmaRef` in `resetAnalysisState` auf `0` zurücksetzen

## 3. Z-Filter-Parameter

- [x] 3.1 One-Euro Z-Filter-Konstanten in `use-pose-detection.ts` anpassen: `minCutoff` 0.6→0.3, `beta` 0.003→0.001

## 4. Validierung

- [x] 4.1 Bestehende Wrist-Tests grün (`wrist-rail-color`, `wrist-rail`, `wrist-repair-status`, `wrist-flexion`)
- [x] 4.2 `tsc --noEmit` clean
- [ ] 4.3 Manueller Smoke-Test: Linie bleibt bei ruhiger Hand stabil blau, Hals-Richtung-Knick baut sich weich auf
