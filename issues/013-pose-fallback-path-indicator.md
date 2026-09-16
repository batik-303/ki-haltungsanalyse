# 13 — Pose-only Fallback + Path-Indikator bei fehlender Hand-Detection

> **Typ**: AFK

## What to build

Robust gegen Frames ohne Hand-Detection: HandLandmarker liefert manchmal kein Ergebnis (Verdeckung, extreme Foreshortening, off-screen, schnelle Bewegung). Statt zu blockieren oder zu flackern, fällt der Analyzer transparent auf den alten Pose-only-Pfad zurück — die Analyse läuft weiter, nur weniger präzise. Beim Hand-Wiedererscheinen smoothe Rückkehr zum Hand-Pfad ohne Winkel-Sprung.

- **Pfad-Wahl**: Pro Frame entscheidet eine Funktion `selectAnalysisPath(handLandmarks)` zwischen `'hand'` und `'pose-fallback'`. Bei `'hand'` läuft der neue Pfad aus Slices 11+12. Bei `'pose-fallback'` läuft der bestehende Code-Pfad (Pose-Elbow + Pose-Wrist + `computeMCP(Pose[17], Pose[19])` + alter Sign).
- **Übergangs-Glättung**: `angleDiffEma` hält einen Decay-Buffer bei Pfad-Wechsel (kein Sprung > 3° in einem Einzelframe). Mechanismus: Beim Wechsel wird der EMA-Wert vom letzten Pfad als Startpunkt für den neuen Pfad übernommen und über ~5 Frames smooth übertragen.
- **Kalibrier-Schutz**: Wenn HandLandmarker zum Kalibrier-Moment leer ist, scheitert die Kalibrierung mit UI-Feedback (Wiederholung). Sonst entstünde eine Baseline aus zwei verschiedenen Pfaden — unbrauchbar.
- **Debug-Visualisierung** (hinter D-Toggle):
  - Kleiner Path-Indikator im Debug-Overlay: `HAND` cyan wenn Hand-Pfad aktiv, `POSE-FB` orange wenn Fallback aktiv
  - Positionierung am Rand des Debug-Badges (oben links auf Screen, CSS-Mirror-kompensiert)
- **Tests**: Pfad-Wahl-Logik isoliert testbar.

## Acceptance criteria

- [ ] `selectAnalysisPath(handLandmarks)` Funktion gibt `'hand'` oder `'pose-fallback'` zurück, isoliert testbar
- [ ] rAF-Wrist-Branch wählt Pfad pro Frame, ruft die entsprechende Analyse-Code-Variante
- [ ] Übergang Hand→Pose und Pose→Hand erzeugt keinen `effectiveAngleDiff`-Sprung > 3° in einem Einzelframe
- [ ] Kalibrierung scheitert sichtbar (UI-Feedback) wenn HandLandmarker am Kalibrier-Moment leer ist
- [ ] Debug-Overlay zeigt Path-Indikator HAND (cyan) / POSE-FB (orange) hinter D-Toggle
- [ ] Manuelle Browser-Verifikation: Hand kurz verdecken → Indikator schaltet auf POSE-FB, Winkel-HUD bleibt smooth, kein sichtbarer Sprung
- [ ] Manuelle Browser-Verifikation: Hand zurück → Indikator zurück auf HAND, smoothe Übergang
- [ ] Neue Unit-Tests für Pfad-Wahl-Logik (Hand vorhanden/leer, beide Hände, falsche Handedness)
- [ ] `npm run build` und `npx vitest` grün

## Blocked by

- 11 — Flexionswinkel aus Pose-Ellenbogen + Hand-MCP
- 12 — Bend-Sign aus Palm-Normal + arm-skalierte Lock-Margin
