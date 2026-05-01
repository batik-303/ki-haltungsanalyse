## 1. 3D-Winkelberechnung

- [x] 1.1 `computeWristAngle()` in `wrist-analyzer.ts` auf 3D-Vektoren erweitern (z-Komponente in dot product und magnitude)
- [x] 1.2 `computeWristBendDirection()` auf 3D cross product erweitern (liefert 3D-Vektor statt Skalar — Magnitude als Richtungssignal)
- [x] 1.3 `WristMasterPrint`-Kalibrierung in `master-print.ts` verifizieren — nutzt bereits `computeWristAngle()` und `computeWristBendDirection()`, speichert automatisch 3D-Werte nach Änderung

## 2. Render-Smoothing

- [x] 2.1 One-Euro-Filter-Instanzen für 6 Wrist-Render-Koordinaten (ex, ey, wx, wy, ix, iy) als `useRef` in `use-pose-detection.ts` erstellen
- [x] 2.2 Gefilterte Koordinaten im Wrist-Rendering-Pfad in `canvas-renderer.ts` nutzen (Analyse weiterhin auf Rohwerten)
- [x] 2.3 Filter-Reset bei Rekalibrierung/Moduswechsel in `resetAnalysisState()` einbauen

## 3. Verifikation

- [ ] 3.1 Manueller Test: Handgelenk Richtung Schnecke bewegen — Farbe und Tension wie bisher
- [ ] 3.2 Manueller Test: Handgelenk Richtung Hals bewegen — Farbe und Tension jetzt sichtbar
- [ ] 3.3 Manueller Test: Hand ruhig halten — Anker zittert nicht mehr
- [ ] 3.4 Manueller Test: Hand schnell bewegen — Anker folgt ohne spürbaren Lag
