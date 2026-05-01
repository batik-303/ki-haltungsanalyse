# Design: Violin Anchor Redesign

## Architecture

Nur Rendering + Kalibrierung betroffen. Analyse-Kern bleibt unverändert.

### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/core/types.ts` | `ViolinMasterPrint.calibWristX` hinzufügen |
| `src/core/calibration/master-print.ts` | `calibWristX` bei Kalibrierung speichern |
| `src/rendering/golden-band.ts` | Trapez → gerichtete Elastic Line mit Farbunterscheidung |
| `src/rendering/canvas-renderer.ts` | Anchor auf fix (calibX, calibY) setzen |

### Nicht betroffen (explizit)

- `src/core/analysis/violin-analyzer.ts` — analysiert weiterhin nur Y-Drift
- `src/rendering/wrist-lines.ts` — Wrist Mode
- `src/rendering/wrist-side-view.ts` — Wrist Mode
- `src/core/analysis/wrist-analyzer.ts` — Wrist Mode

## Visual Design: Elastic Line

### Drei Zustände

```
Geige steigt:          Ideal (Flow):        Geige sinkt:

● Wrist (oben)
│ BLAU ↑
│
⚓ Anchor (fix)       ⚓ Anchor (fix)      ⚓ Anchor (fix)
                                             │
                       (nichts)              │ GOLD ↓
                                             │
                                             ● Wrist (unten)
```

### Tension → Visuelle Eigenschaften

| Tension | Dicke | Opacity | Sichtbar |
|---------|-------|---------|----------|
| 0–3 | — | — | Nein (nur Anchor) |
| 3–15 | 1–2px | 0.15–0.25 | Hauch |
| 15–50 | 2–4px | 0.25–0.5 | Deutlich |
| 50–80 | 4–6px | 0.5–0.65 | Stark |
| 80–100 | 6–8px | 0.65–0.7 | Pulsierend |

### Farbschema

| Richtung | Farbe | Hex |
|----------|-------|-----|
| Sinkt (driftDirection = 1) | Gold | Core: #FFD700, Glow: #DAA520 |
| Steigt (driftDirection = -1) | Silber-Blau | Core: #64B5F6, Glow: #90CAF9 |

### Richtungspfeil

Am Wrist-Ende der Linie, ab tension > 10:
- Sinkt: ▼ in Gold
- Steigt: ▲ in Silber-Blau

## Entscheidungen

- **Warum Linie statt Trapez?** Weniger visuelles Gewicht, skaliert besser bei kleinen Abweichungen, passt zur "App ist Beiwerk"-Philosophie.
- **Warum Farbe + Pfeil?** Redundante Kanäle für peripheres Sehen. Farbe allein reicht nicht bei peripherer Wahrnehmung; Richtung + Pfeil bestätigen.
- **Warum Puls bei >80?** Markiert Limit-Layer ohne Text-Overlay. Konsistent mit Shoulder-Mode-Pattern.
