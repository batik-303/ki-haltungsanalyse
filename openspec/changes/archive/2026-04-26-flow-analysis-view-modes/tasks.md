## 1. Store & Types

- [x] 1.1 `ViewMode` Type (`'flow' | 'analyse'`) in `types.ts` hinzufügen
- [x] 1.2 `viewMode` State-Feld in `pose-store.ts` mit Default `'analyse'`, plus `setViewMode` Action

## 2. Voice Commands

- [x] 2.1 Keywords `flow: ['flow']` und `analyse: ['analyse', 'analys']` in `COMMAND_KEYWORDS` in `use-voice-control.ts` hinzufügen
- [x] 2.2 Voice-Command-Map in `session-screen.tsx` um `flow` und `analyse` Handler erweitern

## 3. Rendering

- [x] 3.1 `renderFrame()` in `canvas-renderer.ts`: Im Flow-Modus schwarzen Hintergrund füllen, Silhouette und Body-Overlay-Linien überspringen
- [x] 3.2 Im Flow-Modus nur Side-View + Anchor + Return-Glow zeichnen (Wrist), für Shoulder/Violin Fallback-Anchor an fester Position
- [x] 3.3 Mode-Indikator ("Flow" / "Analyse") dezent am Bildschirmrand rendern

## 4. Video-Element

- [x] 4.1 Video-Element in `session-screen.tsx` per CSS ausblenden wenn `viewMode === 'flow'` (opacity: 0, Analyse läuft weiter)

## 5. Verifikation

- [ ] 5.1 Manueller Test: Sprachbefehl "Flow" → schwarzer Hintergrund, nur Side-View
- [ ] 5.2 Manueller Test: Sprachbefehl "Analyse" → volles Kamerabild + Overlay
- [ ] 5.3 Manueller Test: Tension-Tracking funktioniert in beiden Modi
- [ ] 5.4 Manueller Test: Umschalten unterbricht Session nicht
