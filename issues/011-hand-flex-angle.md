# 11 — Flexionswinkel aus Pose-Ellenbogen + Hand-MCP (mit Aspect-Korrektur)

> **Typ**: AFK

## What to build

Echter anatomischer Flexionswinkel: Forearm-Vektor kommt aus Pose (Ellenbogen → Wrist), Hand-Vektor aus HandLandmarker (Wrist → Middle-MCP). Beide Vektoren werden im Bildraum mit Aspect-Ratio-Korrektur berechnet — `y * (canvasWidth / canvasHeight)` macht die Pixel-Einheiten isotrop, so dass derselbe physische Bend bei vertikalem und horizontalem Arm denselben Winkel liefert. Das löst die orientation-asymmetrische Verzerrung aus dem ursprünglichen Audit.

- **Neue Signatur**: `computeFlexionExtensionAngle(poseElbow, handWrist, handMiddleMCP, aspect)` und analog `computeCollinearityAngle2D`. Hand-Middle-MCP ist HandLandmark Index 9 (echter Knöchel, nicht mehr Pose-Approximation).
- **Aspect-Source**: Layout-Store liefert die aktuellen Canvas-Dimensionen; Aspect = `width / height`. Alternative: Parameter explizit durchreichen aus dem rAF-Loop.
- **Kalibrierung**: `createMasterPrint` für Wrist seedet `flexAngle` und `calib2DAngle` aus dem neuen Pfad — nur dann, wenn HandLandmarker für den Kalibrier-Frame ein Ergebnis hatte. Sonst Kalibrier-Abbruch (User-Feedback, Wiederholung).
- **Debug-Visualisierung** (hinter D-Toggle):
  - Forearm-Vektor als cyan Linie von Pose-Ellenbogen zum Hand-Wrist
  - Hand-Vektor als lime Linie von Hand-Wrist zum Middle-MCP
  - Winkel-Arc zwischen beiden mit numerischem Grad-Wert am Wrist
- **Tests**: Orientation-Invarianz und Bend-Symmetrie als neue Unit-Tests. Bestehende `wrist-flexion.test.ts`-Suite wird auf neue Signaturen migriert oder ersetzt (alte `computeMCP`-Tests bleiben gültig).

## Acceptance criteria

- [ ] `computeFlexionExtensionAngle` und `computeCollinearityAngle2D` Signaturen nehmen Pose-Elbow + Hand-Wrist + Hand-Middle-MCP + Aspect
- [ ] Aspect-Korrektur wird im Vektor-Aufbau angewendet (`dy *= aspect`) — Validierung über Unit-Test
- [ ] `createMasterPrint` Wrist-Branch verwendet den neuen Pfad
- [ ] Kalibrierung scheitert mit lesbarem UI-Feedback wenn HandLandmarker beim Kalibrier-Moment leer ist
- [ ] Neuer Unit-Test: identischer physischer Bend bei vertikaler vs. horizontaler Forearm-Orientierung → Winkel-Differenz < 0.5°
- [ ] Neuer Unit-Test: symmetrischer Up-Bend und Down-Bend → betragsgleicher Winkel (Sign separat in Slice 12 behandelt)
- [ ] Debug-Overlay zeigt cyan Forearm, lime HandVec, Winkel-Arc, Winkel-Grad-Wert — alles hinter D-Toggle
- [ ] Rail-Farbe und HUD reagieren konsistent in beide Bend-Richtungen (manuelle Verifikation im Browser)
- [ ] Bestehende Tests in `tests/wrist-flexion.test.ts` und `tests/wrist/anchor-stability.test.ts` laufen grün (ggf. migriert)
- [ ] `npm run build` und `npx vitest` grün

## Blocked by

- 10 — HandLandmarker Lifecycle + Debug-Visualisierung
