## Context

Die App hat aktuell einen einzigen Darstellungsmodus: Kamerabild + Canvas-Overlay mit Silhouette, Linien, Anker und Side-View. Sprachbefehle existieren bereits (kalibrieren, start, stop, neu) via `use-voice-control.ts` mit Keyword-Matching. Das Wrist-Side-View (`wrist-side-view.ts`) existiert bereits als schematische Darstellung, die perspektivunabhängig funktioniert — das ist die Grundlage für den Flow-Modus.

Der Rendering-Dispatch in `canvas-renderer.ts` liest Store-State via `usePoseStore.getState()` und zeichnet alles bedingungslos. Das Video-Element wird in der Session-Screen-Komponente über CSS angezeigt.

## Goals / Non-Goals

**Goals:**
- Musiker können zwischen Flow und Analyse wechseln ohne die Session zu unterbrechen
- Flow-Modus: minimales, peripherisches Feedback auf dunklem Hintergrund
- Analyse-Modus: volles visuelles Feedback wie bisher
- Sprachsteuerung für nahtloses Umschalten
- Architektur generisch genug für alle Haltungsmodi (nicht nur Wrist)

**Non-Goals:**
- Automatisches Umschalten basierend auf Verhalten (v2-Feature)
- Eigene Side-View-Elemente für Shoulder/Violin (kommen mit jeweiligem Instrument-Change)
- Schwarzbild-Modus als Energiesparmodus — es geht um Feedback-Fokus, nicht um Performance

## Decisions

### D1: View-Mode als Store-State

**Entscheidung:** `viewMode: 'flow' | 'analyse'` als neues Feld im Zustand-Store. Default: `'analyse'` (bestehende Nutzer sehen keine Änderung).

**Alternativen:**
- *React-State in Session-Screen:* Einfacher, aber nicht vom Canvas-Renderer lesbar (der liest nur Store via getState())
- *URL-Parameter:* Nicht sinnvoll für Live-Umschaltung

**Begründung:** Canvas-Renderer muss den View-Mode lesen — der Store ist die einzige Brücke zwischen React und dem rAF-Loop.

### D2: Flow-Rendering-Logik im bestehenden Renderer

**Entscheidung:** `renderFrame()` prüft `viewMode` und überspringt Silhouette + Body-Overlay + Detail-Linien im Flow-Modus. Nur das mode-spezifische Side-View-Element wird gezeichnet. Hintergrund wird schwarz gefüllt statt transparent.

**Alternativen:**
- *Separater Flow-Renderer:* Saubere Trennung, aber viel Duplikation (Side-View + Anchor + Glow müssen trotzdem gezeichnet werden)
- *CSS-only (Kamerabild ausblenden):* Funktioniert für den schwarzen Hintergrund, aber der Renderer zeichnet trotzdem alles unnötig

**Begründung:** Minimale Änderung — ein `if`-Gate am Anfang des Renderers. Side-View, Anchor und Return-Glow werden in beiden Modi gezeichnet.

### D3: Sprachbefehle erweitern

**Entscheidung:** Zwei neue Keywords in `COMMAND_KEYWORDS`: `flow: ['flow']` und `analyse: ['analyse', 'analys']`. Die Session-Screen bindet diese an `usePoseStore.setState({ viewMode })`.

**Begründung:** Passt ins bestehende Pattern — gleiche Architektur wie kalibrieren/start/stop.

### D4: Video-Element in Flow-Modus

**Entscheidung:** Video-Element via CSS ausblenden (`opacity: 0` oder `display: none`). Canvas bleibt sichtbar und füllt schwarz + Side-View.

**Begründung:** Video muss weiter an MediaPipe gesendet werden (Analyse läuft!), darf aber nicht sichtbar sein. `opacity: 0` ist einfacher als `display: none`, da kein Layout-Reflow nötig.

## Risks / Trade-offs

- **Shoulder/Violin haben noch kein Side-View** → Mitigation: Im Flow-Modus wird für diese Modi erstmal nur Farbe/Tension als Text oder einfacher Indikator gezeigt. Echte Side-Views kommen mit jeweiligem Instrument-Change.
- **Nutzer vergisst in welchem Modus er ist** → Mitigation: Dezenter Mode-Indikator am Bildschirmrand ("Flow" / "Analyse").
- **Schwarzer Hintergrund bei schlechtem Kamerawinkel** → Mitigation: Analyse bleibt nur einen Sprachbefehl entfernt.
