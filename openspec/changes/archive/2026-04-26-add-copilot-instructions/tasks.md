## 1. Datei erstellen und Grundstruktur

- [x] 1.1 `.github/copilot-instructions.md` erstellen mit Markdown-Sektionsstruktur (Projekt-Identität, Architektur, Konventionen, Feedback-Philosophie, Instrument-Erweiterung, UI-Prinzipien, Skills)

## 2. Inhalt verfassen

- [x] 2.1 Sektion "Projekt" — Kurzbeschreibung: Live-Haltungsfeedback für Musiker, aktuell Violine, lokal via MediaPipe, React/Vite/TypeScript/Zustand
- [x] 2.2 Sektion "Architektur" — Die fünf Schichten mit Kernregeln: `core/` (reine Funktionen, kein React), `rendering/` (Canvas via getState), `components/` (React-UI mit Zustand-Subscriptions), `hooks/` (rAF-Loop), `store/` (Flat-Store + separate Selektoren)
- [x] 2.3 Sektion "Feedback-Philosophie" — Positive Sprache, asymmetrische Tension (rise slow/fall fast), sanfte Layer-Namen, keine negative Terminologie
- [x] 2.4 Sektion "UI-Prinzipien" — Canvas-Overlay als primärer Kanal, minimale Chrome an Rändern, keine Modals/Popups in aktiven Sessions, Musiker soll nicht gestört werden
- [x] 2.5 Sektion "Neues Instrument hinzufügen" — Checkliste: FocusMode-Union erweitern, Analyzer in `core/analysis/`, MasterPrint-Variante, Layer-Labels in `layer-classifier.ts`, FocusModeSelector aktualisieren
- [x] 2.6 Sektion "Konventionen" — Deutsche UI-Strings, englische Code-Namen, TailwindCSS v4 + `cn()`, `sapphire` Token, Factory-Funktionen für Analyzer, Zustand-Patterns
- [x] 2.7 Sektion "Skills" — Hinweis auf verfügbare Skills in `.github/skills/` und `.agents/skills/`, Agent soll diese nutzen wenn passend

## 3. Validierung

- [x] 3.1 Prüfen dass die Datei von VS Code/Copilot korrekt erkannt wird (korrekte Platzierung in `.github/`)
- [x] 3.2 Prüfen dass keine Duplikation mit ESLint/TypeScript-Regeln vorliegt
- [x] 3.3 Prüfen dass Datei kompakt bleibt (Ziel: unter 80 Zeilen)
