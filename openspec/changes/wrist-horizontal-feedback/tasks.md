## 1. Refactor Rendering Logic

- [ ] 1.1 Extrahiere Handlinien-Rendering in eigene Funktion
- [ ] 1.2 Entferne alle Winkelberechnungen für die Handlinie (immer waagerecht)
- [ ] 1.3 Passe Deadzone-Logik an: beeinflusst nur noch Farbe/Glow, nicht Richtung

## 2. Modularisierung & Tests

- [ ] 2.1 Stelle sicher, dass die Logik für Linie, Farbe und Glow klar getrennt ist
- [ ] 2.2 Schreibe einen kurzen Inline-Kommentar zur Erweiterbarkeit (z.B. Richtungsglow)
- [ ] 2.3 Manuelle Tests: Feedback-Linie bleibt waagerecht, keine Zitterbewegung mehr
