## 1. GoldenBand vereinfachen

- [x] 1.1 Richtungsfarben in `src/rendering/golden-band.ts` entfernen — Farbe immer Gold (`#FFD700` core, `#DAA520` glow), unabhängig von `driftDirection`
- [x] 1.2 Liniendicke vereinheitlichen: immer 3–14px skaliert mit Intensity (kein Unterschied mehr zwischen sink/rise)

## 2. Canvas-Renderer Violin-Branch umbauen

- [x] 2.1 `SNAIL_MODE`-Konstante und gesamten Schnecken-Zeichencode entfernen (Kreis, Spirale, feste Position 48/48)
- [x] 2.2 Blauen Wrist-Marker zeichnen: `ctx.arc(wx, wy, 8, ...)` mit `#2196F3`, alpha 0.7, jeden Frame
- [x] 2.3 GoldenBand-Aufruf umrouten: von `(anchorX, anchorY)` zu `(wx, wy)` statt Schnecke→Anchor
- [x] 2.4 Flow-Modus: Anchor an kalibrierter Position belassen (nicht an Rand verschieben), gleiche 3 Elemente zeichnen

## 3. Aufräumen

- [x] 3.1 Ungenutzte Variablen und toten Code aus Violin-Branch entfernen
- [x] 3.2 Manuell testen: Kalibrierung → Deadzone (kein Band, Marker über Anchor) → Abweichung (gelbes Band erscheint) → Rückkehr (Band verschwindet)
