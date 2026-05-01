## Context

Die Wrist-Analyse nutzt `computeWristAngle()` mit 2D-Vektoren (x, y). MediaPipe liefert auch z-Werte (Tiefe relativ zur Hüfte), die bisher ignoriert werden. Beim Geigenspiel bewegt sich das Handgelenk Richtung Hals teilweise in die Tiefe — die 2D-Projektion dämpft diese Bewegung stark, sodass `angleDiff` unter dem Schwellwert bleibt.

Der Sapphire-Anker wird auf rohe Landmark-Koordinaten gezeichnet. MediaPipe-Landmarks jittern ±2-4px pro Frame, was den Anker visuell zittern lässt. Ein `createOneEuroFilter` existiert bereits in `src/core/signal/one-euro-filter.ts`, wird aber nur im Violin-Analyzer genutzt.

## Goals / Non-Goals

**Goals:**
- Handgelenk-Abweichungen in alle Richtungen (Schnecke + Hals) zuverlässig erkennen
- Zitterfreier Sapphire-Anker und Wrist-Lines im Rendering
- Bestehende Sensitivitäts-Schwellwerte (`wristStart`/`wristFull`) weiterhin sinnvoll

**Non-Goals:**
- Neue UI-Elemente oder Feedback-Mechanismen
- Änderungen an Shoulder- oder Violin-Modi
- Anpassung der Sensitivitäts-Presets (ggf. nötig nach Testing, aber nicht Teil dieses Changes)

## Decisions

### D1: 3D-Vektoren in Winkelberechnung

**Entscheidung:** `computeWristAngle()` und `computeWristBendDirection()` um z-Komponente erweitern.

**Alternativen:**
- *Dual-Signal (2D-Winkel + z-Distanz):* Robuster bei schlechten z-Werten, aber komplexer — zwei Tension-Kanäle, die fusioniert werden müssen
- *Distanz-basierter Proxy:* Misst Index↔Elbow-Distanz statt Winkel. Kamerastabiler, aber verliert die intuitive Grad-Anzeige

**Begründung:** Minimal-invasiv — gleiche Formel, nur eine Dimension mehr. Die z-Qualität von MediaPipe Pose Landmarker ist für relative Änderungen (Differenz zum kalibrierten Winkel) ausreichend, auch wenn absolute z-Werte rauschen.

### D2: One-Euro-Filter für Render-Landmarks

**Entscheidung:** Je einen One-Euro-Filter pro Render-Koordinate (wx, wy, ex, ey, ix, iy) im rAF-Loop erstellen. Gefilterte Werte nur fürs Rendering nutzen, Analyse weiterhin auf Rohwerten.

**Parameter-Wahl:**
- `minCutoff = 1.5` — bei Ruhe stark glätten
- `beta = 0.007` — bei schneller Bewegung wenig lag
- `dCutoff = 1.0` — Standard

**Alternativen:**
- *EMA (Exponential Moving Average):* Einfacher, aber fixe Glättung — laggt bei schnellen Bewegungen
- *Filter auf Analyse-Werte:* Würde auch Tension glätten, aber das passiert bereits durch `computeTension()`

**Begründung:** One-Euro ist ideal für Landmark-Positionen — adaptiv, kein spürbarer Lag. Filter-Instanzen als `useRef` im Hook, analog zum bestehenden Violin-Analyzer-Pattern.

### D3: Analyse bleibt auf Rohwerten

**Entscheidung:** `analyzeWrist()` bekommt weiterhin ungefilterte Landmarks. Nur die Render-Pipeline nutzt gefilterte Koordinaten.

**Begründung:** Die Analyse-Pipeline hat bereits eigene Glättung (Moving Average auf `rawDev`, asymmetrisches Tension). Ein Filter auf den Input würde die Reaktionszeit verschlechtern.

## Risks / Trade-offs

- **z-Rauschen erzeugt Phantom-Tension** → Mitigation: Der Moving Average (30 Frames) auf `rawDev` glättet z-Rauschen. Falls nötig, Schwellwert `wristStart` leicht anheben (Follow-up).
- **Kalibrierter 3D-Winkel weicht bei Positionswechsel ab** → Mitigation: Gleiche Constraint wie heute — Abstandsprüfung sichert konsistente Kameraposition.
- **One-Euro-Filter-Parameter falsch gewählt** → Mitigation: Werte aus Violin-Analyzer als Startpunkt, iterativ tunen.
