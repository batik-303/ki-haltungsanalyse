## Why

Sich selbst auf dem Bildschirm zu sehen verändert das Spielen. Im Flow — wenn der Musiker Noten liest und spielt — ist das Kamerabild störend und das detaillierte Body-Overlay überflüssig. Peripheres Feedback (Farbe, Form, Dicke) funktioniert besser auf dunklem Hintergrund mit einer einzigen schematischen Darstellung. Gleichzeitig braucht man für bewusste Selbstbeobachtung weiterhin das volle Kamerabild mit Overlay. Zwei umschaltbare Darstellungsmodi lösen diesen Zielkonflikt — für alle Haltungsmodi gleich.

## What Changes

- Neues View-Mode-Konzept: `flow` und `analyse` als umschaltbare Darstellungsebenen
- **Flow-Modus**: Schwarzer/abgedunkelter Hintergrund, nur schematisches Side-View-Element — kein Kamerabild, kein Body-Overlay, keine Linien auf dem Körper
- **Analyse-Modus**: Alles wie bisher — Kamerabild, Silhouette, Linien, Side-View
- Sprachbefehle "Flow" und "Analyse" zum Umschalten während aktiver Session
- View-Mode gilt für alle Focus-Modi (wrist, shoulder, violin) — die schematische Darstellung wird mode-spezifisch angepasst

## Capabilities

### New Capabilities
- `view-mode-switching`: Umschaltbare Darstellungsebenen (Flow/Analyse) mit Store-State, Sprachbefehlen und Rendering-Steuerung
- `flow-view-rendering`: Flow-Modus-Rendering — schwarzer Hintergrund mit nur dem schematischen Side-View-Element als einzigem visuellen Feedback

### Modified Capabilities

## Impact

- `src/store/pose-store.ts` — neues `viewMode` State-Feld
- `src/rendering/canvas-renderer.ts` — bedingte Rendering-Logik basierend auf View-Mode
- `src/hooks/use-voice-control.ts` — neue Sprachbefehle "Flow"/"Analyse"
- `src/components/screens/session-screen.tsx` — View-Mode in Voice-Command-Map einbinden
- Künftig: Jedes neue Instrument/Haltungsmodul muss ein Flow-View-Element mitbringen (analog `wrist-side-view.ts` für Wrist)
