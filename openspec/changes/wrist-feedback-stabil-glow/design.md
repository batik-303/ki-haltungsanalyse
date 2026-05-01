# Design: Stabiles Wrist-Feedback mit Glow

## Wie

1. **Smoothing & Deadzone**
   - One Euro Filter für alle relevanten Landmarken (Elbow, Wrist, Index)
   - Moving Average für den berechneten Winkel (Arm-Hand)
   - Deadzone: ±10° als „gerade“
   - Hysterese: „Repariert“-Status erst nach 200ms stabiler Linie

2. **Repariert-Erkennung**
   - Berechne Winkel zwischen Arm und Hand (2D/3D)
   - Status: „bent forward“, „bent backward“, „repariert“
   - Schwellenwerte und Dauer als Parameter

3. **Visualisierung**
   - Linie: Knick sichtbar bei Abweichung, ruhig und hell bei „repariert“
   - Ankerpunkt: Glow (sanft, Fade-in/out) bei „repariert“
   - Glow-Intensität wächst mit Dauer der Reparatur

4. **Architektur**
   - Status-Logik als pure Funktion in core/analysis/wrist-analyzer.ts
   - Rendering modular in rendering/wrist-side-view.ts und sapphire-anchor.ts
   - Parameter zentral konfigurierbar

## Offene Fragen
- Schwellenwerte für „gerade“?
- Glow binär oder stufenlos?
- Sollen Nutzer Empfindlichkeit einstellen können?