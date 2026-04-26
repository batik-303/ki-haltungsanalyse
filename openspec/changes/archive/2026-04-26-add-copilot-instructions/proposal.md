## Why

Das Projekt hat keine `copilot-instructions.md` — der AI-Agent hat keinen Kontext über Architektur-Entscheidungen, Konventionen, Feedback-Philosophie oder die modulare Instrument-Erweiterungsstrategie. Das führt dazu, dass generierter Code oft gegen bestehende Muster verstößt (z.B. React-Dependencies in `core/`, negative Feedback-Sprache, UI-Elemente die beim Üben stören). Jetzt ist der richtige Zeitpunkt, weil die Violin-Analyse als MVP steht und künftige Instrument-Module konsistent aufgebaut werden sollen.

## What Changes

- Neue Datei `.github/copilot-instructions.md` mit projektweiten Richtlinien
- Abdeckt: Projekt-Identität, Architektur-Regeln, Modul-Erweiterungsmuster, Feedback-Philosophie, UI-Prinzipien, Konventionen, Skill-Nutzung
- Expliziter Hinweis auf den `mediapipe-usage` Skill (`.agents/skills/mediapipe-usage/`) — Agent soll diesen bei MediaPipe-bezogener Arbeit laden
- Keine Code-Änderungen — rein dokumentarisch

## Capabilities

### New Capabilities
- `copilot-project-guidelines`: Projektweite Agent-Instruktionen die bei jedem Chat-Request automatisch geladen werden. Deckt Architektur, Konventionen, Feedback-Philosophie und Instrument-Erweiterungsmuster ab.

### Modified Capabilities
_Keine — reine Dokumentation ohne Änderung bestehender Anforderungen._

## Impact

- `.github/copilot-instructions.md` — neue Datei
- Kein Einfluss auf bestehenden Code, APIs oder Dependencies
- Beeinflusst das Verhalten des AI-Agents bei allen zukünftigen Interaktionen im Workspace
