## ADDED Requirements

### Requirement: Projekt-Identität und Kontext
Die `copilot-instructions.md` SHALL eine kurze Projekt-Beschreibung enthalten: Live-Haltungsfeedback für Musiker, aktuell Violine, lokal via MediaPipe, React Web-App.

#### Scenario: Agent versteht Projektkontext
- **WHEN** der Agent eine beliebige Aufgabe im Workspace bearbeitet
- **THEN** kennt er den Zweck der App (Haltungsanalyse für Musiker) und die technischen Rahmenbedingungen (lokal, MediaPipe, React)

### Requirement: Architektur-Schichten dokumentiert
Die Instructions SHALL die fünf Architektur-Schichten definieren: `core/` (reine Funktionen), `rendering/` (Canvas via getState), `components/` (React-UI), `hooks/` (rAF-Loop), `store/` (Zustand). Jede Schicht SHALL mit ihrer Kernregel beschrieben sein.

#### Scenario: Agent platziert Analyse-Logik korrekt
- **WHEN** der Agent neue Analyse-Logik erstellt
- **THEN** platziert er sie in `src/core/` als reine Funktion ohne React-Abhängigkeiten

#### Scenario: Agent nutzt getState für Canvas-Rendering
- **WHEN** der Agent Canvas-Rendering-Code schreibt
- **THEN** liest er Store-Daten via `usePoseStore.getState()` und nutzt keine React-Subscriptions

### Requirement: Feedback-Philosophie
Die Instructions SHALL die positive Feedback-Philosophie definieren: asymmetrische Tension-Kurve (langsam steigen, schnell fallen), sanfte Layer-Namen, keine negative Sprache in Feedback-Texten.

#### Scenario: Agent schreibt Feedback-Text
- **WHEN** der Agent UI-Text oder Feedback-Meldungen erstellt
- **THEN** verwendet er positive, ermutigende Formulierungen und vermeidet Wörter wie "falsch", "schlecht", "Fehler"

#### Scenario: Agent implementiert Tension-Logik
- **WHEN** der Agent Tension/Feedback-Mechaniken implementiert
- **THEN** folgt er dem Prinzip: schnelle Belohnung (schneller Decay), langsame Bestrafung (langsamer Rise)

### Requirement: UI-Nicht-Intrusivität
Die Instructions SHALL das Prinzip der nicht-intrusiven UI definieren: Canvas-Overlay als primärer Feedback-Kanal, minimale UI-Chrome an Bildschirmrändern, keine Modals/Popups während aktiver Sessions.

#### Scenario: Agent erstellt UI-Komponente für aktive Session
- **WHEN** der Agent eine Komponente für die aktive Übungssession erstellt
- **THEN** verwendet er keine Modals, Popups oder zentrale Overlays die das Üben unterbrechen

### Requirement: Instrument-Erweiterungsmuster
Die Instructions SHALL eine explizite Checkliste für das Hinzufügen neuer Instrumente enthalten: FocusMode-Union, Analyzer, MasterPrint-Variante, Layer-Labels, UI-Selector.

#### Scenario: Agent fügt neues Instrument hinzu
- **WHEN** der Agent ein neues Instrument (z.B. Cello) implementieren soll
- **THEN** folgt er der dokumentierten Checkliste und erstellt alle nötigen Artefakte konsistent zum bestehenden Violin-Pattern

### Requirement: Code-Konventionen
Die Instructions SHALL die Konventionen definieren: Deutsche UI-Strings, englische Code/Variablennamen, TailwindCSS v4 mit `cn()`, `sapphire` Brand-Token, Zustand Flat-Store mit separaten Selektoren, Factory-Funktionen für Analyzer.

#### Scenario: Agent erstellt neue Komponente
- **WHEN** der Agent eine neue React-Komponente erstellt
- **THEN** nutzt er TailwindCSS v4 mit `cn()` Utility, deutsche UI-Strings und englische Variablennamen

### Requirement: Skill-Nutzung
Die Instructions SHALL den Agent anweisen, verfügbare Skills zu nutzen wenn passend, insbesondere OpenSpec-Workflow-Skills und die Skills unter `.agents/skills/`.

#### Scenario: Agent bearbeitet komplexe Aufgabe
- **WHEN** der Agent eine Aufgabe bearbeitet für die ein relevanter Skill existiert
- **THEN** lädt und nutzt er den passenden Skill
