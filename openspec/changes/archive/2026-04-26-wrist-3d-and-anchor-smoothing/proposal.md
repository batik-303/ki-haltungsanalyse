## Why

Die Handgelenk-Analyse erkennt Abweichungen Richtung Schnecke zuverlässig, aber Abweichungen Richtung Hals/Körper erzeugen kaum Feedback. Ursache: Die Winkelberechnung nutzt nur x/y-Koordinaten — Bewegungen in die Tiefe (z-Achse) werden von der 2D-Projektion stark gedämpft. Zusätzlich zittert der Sapphire-Anker, weil Render-Positionen direkt aus ungefilterten MediaPipe-Landmarks stammen.

## What Changes

- `computeWristAngle()` und `computeWristBendDirection()` auf 3D-Vektoren (x, y, z) erweitern, damit Tiefenbewegungen in die Winkelmessung einfließen
- One-Euro-Filter auf Landmark-Positionen im Wrist-Rendering anwenden, um Anker-Zittern zu eliminieren
- `WristMasterPrint` um `wristBendDir`-Kalibrierungsdaten erweitern, die auch z-Werte berücksichtigen

## Capabilities

### New Capabilities
- `wrist-3d-angle`: 3D-Winkelberechnung für Handgelenk-Analyse — erfasst Abweichungen in alle Richtungen (Schnecke UND Hals)
- `wrist-render-smoothing`: One-Euro-gefilterte Landmark-Positionen für zitterfreies Wrist-Rendering

### Modified Capabilities

## Impact

- `src/core/analysis/wrist-analyzer.ts` — Kernänderung: 3D-Vektoren in Winkel- und Richtungsberechnung
- `src/core/calibration/master-print.ts` — Wrist-Kalibrierung nutzt 3D-Werte
- `src/rendering/canvas-renderer.ts` — Wrist-Modus: gefilterte Positionen statt rohe Landmarks
- `src/hooks/use-pose-detection.ts` — One-Euro-Filter-Instanzen für Render-Landmarks erstellen
- `src/core/signal/one-euro-filter.ts` — wird jetzt auch im Wrist-Modus genutzt (bisher nur Violin)
