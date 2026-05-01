## Why

Der Violin-Modus zeigt aktuell eine "Geigenschnecke" (fester Kreis oben links) mit einem Band zum kalibrierten Ankerpunkt. Das ist für Musiker verwirrend — die Schnecke hat keinen Bezug zum Körper und das Band zeigt nicht die eigene Bewegung. Der Feedback-Kanal muss direkt und physisch erlebbar sein: "Mein Handgelenk entfernt sich vom Anker → gelbes Band zieht mich zurück."

## What Changes

- **Entfernung**: `SNAIL_MODE` und gesamte Schnecken-Zeichnung (Kreis, Spirale, feste Position)
- **Blauer Marker**: Neuer Kreis der immer dem Handgelenk folgt (freie XY-Bewegung, live)
- **Gummiband vereinfacht**: GoldenBand geht direkt von Anchor → Live-Wrist-Marker, immer gelb (keine Richtungsfarben mehr)
- **Anchor bleibt**: Sapphire Anchor an kalibrierter Position, glüht bei Flow/Deadzone wie bisher
- **Flow-Modus**: Gleiches Konzept (Marker + Band + Anchor auf schwarzem Hintergrund)

## Capabilities

### New Capabilities

- `violin-direct-feedback`: Vereinfachtes Violin-Feedback mit blauem Wrist-Marker, fixem Anchor und gelbem Gummiband bei Y-Abweichung

### Modified Capabilities

- `render-mode-dispatch`: Violin-Branch im Canvas-Renderer wird umgebaut (Schnecke weg, neuer Marker, geändertes Band-Routing)

## Impact

- `src/rendering/canvas-renderer.ts` — Violin-Branch komplett umgeschrieben
- `src/rendering/golden-band.ts` — Richtungsfarben entfernt, immer gelb
- Keine Änderungen an Analyse-Kern (`violin-analyzer.ts`), Types oder Kalibrierung
- Keine API- oder Dependency-Änderungen
