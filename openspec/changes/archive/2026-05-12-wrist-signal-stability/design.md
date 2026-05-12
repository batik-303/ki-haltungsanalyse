## Context

Die Wrist-Analyse nutzt aktuell `computeCollinearityAngle2D` (Elbow→Wrist→MCP) als primäre Messung, gefiltert durch One-Euro-Filter (x/y und z separat), mit `createWristRailColor` für Blau/Gelb-Hysterese (8°/5° Schwellen). Die Ergebnisse werden im rAF-Loop in `use-pose-detection.ts` berechnet und über den Zustand (`wristRailIsBlue`, `wristRailAngleDeg`) an Rendering-Module weitergegeben.

Bereits vorhanden:
- Adaptive Baseline (EMA α=0.02 in `canvas-renderer.ts`) — absorbiert langsame Drift
- EMA Post-Smoothing auf `effectiveAngleDiff` (α=0.25 in `use-pose-detection.ts`)
- Slide-Shield für schnelle Positionswechsel (Geschwindigkeits-Schwelle 0.45, Damping 0.35)
- `createWristRepairStatus` (Deadzone 10°, Hysterese 200ms)
- `createWristRailColor` (Blau→Gelb bei 8°, Gelb→Blau bei 5°)
- Side-View mit asymmetrischem IIR-Filter (langsamer Rise, schneller Decay)

Uncommitted Changes in Rendering (3 Dateien):
- `canvas-renderer.ts`: Anchor-Color-Override (blau/gelb/lila basierend auf `wristRailIsBlue` und Winkel)
- `sapphire-anchor.ts`: `colorOverride`-Parameter mit Farb-Paletten
- `wrist-side-view.ts`: Verstärkte Liniendicke und Winkel-Amplifikation

## Goals / Non-Goals

**Goals:**
- Farbwechsel Blau↔Gelb stabilisieren: kein Flackern bei ruhig gehaltener Hand
- Lagenwechsel (vertikale Arm-Verschiebung) tolerieren ohne Fehlalarm
- Periphere Side-View als spürbaren Feedback-Kanal aktivieren
- Landmark-Sprünge bei kurzzeitiger Verdeckung abfangen

**Non-Goals:**
- Änderungen an der Shoulder- oder Violin-Mode
- Neues UI-Chrome oder React-Komponenten
- Änderungen an Kalibrierungslogik oder MasterPrint-Struktur
- MediaPipe-Modell oder -Parameter ändern (wir arbeiten mit den gelieferten Landmarks)

## Decisions

### D1: Frame-Count-Hysterese statt rein winkelbasierter Schwelle

**Entscheidung:** `createWristRailColor` wird um einen Frame-Counter erweitert. Zustandswechsel Blau→Gelb erfordert ≥8 konsistente Frames über der Schwelle (≈270ms bei 30fps). Gelb→Blau erfordert ≥4 Frames (≈130ms) — asymmetrisch zugunsten schneller Belohnung.

**Alternativen:**
- *EMA auf den Boolean*: Unnatürlich, Schwellwert schwer zu tunen
- *Rein höhere Winkel-Schwellen*: Verschlechtert Sensitivität für echte Fehler
- *Zeitbasiert (ms)*: Frame-Count ist einfacher und unabhängig von Frame-Rate-Schwankungen

**Rationale:** Frame-Count-Hysterese ist der robusteste Ansatz für binäre Signale. MediaPipe liefert ~30fps stabil, also sind Frames ein zuverlässiger Zeittakt. Die Asymmetrie (8 vs 4) folgt der Feedback-Philosophie: schnelle Belohnung, langsame Bestrafung.

### D2: Slide-Shield-Verstärkung für Lagenwechsel

**Entscheidung:** Slide-Shield-Parameter werden verschärft:
- Geschwindigkeits-Schwelle: 0.45 → 0.30 (empfindlicher für Bewegung)
- Shield-Dauer: 0.22s → 0.35s (längere Unterdrückung)
- Damping: 0.35 → 0.50 (stärkere Dämpfung während Shield)

**Rationale:** Der bestehende Slide-Shield erkennt schnelle Handgelenks-Verschiebungen und unterdrückt Feedback. Lagenwechsel sind genau solche Verschiebungen. Stärkere Parameter = bessere Lagenwechsel-Toleranz ohne neue Logik.

### D3: Visibility-Confidence-Gate für Okklusion

**Entscheidung:** Bevor Landmark-Positionen in die Analyse einfließen, wird `landmark.visibility` geprüft. Unter einer Schwelle von 0.5 wird der letzte bekannt-stabile Wert weiterverwendet (Hold-Strategie).

**Alternativen:**
- *Skelett-Inferenz*: Zu aufwändig, MediaPipe liefert bereits interne Schätzung
- *Interpolation*: Riskant ohne Endpunkt
- *Ignorieren*: Aktuelles Problem — Sprünge bei Verdeckung

**Rationale:** MediaPipe Pose Landmarker liefert pro Landmark ein `visibility`-Feld (0..1). Bei niedriger Visibility sind die Koordinaten unzuverlässig. Halten des letzten stabilen Werts ist sicher und einfach.

### D4: Side-View-Amplifikation und Farbübergang

**Entscheidung:** Der Side-View-Winkel wird mit Faktor 2.5× (statt 1×) amplified dargestellt. Der Farbübergang von Blau→Gelb erfolgt als linearer Gradient über den Winkelbereich 3°–10° (statt hartem Wechsel). Liniendicke wird auf 5px erhöht.

**Rationale:** Die Side-View ist für peripheres Sehen gedacht. Kleine Winkelunterschiede (3–8°) sind peripher unsichtbar. Die Amplifikation macht den Winkel physisch spürbar. Der Gradient verhindert abrupte Farbsprünge.

### D5: Adaptive Baseline nach canvas-renderer verschieben → NEIN, belassen

**Entscheidung:** Die adaptive Baseline bleibt in `canvas-renderer.ts` (Rendering-Schicht), da sie rein visuell ist und keine Analyse-Semantik hat. Sie korrigiert Display-Drift, nicht Mess-Drift.

## Risks / Trade-offs

- **Frame-Count-Hysterese erhöht Latenz**: 8 Frames ≈ 270ms Verzögerung beim Erkennen eines echten Fehlers → akzeptabel, da Musiker ohnehin nicht auf Millisekunden reagieren
- **Slide-Shield-Verstärkung könnte echte Fehler während Lagenwechsel maskieren**: → Akzeptabel, da der Shield nur 0.35s dauert und die Fehlerposition nach dem Lagenwechsel korrekt angezeigt wird
- **Visibility-Gate bei dauerhafter Verdeckung**: Wenn Landmark dauerhaft verdeckt bleibt, wird ein veralteter Wert angezeigt → Timeout nach 1s: Wechsel zu "kein Feedback"
- **Side-View-Amplifikation bei extremen Winkeln**: 2.5× bei 30° = 75° visuell → Clamping bei 45° visuell
