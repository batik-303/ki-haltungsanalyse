## 1. Frame-Count-Hysterese für Farbwechsel

- [x] 1.1 `createWristRailColor` in `wrist-analyzer.ts` erweitern: Frame-Counter für Blau→Gelb (≥8 Frames) und Gelb→Blau (≥4 Frames) statt sofortigem Wechsel
- [x] 1.2 Unit-Test: Kurzer Spike (5 Frames über Schwelle) bleibt blau
- [x] 1.3 Unit-Test: Anhaltende Abweichung (8 Frames) wechselt zu gelb
- [x] 1.4 Unit-Test: Schnelle Rückkehr (4 Frames unter Schwelle) wechselt zu blau

## 2. Slide-Shield-Verstärkung

- [x] 2.1 Konstanten in `use-pose-detection.ts` anpassen: Schwelle 0.45→0.30, Dauer 0.22→0.35s, Damping 0.35→0.50
- [ ] 2.2 Manueller Test: Lagenwechsel bei laufender Session darf keinen Fehlalarm auslösen

## 3. Visibility-Confidence-Gate

- [x] 3.1 Stable-Coordinate-Buffer erstellen: Objekt in `use-pose-detection.ts` das letzte sichtbare Landmark-Positionen speichert (Elbow/Wrist/Index/Pinky)
- [x] 3.2 Gate-Logik: Vor Analyse prüfen ob `visibility >= 0.5` für Elbow, Wrist, Index — bei Unterschreitung Buffer-Werte verwenden
- [x] 3.3 Timeout-Logik: Nach 1s dauerhafter Verdeckung Anchor-Opacity auf 50% reduzieren, Analyse pausieren
- [x] 3.4 Recovery: Bei Visibility-Rückkehr Fade-In auf 100% (300ms), Analyse fortsetzen

## 4. Side-View-Amplifikation und Farbübergang

- [x] 4.1 `drawWristSideView` in `wrist-side-view.ts`: Winkel-Amplifikation auf 2.5× setzen, Clamping bei 45° visuell
- [x] 4.2 Farbübergang: Linearer Gradient Blau→Gelb über Winkelbereich 3°–10° (statt harter Wechsel)
- [x] 4.3 Liniendicke auf 5px erhöhen
- [ ] 4.4 Manueller Test: Periphere Sichtbarkeit bei leichter Abweichung (5–8°) prüfen

## 5. Anchor-Color-Smoothing im Renderer

- [x] 5.1 Sicherstellen dass `anchorColor` in `canvas-renderer.ts` die neue Hysterese aus Task 1 nutzt (kein separater Farbwechsel)
- [x] 5.2 Bestehende uncommitted Rendering-Changes (Anchor-Color-Override, Adaptive Baseline) prüfen und mit neuer Hysterese harmonisieren

## 6. Integration und Verifikation

- [x] 6.1 Build prüfen: `npm run build` ohne Fehler
- [x] 6.2 Bestehende Tests laufen lassen: `npm test` — alle grün
- [ ] 6.3 Manueller Gesamttest: Geige spielen, Lagenwechsel, Hand ruhig halten, Verdeckung testen
