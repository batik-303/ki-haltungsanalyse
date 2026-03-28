# KI-Haltungsanalyse für Musiker

KI-gestützte Echtzeit-Haltungsanalyse für Musiker – der digitale Spiegel beim Üben.

## Was ist das?

Eine App, die per Smartphone-Kamera die Körperhaltung von Musikern in Echtzeit analysiert und präventiv vor schädlichen Fehlhaltungen warnt. Alle Daten werden **lokal auf dem Gerät** verarbeitet – kein Cloud-Upload, 100% Datenschutz.

## Projektstruktur

```
ki-haltungsanalyse/
├── src/
│   ├── pose_estimation/   # Skelett-Tracking (MediaPipe / MoveNet)
│   ├── haltungslogik/     # Regeln & Winkelberechnungen
│   └── ui/                # Benutzeroberfläche
├── data/
│   ├── videos/            # Trainings-/Testvideos (nicht im Repo!)
│   └── modelle/           # Exportierte Modelle
├── tests/                 # Unit- und Integrationstests
└── docs/                  # Dokumentation & Notizen
```

## Tech-Stack (geplant)

- **Pose Estimation:** MediaPipe / TensorFlow Lite
- **Mobile App:** React Native (oder Flutter)
- **Prototyping:** Python + OpenCV
- **On-Device AI:** Edge Computing, keine Cloud-Abhängigkeit

## Erste Schritte

```bash
# Repository klonen
git clone git@github.com:DEIN-USERNAME/ki-haltungsanalyse.git

# Python-Abhängigkeiten installieren (für Prototyping)
pip install -r requirements.txt
```

## Team

- **CEO / Domain Expert:** Anne-Sophie Hueber – Geigerin (Master), Pädagogik & Anforderungen
- **CTO / Tech-Lead:** Full-Stack-Entwickler – Computer Vision, App-Entwicklung

## Wissenschaftliches Fundament

- **Pädagogik:** Systematische Violinschule, Prof. Benjamin Bergmann (HfM Mainz)
- **Medizin:** Biomechanische Grenzwerte, Prof. Dr. med. Jochen Blum (Uni Mainz/Worms, DGfMM)

## Lizenz

Proprietär – Alle Rechte vorbehalten.
