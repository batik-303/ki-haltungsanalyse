# 10 — HandLandmarker Lifecycle + Debug-Visualisierung (Wrist-Mode-gated)

> **Typ**: AFK

## What to build

Tracer-Bullet für die Hand-Landmarker-Integration. HandLandmarker läuft parallel zu PoseLandmarker — aber nur im Wrist-Mode — und seine 21 Hand-Landmarks erscheinen als magenta Punkte im bestehenden Debug-Overlay. Keine Analyzer-Logik-Änderung in diesem Slice — Ziel ist rein, live im Browser zu sehen wie präzise HandLandmarker an den echten MCP-Knöcheln rastet im Vergleich zu Pose's gröberen 17/19/21.

- **Lifecycle**: Lade HandLandmarker beim Eintritt in Wrist-Mode (`focusMode === 'wrist'` Store-Subscription), gib ihn frei beim Mode-Wechsel. Pose-Mode und Violin-Mode haben keinen HandLandmarker-Overhead.
- **Detection**: Pro rAF-Frame ein zusätzlicher `detectForVideo` mit demselben Video-Element und identischem Timestamp wie der Pose-Call.
- **Handedness-Filter**: HandLandmarker kann mehrere Hände liefern. Auswahl: die mit Categorie `'Left'` (Subject-Anatomie = Greifhand des Rechtshänder-Geigers). Bei keiner passenden Hand: `handLandmarks` bleibt `null`, alles läuft wie bisher.
- **Debug-Overlay**: 21 Hand-Landmarks als magenta Punkte mit numerischen Index-Labels 0..20. Verbindungslinien zwischen den Finger-Joints (Standard-Hand-Skeleton). Gleiche CSS-Mirror-Compensation wie Pose-Labels (Text liest sich normal).
- **D-Toggle**: Hand-Visualisierung folgt dem bestehenden `debugLandmarks`-Store-Flag. Single Source of Truth für alle Debug-Layer.

## Acceptance criteria

- [ ] HandLandmarker wird nur instanziiert wenn `focusMode === 'wrist'` — kein Load auf Home/Setup/Shoulder/Violin
- [ ] Mode-Wechsel von Wrist → anderem Mode ruft `landmarker.close()` auf, Speicher wird freigegeben
- [ ] Im Wrist-Mode mit sichtbarer Hand werden 21 Hand-Landmarks pro Frame erkannt
- [ ] Bei zwei detektierten Händen wird nur die linke (Subject-Anatomie, Categorie `'Left'`) verwendet
- [ ] Hand-Landmarks erscheinen im Debug-Overlay als magenta Punkte mit Index-Labels (0..20)
- [ ] Hand-Skeleton-Verbindungslinien zwischen Finger-Joints gezeichnet
- [ ] Index-Labels respektieren CSS-Mirror (Text liest sich für den Nutzer normal)
- [ ] D-Taste blendet Hand-Landmarks gemeinsam mit Pose-Landmarks ein/aus
- [ ] Keine Änderung an `computeFlexionExtensionAngle`, `computeBendDirection2D`, `computeMCP`, `WristMasterPrint` oder am rAF-Wrist-Branch
- [ ] Frame-Rate im Wrist-Mode auf Test-Hardware bleibt ≥ 25 fps mit beiden Modellen aktiv
- [ ] `npm run build` (tsc + vite) und `npx vitest` laufen grün

## Blocked by

None — can start immediately.
