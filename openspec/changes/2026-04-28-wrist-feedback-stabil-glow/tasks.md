# Tasks: Stabiles Wrist-Feedback mit Glow

1. **Smoothing & Deadzone**
   - [ ] One Euro Filter für relevante Landmarken aktivieren/feintunen
   - [ ] Moving Average für Arm-Hand-Winkel implementieren
   - [ ] Deadzone (±10°) und Hysterese (200ms) in Status-Logik einbauen

2. **Repariert-Erkennung**
   - [ ] Pure Funktion für Status-Erkennung in core/analysis/wrist-analyzer.ts
   - [ ] Unit-Tests für Status-Logik (bent/repariert)

3. **Visualisierung**
   - [ ] Rendering-Logik für Glow am Ankerpunkt (Fade-in/out, Intensität)
   - [ ] Linie: ruhig, hell bei „repariert“, Knick und ggf. Farbe bei Abweichung
   - [ ] Parameter für Schwellenwerte und Dauer zentral konfigurierbar machen

4. **Manuelle Tests**
   - [ ] Feedback bleibt ruhig, kein Zittern
   - [ ] Glow erscheint nur bei stabil reparierter Linie
   - [ ] Funktioniert für beide Richtungen (vor/zurück)
   - [ ] Glow motiviert, lenkt aber nicht ab

5. **Review & Feinschliff**
   - [ ] Schwellenwerte und Filter ggf. nachjustieren
   - [ ] Optionale Empfindlichkeitseinstellung prüfen