# KI-Haltungsanalyse für Musiker — Projektplan

> Zuletzt aktualisiert: 2026-03-28

## Vision

Ein digitaler Haltungsspiegel für Geiger: Echtzeit-Feedback per Kamera, komplett on-device, wissenschaftlich fundiert. Langfristig erweiterbar auf andere Instrumente.

## Team

| Rolle | Person | Fokus |
|-------|--------|-------|
| CEO / Domain Expert | Anne-Sophie Hueber | Geigerin (Master), Pädagogik, Anforderungen, Testerin |
| CTO / Tech Lead | — | Computer Vision, App-Entwicklung |

### Wissenschaftliche Berater
- **Prof. Benjamin Bergmann** (HfM Mainz) — Pädagogik, systematische Violinschule
- **Prof. Dr. med. Jochen Blum** (Uni Mainz/Worms, DGfMM) — Biomechanische Grenzwerte

## Aktueller Stand

```
Phase 1: Fundament              ████████████████████  ✅ Abgeschlossen
Phase 2: Proof of Concept       ████████████████████  ✅ Abgeschlossen
Phase 3: Haltungslogik          ████████░░░░░░░░░░░░  ⚡ Teilweise
Phase 4: Stabilisierung         ░░░░░░░░░░░░░░░░░░░░  ⬚ Offen
Phase 5: Mobile App             ░░░░░░░░░░░░░░░░░░░░  ⬚ Offen
Phase 6: User-Testing           ░░░░░░░░░░░░░░░░░░░░  ⬚ Offen
Phase 7: Demo-Ready Prototyp    ░░░░░░░░░░░░░░░░░░░░  ⬚ Offen
```

**Was existiert:** Ein funktionierender Python-Prototyp (`geigen_haltung.py`, 540 Zeilen) mit MediaPipe Pose-Erkennung und 5 Haltungschecks in Echtzeit per Webcam.

**Was fehlt:** Tests, modulare Architektur, Schwellenwert-Validierung, Mobile App.

---

## Phase 1: Fundament ✅

**Status:** Abgeschlossen

- [x] 5 Fehlhaltungen definiert (Schulter-Protraktion, Handgelenk links, Kopfneigung, Schulter-Asymmetrie, Ellbogen rechts)
- [x] GitHub-Repository eingerichtet
- [x] Projektstruktur angelegt
- [x] MediaPipe als Pose-Estimation-Framework gewählt
- [x] Entwicklungsumgebung (Python + OpenCV)

---

## Phase 2: Proof of Concept ✅

**Status:** Abgeschlossen

- [x] MediaPipe PoseLandmarker (33 Körperpunkte) integriert
- [x] Echtzeit-Skelett-Tracking per Webcam
- [x] Visuelles Overlay mit Farbkodierung (grün/orange/rot)
- [x] Grundsätzliche Machbarkeit bestätigt

---

## Phase 3: Haltungslogik ⚡

**Status:** Kernlogik implementiert, aber unstrukturiert und ungetestet

### Was bereits da ist
- [x] 5 Haltungschecks implementiert (`_pruefe_*` Methoden)
- [x] Winkelberechnung (Kosinus-basiert, 2D)
- [x] 3D-Schulter-Protraktion via Z-Koordinaten
- [x] Schweregrad-System (leicht/mittel/stark)
- [x] Korrekturhinweise pro Warnung

### Was noch fehlt
- [ ] **Schwellenwert-Review:** Aktuelle Grenzwerte in `HaltungsGrenzwerte` sind erste Schätzungen — Validierung durch Prof. Dr. Blum (Biomechanik) und Prof. Bergmann (Pädagogik) steht aus
- [ ] **Kalibrierung:** Testen der Checks mit Referenzvideos (korrekte Haltung + typische Fehler)
- [ ] **Zeitliche Glättung:** Einzelframe-Warnungen können flackern — Smoothing/Hysterese fehlt
- [ ] **Edge Cases:** Verhalten bei teilweise verdeckten Landmarks (z.B. Geige verdeckt Kinn/Schulter)

### Offene Fragen
- Reichen die 5 aktuellen Checks, oder fehlen kritische Fehlhaltungen?
- Ist die Visibility-Schwelle von 0.5 richtig gewählt?
- Braucht es instrumentenspezifische Landmark-Gewichtung?

---

## Phase 4: Stabilisierung (NEU)

> **Nicht im ursprünglichen Plan.** Diese Phase schließt die Lücke zwischen "es funktioniert als Skript" und "es ist bereit für Mobile-Portierung".

**Ziel:** Testbare, modulare Codebasis als solides Fundament für die Mobile-App.

### 4.1 Architektur-Refactoring
- [ ] Haltungslogik extrahieren nach `src/haltungslogik/` (reine Berechnung, kein OpenCV)
- [ ] Visualisierung isolieren nach `src/ui/` (nur Darstellung)
- [ ] Pose-Estimation-Adapter (MediaPipe-spezifischen Code kapseln)
- [ ] Klare Schnittstellen zwischen den Modulen

```
ZIEL-ARCHITEKTUR:

┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Kamera /    │     │  Pose Estimation │     │  Haltungs-   │
│  Videoquelle │────▶│  (MediaPipe)     │────▶│  logik       │
│              │     │  src/pose_est/   │     │  src/halt./  │
└──────────────┘     └──────────────────┘     └──────┬───────┘
                                                      │
                                                      │ [Warnungen]
                                                      ▼
                                               ┌──────────────┐
                                               │  UI / Overlay│
                                               │  src/ui/     │
                                               └──────────────┘
```

### 4.2 Tests
- [ ] Unit-Tests für Winkelberechnung (`berechne_winkel`)
- [ ] Unit-Tests für jeden `_pruefe_*` Check mit synthetischen Landmarks
- [ ] Integrationstests: Vollständiger Analyse-Durchlauf mit Fixture-Daten
- [ ] CI-Pipeline (GitHub Actions) mit pytest

### 4.3 Code-Qualität
- [ ] Typisierung vervollständigen
- [ ] Docstrings wo nötig ergänzen
- [ ] Linting (ruff oder flake8)

---

## Phase 5: Mobile App

**Ziel:** Die Haltungsanalyse auf dem Smartphone — alle Berechnung on-device.

### Offene Entscheidung: Framework
| | React Native | Flutter |
|--|--------------|---------|
| MediaPipe-Support | Über `react-native-mediapipe` (Community) | Über `google_mlkit_pose_detection` (offiziell) |
| On-Device AI | TFLite via Bridge | TFLite nativ |
| Team-Erfahrung | ? | ? |
| Hot Reload | ✅ | ✅ |
| Performance | Bridge-Overhead | Kompiliert nativ |

> **Entscheidung steht aus.** Abhängig von Team-Erfahrung und MediaPipe-Integrations-Reife.

### Tasks (Framework-unabhängig)
- [ ] Framework-Entscheidung treffen und dokumentieren
- [ ] Kamera-Integration mit Echtzeit-Preview
- [ ] MediaPipe / Pose-Detection auf dem Gerät
- [ ] Haltungslogik portieren (oder via Python-Bridge / Dart-Port)
- [ ] UI: Kamera-Overlay mit Warnungen
- [ ] Testen auf verschiedenen Geräten und Lichtverhältnissen
- [ ] Performance-Optimierung (Ziel: ≥ 25 fps auf Mittelklasse-Smartphones)

---

## Phase 6: User-Testing

**Ziel:** Validierung durch echte Musiker.

- [ ] 5–10 Testpersonen rekrutieren (Studenten, Kollegen)
- [ ] Testprotokoll erstellen (Aufgaben, Szenarien, Fragebogen)
- [ ] Feedback sammeln: Nützlichkeit, Fehlalarme, fehlende Checks
- [ ] Schwellenwerte anpassen basierend auf Feedback
- [ ] Wissenschaftliche Validierung mit Prof. Dr. Blum und Prof. Bergmann

---

## Phase 7: Demo-Ready Prototyp

**Ziel:** Vorzeigbare App für Stakeholder (Berater, Fördergeber, Partner).

- [ ] UI polieren
- [ ] Demo-Video erstellen
- [ ] Präsentation: Prototyp, USP (Datenschutz/On-Device), Vision
- [ ] Onboarding-Flow (kurze Anleitung beim ersten Start)

---

## Constraints & Prinzipien

1. **On-Device only** — Kein Cloud-Upload von Video- oder Pose-Daten. Alle Inferenz lokal.
2. **Schwellenwerte sind geschützt** — `HaltungsGrenzwerte` dürfen nicht ohne Rücksprache mit den Domänen-Experten angepasst werden.
3. **Python-first** — Mobile kommt erst, wenn die Logik stabil und getestet ist.
4. **Geige zuerst** — Andere Instrumente sind Zukunftsmusik. Kein Over-Engineering für Erweiterbarkeit.

---

## Risiken

| Risiko | Impact | Mitigation |
|--------|--------|------------|
| Geige verdeckt Landmarks (Schulter, Kinn) | Checks schlagen fehl / Fehlalarme | Testen mit realen Spielvideos, ggf. Landmark-Interpolation |
| Schwellenwerte sind falsch kalibriert | Irreführende Warnungen | Experten-Validierung (Phase 6), konservative Defaults |
| MediaPipe-Genauigkeit reicht nicht | Unzuverlässiges Tracking | Frühzeitig auf Smartphone testen, Alternative MoveNet evaluieren |
| Mobile Performance zu schlecht | App ruckelt, UX leidet | Performance-Budget definieren (≥25 fps), frühes Profiling |
| Framework-Lock-in (RN/Flutter) | Aufwändiger Wechsel | Haltungslogik framework-agnostisch halten |
