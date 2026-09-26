## Why

Die OpenSpec-Specs `wrist-z-smoothing`, `wrist-baseline-stability` und `wrist-flexion-tracking` beschreiben noch die alte Knick-Messung: 2D-Winkel minus `calib2DAngle`, plus Z-Boost aus gefilterten z-Werten. Mit #82 (PR #86, ADR 0003) ist der Code längst weiter: 2D-Winkel mit Verkürzungs-Korrektur, keine z-Werte, keine „nur-steigen"-Sperre. Dieser Change zieht die Specs nach (reine Doku, kein Produktionscode).

## What Changes

- **ENTFERNT**: Z-Boost (lineare Rampe und Anhebung bei kleinem 2D-Winkel) und die z-Filter-Parameter — der Knick nutzt kein z mehr, weil die geschätzte Tiefe im Stillstand rauscht.
- **GEÄNDERT**: EMA-Glättung setzt direkt auf der Knick-Abweichung auf; ausdrücklich keine „nur-steigen"-Sperre bei geringer Foreshortening-Konfidenz.
- **GEÄNDERT**: Baseline heißt `calibKnick`/`calibKnickFallback` und liegt in derselben Größe wie die Laufzeit-Messung; Armdrehung erzeugt bei guter Haltung keine Abweichung.
- **GEÄNDERT**: Kalibrierung speichert `calibKnick`, `calibKnickFallback` und `calibArmLength2D` (mit Seitenverhältnis).
- **NEU**: Verkürzungs-Korrektur `acos(cos(Winkel2D)·r² + 1 − r²)` samt bekannter Grenzen (Unterarm-Längsachse, Vorzeichen → #85).

## Capabilities

### New Capabilities

### Modified Capabilities
- `wrist-z-smoothing`: Z-Boost und z-Filter entfernt; EMA ohne Sperre.
- `wrist-baseline-stability`: Baseline `calibKnick`, Deviation aus korrigiertem Knick.
- `wrist-flexion-tracking`: Kalibrier-Felder, Z-Boost entfernt, Verkürzungs-Korrektur neu.

## Impact

- Nur `openspec/specs/**` (nach Archivierung). Code-Stand: `main` `f62792d`.
- Referenzen: ADR `docs/adr/0003-knick-2d-mit-verkuerzungs-korrektur.md`, `docs/mediapipe-wrist-modus.md` §5, `src/core/analysis/knick-tracker.ts`, Tests `tests/wrist/knick-tracker.test.ts`, `angle-orientation-drift.test.ts`, `knick-baseline.test.ts`.
