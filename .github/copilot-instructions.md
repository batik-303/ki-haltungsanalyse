# Projekt-Richtlinien

## Projekt

Live-Haltungsfeedback für Musiker — aktuell Violine, künftig weitere Instrumente. Läuft lokal im Browser via MediaPipe Pose Landmarker. Stack: React 18, TypeScript, Vite, Zustand, TailwindCSS v4.

## Architektur

Fünf Schichten mit strikter Trennung:

| Schicht | Pfad | Regel |
|---------|------|-------|
| Analyse-Kern | `src/core/` | Reine Funktionen, **kein React**, keine Imports aus `components/` oder `hooks/` |
| Rendering | `src/rendering/` | Canvas-Zeichnung, liest Store via `usePoseStore.getState()` — **keine React-Subscriptions** |
| Komponenten | `src/components/` | React-UI, liest Store via `usePoseStore((s) => s.field)` Selector-Pattern |
| Hooks | `src/hooks/` | rAF-Loop, MediaPipe-Integration, verbindet Core mit Store |
| Store | `src/store/` | Zustand Flat-Store, Selektoren in separater Datei (`selectors.ts`) |

Analyzer sind Factory-Funktionen mit Closure-State (z.B. `createViolinAnalyzer()`), genutzt via `useRef` in Hooks.

## Feedback-Philosophie

- **Positiv formulieren** — ermutigende Sprache, keine Wörter wie "falsch", "schlecht", "Fehler"
- **Asymmetrische Tension** — langsamer Rise (Bestrafung), schneller Decay (Belohnung). Der Nutzer soll die Rückkehr zur guten Haltung sofort spüren
- **Sanfte Layer-Namen** — `flow → bewusst → achtung → limit`. Layers leiten Aufmerksamkeit, sie bestrafen nicht
- Siehe `src/core/analysis/layer-classifier.ts` für Layer-Konfiguration

## UI-Prinzipien

- Canvas-Overlay ist der **primäre Feedback-Kanal** — nicht die React-UI
- UI-Chrome minimal und an Bildschirmrändern. Kein Element soll den Blick auf das Instrument blockieren
- **Keine Modals, Popups oder zentrale Overlays** während aktiver Sessions
- Der Musiker übt — die App ist Beiwerk, nicht Hauptsache

## Neues Instrument hinzufügen

Checkliste für jedes neue Instrument (Beispiel: Cello):

1. `FocusMode` Union in `src/core/types.ts` erweitern
2. Neuen Analyzer als Factory-Funktion in `src/core/analysis/` erstellen
3. `MasterPrint` Discriminated Union in `src/core/types.ts` um Variante ergänzen
4. Mode-spezifische Layer-Labels und Messages in `src/core/analysis/layer-classifier.ts` hinzufügen
5. `FocusModeSelector` Komponente aktualisieren
6. Kalibrierung in `src/core/calibration/master-print.ts` erweitern
7. Ggf. neue Rendering-Module in `src/rendering/` anlegen

Bestehende Violin-Implementierung als Referenz nutzen.

## Konventionen

- **UI-Sprache**: Deutsch (alle sichtbaren Strings)
- **Code-Sprache**: Englisch (Variablen, Funktionen, Typen, Kommentare)
- **Styling**: TailwindCSS v4, `cn()` Utility aus `src/lib/utils.ts`, `sapphire` als Brand-Farbtoken
- **State**: Zustand Flat-Store, abgeleitete Werte als reine Selector-Funktionen in `src/store/selectors.ts`
- **Typen**: Zentral in `src/core/types.ts`, Discriminated Unions für mode-spezifische Daten

## Skills

Verfügbare Skills bei passenden Aufgaben nutzen:

- **MediaPipe**: `.agents/skills/mediapipe-usage/` — bei Arbeit mit Pose Landmarker, Landmarks, Detection-Setup
- **OpenSpec-Workflow**: `.github/skills/` — für Changes vorschlagen, implementieren, archivieren
- **Context7**: `.agents/skills/context7/` — für aktuelle Library-Dokumentation
- **Frontend-Design**: `.agents/skills/frontend-design/` — für UI-Komponenten mit hoher Designqualität
- **Skill-Discovery**: `.agents/skills/find-skills/` — wenn ein passender Skill existieren könnte
