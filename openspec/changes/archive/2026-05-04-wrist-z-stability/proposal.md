## Why

MediaPipe Z-Werte (Tiefenachse) sind 3–5× lauter als X/Y. Im Wrist-Modus verursacht das sichtbares Zittern der Feedback-Linie bei Bewegungen Richtung Hals (Geigenschnecke), weil der Z-Boost binär zwischen 0° und 4° flippt, sobald `zDelta` am Schwellwert `0.02` oszilliert. Der Knick Richtung Hals fühlt sich nervös an, während der Knick Richtung Schnecke (rein 2D) stabil ist.

## What Changes

- `computeZBoost` von binärem Schwellwert auf graduellen Ramp umbauen — eliminiert das Haupt-Flicker
- Zusätzlicher EMA-Filter auf `effectiveAngleDiff` nach dem Z-Boost — glättet verbleibende Mikro-Sprünge
- Z-Filter-Parameter (One-Euro) verschärfen: `minCutoff` 0.6→0.3, `beta` 0.003→0.001 — stärkere Rauschunterdrückung bei kaum spürbarer Verzögerung
- EMA-Ref im Hook bei Rekalibrierung zurücksetzen

## Capabilities

### New Capabilities
- `wrist-z-smoothing`: Gradueller Z-Boost-Ramp und EMA-Nachglättung für zitterfreie Winkelberechnung bei Z-Achsen-Bewegungen

### Modified Capabilities
- `wrist-baseline-stability`: Z-Boost-Verhalten ändert sich von binär auf graduell; neue Filter-Parameter

## Impact

- `src/core/analysis/wrist-analyzer.ts` — `computeZBoost` Signatur und Logik
- `src/hooks/use-pose-detection.ts` — EMA-Ref, Z-Filter-Konstanten, Reset-Pfad
- Bestehende Tests für `computeZBoost` müssen auf graduelles Verhalten angepasst werden
- Kein Breaking Change für Renderer — `effectiveAngleDiff` bleibt der gleiche Typ (number)
