## Context

Der Wrist-Modus nutzt einen zweistufigen Pipeline für die Winkelberechnung:
1. **2D Collinearity** (`computeCollinearityAngle2D`) — misst den Knick in der Kameraebene (X/Y). Stabil.
2. **Z-Boost** (`computeZBoost`) — erkennt Tiefenbewegungen (Hand Richtung Hals/Schnecke), die in 2D unsichtbar wären.

Der Z-Boost ist aktuell ein binärer Schalter: Wenn `|zMcp - zWrist| > 0.02`, wird der Winkel auf mindestens 4° gesetzt. Das erzeugt Frame-zu-Frame-Flicker, weil MediaPipe Z-Rauschen im Bereich ±0.01–0.02 liegt — genau am Schwellwert.

Bestehende Z-Filter (One-Euro, `minCutoff=0.6, beta=0.003`) dämpfen das Rauschen teilweise, aber nicht genug, um den binären Flip zu verhindern.

## Goals / Non-Goals

**Goals:**
- Eliminierung des sichtbaren Winkel-Jitters bei Z-Achsen-Bewegungen
- Gleich ruhiges Feedback für Hals-Richtung wie für Schnecke-Richtung
- Keine spürbare Latenz-Erhöhung (Ziel: <100ms zusätzliche Verzögerung)

**Non-Goals:**
- Änderung der Schwellwerte für Blue/Yellow-Entscheidung (bleibt bei 8°/5°)
- Änderung der Rendering-Logik (Renderer liest weiterhin nur `effectiveAngleDiff`)
- Verbesserung der MediaPipe Z-Genauigkeit selbst

## Decisions

### 1. Gradueller Z-Boost-Ramp statt binärem Schwellwert

**Entscheidung:** `computeZBoost` bekommt einen linearen Ramp: `zDelta` zwischen `threshold` und `threshold × 3` wird auf `0..boostDeg` gemappt.

**Alternativen:**
- **Hysterese auf zDelta** (Ein bei 0.025, Aus bei 0.015): Verhindert Flipping, aber der Boost bleibt binär — es gibt immer noch einen Sprung, nur seltener.
- **Z-Boost komplett entfernen**: Verliert die Erkennung von Hals-Richtung-Bewegungen, die in 2D unsichtbar sind.
- **Sigmoid statt Linear**: Marginal bessere Glättung, aber schwerer zu debuggen/tunen.

**Rationale:** Linearer Ramp ist einfach, vorhersagbar, und eliminiert den binären Flip vollständig. Der Ramp von `threshold` bis `threshold × 3` gibt genug Spielraum für Z-Noise.

### 2. EMA-Nachglättung auf effectiveAngleDiff

**Entscheidung:** Ein einfacher EMA-Filter (`alpha = 0.25`) wird nach dem Z-Boost auf den finalen `effectiveAngleDiff` angewendet.

**Alternativen:**
- **Nur Z-Filter verschärfen**: Hilft bei Rauschen, aber nicht bei dem graduellen Ramp-Übergang, der bei schnellen Bewegungen trotzdem 1-2° springen kann.
- **One-Euro statt EMA**: Overkill — der Wert ist bereits ein abgeleiteter Skalar, kein Landmark.
- **Median-Filter**: Bessere Spike-Unterdrückung, aber erzeugt Treppeneffekte.

**Rationale:** EMA ist O(1), zustandslos bis auf einen Wert, und bei `alpha=0.25` / ~30fps ergibt sich eine Zeitkonstante von ~100ms — unter der Wahrnehmungsschwelle. Fängt restliche Mikro-Sprünge ab, die der Ramp nicht eliminiert.

### 3. Z-Filter-Parameter verschärfen

**Entscheidung:** One-Euro Z-Filter: `minCutoff` 0.6→0.3, `beta` 0.003→0.001.

**Rationale:** Niedrigerer `minCutoff` = stärkere Glättung im Ruhezustand. Niedrigerer `beta` = weniger Reaktivität auf Z-Spikes. Effektive Verzögerung steigt um ~2 Frames (~60ms) — nicht spürbar bei einem Feedback-Kanal, der ohnehin peripher wahrgenommen wird.

## Risks / Trade-offs

- **Leicht erhöhte Latenz bei echten Z-Bewegungen** → Akzeptabel: Hals-Richtung-Feedback ist peripher, ~100ms Verzögerung ist nicht spürbar. Mitigation: EMA-Alpha und Z-Filter-Params sind als Konstanten definiert und leicht tunbar.
- **Gradueller Ramp könnte Z-Boost-Erkennung abschwächen** → Mitigation: Voller Boost bei `3×threshold` (0.06), was einer deutlichen Tiefenbewegung entspricht. Kleine echte Bewegungen erzeugen proportionalen Boost statt nichts.
- **EMA-Reset bei Rekalibrierung nötig** → Im `resetAnalysisState` zurücksetzen, analog zu `wristRailColorRef`.
