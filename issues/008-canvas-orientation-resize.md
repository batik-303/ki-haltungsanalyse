# 8 — Canvas Orientation Resize

> **Typ**: HITL | **Eltern-PRD**: PRD-responsive-redesign.md

## What to build

Canvas reagiert auf Orientation-Change (Portrait↔Landscape) und dimensioniert sich neu. Landmark-Rendering wird korrekt vom Video-Koordinatensystem ins Canvas-Koordinatensystem transformiert.

- `usePoseDetection` Hook: reagiert auf `layoutStore.orientation`-Änderungen → setzt `canvas.width`/`canvas.height` neu
- `canvas-renderer.ts` / `renderFrame()`: erhält zwei neue Parameter `videoWidth` und `videoHeight`, berechnet `scaleX`/`scaleY`, transformiert Landmark-Koordinaten vor Übergabe an Sub-Module
- Einzelne Rendering-Module (`silhouette`, `target-zone`, etc.) erhalten bereits transformierte Koordinaten — sie müssen nichts von Video-vs-Canvas wissen
- Keine Resize bei jedem Pixel-Resize — nur bei Orientation-Wechsel

## Acceptance criteria

- [ ] Beim Drehen von Landscape auf Portrait: Canvas wird neu dimensioniert
- [ ] Landmark-Linien (Silhouette, Wrist-Lines, Golden-Band) bleiben korrekt auf dem Videobild positioniert
- [ ] Kein Flackern während der Neu-Dimensionierung
- [ ] Koordinaten-Transformation korrekt: Landmark bei Video-Position (320, 240) landet bei Canvas-Größe 390×844 an der richtigen Stelle
- [ ] Rendering-Module erhalten transformierte Koordinaten (kein Modul muss `videoWidth`/`videoHeight` kennen)
- [ ] **Manueller Test**: Session starten, Gerät von Landscape auf Portrait drehen und zurück. Canvas-Overlay bleibt passgenau auf dem Video.

## Blocked by

- #1 Layout-System Foundation