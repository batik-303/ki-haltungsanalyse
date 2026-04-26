## Context

Das Projekt `ki-haltungsanalyse` ist eine React/Vite/TypeScript Web-App für Live-Haltungsanalyse von Musikern mittels MediaPipe. Die Architektur ist bereits modular aufgebaut:

- `src/core/` — reine Funktionen ohne React-Abhängigkeiten (Analyse, Kalibrierung, Signal)
- `src/rendering/` — Canvas-Rendering via `getState()` (kein React-Subscription)
- `src/components/` — React-UI mit Zustand-Subscriptions
- `src/hooks/` — rAF-Loop und MediaPipe-Integration
- `src/store/` — Zustand Flat-Store mit separaten Selektoren

Aktuell existiert keine `.github/copilot-instructions.md`. Der AI-Agent hat keinen Kontext über projektspezifische Konventionen, was zu inkonsistentem generierten Code führt.

Skills existieren unter `.github/skills/` (OpenSpec-Workflow) und `.agents/skills/` (caveman, context7, find-skills, frontend-design).

## Goals / Non-Goals

**Goals:**
- Agent versteht die Architektur-Trennung (core/rendering/components/hooks/store)
- Agent kennt das Instrument-Erweiterungsmuster (neue FocusMode → Analyzer → MasterPrint-Variante → Layer-Labels)
- Agent folgt der Feedback-Philosophie (positiv, nicht-intrusiv, sanfte Layer-Namen)
- Agent kennt UI-Konventionen (TailwindCSS v4, `cn()`, `sapphire` Token, deutsche Strings)
- Agent nutzt verfügbare Skills wenn passend
- Datei ist minimal und actionable — jede Zeile beeinflusst Agent-Verhalten

**Non-Goals:**
- Keine Duplikation von ESLint/TypeScript-Regeln (werden bereits enforced)
- Kein vollständiges Architektur-Dokument (dafür gibt es das archivierte Design)
- Keine Anleitung für Nicht-Agent-Entwickler (kein CONTRIBUTING.md-Ersatz)
- Keine Internationalisierung der Instructions selbst (Datei in Deutsch)

## Decisions

### 1. Eine `copilot-instructions.md` statt `AGENTS.md`
**Entscheidung:** `copilot-instructions.md` in `.github/`
**Rationale:** Cross-Editor-kompatibel (VS Code empfohlen), Projekt ist kein Monorepo. `AGENTS.md` ist für Monorepo-Hierarchien gedacht. Nur eines der beiden Formate verwenden.

### 2. Sprache: Deutsch
**Entscheidung:** Instructions in Deutsch verfassen, wie die gesamte UI
**Rationale:** Konsistenz mit dem Projekt. UI-Strings sind deutsch, Feedback-Meldungen deutsch. Agent soll deutschen Kontext verstehen. Code und Variablennamen bleiben Englisch.
**Erweiterung:** Später können weitere Sprachen ergänzt werden.

### 3. Struktur: Thematische Sektionen statt Prosa
**Entscheidung:** Klare Markdown-Sektionen: Projekt-Identität, Architektur, Konventionen, Feedback-Philosophie, Instrument-Erweiterung, Skills
**Rationale:** Agent-Instructions sollen scanbar sein. Jede Sektion hat einen klaren Zweck. Best Practice laut VS Code Docs: "Concise and actionable".

### 4. Referenzierung statt Embedding
**Entscheidung:** Für tiefere Details auf existierende Dateien verweisen (z.B. `src/core/types.ts` für Typen, archiviertes Design für Architektur-Entscheidungen)
**Rationale:** Vermeidet Duplikation und hält die Datei kompakt. Agent kann referenzierte Dateien bei Bedarf lesen.

### 5. Instrument-Erweiterung als explizite Checkliste
**Entscheidung:** Konkrete Schritte für "neues Instrument hinzufügen" als nummerierte Liste
**Rationale:** Das ist die häufigste zukünftige Erweiterung. Ein klares Rezept verhindert, dass der Agent Schritte vergisst oder inkonsistente Patterns einführt.

## Risks / Trade-offs

- **Zu viel Content** → Agent-Context-Window wird belastet, irrelevante Regeln stören. Mitigation: Strikt minimal halten, regelmäßig reviewen.
- **Veraltet** → Instructions divergieren vom tatsächlichen Code. Mitigation: Bei Architektur-Änderungen Instructions mit-aktualisieren (als Aufgabe in Changes aufnehmen).
- **Deutsch als Hürde** → Nicht-deutschsprachige Contributor könnten Probleme haben. Mitigation: Code/Variablen bleiben englisch. Instructions können später mehrsprachig werden.
