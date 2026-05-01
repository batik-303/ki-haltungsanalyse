### Vision: Direkter Schnecken-Ankerpunkt (Zukunft)

Mit zukünftigen KI- und Tracking-Verbesserungen kann die Schnecke der Geige als eigene Landmark erkannt werden. Dann kann der Ankerpunkt direkt und stabil an der Schnecke platziert werden – ohne Projektion oder Kompromisse.

**Vorteile:**
- Maximale pädagogische Klarheit: Feedback am Zielpunkt (Schnecke)
- Ruhiges, robustes Signal (bei guter Landmark)
- Keine Notwendigkeit für Zwischenlösungen (Projektion, Offset)

**Empfehlung:**
Das UI und die Architektur so gestalten, dass ein Wechsel auf einen echten Schnecken-Anker später einfach möglich ist (z.B. Austausch der Landmark-Berechnung, flexible Rendering-Logik).

**Fallback:**
Bis dahin bleibt der Ankerpunkt am Handgelenk oder auf der Schulter-Hand-Projektion mit starker Glättung.
# Violin Pitch Mode – The Stable Anchor System

## Design

### 1. Vertikale Achsen-Fixierung
- Im violin-mode wird für alle Feedback-Elemente (Anker, Gummiband) nur die Y-Position (Pitch) der Geige verwendet.
- Die X-Position wird für das Rendering ignoriert.

### 2. Magnetisches Einrasten (Deadzone)
- Die Deadzone wird als Bereich um die Zielhöhe (z. B. ±4 Grad) definiert.
- Befindet sich die Geige in der Deadzone, springt der Anker exakt auf die Zielhöhe (Snap-to-Grid).
- Verlassen der Zone setzt den Timer zurück.

### 3. Asymmetrisches Gummiband
- Sinkt die Geige unter die Zielhöhe, wird das Band dicker und goldfarben (Schwere).
- Steigt die Geige über die Zielhöhe, bleibt das Band dünn und blau/silbern.

### 4. 5-Sekunden-Belohnungs-Logik
- Ein Timer zählt, wie lange die Geige stabil in der Deadzone gehalten wird.
- Nach 5 Sekunden wird ein Glow-Pulse/Glitzern am Anker ausgelöst und ein Ankerpunkt gutgeschrieben.
- Verlässt die Geige die Zone, wird der Timer zurückgesetzt.

### 5. Schnecken-Projektion
- Die Ankerposition wird auf der Verlängerung Schulter→Handgelenk (Richtung Schnecke) berechnet.
- Der Anker schwebt vor dem Instrument, nicht am Körper.

### 6. Glättung
- Die Y-Position des Ankers wird mit einem One Euro Filter geglättet.
- Das Feedback bleibt ruhig und flüssig.

### 7. Tests & UI-Feinschliff
- Unit-Tests für Deadzone, Timer, Projektion.
- UI-Review: Feedback ruhig, motivierend, keine Ablenkung.
