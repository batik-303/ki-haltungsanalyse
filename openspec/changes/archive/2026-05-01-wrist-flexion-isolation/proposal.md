## Why

Der Wrist-Mode misst aktuell einen skalaren 3D-Gesamtwinkel (Elbow→Wrist→Index), der Flexion/Extension und Radial/Ulnar-Deviation vermischt. Beim Geigenspiel sind radiale/ulnare Bewegungen (z.B. Bogenwechsel) normal und sollen kein Feedback auslösen. Nur die Neigung der Hand nach innen/außen (Flexion/Extension) ist relevant. Zusätzlich nutzt der Analyzer die Zeigefingerspitze statt des MCP-Joints, was die Messung instabiler macht.

## What Changes

- **Neuer Winkel-Algorithmus**: Ebenen-Projektion isoliert Flexion/Extension, Radial/Ulnar wird ignoriert
- **MCP-Joint Approximation**: Midpoint von Landmark 17 (Pinky) und 19 (Index) als stabiler Handvektor-Endpunkt statt Zeigefingerspitze allein
- **Vereinfachte Visualisierung**: Gelbe gestrichelte Linie auf der Hand bei Abweichung (statt geknicktem Linienzug mit Perpendicular-Offset)
- **Peripherie-Synchronisation**: Side-View zeigt gleiche Elemente (Anker, Linie) in vereinfachter Form, synchron zur Hauptansicht
- **Anker-Belohnung**: Leuchtet bei Rückkehr zur korrekten Position (bestehendes Konzept bleibt)
- **BREAKING**: `WristMasterPrint` Typ ändert sich (neuer Winkeltyp, MCP-basiert)

## Capabilities

### New Capabilities
- `wrist-flexion-tracking`: Isolierte Flexion/Extension-Messung durch Ebenen-Projektion mit MCP-Joint als Handvektor-Endpunkt
- `wrist-visual-feedback`: Gelbe gestrichelte Linie auf der Hand bei Abweichung, Anker-Glow bei Rückkehr, synchronisierte Peripherie-Darstellung

### Modified Capabilities

## Impact

- `src/core/analysis/wrist-analyzer.ts` — neuer Projektionsalgorithmus, MCP-Berechnung
- `src/core/types.ts` — `WristMasterPrint` Interface anpassen
- `src/core/calibration/master-print.ts` — Kalibrierung mit neuem Winkeltyp
- `src/rendering/wrist-lines.ts` — komplett überarbeiten (gelbe gestrichelte Linie statt Knick)
- `src/rendering/wrist-side-view.ts` — vereinfachen, synchron zur Hauptansicht
- `src/rendering/canvas-renderer.ts` — Wrist-Rendering-Aufruf anpassen
- `src/store/pose-store.ts` — ggf. neue Felder für MCP-Koordinaten
- `tests/` — bestehende Wrist-Tests anpassen
