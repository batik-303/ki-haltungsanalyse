## Context

Der Violin-Modus nutzt `LEFT_WRIST` (Landmark 15) als einzigen Tracking-Punkt. Die Analyse (`violin-analyzer.ts`) berechnet Y-Drift gegen den kalibrierten Wert. Das Rendering zeigt aktuell eine experimentelle "Schnecke" (fester Punkt oben links) mit Band zum Anchor — ein Überbleibsel aus der Prototyping-Phase, das keinen pädagogischen Wert hat.

Die Rendering-Pipeline ist: `canvas-renderer.ts` → dispatcht pro `focusMode` → ruft Module (`sapphire-anchor`, `golden-band`) auf.

## Goals / Non-Goals

**Goals:**
- Direktes, physisch erlebbares Feedback: Marker folgt Handgelenk, Band zeigt Abweichung
- Entfernung aller Schnecken-Artefakte (`SNAIL_MODE`, Spiral-Zeichnung, feste Position)
- Einheitliches Verhalten in Analyse- und Flow-Modus
- GoldenBand vereinfachen: immer gelb, kein Richtungs-Farbwechsel

**Non-Goals:**
- Keine Änderung am Analyse-Kern (Drift-Berechnung, Tension-Kurve)
- Keine Änderung an Kalibrierung oder MasterPrint-Struktur
- Keine X-Achsen-Analyse (nur Y bestimmt Tension, X ist nur visuell)
- Kein neues Rendering-Modul für den blauen Marker (inline im Renderer)

## Decisions

### 1. Blauer Marker inline im Canvas-Renderer

**Entscheidung**: Einfacher `ctx.arc()` Aufruf direkt im Violin-Branch, kein eigenes Modul.

**Rationale**: Der Marker ist ein simpler Kreis (≈8px Radius, gefüllt, `#2196F3`). Ein eigenes Modul wäre Over-Engineering für 5 Zeilen Code.

**Alternativen**: Eigenes `wrist-marker.ts` Modul → unnötige Indirektion für einen Kreis.

### 2. GoldenBand immer gelb, `driftDirection`-Parameter ignoriert

**Entscheidung**: `drawGoldenBand` behält die Signatur, aber intern wird Farbe immer Gold (`#FFD700` / `#DAA520`). Der `driftDirection`-Parameter wird noch übergeben (für Pfeilrichtung ▼/▲), steuert aber nicht mehr die Farbe.

**Rationale**: Farbwechsel Gold/Silber war verwirrend — der Musiker soll nur "Band = Abweichung" verstehen, nicht "Gold = sinken, Blau = steigen".

**Alternativen**: Parameter komplett entfernen → würde Wrist-Mode brechen falls der `drawGoldenBand` dort auch genutzt wird (aktuell nicht der Fall, aber defensiv beibehalten).

### 3. Band-Routing: Anchor → Live-Wrist (kein Schnecken-Zwischenpunkt)

**Entscheidung**: `drawGoldenBand(ctx, anchorX, anchorY, wx, wy, ...)` — direkte Linie vom kalibrierten Punkt zum aktuellen Handgelenk.

**Rationale**: Das ist die physisch intuitive Darstellung. Der Musiker sieht sofort: "Band wird länger = ich weiche ab."

### 4. Flow-Modus: gleiche Elemente, gleiche Positionen

**Entscheidung**: Im Flow-Modus wird der Anchor NICHT an den Rand verschoben (wie bei Shoulder/Wrist), sondern bleibt an der kalibrierten Position. Marker und Band identisch zu Analyse.

**Rationale**: Violin-Mode zeigt keine Silhouette — der Anchor an der kalibrierten Y-Position IST das räumliche Feedback. Rand-Verschiebung würde die Band-Metapher zerstören.

## Risks / Trade-offs

- **[Marker überdeckt Anchor bei guter Haltung]** → Akzeptabel: in Deadzone sind beide übereinander, Anchor-Glow ist trotzdem sichtbar (größerer Radius). Marker ist halbtransparent.
- **[Kein visueller Hinweis auf Richtung ohne Farbwechsel]** → Mitigation: Pfeil (▼/▲) am Band-Ende bleibt erhalten, zeigt Korrekturrichtung.
- **[Breaking Change für GoldenBand-Modul]** → GoldenBand wird aktuell nur im Violin-Branch genutzt. Keine externe Abhängigkeit.
