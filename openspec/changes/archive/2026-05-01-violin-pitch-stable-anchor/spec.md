# Violin Pitch Mode – The Stable Anchor System

## Spezifikation

### Vertikale Achsen-Fixierung
- Im violin-mode werden für Feedback-Elemente (Anker, Band) nur Y-Koordinaten verwendet.
- X-Koordinaten werden für das Rendering ignoriert.

### Magnetisches Einrasten (Deadzone)
- Deadzone: ±4 Grad um die Zielhöhe (aus Kalibrierung).
- Snap-to-Grid: In der Deadzone wird der Anker exakt auf die Zielhöhe gesetzt.

### Asymmetrisches Gummiband
- Sinkt die Geige unter die Zielhöhe: Band dick/gold, visuell „schwer“.
- Steigt die Geige über die Zielhöhe: Band dünn/blau, dezent.

### 5-Sekunden-Belohnungs-Logik
- Timer für stabilen Halt in der Deadzone.
- Nach 5 Sekunden: Glow-Pulse am Anker, Ankerpunkt wird gutgeschrieben.
- Timer reset bei Verlassen der Zone.

### Schnecken-Projektion
- Ankerposition = Verlängerung Schulter→Handgelenk, projiziert vor das Instrument.

### Glättung
- One Euro Filter für Y-Position des Ankers.

### Tests
- Unit-Tests für Deadzone, Timer, Projektion.
- UI-Review: Feedback ruhig, motivierend, keine Ablenkung.
