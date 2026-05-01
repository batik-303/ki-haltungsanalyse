# Violin Pitch Mode – The Stable Anchor System

## Aufgaben

1. **Vertikale Achsen-Fixierung (Schiene):**
   - [x] Feedback-Visualisierung (Gummiband, Anker) im violin-mode folgt nur der Y-Achse (Pitch/Höhe).
   - [x] X-Achse wird für Rendering ignoriert.

2. **Magnetisches Einrasten (Deadzone):**
   - [x] Definiere Deadzone um die Zielhöhe (±3–5 Grad).
   - [x] Bei Eintritt in die Deadzone springt der Anker exakt auf die Zielhöhe (Snap-to-Grid).
   - [x] Verlasse der Zone setzt den Timer zurück (Vorbereitung für Task 4).

3. **Asymmetrisches Gummiband:**
   - [x] Sinken: Band wird dicker und goldfarben, vermittelt „Schwere“.
   - [x] Steigen: Band bleibt dünn und blau/silbern.

4. **5-Sekunden-Belohnungs-Logik:**
   - [x] Timer für stabilen Halt in der Deadzone.
   - [x] Nach 5 Sekunden: Glow-Pulse/Glitzern am Anker, Ankerpunkt wird gutgeschrieben.
   - [x] Timer reset bei Verlassen der Zone.

5. **Ankerpunkt an Hand-Innenseite (Daumenseite, körpernah):**
   - [x] Ankerpunkt liegt auf der Innenseite des Handgelenks (Daumenseite, leicht körpernah).
   - [x] Gummiband startet von dort.
   - [x] Offset als Konstante oder konfigurierbar.

6. **Schnecken-Projektion (experimentell):**
   - Ankerpunkt kann alternativ auf Verlängerung Schulter→Handgelenk (Richtung Schnecke) projiziert werden.
   - Starke Glättung und Fallback auf Hand-Innenseite bei Instabilität.

6. **Glättung:**
   - [x] One Euro Filter für Y-Position des Ankers (und ggf. Band).
   - [x] Keine digitalen Sprünge oder Rauschen.

7. **Tests & UI-Feinschliff:**
   - [x] Unit-Tests für Deadzone, Timer, Projektion.
   - [x] UI-Review: Feedback ruhig, motivierend, keine Ablenkung.
