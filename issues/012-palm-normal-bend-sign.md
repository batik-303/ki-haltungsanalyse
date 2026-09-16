# 12 — Bend-Sign aus Palm-Normal + arm-skalierte Lock-Margin

> **Typ**: AFK

## What to build

Stabilisiert das Vorzeichen der Bend-Richtung. Heute kommt der Sign aus dem `cz`-Component eines 3D-Crossproducts im Bildraum — für die typische Violin-Pose (Arm zur Kamera) ist das die rauschende Achse, der Sign flackert. Neu: Sign aus der Palm-Normal-Hand-Geometrie.

- **Palm-Normal**: `palmNormal = (Hand[0] → Hand[5]) × (Hand[0] → Hand[17])` — Vektor senkrecht zur Handfläche, eindeutig vom Daumen-Seite weg.
- **Sign**: `bendSign = sign(dot(handVec, palmNormal))` — positiv = Flexion (Palmar), negativ = Extension (Dorsal). Orientation-invariant: Funktioniert egal wie der Arm im Raum steht.
- **Lock-Margin**: `updateBendLock` Margin wird proportional zur Forearm-Länge skaliert statt der heutigen Konstante mit dominantem Floor (`|refBendDir| * 0.6 + 0.002` → arm-proportional). Damit lockt die Direction in beide Richtungen bei gleichem relativen Bend.
- **Konsistenz**: Kalibrier-`flexBendDir` und Runtime-Sign nutzen exakt denselben Code-Pfad (keine Variante in `createMasterPrint` und eine andere im rAF-Loop).
- **Debug-Visualisierung** (hinter D-Toggle):
  - Palm-Normal als kurzer weißer Pfeil vom Hand-Wrist in Normal-Richtung
  - Aktueller Sign als ±-Symbol neben dem Lock-Status-Indikator im Side-View
- **Tests**: Orientation-Invarianz des Signs als neue Unit-Tests.

## Acceptance criteria

- [ ] Palm-Normal-Funktion implementiert mit Cross-Product von zwei Hand-Vektoren (Index-MCP und Pinky-MCP)
- [ ] Bend-Sign-Berechnung über Dot-Product mit Palm-Normal — eindeutig ±1 pro Frame
- [ ] `updateBendLock` Margin proportional zu `|forearm|` skaliert (`k * |forearm|`, kein Konstanten-Floor)
- [ ] `createMasterPrint` und rAF-Wrist-Branch nutzen denselben Sign-Code-Pfad (kein Code-Duplikat)
- [ ] Neuer Unit-Test: identischer physischer Bend bei rotierter Forearm-Orientierung → identischer Sign
- [ ] Neuer Unit-Test: Lock triggert symmetrisch bei gleichem Winkel-Anstieg in beide Bend-Richtungen
- [ ] Debug-Overlay zeigt Palm-Normal-Pfeil und ±-Sign-Symbol hinter D-Toggle
- [ ] Im Browser manuell verifizierbar: Flexion und Extension um gleichen Winkel lösen den Lock-Switch symmetrisch aus
- [ ] `npm run build` und `npx vitest` grün

## Blocked by

- 10 — HandLandmarker Lifecycle + Debug-Visualisierung
