"""
KI-Haltungsanalyse für Geiger – Erster Prototyp
================================================

Dieses Skript nutzt MediaPipe Pose, um in Echtzeit per Webcam
die Körperhaltung eines Geigers zu analysieren und bei typischen
Fehlhaltungen zu warnen.

Erkannte Fehlhaltungen:
1. Schulter-Protraktion (Rundrücken / Schultern nach vorne)
2. Falscher Handgelenkswinkel links (Griffhand)
3. Übermäßige Kopfneigung
4. Asymmetrische Schulterhöhe
5. Eingeknickte Bogenführung rechts (Ellbogen zu tief)

Verwendung:
    python geigen_haltung.py

Beenden mit 'q' oder ESC.
"""

import cv2
import mediapipe as mp
import numpy as np
import math
import os
import json
import random
import time
import urllib.request
from datetime import datetime
from dataclasses import dataclass
from typing import Optional
from collections import deque
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

try:
    from PIL import Image as PILImage, ImageDraw, ImageFont
    _PIL_VERFUEGBAR = True
except ImportError:
    _PIL_VERFUEGBAR = False

try:
    import speech_recognition as sr
    _SPRACHE_VERFUEGBAR = True
except ImportError:
    _SPRACHE_VERFUEGBAR = False


# ──────────────────────────────────────────────
# Modell-Setup
# ──────────────────────────────────────────────

MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker_full.task")
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_full/float16/latest/pose_landmarker_full.task"
)


def sicherstellen_modell():
    """Lädt das MediaPipe Pose-Modell herunter, falls noch nicht vorhanden."""
    if not os.path.exists(MODEL_PATH):
        print("Lade MediaPipe Pose-Modell herunter (einmalig, ~30 MB)...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Modell bereit.")


# ──────────────────────────────────────────────
# Anker: Persistentes Speichern & Laden
# ──────────────────────────────────────────────

def _anker_datei(profil: str) -> str:
    """Gibt den Pfad zur Anker-Datei für dieses Profil zurück."""
    dateiname = f"anchor_{profil}.json"
    return os.path.join(os.path.dirname(__file__), dateiname)


def anker_speichern(analyse: "HaltungsAnalyse"):
    """Speichert den aktuellen Blue Anchor auf die Festplatte.
    Überschreibt immer den vorherigen Wert für dieses Profil.
    Der Spieler kann jederzeit neu kalibrieren – Schulterstütze wechseln,
    Kind wächst, neues Instrument – einfach 'Anchor' sagen und fertig.
    """
    if not analyse._ankerpunkt_gesetzt:
        return
    daten = {
        "anker_diff":         analyse._anker_diff,
        "anker_l_px":         list(analyse._anker_l_px),
        "anker_r_px":         list(analyse._anker_r_px),
        "anker_ohr_abstand_l": analyse._anker_ohr_abstand_l,
        "anker_ohr_abstand_r": analyse._anker_ohr_abstand_r,
        "datum":              datetime.now().strftime("%Y-%m-%d"),
        "profil":             analyse.grenzwerte.profil,
    }
    try:
        pfad = _anker_datei(analyse.grenzwerte.profil)
        with open(pfad, "w") as f:
            json.dump(daten, f, indent=2)
        print(f"Anchor saved ({daten['datum']}) → {os.path.basename(pfad)}")
    except Exception as e:
        print(f"Anchor konnte nicht gespeichert werden: {e}")


def anker_laden(analyse: "HaltungsAnalyse") -> bool:
    """Lädt den gespeicherten Anchor beim Programmstart.
    Gibt True zurück wenn ein gespeicherter Anker gefunden wurde.
    """
    pfad = _anker_datei(analyse.grenzwerte.profil)
    if not os.path.exists(pfad):
        return False
    try:
        with open(pfad) as f:
            daten = json.load(f)
        analyse._anker_diff          = daten["anker_diff"]
        analyse._anker_l_px          = tuple(daten["anker_l_px"])
        analyse._anker_r_px          = tuple(daten["anker_r_px"])
        analyse._anker_ohr_abstand_l = daten.get("anker_ohr_abstand_l", 0)
        analyse._anker_ohr_abstand_r = daten.get("anker_ohr_abstand_r", 0)
        analyse._anker_datum         = daten.get("datum", "")
        analyse._ankerpunkt_gesetzt = True
        print(f"Anchor loaded (set: {analyse._anker_datum}) – say 'Anchor' anytime to recalibrate.")
        return True
    except Exception as e:
        print(f"Anchor konnte nicht geladen werden: {e}")
        return False


# ──────────────────────────────────────────────
# Blue Anchor: Sprachbefehl-Thread
# ──────────────────────────────────────────────

def starte_sprachbefehl_thread(analyse_instanz):
    """
    Startet einen Hintergrund-Thread für mehrsprachige Sprachbefehle.

    Erkannte Trigger-Wörter:
      EN: "anchor", "ready", "music"
      DE: "anker", "bereit", "musik"
      FR: "prêt", "musique", "ancre"

    Der Musiker sagt einfach ein Wort — in seiner eigenen Sprache —
    während beide Hände die Geige halten. Kein Knopf, kein Pedal nötig.

    Benötigt: pip install SpeechRecognition pyaudio
    """
    if not _SPRACHE_VERFUEGBAR:
        print("Info: 'SpeechRecognition' not installed – voice command disabled.")
        print("      pip install SpeechRecognition pyaudio")
        return False

    import threading

    # Alle Trigger-Wörter in allen Sprachen
    TRIGGER_WOERTER = {
        "anchor", "ready", "music",          # English
        "anker", "bereit", "musik",          # Deutsch
        "ancre", "pret", "prêt", "musique",  # Français
    }

    # Sprachen für die Erkennung (mehrere probieren)
    SPRACHEN = ["en-US", "de-DE", "fr-FR"]

    def _lausche():
        erkenner = sr.Recognizer()
        erkenner.energy_threshold = 300
        erkenner.dynamic_energy_threshold = True
        mikrofon = sr.Microphone()

        with mikrofon as quelle:
            erkenner.adjust_for_ambient_noise(quelle, duration=1)
        print("Voice command active – say 'Anchor', 'Ready', 'Anker' or 'Bereit' to set your anchor.")
        print("(Also: 'Music' / 'Musik' / 'Musique' / 'Prêt')")

        while True:
            try:
                with mikrofon as quelle:
                    audio = erkenner.listen(quelle, timeout=5, phrase_time_limit=3)

                # Versuche alle konfigurierten Sprachen
                erkannt = None
                for sprache in SPRACHEN:
                    try:
                        erkannt = erkenner.recognize_google(audio, language=sprache).lower()
                        break
                    except sr.UnknownValueError:
                        continue

                if erkannt:
                    woerter = erkannt.replace("'", "").split()
                    treffer = TRIGGER_WOERTER & set(woerter)
                    if treffer and not analyse_instanz._kalibrierung_aktiv:
                        wort = next(iter(treffer))
                        print(f"Voice command: '{erkannt}' → '{wort}' → Anchor starting!")
                        analyse_instanz.starte_kalibrierung()

            except sr.WaitTimeoutError:
                pass
            except sr.RequestError as e:
                print(f"Voice recognition error: {e}")
            except Exception:
                pass

    thread = threading.Thread(target=_lausche, daemon=True, name="BlueAnchor-Voice")
    thread.start()
    return True


# ──────────────────────────────────────────────
# Skeleton-Verbindungen (MediaPipe Pose, 33 Landmarks)
# ──────────────────────────────────────────────

POSE_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 7),
    (0, 4), (4, 5), (5, 6), (6, 8),
    (9, 10),
    (11, 12),
    (11, 13), (13, 15), (15, 17), (15, 19), (15, 21), (17, 19),
    (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (24, 26),
    (25, 27), (26, 28),
    (27, 29), (28, 30),
    (29, 31), (30, 32),
    (27, 31), (28, 32),
]


# ──────────────────────────────────────────────
# Segment-Farben (BGR) nach Körperregion
# ──────────────────────────────────────────────

FARBE_KOPF = (255, 255, 255)   # Weiß
FARBE_ARME = (255, 150, 50)    # Blau (BGR)
FARBE_TORSO = (0, 200, 100)    # Grün
FARBE_BEINE = (0, 165, 255)    # Orange

SEGMENT_FARBEN = {
    # Kopf/Gesicht
    (0, 1): FARBE_KOPF, (1, 2): FARBE_KOPF, (2, 3): FARBE_KOPF, (3, 7): FARBE_KOPF,
    (0, 4): FARBE_KOPF, (4, 5): FARBE_KOPF, (5, 6): FARBE_KOPF, (6, 8): FARBE_KOPF,
    (9, 10): FARBE_KOPF,
    # Torso
    (11, 12): FARBE_TORSO,
    (11, 23): FARBE_TORSO, (12, 24): FARBE_TORSO, (23, 24): FARBE_TORSO,
    # Arme
    (11, 13): FARBE_ARME, (13, 15): FARBE_ARME,
    (15, 17): FARBE_ARME, (15, 19): FARBE_ARME, (15, 21): FARBE_ARME, (17, 19): FARBE_ARME,
    (12, 14): FARBE_ARME, (14, 16): FARBE_ARME,
    (16, 18): FARBE_ARME, (16, 20): FARBE_ARME, (16, 22): FARBE_ARME, (18, 20): FARBE_ARME,
    # Beine
    (23, 25): FARBE_BEINE, (24, 26): FARBE_BEINE,
    (25, 27): FARBE_BEINE, (26, 28): FARBE_BEINE,
    (27, 29): FARBE_BEINE, (28, 30): FARBE_BEINE,
    (29, 31): FARBE_BEINE, (30, 32): FARBE_BEINE,
    (27, 31): FARBE_BEINE, (28, 32): FARBE_BEINE,
}

# ──────────────────────────────────────────────
# Gelenkgrößen nach Wichtigkeit (Landmark-Index → Radius)
# ──────────────────────────────────────────────

_GROESSE_GROSS = 8    # Schultern, Hüften
_GROESSE_MITTEL = 5   # Ellbogen, Knie, Handgelenke
_GROESSE_KLEIN = 3    # Rest (Finger, Zehen, Gesicht)

GELENK_GROESSEN = {i: _GROESSE_KLEIN for i in range(33)}
for idx in (11, 12, 23, 24):                          # Schultern, Hüften
    GELENK_GROESSEN[idx] = _GROESSE_GROSS
for idx in (13, 14, 15, 16, 25, 26, 27, 28):          # Ellbogen, Handgelenke, Knie, Knöchel
    GELENK_GROESSEN[idx] = _GROESSE_MITTEL

# ──────────────────────────────────────────────
# Check-zu-Landmark-Zuordnung (Modus 1–5)
# ──────────────────────────────────────────────

CHECK_LANDMARKS = {
    1: {0, 7, 8},                   # Kopfneigung: Nase, Ohren
    2: {11, 12},                    # Schulter-Asymmetrie: beide Schultern
    3: {11, 13, 15},                # Handgelenk links: Schulter, Ellbogen, Handgelenk
    4: {12, 14, 16},                # Ellbogen rechts: Schulter, Ellbogen, Handgelenk
    5: {0, 11, 12},                 # Schulter-Protraktion: Nase, beide Schultern
    6: {11},                        # Linke Schulter Anstieg (Greifhand) – Blue Anchor
    7: {12},                        # Rechte Schulter Anstieg (Bogenhand) – Blue Anchor
}

# ──────────────────────────────────────────────
# Modus-Namen
# ──────────────────────────────────────────────

MODUS_NAMEN = {
    0: "Alle Checks",
    1: "Kopfneigung",
    2: "Schulter-Asymmetrie",
    3: "Handgelenk links",
    4: "Ellbogen rechts",
    5: "Schulter-Protraktion",
    6: "Linke Schulter – Greifhand",
    7: "Rechte Schulter – Bogenhand",
}


# ──────────────────────────────────────────────
# Konfiguration
# ──────────────────────────────────────────────

@dataclass
class HaltungsGrenzwerte:
    """
    Schwellenwerte für die Haltungsanalyse.
    Diese Werte sind erste Schätzungen und müssen durch Tests
    mit echten Musikern kalibriert werden.

    Langfristig: Validierung durch Prof. Dr. Blum (Biomechanik).
    """
    # Schulter-Protraktion: Winkel der Schulterachse zur Kamera
    schulter_protraktion_max: float = 15.0  # Grad Abweichung nach vorne

    # Handgelenkswinkel links (Griffhand)
    handgelenk_links_min: float = 140.0  # Mindestwinkel (zu stark abgeknickt wenn kleiner)
    handgelenk_links_max: float = 180.0  # Maximalwinkel (überstreckt)

    # Kopfneigung
    kopfneigung_max: float = 25.0  # Maximale Neigung in Grad

    # Schulterhöhen-Differenz – Drei-Zonen-Modell
    # Grün  (< ok):  normale Spielhaltung, keine Warnung
    # Orange (ok .. warnung): auffällig, sanfter Hinweis nach Mindestdauer
    # Rot    (> warnung):     klar problematisch, sofortige Warnung
    # Arbeitswerte – finale Kalibrierung durch Prof. Dr. Blum
    schulter_asymmetrie_ok: float = 0.10       # bis 10%: grüner Bereich
    schulter_asymmetrie_warnung: float = 0.18  # ab 18%: roter Bereich (dazwischen: orange)
    schulter_asymmetrie_orange_sek: float = 1.5  # Sekunden, bevor Orange-Warnung erscheint

    # Eigene EMA-Glättung für Schulter-Asymmetrie (langsamer als Standard)
    schulter_asymmetrie_ema_alpha: float = 0.10  # träger → filtert kurze Schwankungen raus

    # Rotationskompensation: ab diesem Verhältnis (aktuelle/maximale Schulterbreite)
    # wird der Check ausgesetzt, weil Perspektive zu stark verzerrt
    schulter_rotation_min_breite: float = 0.55  # unter 55%: Check pausieren

    # Individuelle Schulter-Anstieg-Checks (Checks 6 + 7, nur mit Blue Anchor aktiv)
    # Grün  (< ok):      Schulter innerhalb der persönlichen Norm
    # Orange (ok..warn): leichter Anstieg vom Ankerpunkt, Hinweis nach Mindestdauer
    # Rot    (> warn):   deutlicher Anstieg – Verspannung erkannt
    # VORLAEUFIG – Validierung durch Prof. Dr. Blum ausstehend
    schulter_anstieg_ok: float = 0.07        # bis 7% Anstieg vom Anker: grün
    schulter_anstieg_warnung: float = 0.13   # ab 13%: rot
    schulter_anstieg_orange_sek: float = 2.0 # Sekunden bevor Orange erscheint
    schulter_anstieg_ema_alpha: float = 0.10 # träge Glättung (wie Asymmetrie)

    # Blum-Limit: medizinische Langzeit-Grenze (nur Profi-Profil sichtbar)
    # Prof. Dr. Blum: ab diesem Schulter-Anstieg langfristig schädlich
    # VORLAEUFIG – finale Kalibrierung durch Prof. Dr. Blum ausstehend
    blum_grenze_ratio: float = 0.15      # 15% Schulterbreite über dem Ankerpunkt
    blum_langfristig_sek: float = 30.0   # Sekunden im Blum-Bereich → diskreter Hinweis

    # Ellbogen rechts (Bogenführung)
    ellbogen_rechts_min: float = 80.0  # Mindestwinkel
    ellbogen_rechts_max: float = 160.0  # Maximalwinkel

    # Temporale Glättung
    ema_alpha: float = 0.3  # Gewichtung neuer Frames (0.0–1.0, höher = reaktiver)
    hysterese_faktor: float = 0.20  # 20% Hysterese-Band für Schwellenwerte

    # Feedback-Modus
    profil: str = "erwachsen"  # "erwachsen" oder "kind"
    # Lob-Timing: nach wie vielen Sekunden guter Haltung loben?
    lob_nach_sekunden: float = 15.0    # Erwachsene: seltener
    lob_cooldown_sek: float = 30.0     # Mindestabstand zwischen zwei Lob-Meldungen

    @classmethod
    def kinder_profil(cls) -> "HaltungsGrenzwerte":
        """Erstellt ein kindgerechtes Profil mit großzügigeren Werten."""
        return cls(
            profil="kind",
            # Großzügigere Schulter-Asymmetrie-Grenzen
            schulter_asymmetrie_ok=0.13,         # 13% statt 10%
            schulter_asymmetrie_warnung=0.22,     # 22% statt 18%
            schulter_asymmetrie_orange_sek=3.0,   # 3 Sek. statt 1.5 – mehr Geduld
            schulter_asymmetrie_ema_alpha=0.07,   # noch träger – Kinder bewegen sich mehr
            # Großzügigere Kopfneigung (Kinder: größerer Kopf)
            kopfneigung_max=30.0,                 # 30° statt 25°
            # Langsamere globale Glättung
            ema_alpha=0.2,                        # 0.2 statt 0.3
            # Häufigeres Loben
            lob_nach_sekunden=10.0,               # nach 10 Sek. loben (statt 15)
            lob_cooldown_sek=20.0,                # öfter loben als bei Erwachsenen
            # Großzügigere individuelle Schulter-Anstieg-Werte
            schulter_anstieg_ok=0.10,             # 10% statt 7%
            schulter_anstieg_warnung=0.18,        # 18% statt 13%
            schulter_anstieg_orange_sek=3.5,      # mehr Geduld bei Kindern
            schulter_anstieg_ema_alpha=0.07,      # noch träger
        )

    @classmethod
    def profi_profil(cls) -> "HaltungsGrenzwerte":
        """Profil für professionelle Musiker: minimales Feedback, strenge Grenzen,
        Trail-Visualisierung und diskrete Blum-Linie.
        """
        return cls(
            profil="profi",
            # Strenger als Erwachsene (Profis haben hohes Körperbewusstsein)
            schulter_asymmetrie_ok=0.06,
            schulter_asymmetrie_warnung=0.11,
            schulter_asymmetrie_orange_sek=3.0,
            schulter_asymmetrie_ema_alpha=0.08,
            # Seltenes Lob – Profis brauchen keine Bestätigung für Basics
            lob_nach_sekunden=30.0,
            lob_cooldown_sek=60.0,
            # Individuelle Schulter-Anstieg-Werte (strenger als Erwachsene)
            schulter_anstieg_ok=0.05,
            schulter_anstieg_warnung=0.09,
            schulter_anstieg_orange_sek=3.0,
            schulter_anstieg_ema_alpha=0.08,
        )


# ──────────────────────────────────────────────
# Feedback-Texte nach Profil
# ──────────────────────────────────────────────

FEEDBACK_TEXTE = {
    "erwachsen": {
        # Lob bei anhaltend guter Haltung
        "lob": [
            "Schultern frei – schoen so",
            "Entspannt – genau das",
            "Schultern fliessen – weiter so",
        ],
        # Übergang grün → orange: einladen, nicht anweisen
        "gruen_zu_orange": "Schultern fliessen lassen",
        # Übergang orange → rot: ruhig, atembasiert
        "orange_zu_rot": "Einatmen – Schultern sinken lassen",
        # Übergang orange/rot → grün: anerkennen, nicht bewerten
        "korrektur_geschafft": "Schultern sind frei",
    },
    "kind": {
        "lob": [
            "Super, deine Schultern sind so schoen locker!",
            "Toll, genau so ist es richtig!",
            "Klasse, du spielst ganz entspannt!",
            "Weiter so, das fuehlt sich gut an!",
        ],
        # Kinder: spielerisch, nicht mahnend
        "gruen_zu_orange": "Schultern einmal kurz fallen lassen!",
        "orange_zu_rot": "Einmal tief einatmen und Schultern loslassen!",
        "korrektur_geschafft": "Ja, genau so – das ist es!",
    },
}


@dataclass
class Messung:
    """Messergebnis eines Checks mit Positionsdaten für die Visualisierung."""
    check_index: int          # 1–5
    messwert: float           # Gemessener Wert (Winkel in Grad oder Ratio)
    einheit: str = "°"        # "°" für Winkel, "%" für Verhältnisse
    gelenk_position: Optional[tuple] = None  # (x, y) Pixel für Label-Platzierung
    # Für Winkelbogen-Zeichnung: die drei Punkte (a, b, c) wobei b das Gelenk ist
    punkt_a: Optional[tuple] = None
    punkt_b: Optional[tuple] = None
    punkt_c: Optional[tuple] = None
    schwelle_min: Optional[float] = None
    schwelle_max: Optional[float] = None


@dataclass
class Warnung:
    """Eine erkannte Fehlhaltung mit Schweregrad und Korrekturhinweis."""
    name: str
    schweregrad: str  # "leicht", "mittel", "stark"
    korrektur: str
    farbe: tuple  # BGR-Farbe für die Visualisierung
    check_index: int = 0  # 1–5, zugehöriger Check (für Segment-Highlighting)
    messung: Optional[Messung] = None  # Messdaten für Winkel-Visualisierung


# ──────────────────────────────────────────────
# Hilfsfunktionen
# ──────────────────────────────────────────────

def berechne_winkel(punkt_a, punkt_b, punkt_c) -> float:
    """
    Berechnet den Winkel am Punkt B zwischen den Vektoren BA und BC.

    Args:
        punkt_a, punkt_b, punkt_c: Jeweils (x, y) Koordinaten

    Returns:
        Winkel in Grad (0-180)
    """
    a = np.array(punkt_a)
    b = np.array(punkt_b)
    c = np.array(punkt_c)

    ba = a - b
    bc = c - b

    kosinus = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    kosinus = np.clip(kosinus, -1.0, 1.0)
    winkel = math.degrees(math.acos(kosinus))

    return winkel


def hole_punkt(landmarks, index, breite, hoehe) -> Optional[tuple]:
    """
    Extrahiert einen Landmark-Punkt als Pixelkoordinaten.

    Args:
        landmarks: Liste von NormalizedLandmark (mediapipe.tasks)
        index: Index des Landmarks
        breite, hoehe: Bildabmessungen

    Returns:
        (x, y) Pixelkoordinaten oder None bei schlechter Sichtbarkeit
    """
    lm = landmarks[index]
    if lm.visibility < 0.5:
        return None
    return (int(lm.x * breite), int(lm.y * hoehe))


def hole_punkt_3d(landmarks, index) -> Optional[tuple]:
    """Extrahiert einen 3D-Landmark-Punkt (normalisiert)."""
    lm = landmarks[index]
    if lm.visibility < 0.5:
        return None
    return (lm.x, lm.y, lm.z)


# ──────────────────────────────────────────────
# Unicode-Textrendering
# ──────────────────────────────────────────────

_UMLAUT_ERSETZUNGEN = {
    "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
    "Ä": "Ae", "Ö": "Oe", "Ü": "Ue",
    "–": "-", "—": "-",
}

_schrift_pfad_cache: Optional[str] = None
_schrift_cache: dict = {}


def _finde_schrift(groesse: int = 16):
    """Sucht eine TTF-Schrift mit Unicode-Unterstützung (gecacht nach Größe)."""
    global _schrift_pfad_cache
    if not _PIL_VERFUEGBAR:
        return None

    if groesse in _schrift_cache:
        return _schrift_cache[groesse]

    # Pfad einmalig suchen
    if _schrift_pfad_cache is None:
        kandidaten = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/SFNSText.ttf",
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ]
        for pfad in kandidaten:
            if os.path.exists(pfad):
                _schrift_pfad_cache = pfad
                break
        if _schrift_pfad_cache is None:
            _schrift_pfad_cache = ""  # Markiert: kein Font gefunden

    if _schrift_pfad_cache:
        try:
            schrift = ImageFont.truetype(_schrift_pfad_cache, groesse)
            _schrift_cache[groesse] = schrift
            return schrift
        except Exception:
            pass

    # Fallback: PIL Default-Font
    try:
        schrift = ImageFont.load_default()
        _schrift_cache[groesse] = schrift
        return schrift
    except Exception:
        return None


def _ascii_fallback(text: str) -> str:
    """Ersetzt Umlaute durch ASCII-Äquivalente."""
    for original, ersatz in _UMLAUT_ERSETZUNGEN.items():
        text = text.replace(original, ersatz)
    return text


def zeichne_text(bild, text: str, position: tuple, schriftgroesse: float = 0.5,
                 farbe: tuple = (255, 255, 255), dicke: int = 1):
    """
    Zeichnet Unicode-Text auf ein OpenCV-Bild.
    Nutzt Pillow wenn verfügbar, sonst cv2.putText mit ASCII-Fallback.
    """
    if _PIL_VERFUEGBAR:
        schrift = _finde_schrift(int(schriftgroesse * 28))
        if schrift is not None:
            # BGR → RGB für PIL
            bild_rgb = cv2.cvtColor(bild, cv2.COLOR_BGR2RGB)
            pil_bild = PILImage.fromarray(bild_rgb)
            draw = ImageDraw.Draw(pil_bild)
            # OpenCV-Farbe ist BGR, PIL erwartet RGB
            farbe_rgb = (farbe[2], farbe[1], farbe[0])
            draw.text(position, text, font=schrift, fill=farbe_rgb)
            bild[:] = cv2.cvtColor(np.array(pil_bild), cv2.COLOR_RGB2BGR)
            return

    # Fallback: ASCII-Transliteration mit cv2.putText
    cv2.putText(bild, _ascii_fallback(text), position,
                cv2.FONT_HERSHEY_SIMPLEX, schriftgroesse, farbe, dicke)


# ──────────────────────────────────────────────
# MediaPipe Landmark-Indizes (zur Übersicht)
# ──────────────────────────────────────────────
# 0  = Nase
# 7  = Linkes Ohr
# 8  = Rechtes Ohr
# 11 = Linke Schulter
# 12 = Rechte Schulter
# 13 = Linker Ellbogen
# 14 = Rechter Ellbogen
# 15 = Linkes Handgelenk
# 16 = Rechtes Handgelenk

class HaltungsAnalyse:
    """Analysiert die Haltung eines Geigers basierend auf Pose-Landmarks."""

    # MediaPipe Landmark-Indizes
    NASE = 0
    LINKES_OHR = 7
    RECHTES_OHR = 8
    LINKE_SCHULTER = 11
    RECHTE_SCHULTER = 12
    LINKER_ELLBOGEN = 13
    RECHTER_ELLBOGEN = 14
    LINKES_HANDGELENK = 15
    RECHTES_HANDGELENK = 16

    def __init__(self, grenzwerte: Optional[HaltungsGrenzwerte] = None):
        self.grenzwerte = grenzwerte or HaltungsGrenzwerte()
        # Temporale Glättung: {check_name: {"wert": float, "warnung_aktiv": bool}}
        self._glaettung: dict = {}
        self._frames_ohne_landmarks: int = 0
        # Schulter-Asymmetrie: Rotationskompensation
        self._schulter_referenz_breite: float = 0.0  # max. beobachtete Schulterbreite
        # Schulter-Asymmetrie: Orange-Mindestdauer
        self._schulter_orange_start: Optional[float] = None  # Zeitstempel (time.time())
        # Feedback-System: Zustandsübergänge & Lob
        self._letzte_zone: str = "gruen"         # letzte erkannte Zone
        self._gruen_seit: Optional[float] = None  # Zeitstempel: seit wann durchgehend grün
        self._letztes_lob: float = 0.0            # Zeitstempel des letzten Lobs
        self._feedback_text: Optional[str] = None  # aktuell anzuzeigender Feedback-Text
        self._feedback_bis: float = 0.0            # Zeitstempel bis wann Feedback sichtbar
        self._lob_index: int = 0                   # rotiert durch Lob-Texte
        # Schulter-Anstieg-Checks: Orange-Timer pro Seite
        self._schulter_anstieg_orange_start: dict = {}  # {"links": ts, "rechts": ts}
        # ── Open Start Zone ──────────────────────────────────────────────
        # Ohne Ankerpunkt: Analyse sofort aktiv (feste Schwellenwerte)
        # Mit Ankerpunkt: Analyse erst nach erster Bogenbewegung aktiv
        self.analyse_aktiv: bool = True  # startet aktiv; nach Kalibrierung → False
        self._prev_handgelenk_r: Optional[tuple] = None  # letzter Frame (px)
        self._bogen_bewegungs_ema: float = 0.0            # geglättete Handgelenk-Geschw.
        # ── Motion Anchor: Individueller Kalibrierungs-Ankerpunkt ──────────
        self._ankerpunkt_gesetzt: bool = False
        self._anker_l_px: Optional[tuple] = None   # linke Schulter (px) beim Kalibrieren
        self._anker_r_px: Optional[tuple] = None   # rechte Schulter (px) beim Kalibrieren
        self._anker_diff: float = 0.0              # Schulterhoehen-Differenz (ratio) am Anker
        self._anker_datum: str = ""                # Datum des letzten Ankers (z.B. "2026-04-01")
        self._anker_ohr_abstand_l: int = 0         # Ohr-Schulter-Abstand links beim Ankern (px)
        self._anker_ohr_abstand_r: int = 0         # Ohr-Schulter-Abstand rechts beim Ankern (px)
        self._kalibrierung_aktiv: bool = False
        self._kalibrierung_start: Optional[float] = None
        self._kalibrierung_dauer: float = 5.0      # nur noch für Bio-Anker verwendet
        # ── Blue Anchor: Stabilitätserkennung (kein Countdown) ──────────────
        # Ablauf: Trigger → Spieler setzt sich/steht ruhig → App erkennt
        # Stillstand → "Bereit"-Signal → erster Bogenstrich → Anker gesetzt.
        # Kein Zeitdruck. Kinder, Profis, alle Stile gleichbehandelt.
        self._schulter_puffer_l: deque = deque(maxlen=30)  # ~1 Sek. Ringpuffer
        self._schulter_puffer_r: deque = deque(maxlen=30)
        self._schulter_beweg_ema: float = 0.0       # EMA Schulter-Bewegung (normiert)
        self._kalibrierung_stabil_seit: Optional[float] = None
        self._kalibrierung_stabil_bereit: bool = False   # stabile Haltung erkannt
        self._kalibrierung_stabil_l: Optional[tuple] = None  # gemittelte stabile L-Pos.
        self._kalibrierung_stabil_r: Optional[tuple] = None  # gemittelte stabile R-Pos.
        # ── Biologischer Anker (Fallback für Anfänger ohne Lehrer) ──────────
        # Messung der natürlichen Schulterposition OHNE Instrument.
        # Ablauf: Arme hängen lassen → Bio-Anker setzen → dann Geige nehmen → Blue Anchor.
        # Die Differenz beider Anker zeigt den instrumentbedingten Einfluss auf die Schultern.
        self._bio_anker_gesetzt: bool = False
        self._bio_anker_l_px: Optional[tuple] = None
        self._bio_anker_r_px: Optional[tuple] = None
        self._bio_anker_diff: float = 0.0
        self._bio_kalibrierung_aktiv: bool = False
        self._bio_kalibrierung_start: Optional[float] = None
        # ── Profi-Trail: letzte ~2 Sek. Schulter-Positionen ─────────────────
        self._trail_l: deque = deque(maxlen=60)  # ~60 Frames ≈ 2 Sek. bei 30fps
        self._trail_r: deque = deque(maxlen=60)
        # Blum-Limit-Timer: wann wurde die medizinische Grenze überschritten?
        self._blum_limit_start: Optional[float] = None

    def glaettung_zuruecksetzen(self):
        """Setzt die Glättungswerte zurück (z.B. nach Tracking-Verlust)."""
        self._glaettung.clear()
        self._frames_ohne_landmarks = 0
        self._schulter_referenz_breite = 0.0
        self._schulter_orange_start = None
        self._letzte_zone = "gruen"
        self._gruen_seit = None
        self._letztes_lob = 0.0
        self._feedback_text = None
        self._feedback_bis = 0.0
        self._schulter_anstieg_orange_start.clear()

    # ── Motion Anchor: Kalibrierung ────────────────────────────────────────

    def starte_kalibrierung(self):
        """Startet den Blue-Anchor-Warte-Modus (kein Countdown).
        Trigger: Taste 'k', Leertaste (Pedal), Sprachbefehl 'Anker'.

        Neuer Ablauf – kein Zeitdruck, beide Hände frei:
          1. Trigger → App wartet still (Anzeige: orange pulsierend)
          2. Spieler nimmt Geige, geht in Spielhaltung (beliebig lang)
          3. App erkennt automatisch wenn Schultern ≥ 0.8 Sek. ruhig bleiben
          4. Anzeige wechselt auf grün: "Bereit – jetzt starten!"
          5. Erster Bogenstrich → Ankerpunkt wird aus der stabilen Position gesetzt

        Besonders geeignet für Geiger (beide Hände beim Spielen belegt):
        Bio-Anker zuerst setzen (Taste 'b'), dann Geige nehmen, dann einfach spielen.
        """
        self._kalibrierung_aktiv = True
        self._kalibrierung_start = None   # kein Countdown
        self._schulter_puffer_l.clear()
        self._schulter_puffer_r.clear()
        self._schulter_beweg_ema = 0.0
        self._kalibrierung_stabil_seit = None
        self._kalibrierung_stabil_bereit = False
        self._kalibrierung_stabil_l = None
        self._kalibrierung_stabil_r = None
        # Analyse pausieren bis Ankerpunkt gesetzt (Open Start Zone)
        self.analyse_aktiv = False
        self._prev_handgelenk_r = None
        self._bogen_bewegungs_ema = 0.0
        print("Blue Anchor: Nimm die Geige – geh in deine Spielhaltung, keine Eile...")

    def kalibrierungs_sekunden_verbleibend(self) -> Optional[float]:
        """Für Rückwärtskompatibilität: gibt None zurück (kein Countdown mehr).
        Stabilitätsstatus über _kalibrierung_stabil_bereit abfragen.
        """
        return None

    def kalibrierung_aktualisieren(self, landmarks, breite: int, hoehe: int) -> bool:
        """Verwaltet Blue-Anchor-Wartemodus: erkennt automatisch stabile Spielhaltung.

        Ablauf (kein Countdown):
        - Schulter-Positionen werden in einem Ringpuffer akkumuliert
        - Wenn Schultern < 0.3% Bildbreite/Frame für ≥ 0.8 Sek.: "stabil bereit"
        - Der eigentliche Ankerpunkt wird erst in bogenbewegung_pruefen() gesetzt
          (erster Bogenstrich nach stabilem Zustand)

        Gibt False zurück (Anker wird von bogenbewegung_pruefen gesetzt).
        """
        if not self._kalibrierung_aktiv:
            return False

        l_lm = landmarks[self.LINKE_SCHULTER]
        r_lm = landmarks[self.RECHTE_SCHULTER]
        if l_lm.visibility < 0.5 or r_lm.visibility < 0.5:
            return False

        l_px = (int(l_lm.x * breite), int(l_lm.y * hoehe))
        r_px = (int(r_lm.x * breite), int(r_lm.y * hoehe))

        # Schulter-Bewegungsgeschwindigkeit (normiert auf Bildbreite)
        if self._schulter_puffer_l:
            letztes_l = self._schulter_puffer_l[-1]
            delta_px = math.hypot(l_px[0] - letztes_l[0], l_px[1] - letztes_l[1])
            delta_norm = delta_px / max(breite, 1)
            self._schulter_beweg_ema = 0.3 * delta_norm + 0.7 * self._schulter_beweg_ema

        self._schulter_puffer_l.append(l_px)
        self._schulter_puffer_r.append(r_px)

        # Stabilitätsschwelle: < 0.3% Bildbreite pro Frame ≈ 4px bei 1280px
        stabil_schwelle = 0.003
        jetzt = time.time()

        if self._schulter_beweg_ema < stabil_schwelle:
            if self._kalibrierung_stabil_seit is None:
                self._kalibrierung_stabil_seit = jetzt
            # Nach 0.8 Sek. Stabilität: Position als Kandidat speichern (laufend)
            if (jetzt - self._kalibrierung_stabil_seit >= 0.8
                    and len(self._schulter_puffer_l) >= 10):
                n = len(self._schulter_puffer_l)
                self._kalibrierung_stabil_l = (
                    int(sum(p[0] for p in self._schulter_puffer_l) / n),
                    int(sum(p[1] for p in self._schulter_puffer_l) / n),
                )
                self._kalibrierung_stabil_r = (
                    int(sum(p[0] for p in self._schulter_puffer_r) / n),
                    int(sum(p[1] for p in self._schulter_puffer_r) / n),
                )
                self._kalibrierung_stabil_bereit = True
        else:
            self._kalibrierung_stabil_seit = None
            # Bei Bewegung: stabile Position verwerfen (bis wieder ruhig)
            if not self._kalibrierung_stabil_bereit:
                self._kalibrierung_stabil_l = None
                self._kalibrierung_stabil_r = None

        return False  # Anker wird von bogenbewegung_pruefen() gesetzt

    def bogenbewegung_pruefen(self, landmarks, breite: int, hoehe: int):
        """
        Erkennt die erste Bogenbewegung nach dem Blue Anchor (Open Start Zone).
        Misst die Geschwindigkeit des rechten Handgelenks (Bogenhand) Frame für Frame.

        Im Blue-Anchor-Kalibrierungs-Modus:
          → Ankerpunkt wird aus der zuletzt gespeicherten stabilen Schulterposition gesetzt.
          → Kein Zeitdruck: Spieler kann beliebig lange warten bis sie bereit sind.

        Ohne Kalibrierung (nachträglich): wartet auf ersten Bogenstrich → Analyse startet.
        """
        if self.analyse_aktiv and not self._kalibrierung_aktiv:
            return  # Analyse läuft und kein Anker-Reset ausstehend

        hw_r = hole_punkt(landmarks, self.RECHTES_HANDGELENK, breite, hoehe)
        if not hw_r:
            return

        if self._prev_handgelenk_r is not None:
            delta_px = math.hypot(hw_r[0] - self._prev_handgelenk_r[0],
                                  hw_r[1] - self._prev_handgelenk_r[1])
            delta_norm = delta_px / breite
            self._bogen_bewegungs_ema = (0.4 * delta_norm
                                         + 0.6 * self._bogen_bewegungs_ema)

            if self._bogen_bewegungs_ema > 0.015:
                # ── Ankerpunkt setzen bei erster Bogenbewegung ──────────────
                if self._kalibrierung_aktiv:
                    if self._kalibrierung_stabil_bereit and self._kalibrierung_stabil_l:
                        # Aus gemittelter stabiler Position
                        l_px = self._kalibrierung_stabil_l
                        r_px = self._kalibrierung_stabil_r
                    else:
                        # Fallback: aktuelle Schulter-Position (kein Stillstand erkannt)
                        l_lm = landmarks[self.LINKE_SCHULTER]
                        r_lm = landmarks[self.RECHTE_SCHULTER]
                        if l_lm.visibility >= 0.5 and r_lm.visibility >= 0.5:
                            l_px = (int(l_lm.x * breite), int(l_lm.y * hoehe))
                            r_px = (int(r_lm.x * breite), int(r_lm.y * hoehe))
                        else:
                            l_px, r_px = None, None

                    if l_px and r_px:
                        schulterbreite_px = abs(r_px[0] - l_px[0])
                        if schulterbreite_px > 10:
                            self._anker_diff = (l_px[1] - r_px[1]) / schulterbreite_px
                            self._anker_l_px = l_px
                            self._anker_r_px = r_px
                            self._ankerpunkt_gesetzt = True
                            self._anker_datum = datetime.now().strftime("%Y-%m-%d")
                            self._glaettung.pop("schulter_asymmetrie", None)
                            # Ohr-Schulter-Abstände speichern (für Blauer Raum)
                            l_ohr_lm = landmarks[self.LINKES_OHR]
                            r_ohr_lm = landmarks[self.RECHTES_OHR]
                            if l_ohr_lm.visibility >= 0.4:
                                l_ohr_y = int(l_ohr_lm.y * hoehe)
                                self._anker_ohr_abstand_l = max(l_px[1] - l_ohr_y, 10)
                            if r_ohr_lm.visibility >= 0.4:
                                r_ohr_y = int(r_ohr_lm.y * hoehe)
                                self._anker_ohr_abstand_r = max(r_px[1] - r_ohr_y, 10)
                            quelle = "stable position" if self._kalibrierung_stabil_bereit else "current"
                            print(f"Anchor set ({quelle})! "
                                  f"Shoulder diff: {self._anker_diff*100:.1f}%")
                            anker_speichern(self)
                    self._kalibrierung_aktiv = False

                self.analyse_aktiv = True
                print("Erste Bogenbewegung erkannt – Analyse startet!")

        self._prev_handgelenk_r = hw_r

    # ── Biologischer Anker: Kalibrierung ────────────────────────────────────

    def starte_bio_kalibrierung(self):
        """Startet den Biologischen-Anker-Countdown (5 Sek.).
        Ablauf: Geige weglegen → Arme locker hängen lassen → natürliche Ruheposition erfassen.
        Gedacht als Onboarding-Fallback für Anfänger ohne Lehrer:
          1. Bio-Anker setzen (Ruhehaltung, kein Instrument)
          2. Geige nehmen → Blue Anchor setzen (Spielhaltung)
        Die Differenz beider Anker zeigt den instrumentbedingten Einfluss auf die Schultern.
        """
        self._bio_kalibrierung_aktiv = True
        self._bio_kalibrierung_start = time.time()
        print("Biologischer Anker: Geige weglegen – Arme locker hängen lassen...")

    def bio_kalibrierungs_sekunden_verbleibend(self) -> Optional[float]:
        """Gibt verbleibende Sekunden für Bio-Anker-Countdown zurück, oder None."""
        if not self._bio_kalibrierung_aktiv or self._bio_kalibrierung_start is None:
            return None
        verbleibend = self._kalibrierung_dauer - (time.time() - self._bio_kalibrierung_start)
        return max(0.0, verbleibend)

    def bio_kalibrierung_aktualisieren(self, landmarks, breite: int, hoehe: int) -> bool:
        """Prüft ob der Bio-Anker-Countdown abgelaufen ist und speichert die Ruheposition.
        Gibt True zurück im Frame, in dem der Bio-Anker gerade gesetzt wurde.
        """
        if not self._bio_kalibrierung_aktiv:
            return False
        verbleibend = self.bio_kalibrierungs_sekunden_verbleibend()
        if verbleibend is not None and verbleibend <= 0:
            l_lm = landmarks[self.LINKE_SCHULTER]
            r_lm = landmarks[self.RECHTE_SCHULTER]
            if l_lm.visibility >= 0.5 and r_lm.visibility >= 0.5:
                l_px = (int(l_lm.x * breite), int(l_lm.y * hoehe))
                r_px = (int(r_lm.x * breite), int(r_lm.y * hoehe))
                schulterbreite_px = abs(r_px[0] - l_px[0])
                if schulterbreite_px > 10:
                    self._bio_anker_diff = (l_px[1] - r_px[1]) / schulterbreite_px
                    self._bio_anker_l_px = l_px
                    self._bio_anker_r_px = r_px
                    self._bio_anker_gesetzt = True
                    print(f"Biologischer Anker gesetzt (Schulter-Diff: {self._bio_anker_diff*100:.1f}%).")
                    print("Jetzt Geige nehmen → Blue Anchor setzen (Taste k / Leertaste).")
            self._bio_kalibrierung_aktiv = False
            return True
        return False

    # ── Profi-Trail und Blum-Timer ───────────────────────────────────────────

    def trail_aktualisieren(self, l_px: Optional[tuple], r_px: Optional[tuple]):
        """Speichert aktuelle Schulter-Pixel-Positionen für Profi-Trail-Visualisierung.
        Wird jeden Frame aufgerufen, wenn Analyse aktiv.
        """
        if l_px:
            self._trail_l.append(l_px)
        if r_px:
            self._trail_r.append(r_px)

    def blum_timer_aktualisieren(self, anstieg_links: float, anstieg_rechts: float):
        """Überwacht ob eine Schulter die Blum-Grenze überschritten hat.
        Bei dauerhafter Überschreitung → diskreter Langzeit-Hinweis im Profi-Profil.
        """
        blum_ratio = self.grenzwerte.blum_grenze_ratio
        im_blum_bereich = (anstieg_links > blum_ratio or anstieg_rechts > blum_ratio)
        jetzt = time.time()
        if im_blum_bereich:
            if self._blum_limit_start is None:
                self._blum_limit_start = jetzt
        else:
            self._blum_limit_start = None

    def blum_warnung_aktiv(self) -> bool:
        """True wenn Blum-Grenze für > blum_langfristig_sek ununterbrochen überschritten."""
        if self._blum_limit_start is None:
            return False
        return (time.time() - self._blum_limit_start) >= self.grenzwerte.blum_langfristig_sek

    def _ema_aktualisieren(self, check_name: str, rohwert: float,
                           alpha_override: Optional[float] = None) -> float:
        """Aktualisiert den EMA-Wert für einen Check und gibt den geglätteten Wert zurück.
        alpha_override: eigene Glättung für diesen Check (z.B. langsamer für Schulter-Asymmetrie).
        """
        alpha = alpha_override if alpha_override is not None else self.grenzwerte.ema_alpha
        if check_name not in self._glaettung:
            self._glaettung[check_name] = {"wert": rohwert, "warnung_aktiv": False}
            return rohwert
        state = self._glaettung[check_name]
        state["wert"] = alpha * rohwert + (1 - alpha) * state["wert"]
        return state["wert"]

    def _hysterese_pruefen(self, check_name: str, glattwert: float,
                           schwelle: float, richtung: str = "ueber") -> bool:
        """
        Prüft mit Hysterese ob eine Warnung aktiv sein soll.
        richtung='ueber': Warnung wenn Wert über Schwelle (z.B. Kopfneigung)
        richtung='unter': Warnung wenn Wert unter Schwelle (z.B. Handgelenk-Winkel)
        """
        if check_name not in self._glaettung:
            return False
        state = self._glaettung[check_name]
        band = schwelle * self.grenzwerte.hysterese_faktor

        if richtung == "ueber":
            if state["warnung_aktiv"]:
                state["warnung_aktiv"] = glattwert > (schwelle - band)
            else:
                state["warnung_aktiv"] = glattwert > schwelle
        else:  # "unter"
            if state["warnung_aktiv"]:
                state["warnung_aktiv"] = glattwert < (schwelle + band)
            else:
                state["warnung_aktiv"] = glattwert < schwelle

        return state["warnung_aktiv"]

    def analysiere(self, landmarks, breite: int, hoehe: int,
                   modus: int = 0) -> tuple[list[Warnung], list[Messung]]:
        """
        Führt Haltungschecks durch und gibt Warnungen + Messdaten zurück.

        Args:
            modus: 0 = alle Checks, 1–5 = einzelner Check

        Returns:
            (warnungen, messungen) – Messungen werden auch ohne Warnung geliefert
        """
        checks = {
            1: lambda: self._pruefe_kopfneigung(landmarks, breite, hoehe),
            2: lambda: self._pruefe_schulter_asymmetrie(landmarks, breite, hoehe),
            3: lambda: self._pruefe_handgelenk_links(landmarks, breite, hoehe),
            4: lambda: self._pruefe_ellbogen_rechts(landmarks, breite, hoehe),
            5: lambda: self._pruefe_schulter_protraktion(landmarks),
            # Blue Anchor: individuelle Schulter-Anstieg-Checks (nur nach Kalibrierung)
            6: lambda: self._pruefe_schulter_anstieg(landmarks, breite, hoehe, "links"),
            7: lambda: self._pruefe_schulter_anstieg(landmarks, breite, hoehe, "rechts"),
        }

        if modus == 0:
            auswahl = checks.values()
        else:
            auswahl = [checks[modus]] if modus in checks else []

        warnungen = []
        messungen = []
        for check_fn in auswahl:
            w, m = check_fn()
            if w:
                warnungen.append(w)
            if m:
                messungen.append(m)

        return warnungen, messungen

    def _pruefe_kopfneigung(self, landmarks, breite, hoehe):
        """Prüft ob der Kopf zu stark zur Seite geneigt ist."""
        linkes_ohr = hole_punkt(landmarks, self.LINKES_OHR, breite, hoehe)
        rechtes_ohr = hole_punkt(landmarks, self.RECHTES_OHR, breite, hoehe)

        if not linkes_ohr or not rechtes_ohr:
            return None, None

        # Neigungswinkel berechnen: Abweichung der Ohr-Linie von der Horizontalen
        dx = rechtes_ohr[0] - linkes_ohr[0]
        dy = rechtes_ohr[1] - linkes_ohr[1]
        winkel = math.degrees(math.atan2(dy, dx))
        # Normalisieren auf [-90, +90] – Abweichung von horizontal (0°)
        if winkel > 90:
            winkel = 180 - winkel
        elif winkel < -90:
            winkel = -180 - winkel
        neigung = abs(winkel)

        # EMA-Glättung + Hysterese
        neigung_glatt = self._ema_aktualisieren("kopfneigung", neigung)
        warnung_aktiv = self._hysterese_pruefen(
            "kopfneigung", neigung_glatt,
            self.grenzwerte.kopfneigung_max, richtung="ueber"
        )

        # Messung: Mittelpunkt zwischen Ohren, Referenzlinie horizontal
        mitte = ((linkes_ohr[0] + rechtes_ohr[0]) // 2,
                 (linkes_ohr[1] + rechtes_ohr[1]) // 2)
        messung = Messung(
            check_index=1, messwert=neigung_glatt, einheit="°",
            gelenk_position=mitte,
            punkt_a=linkes_ohr, punkt_b=mitte, punkt_c=rechtes_ohr,
            schwelle_max=self.grenzwerte.kopfneigung_max,
        )

        if warnung_aktiv:
            schweregrad = "stark" if neigung_glatt > self.grenzwerte.kopfneigung_max * 1.5 else "mittel"
            warnung = Warnung(
                name=f"Kopfneigung: {neigung_glatt:.0f}°",
                schweregrad=schweregrad,
                korrektur="Kopf gerader halten – Kinnstütze prüfen",
                farbe=(0, 0, 255) if schweregrad == "stark" else (0, 165, 255),
                check_index=1,
                messung=messung,
            )
            return warnung, messung
        return None, messung

    # ──────────────────────────────────────────────
    # Feedback-System (Lob & Zustandsübergänge)
    # ──────────────────────────────────────────────

    def _feedback_aktualisieren(self, aktuelle_zone: str):
        """
        Verwaltet Feedback-Texte basierend auf Zustandsübergängen.

        Logik:
        - Grün durchgehend → nach X Sekunden loben (mit Cooldown)
        - Grün → Orange: sanfte Erinnerung
        - Orange → Rot: deutlichere Warnung
        - Orange/Rot → Grün: Lob für Korrektur (sofort!)
        """
        jetzt = time.time()
        profil = self.grenzwerte.profil
        texte = FEEDBACK_TEXTE.get(profil, FEEDBACK_TEXTE["erwachsen"])
        vorherige_zone = self._letzte_zone

        # ── Zustandsübergang erkennen ──
        if aktuelle_zone != vorherige_zone:
            if aktuelle_zone == "gruen" and vorherige_zone in ("orange", "rot"):
                # Korrektur geschafft → sofort loben!
                self._feedback_setzen(texte["korrektur_geschafft"], dauer=3.0)
                self._gruen_seit = jetzt
                self._letztes_lob = jetzt  # zählt als Lob
            elif aktuelle_zone == "orange" and vorherige_zone == "gruen":
                # Verschlechterung → sanft erinnern
                self._feedback_setzen(texte["gruen_zu_orange"], dauer=3.0)
                self._gruen_seit = None
            elif aktuelle_zone == "rot":
                # Deutliche Verschlechterung
                self._feedback_setzen(texte["orange_zu_rot"], dauer=4.0)
                self._gruen_seit = None

        # ── Lob bei anhaltend guter Haltung ──
        if aktuelle_zone == "gruen":
            if self._gruen_seit is None:
                self._gruen_seit = jetzt
            gruen_dauer = jetzt - self._gruen_seit
            lob_abstand = jetzt - self._letztes_lob
            if (gruen_dauer >= self.grenzwerte.lob_nach_sekunden
                    and lob_abstand >= self.grenzwerte.lob_cooldown_sek):
                lob_liste = texte["lob"]
                lob_text = lob_liste[self._lob_index % len(lob_liste)]
                self._lob_index += 1
                self._feedback_setzen(lob_text, dauer=2.5)
                self._letztes_lob = jetzt
        else:
            self._gruen_seit = None

        self._letzte_zone = aktuelle_zone

    def _feedback_setzen(self, text: str, dauer: float = 3.0):
        """Setzt einen Feedback-Text, der für `dauer` Sekunden angezeigt wird."""
        self._feedback_text = text
        self._feedback_bis = time.time() + dauer

    def aktuelles_feedback(self) -> Optional[str]:
        """Gibt den aktuellen Feedback-Text zurück, oder None wenn abgelaufen."""
        if self._feedback_text and time.time() <= self._feedback_bis:
            return self._feedback_text
        return None

    def _pruefe_schulter_asymmetrie(self, landmarks, breite, hoehe):
        """
        Prüft ob eine Schulter deutlich höher ist als die andere.

        Drei-Zonen-Modell:
          Grün  (< schulter_asymmetrie_ok):      normale Spielhaltung, keine Warnung
          Orange (ok .. warnung):                 auffällig, Hinweis nach Mindestdauer
          Rot    (> schulter_asymmetrie_warnung): klar problematisch, sofortige Warnung

        Rotationskompensation:
          Wenn der Musiker sich seitlich dreht (z.B. Bogenkontrolle),
          wird die Schulterbreite im Bild kleiner. Ab einem bestimmten
          Verhältnis zur Referenzbreite wird der Check ausgesetzt,
          weil die Perspektive die Messung zu stark verzerrt.
        """
        l_schulter = hole_punkt(landmarks, self.LINKE_SCHULTER, breite, hoehe)
        r_schulter = hole_punkt(landmarks, self.RECHTE_SCHULTER, breite, hoehe)

        if not l_schulter or not r_schulter:
            return None, None

        schulterbreite = abs(r_schulter[0] - l_schulter[0])
        if schulterbreite < 10:
            return None, None

        # ── Rotationskompensation ──
        # Referenzbreite aktualisieren (Maximum = frontale Haltung)
        if schulterbreite > self._schulter_referenz_breite:
            self._schulter_referenz_breite = schulterbreite

        # Verhältnis aktuelle / maximale Breite als Rotationsschätzer
        if self._schulter_referenz_breite > 0:
            breite_verhaeltnis = schulterbreite / self._schulter_referenz_breite
        else:
            breite_verhaeltnis = 1.0

        # Bei starker Rotation: Check aussetzen (Messung nicht aussagekräftig)
        if breite_verhaeltnis < self.grenzwerte.schulter_rotation_min_breite:
            self._schulter_orange_start = None  # Timer zurücksetzen
            return None, None

        # Vorzeichenbehaftete Ratio (negativ = linke Schulter höher, da y↓)
        hoehen_diff_signed = (l_schulter[1] - r_schulter[1]) / schulterbreite

        # Wenn Ankerpunkt gesetzt: Abweichung VOM Anker messen (personalisiert)
        # → Deine individuelle Spielhaltung wird als Null-Linie akzeptiert
        if self._ankerpunkt_gesetzt:
            hoehen_diff = abs(hoehen_diff_signed - self._anker_diff)
        else:
            hoehen_diff = abs(hoehen_diff_signed)

        # EMA-Glättung mit eigener, langsamerer Alpha
        diff_glatt = self._ema_aktualisieren(
            "schulter_asymmetrie", hoehen_diff,
            alpha_override=self.grenzwerte.schulter_asymmetrie_ema_alpha
        )

        # ── Drei-Zonen-Logik ──
        grenze_ok = self.grenzwerte.schulter_asymmetrie_ok
        grenze_warnung = self.grenzwerte.schulter_asymmetrie_warnung

        if diff_glatt <= grenze_ok:
            # Grün: alles in Ordnung
            zone = "gruen"
            self._schulter_orange_start = None
        elif diff_glatt <= grenze_warnung:
            # Orange: auffällig, aber erst nach Mindestdauer warnen
            zone = "orange"
            jetzt = time.time()
            if self._schulter_orange_start is None:
                self._schulter_orange_start = jetzt
            orange_dauer = jetzt - self._schulter_orange_start
            if orange_dauer < self.grenzwerte.schulter_asymmetrie_orange_sek:
                zone = "gruen"  # noch nicht lang genug → unterdrücken
        else:
            # Rot: sofortige Warnung
            zone = "rot"
            self._schulter_orange_start = None

        # Feedback-System aktualisieren (Lob / Übergangs-Texte)
        self._feedback_aktualisieren(zone)

        # Messung: Mittelpunkt zwischen Schultern
        mitte = ((l_schulter[0] + r_schulter[0]) // 2,
                 (l_schulter[1] + r_schulter[1]) // 2)
        messung = Messung(
            check_index=2, messwert=diff_glatt * 100, einheit="%",
            gelenk_position=mitte,
            punkt_a=l_schulter, punkt_b=mitte, punkt_c=r_schulter,
            schwelle_max=grenze_warnung * 100,
        )

        if zone == "rot":
            seite = "Linke" if l_schulter[1] < r_schulter[1] else "Rechte"
            warnung = Warnung(
                name=f"{seite} Schulter – einatmen, loslassen",
                schweregrad="stark",
                korrektur="Einatmen – Schultern mit dem Atem sinken lassen",
                farbe=(0, 0, 255),
                check_index=2,
                messung=messung,
            )
            return warnung, messung
        elif zone == "orange":
            seite = "Linke" if l_schulter[1] < r_schulter[1] else "Rechte"
            warnung = Warnung(
                name=f"{seite} Schulter – locker lassen",
                schweregrad="mittel",
                korrektur="Schultern fließen lassen",
                farbe=(0, 165, 255),
                check_index=2,
                messung=messung,
            )
            return warnung, messung
        return None, messung

    def _pruefe_schulter_anstieg(self, landmarks, breite, hoehe, seite: str):
        """
        Prüft ob eine Schulter von ihrem individuellen Blue-Anchor-Punkt aufgestiegen ist.

        seite: 'links' (Greifhand, Demo-Priorität) oder 'rechts' (Bogenhand)

        Nur aktiv wenn Blue Anchor gesetzt – ohne Kalibrierung kein Check.
        Das macht die Analyse unabhängig von Schulterstütze, Körperbau und
        individuellem Spielstil: jeder Geiger wird an seiner eigenen Norm gemessen.
        """
        if not self._ankerpunkt_gesetzt:
            return None, None

        if seite == "links":
            lm_idx = self.LINKE_SCHULTER
            anker_px = self._anker_l_px
            check_idx = 6
        else:
            lm_idx = self.RECHTE_SCHULTER
            anker_px = self._anker_r_px
            check_idx = 7

        if not anker_px:
            return None, None

        schulter = hole_punkt(landmarks, lm_idx, breite, hoehe)
        l_schulter = hole_punkt(landmarks, self.LINKE_SCHULTER, breite, hoehe)
        r_schulter = hole_punkt(landmarks, self.RECHTE_SCHULTER, breite, hoehe)

        if not schulter or not l_schulter or not r_schulter:
            return None, None

        schulterbreite = abs(r_schulter[0] - l_schulter[0])
        if schulterbreite < 10:
            return None, None

        # Anstieg: positiv = Schulter höher als beim Ankerpunkt (y nimmt ab)
        anstieg_raw = (anker_px[1] - schulter[1]) / schulterbreite
        check_name = f"schulter_{seite}_anstieg"
        anstieg_glatt = self._ema_aktualisieren(
            check_name, anstieg_raw,
            alpha_override=self.grenzwerte.schulter_anstieg_ema_alpha
        )

        # ── Drei-Zonen-Logik ──
        grenze_ok = self.grenzwerte.schulter_anstieg_ok
        grenze_warnung = self.grenzwerte.schulter_anstieg_warnung

        if anstieg_glatt <= grenze_ok:
            zone = "gruen"
            self._schulter_anstieg_orange_start.pop(seite, None)
        elif anstieg_glatt <= grenze_warnung:
            zone = "orange"
            jetzt = time.time()
            if seite not in self._schulter_anstieg_orange_start:
                self._schulter_anstieg_orange_start[seite] = jetzt
            if (jetzt - self._schulter_anstieg_orange_start[seite]
                    < self.grenzwerte.schulter_anstieg_orange_sek):
                zone = "gruen"  # noch nicht lang genug
        else:
            zone = "rot"
            self._schulter_anstieg_orange_start.pop(seite, None)

        # Feedback: linke Schulter hat Demo-Priorität
        if seite == "links":
            self._feedback_aktualisieren(zone)

        seite_text = "Linke Schulter" if seite == "links" else "Rechte Schulter"
        messung = Messung(
            check_index=check_idx,
            messwert=max(0.0, anstieg_glatt * 100),
            einheit="%",
            gelenk_position=schulter,
        )

        if zone == "rot":
            return Warnung(
                name=f"{seite_text} – einatmen, loslassen",
                schweregrad="stark",
                korrektur="Einatmen – Schulter mit dem Atem sinken lassen",
                farbe=(0, 0, 255),
                check_index=check_idx,
                messung=messung,
            ), messung
        elif zone == "orange":
            return Warnung(
                name=f"{seite_text} – locker lassen",
                schweregrad="mittel",
                korrektur="Schulter fließen lassen",
                farbe=(0, 165, 255),
                check_index=check_idx,
                messung=messung,
            ), messung
        return None, messung

    def _pruefe_handgelenk_links(self, landmarks, breite, hoehe):
        """Prüft den Winkel des linken Handgelenks (Griffhand)."""
        schulter = hole_punkt(landmarks, self.LINKE_SCHULTER, breite, hoehe)
        ellbogen = hole_punkt(landmarks, self.LINKER_ELLBOGEN, breite, hoehe)
        handgelenk = hole_punkt(landmarks, self.LINKES_HANDGELENK, breite, hoehe)

        if not schulter or not ellbogen or not handgelenk:
            return None, None

        winkel = berechne_winkel(schulter, ellbogen, handgelenk)

        # EMA-Glättung + Hysterese
        winkel_glatt = self._ema_aktualisieren("handgelenk_links", winkel)
        warnung_aktiv = self._hysterese_pruefen(
            "handgelenk_links", winkel_glatt,
            self.grenzwerte.handgelenk_links_min, richtung="unter"
        )

        messung = Messung(
            check_index=3, messwert=winkel_glatt, einheit="°",
            gelenk_position=ellbogen,
            punkt_a=schulter, punkt_b=ellbogen, punkt_c=handgelenk,
            schwelle_min=self.grenzwerte.handgelenk_links_min,
            schwelle_max=self.grenzwerte.handgelenk_links_max,
        )

        if warnung_aktiv:
            schweregrad = "stark" if winkel_glatt < self.grenzwerte.handgelenk_links_min - 20 else "leicht"
            warnung = Warnung(
                name=f"Handgelenk links: {winkel_glatt:.0f}°",
                schweregrad=schweregrad,
                korrektur="Linkes Handgelenk gerader halten – nicht abknicken",
                farbe=(0, 0, 255) if schweregrad == "stark" else (0, 255, 255),
                check_index=3,
                messung=messung,
            )
            return warnung, messung
        return None, messung

    def _pruefe_ellbogen_rechts(self, landmarks, breite, hoehe):
        """Prüft den Winkel des rechten Ellbogens (Bogenführung)."""
        schulter = hole_punkt(landmarks, self.RECHTE_SCHULTER, breite, hoehe)
        ellbogen = hole_punkt(landmarks, self.RECHTER_ELLBOGEN, breite, hoehe)
        handgelenk = hole_punkt(landmarks, self.RECHTES_HANDGELENK, breite, hoehe)

        if not schulter or not ellbogen or not handgelenk:
            return None, None

        winkel = berechne_winkel(schulter, ellbogen, handgelenk)

        # EMA-Glättung + Hysterese (zwei Schwellen: zu eng und zu gestreckt)
        winkel_glatt = self._ema_aktualisieren("ellbogen_rechts", winkel)
        zu_eng = self._hysterese_pruefen(
            "ellbogen_rechts_min", winkel_glatt,
            self.grenzwerte.ellbogen_rechts_min, richtung="unter"
        )
        zu_gestreckt = self._hysterese_pruefen(
            "ellbogen_rechts_max", winkel_glatt,
            self.grenzwerte.ellbogen_rechts_max, richtung="ueber"
        )

        messung = Messung(
            check_index=4, messwert=winkel_glatt, einheit="°",
            gelenk_position=ellbogen,
            punkt_a=schulter, punkt_b=ellbogen, punkt_c=handgelenk,
            schwelle_min=self.grenzwerte.ellbogen_rechts_min,
            schwelle_max=self.grenzwerte.ellbogen_rechts_max,
        )

        if zu_eng:
            warnung = Warnung(
                name=f"Bogenarm-Ellbogen zu eng: {winkel_glatt:.0f}°",
                schweregrad="mittel",
                korrektur="Rechten Ellbogen etwas anheben",
                farbe=(0, 165, 255),
                check_index=4,
                messung=messung,
            )
            return warnung, messung
        elif zu_gestreckt:
            warnung = Warnung(
                name=f"Bogenarm zu gestreckt: {winkel_glatt:.0f}°",
                schweregrad="mittel",
                korrektur="Rechten Ellbogen etwas mehr beugen",
                farbe=(0, 165, 255),
                check_index=4,
                messung=messung,
            )
            return warnung, messung
        return None, messung

    def _pruefe_schulter_protraktion(self, landmarks):
        """
        Prüft Schulter-Protraktion (Rundrücken) anhand der Z-Koordinaten.
        Kein Winkelbogen möglich (Z-Tiefe), nur numerischer Messwert.
        """
        l_schulter_3d = hole_punkt_3d(landmarks, self.LINKE_SCHULTER)
        r_schulter_3d = hole_punkt_3d(landmarks, self.RECHTE_SCHULTER)
        nase_3d = hole_punkt_3d(landmarks, self.NASE)

        if not l_schulter_3d or not r_schulter_3d or not nase_3d:
            return None, None

        # Durchschnittliche Z-Position der Schultern vs. Nase
        schulter_z = (l_schulter_3d[2] + r_schulter_3d[2]) / 2
        z_diff = schulter_z - nase_3d[2]

        # Wenn Schultern deutlich vor der Nase liegen (in Z-Richtung)
        schwelle = self.grenzwerte.schulter_protraktion_max / 100.0

        # EMA-Glättung + Hysterese
        z_diff_glatt = self._ema_aktualisieren("schulter_protraktion", z_diff)
        warnung_aktiv = self._hysterese_pruefen(
            "schulter_protraktion", z_diff_glatt,
            schwelle, richtung="ueber"
        )

        # Kein Winkelbogen (Z-Achse), nur Label
        messung = Messung(
            check_index=5, messwert=z_diff_glatt * 100, einheit="",
            schwelle_max=self.grenzwerte.schulter_protraktion_max,
        )

        if warnung_aktiv:
            warnung = Warnung(
                name="Rundrücken erkannt",
                schweregrad="mittel",
                korrektur="Brustbein heben, Schultern sanft zurückziehen",
                farbe=(0, 100, 255),
                check_index=5,
                messung=messung,
            )
            return warnung, messung
        return None, messung


# ──────────────────────────────────────────────
# Visualisierung
# ──────────────────────────────────────────────

class Visualisierung:
    """Zeichnet Pose-Landmarks und Warnungen auf das Kamerabild."""

    FARBE_OK = (0, 200, 0)        # Grün
    FARBE_WARNUNG = (0, 165, 255)  # Orange
    FARBE_FEHLER = (0, 0, 255)     # Rot
    FARBE_GELENK = (255, 255, 255) # Weiß
    FARBE_KNOCHEN = (0, 200, 100)  # Grün-Türkis

    FARBE_GRAU = (100, 100, 100)   # Gedimmte Segmente
    FARBE_ROT = (0, 0, 255)        # Fehlerhaftes Segment

    def zeichne_skelett(self, bild, landmarks, warnungen: list[Warnung] = None,
                        modus: int = 0):
        """Zeichnet das erkannte Skelett mit Farben, Glow und Highlighting."""
        if not landmarks:
            return
        hoehe, breite = bild.shape[:2]
        warnungen = warnungen or []

        # Betroffene Landmarks aus aktiven Warnungen sammeln
        fehler_landmarks = set()
        for w in warnungen:
            if w.check_index in CHECK_LANDMARKS:
                fehler_landmarks |= CHECK_LANDMARKS[w.check_index]

        # Relevante Landmarks für Single-Check-Modus
        relevante_landmarks = CHECK_LANDMARKS.get(modus) if modus != 0 else None

        # Verbindungen zeichnen (Glow + Farbe)
        for start_idx, end_idx in POSE_CONNECTIONS:
            start_lm = landmarks[start_idx]
            end_lm = landmarks[end_idx]
            if start_lm.visibility < 0.5 or end_lm.visibility < 0.5:
                continue

            start_pt = (int(start_lm.x * breite), int(start_lm.y * hoehe))
            end_pt = (int(end_lm.x * breite), int(end_lm.y * hoehe))

            # Farbe bestimmen
            if relevante_landmarks and not ({start_idx, end_idx} & relevante_landmarks):
                farbe = self.FARBE_GRAU
            elif {start_idx, end_idx} & fehler_landmarks:
                farbe = self.FARBE_ROT
            else:
                farbe = SEGMENT_FARBEN.get((start_idx, end_idx), FARBE_TORSO)

            # Glow: dunkle Linie darunter
            cv2.line(bild, start_pt, end_pt, (20, 20, 20), 6)
            cv2.line(bild, start_pt, end_pt, farbe, 2)

        # Schulter-Offset berechnen (visuell nach außen verschieben)
        schulter_offset = {}
        l_lm = landmarks[11]
        r_lm = landmarks[12]
        if l_lm.visibility >= 0.5 and r_lm.visibility >= 0.5:
            lx, ly = int(l_lm.x * breite), int(l_lm.y * hoehe)
            rx, ry = int(r_lm.x * breite), int(r_lm.y * hoehe)
            sb = abs(rx - lx)
            versatz = int(sb * 0.15)
            # Richtungsvektor der Schulterachse (normiert, nach außen)
            schulter_offset[11] = (lx - versatz, ly)
            schulter_offset[12] = (rx + versatz, ry)

        # Gelenke zeichnen (Glow + Größenhierarchie)
        for idx, lm in enumerate(landmarks):
            if lm.visibility < 0.5:
                continue

            pt = (int(lm.x * breite), int(lm.y * hoehe))
            # Visueller Schulter-Offset (nur für Darstellung)
            if idx in schulter_offset:
                pt = schulter_offset[idx]
            radius = GELENK_GROESSEN.get(idx, _GROESSE_KLEIN)

            # Farbe bestimmen
            if relevante_landmarks and idx not in relevante_landmarks:
                farbe = self.FARBE_GRAU
            elif idx in fehler_landmarks:
                farbe = self.FARBE_ROT
            else:
                farbe = self.FARBE_GELENK

            # Glow: dunkler Kreis darunter
            cv2.circle(bild, pt, radius + 2, (20, 20, 20), -1)
            cv2.circle(bild, pt, radius, farbe, -1)

    def _farbe_fuer_messung(self, messung: Messung, hat_warnung: bool) -> tuple:
        """Bestimmt die Farbe für eine Messung basierend auf Schwellennähe."""
        if hat_warnung:
            return self.FARBE_FEHLER  # Rot
        wert = messung.messwert
        # Nähe zur Schwelle prüfen (20% Band)
        if messung.schwelle_max is not None:
            band = messung.schwelle_max * 0.2
            if wert > messung.schwelle_max - band:
                return self.FARBE_WARNUNG  # Orange
        if messung.schwelle_min is not None:
            band = messung.schwelle_min * 0.2
            if wert < messung.schwelle_min + band:
                return self.FARBE_WARNUNG  # Orange
        return self.FARBE_OK  # Grün

    def _zeichne_winkel_bogen(self, bild, messung: Messung, farbe: tuple):
        """Zeichnet einen Winkelbogen am Gelenk zwischen zwei Segmenten."""
        if not messung.punkt_a or not messung.punkt_b or not messung.punkt_c:
            return

        b = messung.punkt_b  # Scheitelpunkt
        a = messung.punkt_a
        c = messung.punkt_c

        # Winkel der beiden Schenkel berechnen (für cv2.ellipse)
        winkel_ba = math.degrees(math.atan2(a[1] - b[1], a[0] - b[0]))
        winkel_bc = math.degrees(math.atan2(c[1] - b[1], c[0] - b[0]))

        # Start- und Endwinkel für den Bogen (kürzerer Weg)
        start = min(winkel_ba, winkel_bc)
        end = max(winkel_ba, winkel_bc)
        if end - start > 180:
            start, end = end, start + 360

        radius = 30
        cv2.ellipse(bild, b, (radius, radius), 0, start, end, farbe, 2)

    def _zeichne_winkel_label(self, bild, messung: Messung, farbe: tuple):
        """Zeichnet den numerischen Messwert neben dem Gelenk."""
        if not messung.gelenk_position:
            return
        pos = messung.gelenk_position
        text = f"{messung.messwert:.0f}{messung.einheit}"
        # Offset nach rechts-oben vom Gelenk
        text_pos = (pos[0] + 15, pos[1] - 15)
        cv2.putText(bild, text, text_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 3)
        cv2.putText(bild, text, text_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.5, farbe, 1)

    def _zeichne_kopf_referenzlinie(self, bild, messung: Messung, farbe: tuple):
        """Zeichnet eine horizontale Referenzlinie durch den Ohr-Mittelpunkt."""
        if not messung.gelenk_position:
            return
        mitte = messung.gelenk_position
        laenge = 60
        # Horizontale Referenzlinie (gestrichelt simuliert durch kurze Linie)
        cv2.line(bild, (mitte[0] - laenge, mitte[1]),
                 (mitte[0] + laenge, mitte[1]), (150, 150, 150), 1)
        # Tatsächliche Ohr-Linie
        if messung.punkt_a and messung.punkt_c:
            cv2.line(bild, messung.punkt_a, messung.punkt_c, farbe, 2)

    def zeichne_messungen(self, bild, messungen: list[Messung],
                          warnungen: list[Warnung], modus: int = 0):
        """Zeichnet Winkelbögen und Labels für Messungen."""
        warnung_checks = {w.check_index for w in warnungen}

        for m in messungen:
            # In Modus 0: nur bei aktiven Warnungen zeichnen
            # In Single-Check-Modus: immer zeichnen
            if modus == 0 and m.check_index not in warnung_checks:
                continue

            hat_warnung = m.check_index in warnung_checks
            farbe = self._farbe_fuer_messung(m, hat_warnung)

            # Spezialfall Kopfneigung: Referenzlinie statt Bogen
            if m.check_index == 1:
                self._zeichne_kopf_referenzlinie(bild, m, farbe)
            elif m.punkt_a and m.punkt_b and m.punkt_c:
                self._zeichne_winkel_bogen(bild, m, farbe)

            self._zeichne_winkel_label(bild, m, farbe)

    def _zeichne_panel(self, bild, x, y, breite, hoehe, alpha=0.6):
        """Zeichnet ein halbtransparentes dunkles Rechteck."""
        bild_h, bild_b = bild.shape[:2]
        x2 = min(x + breite, bild_b)
        y2 = min(y + hoehe, bild_h)
        roi = bild[y:y2, x:x2]
        dunkel = np.zeros_like(roi)
        cv2.addWeighted(dunkel, alpha, roi, 1 - alpha, 0, roi)

    def zeichne_warnungen(self, bild, warnungen: list[Warnung], modus: int = 0):
        """Zeichnet Warnungen mit halbtransparentem Panel."""
        modus_text = f"Modus: {MODUS_NAMEN.get(modus, 'Unbekannt')}"
        panel_x, panel_y = 8, 8
        panel_breite = 420
        zeilen_hoehe = 28

        if not warnungen:
            # Modus + "Haltung OK"
            panel_hoehe = zeilen_hoehe * 2 + 16
            self._zeichne_panel(bild, panel_x, panel_y, panel_breite, panel_hoehe)
            zeichne_text(bild, modus_text,
                         (panel_x + 8, panel_y + 10), 0.55, (180, 180, 180), 1)
            zeichne_text(bild, "Haltung OK",
                         (panel_x + 8, panel_y + 10 + zeilen_hoehe), 0.7, self.FARBE_OK, 2)
            return

        # Modus-Zeile + pro Warnung 2 Zeilen (Name + Korrektur)
        panel_hoehe = zeilen_hoehe + len(warnungen) * (zeilen_hoehe * 2) + 16
        self._zeichne_panel(bild, panel_x, panel_y, panel_breite, panel_hoehe)

        # Modus-Zeile
        zeichne_text(bild, modus_text,
                     (panel_x + 8, panel_y + 10), 0.55, (180, 180, 180), 1)

        y_pos = panel_y + 10 + zeilen_hoehe
        for warnung in warnungen:
            zeichne_text(bild, f"! {warnung.name}",
                         (panel_x + 8, y_pos), 0.6, warnung.farbe, 2)
            y_pos += zeilen_hoehe

            zeichne_text(bild, f"  → {warnung.korrektur}",
                         (panel_x + 8, y_pos), 0.42, (200, 200, 200), 1)
            y_pos += zeilen_hoehe

    @staticmethod
    def _zeichne_blauer_raum_seite(bild, anker_px: tuple, aktuell_px: tuple,
                                   profil: str = "erwachsen"):
        """Zeichnet den Blauen Raum einer Schulterseite.

        Die blaue Fläche entsteht zwischen dem Ankerpunkt (unten, fixiert) und
        der aktuellen Schulterposition (oben, wenn gestiegen).
        Mehr Blau = mehr Abstand vom Anker = mehr Schulter-Anspannung.
        Spieler-Ziel: das Blau verschwinden lassen (Schulter sinken lassen).

        Linke und rechte Seite werden unabhängig gezeichnet, weil sie
        verschiedene Diagnosen tragen:
          - Links:  Greifspannung, Lagenwechsel, Instrument-Gewicht
          - Rechts: Bogendruck, Saitenwechsel (besonders E→D)
        """
        if not anker_px or not aktuell_px:
            return

        # Schulter gestiegen = aktuell_y < anker_y (y wächst nach unten im Bild)
        delta_y = anker_px[1] - aktuell_px[1]
        if delta_y <= 2:
            return  # Nur bei wirklich keiner Bewegung nichts zeigen

        # Rechteck-Grenzen
        x_mitte = (anker_px[0] + aktuell_px[0]) // 2
        if profil == "kind":
            halb_breite = 22
            alpha = 0.70
        elif profil == "profi":
            halb_breite = 14
            alpha = 0.35
        else:  # erwachsen
            halb_breite = 18
            alpha = 0.62

        x1 = x_mitte - halb_breite
        x2 = x_mitte + halb_breite
        y_top = aktuell_px[1]   # aktuelle Schulter (oben)
        y_bot = anker_px[1]     # Anker (unten, fixiert)

        # Intensität steigt mit Abstand, bei ~40px voll gesättigt (sensibler)
        intensitaet = min(delta_y / 40.0, 1.0)

        # Blaue Füllfarbe (BGR): satt Blau mit leichtem Cyan-Stich
        b_val = int(230 * intensitaet)
        g_val = int(90 * intensitaet)
        r_val = int(20 * intensitaet)

        # Semi-transparente Fläche
        overlay = bild.copy()
        cv2.rectangle(overlay, (x1, y_top), (x2, y_bot), (b_val, g_val, r_val), -1)
        # Dezente Konturlinie (etwas heller)
        cv2.rectangle(overlay, (x1, y_top), (x2, y_bot),
                      (min(b_val + 40, 255), g_val, r_val), 1)
        cv2.addWeighted(overlay, alpha, bild, 1.0 - alpha, 0, bild)

    def zeichne_ankerpunkt_overlay(self, bild,
                                   analyse: "HaltungsAnalyse",
                                   aktuell_l_px: Optional[tuple],
                                   aktuell_r_px: Optional[tuple]):
        """Zeichnet Motion-Anchor-Overlay (profil-bewusst):
        - Countdown für Blue Anchor und Bio-Anker
        - Bio-Anker: Cyan-Punkte (Ruhehaltung ohne Instrument)
        - Blue Anchor: Gold-Punkte (Spielhaltung mit Instrument)
        - Gummiband-Visualisierung abhängig vom Profil:
            Kind:      Pulsierender Ankerpunkt, warmes Gummiband (immer sichtbar)
            Erwachsen: Blaue Intensität nach Abweichung
            Profi:     Minimales Gummiband, Trail, diskrete Blum-Linie
        """
        hoehe, breite = bild.shape[:2]
        profil = analyse.grenzwerte.profil
        jetzt = time.time()

        # ── Bio-Anker Countdown ──────────────────────────────────────────────
        bio_sek = analyse.bio_kalibrierungs_sekunden_verbleibend()
        if bio_sek is not None and bio_sek > 0:
            cv2.rectangle(bild,
                          (breite // 2 - 155, hoehe // 2 - 60),
                          (breite // 2 + 155, hoehe // 2 + 50), (0, 0, 0), -1)
            zeichne_text(bild, "Bio-Anker: Arme hängen lassen...",
                         (breite // 2 - 145, hoehe // 2 - 40),
                         0.65, (0, 220, 200), 2)
            zeichne_text(bild, f"{int(bio_sek) + 1}",
                         (breite // 2 - 18, hoehe // 2 + 35),
                         1.8, (0, 255, 230), 3)
            return

        # ── Blue Anchor Warte-Modus ──────────────────────────────────────────
        if analyse._kalibrierung_aktiv:
            stabil = analyse._kalibrierung_stabil_bereit
            farbe_warte = (0, 210, 80) if stabil else (30, 160, 255)
            zeile1 = "Nimm dir Zeit – genieß das Spielen" if stabil else "Nimm die Geige..."
            zeile2 = "Erster Bogenstrich setzt deinen Anker" if stabil else "Geh in deine Spielhaltung"
            box_b = 310 if stabil else 260
            cv2.rectangle(bild,
                          (breite // 2 - box_b, hoehe // 2 - 55),
                          (breite // 2 + box_b, hoehe // 2 + 65), (0, 0, 0), -1)
            zeichne_text(bild, zeile1, (breite // 2 - box_b + 12, hoehe // 2 - 35),
                         0.75, farbe_warte, 2)
            zeichne_text(bild, zeile2, (breite // 2 - box_b + 12, hoehe // 2 + 10),
                         0.5, (180, 180, 180), 1)
            # Pulsierender Indikator-Punkt (zeigt "lebt")
            puls = int(6 + 4 * abs(math.sin(jetzt * (1.5 if stabil else 3.0))))
            cv2.circle(bild, (breite // 2, hoehe // 2 + 45), puls, farbe_warte, -1)
            return

        # ── Biologischer Anker: Cyan-Referenzpunkte ─────────────────────────
        if analyse._bio_anker_gesetzt:
            FARBE_BIO = (200, 220, 0)   # Cyan-Grün (BGR)
            bio_l = analyse._bio_anker_l_px
            bio_r = analyse._bio_anker_r_px
            if bio_l:
                cv2.circle(bild, bio_l, 7, (0, 0, 0), -1)
                cv2.circle(bild, bio_l, 5, FARBE_BIO, -1)
                cv2.circle(bild, bio_l, 7, FARBE_BIO, 1)
            if bio_r:
                cv2.circle(bild, bio_r, 7, (0, 0, 0), -1)
                cv2.circle(bild, bio_r, 5, FARBE_BIO, -1)
                cv2.circle(bild, bio_r, 7, FARBE_BIO, 1)
            if bio_l:
                zeichne_text(bild, "Bio", (bio_l[0] - 10, bio_l[1] - 14),
                             0.38, FARBE_BIO, 1)

        if not analyse._ankerpunkt_gesetzt:
            return

        anker_l = analyse._anker_l_px
        anker_r = analyse._anker_r_px

        # ── Schulterbreite für Blum-Berechnung ──────────────────────────────
        if aktuell_l_px and aktuell_r_px:
            schulterbreite_px = abs(aktuell_r_px[0] - aktuell_l_px[0])
        elif anker_l and anker_r:
            schulterbreite_px = abs(anker_r[0] - anker_l[0])
        else:
            schulterbreite_px = 100

        # ════════════════════════════════════════════════════════════════════
        # PROFIL: KIND – pulsierender Ankerpunkt, warmes Gummiband
        # ════════════════════════════════════════════════════════════════════
        if profil == "kind":
            puls = int(4 + 3 * abs(math.sin(jetzt * 2.5)))  # Radius pulsiert 4–7
            FARBE_ANKER_KIND = (240, 160, 80)  # Blau (BGR)
            for anker in [anker_l, anker_r]:
                if anker:
                    cv2.circle(bild, anker, puls + 3, (30, 30, 30), -1)
                    cv2.circle(bild, anker, puls, FARBE_ANKER_KIND, -1)
                    cv2.circle(bild, anker, puls + 3, FARBE_ANKER_KIND, 1)
            if anker_l and anker_r:
                cv2.line(bild, anker_l, anker_r, FARBE_ANKER_KIND, 1)
            # Gummiband: immer sichtbar
            for aktuell, anker in ((aktuell_l_px, anker_l), (aktuell_r_px, anker_r)):
                if not aktuell or not anker:
                    continue
                abstand_px = math.hypot(aktuell[0] - anker[0], aktuell[1] - anker[1])
                if abstand_px < 15:
                    gummi_farbe = (255, 200, 120)  # hellblau
                    dicke = 2
                elif abstand_px < 40:
                    t = (abstand_px - 15) / 25.0
                    # hellblau → amber: BGR (255,200,120) → (0,165,255)
                    b_val = int(255 * (1 - t))
                    g_val = int(200 * (1 - t) + 165 * t)
                    r_val = int(120 * (1 - t) + 255 * t)
                    gummi_farbe = (b_val, g_val, r_val)
                    dicke = 3
                else:
                    gummi_farbe = (200, 50, 180)   # lila/violett
                    dicke = 4
                cv2.line(bild, aktuell, anker, (20, 20, 20), dicke + 2)
                cv2.line(bild, aktuell, anker, gummi_farbe, dicke)
            return

        # ── Anker-Datum (kleine Beschriftung oben rechts) ───────────────────
        if analyse._anker_datum:
            datum_text = f"Anker: {analyse._anker_datum}"
            zeichne_text(bild, datum_text, (breite - 200, 18), 0.42, (180, 160, 80), 1)

        # ════════════════════════════════════════════════════════════════════
        # ERWACHSEN + PROFI: Gold-Ankerpunkte + gestrichelte Verbindungslinie
        # ════════════════════════════════════════════════════════════════════
        FARBE_ANKER = (230, 120, 40)   # Blau (BGR) – Blue Anchor
        for anker in [anker_l, anker_r]:
            if anker:
                # Äußerer Glow-Ring (weich, gross)
                cv2.circle(bild, anker, 20, (40, 100, 200), 1)
                cv2.circle(bild, anker, 17, (60, 140, 240), 1)
                # Dunkler Hintergrundkreis für Kontrast
                cv2.circle(bild, anker, 14, (0, 0, 0), -1)
                # Gefüllter blauer Kern
                cv2.circle(bild, anker, 12, FARBE_ANKER, -1)
                # Heller Rand
                cv2.circle(bild, anker, 14, FARBE_ANKER, 2)
                # Kleines weisses Zentrum (Punkt im Punkt – klar erkennbar)
                cv2.circle(bild, anker, 3, (255, 255, 255), -1)
        if anker_l and anker_r:
            for i in range(0, 10):
                t = i / 10.0
                t2 = (i + 0.5) / 10.0
                p1 = (int(anker_l[0] + t * (anker_r[0] - anker_l[0])),
                      int(anker_l[1] + t * (anker_r[1] - anker_l[1])))
                p2 = (int(anker_l[0] + t2 * (anker_r[0] - anker_l[0])),
                      int(anker_l[1] + t2 * (anker_r[1] - anker_l[1])))
                cv2.line(bild, p1, p2, FARBE_ANKER, 1)

        # ════════════════════════════════════════════════════════════════════
        # PROFIL: PROFI – Trail + diskrete Blum-Linie + minimales Gummiband
        # ════════════════════════════════════════════════════════════════════
        if profil == "profi":
            # ── Trail: letzte ~2 Sek. als verblassende Punkte ───────────────
            for trail, farbe_basis in ((analyse._trail_l, (180, 100, 220)),
                                       (analyse._trail_r, (220, 100, 180))):
                n = len(trail)
                if n < 2:
                    continue
                trail_list = list(trail)
                for i, pt in enumerate(trail_list):
                    if i == n - 1:
                        continue
                    alpha = (i / max(n - 1, 1))
                    if alpha < 0.1:
                        continue  # älteste Punkte weglassen
                    b_val = int(farbe_basis[0] * alpha * 0.7)
                    g_val = int(farbe_basis[1] * alpha * 0.7)
                    r_val = int(farbe_basis[2] * alpha * 0.7)
                    radius = 2 if alpha < 0.7 else 3
                    cv2.circle(bild, pt, radius, (b_val, g_val, r_val), -1)

            # ── Blum-Limit: diskrete Referenzstrich über jedem Ankerpunkt ───
            blum_ratio = analyse.grenzwerte.blum_grenze_ratio
            FARBE_BLUM = (100, 80, 160)   # Gedämpftes Blau-Violett (subtil)
            for anker in [anker_l, anker_r]:
                if anker:
                    blum_y = int(anker[1] - blum_ratio * schulterbreite_px)
                    cv2.line(bild,
                             (anker[0] - 14, blum_y),
                             (anker[0] + 14, blum_y),
                             FARBE_BLUM, 1)
                    cv2.circle(bild, (anker[0], blum_y), 3, (0, 0, 0), -1)
                    cv2.circle(bild, (anker[0], blum_y), 2, FARBE_BLUM, -1)

            # ── Blum-Langzeit-Hinweis (nach 30 Sek.) ────────────────────────
            if analyse.blum_warnung_aktiv():
                zeichne_text(bild, "Langfristig belasten",
                             (breite - 240, hoehe - 65),
                             0.48, (140, 120, 200), 1)

            # ── Profi-Gummiband: nur bei deutlicher Abweichung sichtbar ─────
            for aktuell, anker in ((aktuell_l_px, anker_l), (aktuell_r_px, anker_r)):
                if not aktuell or not anker:
                    continue
                abstand_px = math.hypot(aktuell[0] - anker[0], aktuell[1] - anker[1])
                if abstand_px < 15:
                    continue  # Kein Band wenn nah am Anker – kein visuelles Rauschen
                # hellblau→amber→lila, dezent (Profi: dünn, subtil)
                if abstand_px < 35:
                    gummi_farbe = (200, 150, 80)   # helles Blau-Cyan (dezent)
                elif abstand_px < 60:
                    gummi_farbe = (60, 130, 200)   # amber (dezent)
                else:
                    gummi_farbe = (160, 40, 140)   # lila (dezent)
                cv2.line(bild, aktuell, anker, gummi_farbe, 1)
            return

        # ════════════════════════════════════════════════════════════════════
        # PROFIL: ERWACHSEN – Gummiband mit Farbverlauf hellblau→amber→lila
        # ════════════════════════════════════════════════════════════════════
        for aktuell, anker in ((aktuell_l_px, anker_l), (aktuell_r_px, anker_r)):
            if not aktuell or not anker:
                continue
            abstand_px = math.hypot(aktuell[0] - anker[0], aktuell[1] - anker[1])
            # Farbverlauf: hellblau → amber → lila  (kein Rot, kein Stress)
            if abstand_px < 20:
                gummi_farbe = (255, 200, 120)   # hellblau – entspannt
                dicke = 1
            elif abstand_px < 50:
                t = (abstand_px - 20) / 30.0
                # hellblau (255,200,120) → amber (0,165,255)
                b_val = int(255 * (1 - t))
                g_val = int(200 * (1 - t) + 165 * t)
                r_val = int(120 * (1 - t) + 255 * t)
                gummi_farbe = (b_val, g_val, r_val)
                dicke = 2
            else:
                # amber → lila: (0,165,255) → (200,50,180)
                t2 = min((abstand_px - 50) / 30.0, 1.0)
                b_val = int(0 * (1 - t2) + 200 * t2)
                g_val = int(165 * (1 - t2) + 50 * t2)
                r_val = int(255 * (1 - t2) + 180 * t2)
                gummi_farbe = (b_val, g_val, r_val)
                dicke = 3
            cv2.line(bild, aktuell, anker, (20, 20, 20), dicke + 3)
            cv2.line(bild, aktuell, anker, gummi_farbe, dicke)

    def zeichne_status_leiste(self, bild, warnungen: list[Warnung]):
        """Zeichnet eine Statusleiste am unteren Bildrand."""
        hoehe, breite = bild.shape[:2]

        # Hintergrund
        if not warnungen:
            farbe = self.FARBE_OK
            text = "Schultern frei – genieß das Spielen"
        elif any(w.schweregrad == "stark" for w in warnungen):
            farbe = self.FARBE_FEHLER
            text = "Einatmen – Schultern mit dem Atem sinken lassen"
        else:
            farbe = self.FARBE_WARNUNG
            text = "Schultern fließen lassen"

        cv2.rectangle(bild, (0, hoehe - 40), (breite, hoehe), farbe, -1)
        zeichne_text(bild, text, (10, hoehe - 35), 0.7, (255, 255, 255), 2)

    def zeichne_zoom_fenster(self, bild, warnungen: list[Warnung],
                             landmarks, breite: int, hoehe: int):
        """PiP-Zoom: Vergrößert die Problemstelle in der unteren rechten Ecke.

        Wird nur angezeigt wenn mindestens eine Warnung aktiv ist.
        Das Fenster zeigt das bereits annotierte Bild (mit Skelett, Gummiband)
        in 2.5-facher Vergrößerung, damit kleine Details gut sichtbar sind.
        """
        if not warnungen or landmarks is None:
            return

        # ── Problemstelle je nach Check bestimmen ───────────────────────────
        # check_index: 0=Schulter-Anstieg, 1=Kopf, 2=Handgelenk,
        #              3=Schulter-Asymmetrie, 4=Ellbogen
        ZOOM_BEREICHE = {
            0: (HaltungsAnalyse.LINKE_SCHULTER,  140),  # Schulter: größerer Bereich
            1: (HaltungsAnalyse.LINKES_OHR,       110),  # Kopf/Ohr
            2: (HaltungsAnalyse.LINKES_HANDGELENK, 90),  # Handgelenk
            3: (HaltungsAnalyse.LINKE_SCHULTER,  150),  # beide Schultern
            4: (HaltungsAnalyse.RECHTER_ELLBOGEN, 100),  # Ellbogen
        }

        warnung = warnungen[0]
        lm_index, halbgroesse = ZOOM_BEREICHE.get(warnung.check_index,
                                                   (HaltungsAnalyse.LINKE_SCHULTER, 130))

        try:
            lm = landmarks[lm_index]
        except (IndexError, TypeError):
            return
        if lm.visibility < 0.3:
            return

        cx = int(lm.x * breite)
        cy = int(lm.y * hoehe)

        # ── Crop-Region (gespiegelt – x-Koordinate ist bereits gespiegelt) ──
        x1 = max(cx - halbgroesse, 0)
        y1 = max(cy - halbgroesse, 0)
        x2 = min(cx + halbgroesse, breite)
        y2 = min(cy + halbgroesse, hoehe)
        if x2 <= x1 or y2 <= y1:
            return

        crop = bild[y1:y2, x1:x2].copy()

        # ── Zoom 2.5× ────────────────────────────────────────────────────────
        zoom_f = 2.5
        pip_b = int((x2 - x1) * zoom_f)
        pip_h = int((y2 - y1) * zoom_f)

        # Auf max. 260 px begrenzen
        max_pip = 260
        if pip_b > max_pip or pip_h > max_pip:
            scale = max_pip / max(pip_b, pip_h)
            pip_b = int(pip_b * scale)
            pip_h = int(pip_h * scale)

        if pip_b < 20 or pip_h < 20:
            return

        zoomed = cv2.resize(crop, (pip_b, pip_h), interpolation=cv2.INTER_LINEAR)

        # ── Position: unten rechts, über der Statusleiste ───────────────────
        rand = 12
        pip_x = breite - pip_b - rand
        pip_y = hoehe - pip_h - 40 - rand   # 40 = Höhe der Statusleiste

        if pip_y < 0 or pip_x < 0:
            return

        # ── Hintergrunddunkelung + farbiger Rahmen ───────────────────────────
        cv2.rectangle(bild,
                      (pip_x - 4, pip_y - 20),
                      (pip_x + pip_b + 4, pip_y + pip_h + 4),
                      (20, 20, 20), -1)
        cv2.rectangle(bild,
                      (pip_x - 4, pip_y - 20),
                      (pip_x + pip_b + 4, pip_y + pip_h + 4),
                      warnung.farbe, 2)

        # ── Label oben links im Rahmen ───────────────────────────────────────
        zeichne_text(bild, "zoom", (pip_x, pip_y - 6), 0.5, warnung.farbe, 1)

        # ── Zoom-Bild einsetzen ───────────────────────────────────────────────
        bild[pip_y:pip_y + pip_h, pip_x:pip_x + pip_b] = zoomed


# ──────────────────────────────────────────────
# Hauptprogramm
# ──────────────────────────────────────────────

def main():
    """Startet die Echtzeit-Haltungsanalyse per Webcam."""
    import sys

    # Profilwahl: --kind, --profi oder --erwachsen (Standard)
    if "--kind" in sys.argv:
        grenzwerte = HaltungsGrenzwerte.kinder_profil()
        profil_name = "Kinder"
    elif "--profi" in sys.argv:
        grenzwerte = HaltungsGrenzwerte.profi_profil()
        profil_name = "Profi"
    else:
        grenzwerte = HaltungsGrenzwerte()
        profil_name = "Erwachsene"

    print("=" * 50)
    print("  KI-Haltungsanalyse fuer Geiger")
    print(f"  Prototyp v0.2 – Profil: {profil_name}")
    print("=" * 50)
    print()

    sicherstellen_modell()

    print("Starte Webcam...")
    print("Druecke 0-7 zum Moduswechsel, 'q' oder ESC zum Beenden.")
    print("  0 = Alle Checks | 1 = Kopfneigung | 2 = Schulter-Asymmetrie")
    print("  3 = Handgelenk links | 4 = Ellbogen rechts | 5 = Schulter-Protraktion")
    print("  6 = Linke Schulter Anstieg | 7 = Rechte Schulter Anstieg")
    print()
    print("Blue Anchor – no countdown, no time pressure:")
    print("  Say 'Anchor', 'Ready', 'Anker', 'Bereit', 'Prêt' or 'Musique'")
    print("  OR press 'k' / spacebar")
    print("  → Hold violin in playing position → shoulders settle → green signal")
    print("  → First bow stroke sets your personal anchor point")
    print("  → Anchor is saved automatically and reloaded on next start")
    print()
    print("Recalibrate anytime (new shoulder rest, child grew, new instrument):")
    print("  Just say 'Anchor' again – old value is replaced instantly")
    print()

    # MediaPipe PoseLandmarker initialisieren (Tasks API)
    options = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_segmentation_masks=True,   # Silhouette-Modus ermöglicht
    )
    landmarker = vision.PoseLandmarker.create_from_options(options)

    # Analyse und Visualisierung
    analyse = HaltungsAnalyse(grenzwerte=grenzwerte)
    vis = Visualisierung()

    # Gespeicherten Anker laden (persistent – bleibt über Sessions erhalten)
    anker_laden(analyse)

    # Webcam öffnen
    kamera = cv2.VideoCapture(0)
    if not kamera.isOpened():
        print("FEHLER: Webcam konnte nicht geöffnet werden!")
        print("Stelle sicher, dass eine Webcam angeschlossen ist.")
        return

    kamera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    kamera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("Webcam bereit.")
    print()

    # Sprachbefehl-Thread starten (optional – braucht SpeechRecognition + pyaudio)
    starte_sprachbefehl_thread(analyse)

    aktiver_modus = 0
    timestamp_ms = 0
    silhouette_aktiv = False   # Taste 's' schaltet Silhouetten-Modus um
    auto_frame_crop: dict = {}  # EMA-geglättete Crop-Region für Auto-Framing

    while True:
        erfolg, bild = kamera.read()
        if not erfolg:
            print("Fehler beim Lesen der Webcam.")
            break

        # Bild spiegeln (Spiegel-Effekt)
        bild = cv2.flip(bild, 1)

        # Bild für MediaPipe vorbereiten (RGB)
        bild_rgb = cv2.cvtColor(bild, cv2.COLOR_BGR2RGB)

        # Pose erkennen
        mp_bild = mp.Image(image_format=mp.ImageFormat.SRGB, data=bild_rgb)
        ergebnis = landmarker.detect_for_video(mp_bild, timestamp_ms)
        timestamp_ms += 33  # ~30 fps

        # ── Silhouetten-Modus: Hintergrund abdunkeln ────────────────────────
        if silhouette_aktiv and ergebnis.segmentation_masks:
            maske = ergebnis.segmentation_masks[0].numpy_view()
            maske_gespiegelt = cv2.flip(maske, 1)
            koerper = maske_gespiegelt > 0.4   # True = Körper, False = Hintergrund
            # Hintergrund auf 25% abdunkeln → Körper leuchtet heraus
            hintergrund = (bild * 0.25).astype(bild.dtype)
            bild = np.where(koerper[..., np.newaxis], bild, hintergrund)

        if ergebnis.pose_landmarks:
            analyse._frames_ohne_landmarks = 0
            landmarks = ergebnis.pose_landmarks[0]
            hoehe, breite = bild.shape[:2]

            # Kalibrierungs-Countdowns aktualisieren (Blue Anchor + Bio-Anker)
            analyse.kalibrierung_aktualisieren(landmarks, breite, hoehe)
            analyse.bio_kalibrierung_aktualisieren(landmarks, breite, hoehe)

            # Aktuelle Schulter-Pixelpositionen für Gummiband
            l_schulter_px = hole_punkt(landmarks, HaltungsAnalyse.LINKE_SCHULTER, breite, hoehe)
            r_schulter_px = hole_punkt(landmarks, HaltungsAnalyse.RECHTE_SCHULTER, breite, hoehe)

            # ── Open Start Zone ────────────────────────────────────────────
            # Nach dem Blue Anchor wartet die App still bis der erste
            # Bogenstrich erkannt wird (Bewegung des rechten Handgelenks).
            if not analyse.analyse_aktiv:
                analyse.bogenbewegung_pruefen(landmarks, breite, hoehe)
                vis.zeichne_skelett(bild, landmarks, warnungen=[], modus=aktiver_modus)
                vis.zeichne_ankerpunkt_overlay(bild, analyse, l_schulter_px, r_schulter_px)
                if analyse._ankerpunkt_gesetzt:
                    cv2.rectangle(bild, (0, hoehe - 40), (breite, hoehe),
                                  (30, 130, 200), -1)
                    zeichne_text(bild, "Bereit – warte auf ersten Bogenstrich",
                                 (10, hoehe - 12), 0.7, (255, 255, 255), 2)
                else:
                    cv2.rectangle(bild, (0, hoehe - 40), (breite, hoehe),
                                  (60, 60, 60), -1)
                    zeichne_text(bild, "Taste k / Leertaste / 'Anker': Blue Anchor setzen",
                                 (10, hoehe - 12), 0.65, (200, 200, 200), 1)
                cv2.imshow("Haltungsanalyse fuer Geiger", bild)
                taste = cv2.waitKey(1) & 0xFF
                if taste == ord('q') or taste == 27:
                    break
                elif ord('0') <= taste <= ord('7'):
                    aktiver_modus = taste - ord('0')
                elif taste == ord('k') or taste == ord(' '):
                    if not analyse._kalibrierung_aktiv:
                        analyse.starte_kalibrierung()
                elif taste == ord('b'):
                    if not analyse._bio_kalibrierung_aktiv:
                        analyse.starte_bio_kalibrierung()
                elif taste == ord('s'):
                    silhouette_aktiv = not silhouette_aktiv
                    print(f"Silhouetten-Modus: {'AN' if silhouette_aktiv else 'AUS'}")
                continue
            # ── Ende Open Start Zone ───────────────────────────────────────

            # Haltung analysieren
            warnungen, messungen = analyse.analysiere(landmarks, breite, hoehe, modus=aktiver_modus)

            # Trail aktualisieren (Profi-Profil: letzte ~2 Sek. Schulter-Positionen)
            analyse.trail_aktualisieren(l_schulter_px, r_schulter_px)

            # Blum-Timer aktualisieren (nur relevant für Profi-Profil)
            if analyse.grenzwerte.profil == "profi" and analyse._ankerpunkt_gesetzt:
                anstieg_l = analyse._glaettung.get("schulter_links_anstieg", {}).get("wert", 0.0)
                anstieg_r = analyse._glaettung.get("schulter_rechts_anstieg", {}).get("wert", 0.0)
                analyse.blum_timer_aktualisieren(anstieg_l, anstieg_r)

            # Visualisierung
            vis.zeichne_skelett(bild, landmarks, warnungen=warnungen, modus=aktiver_modus)
            vis.zeichne_messungen(bild, messungen, warnungen, modus=aktiver_modus)
            vis.zeichne_ankerpunkt_overlay(bild, analyse, l_schulter_px, r_schulter_px)
            vis.zeichne_warnungen(bild, warnungen, modus=aktiver_modus)
            vis.zeichne_status_leiste(bild, warnungen)
            # PiP-Zoom: Problemstelle vergrößert in der Ecke anzeigen
            vis.zeichne_zoom_fenster(bild, warnungen, landmarks, breite, hoehe)

            # Feedback-Text anzeigen (Lob / Übergangsmeldungen)
            feedback = analyse.aktuelles_feedback()
            if feedback:
                hoehe_bild, breite_bild = bild.shape[:2]
                # Farbe: grün bei Lob, orange bei Hinweis
                ist_lob = any(w in feedback.lower() for w in
                              ["super", "toll", "klasse", "weiter", "gut", "prima"])
                farbe = (0, 200, 100) if ist_lob else (0, 165, 255)
                # Zentriert oben im Bild anzeigen
                zeichne_text(bild, feedback,
                             (breite_bild // 2 - 200, hoehe_bild - 60),
                             0.8, farbe, 2)
        else:
            analyse._frames_ohne_landmarks += 1
            if analyse._frames_ohne_landmarks > 30:  # ~1 Sekunde bei 30fps
                analyse.glaettung_zuruecksetzen()
            zeichne_text(bild, "Kein Körper erkannt – bitte in die Kamera stellen",
                         (10, 10), 0.7, (100, 100, 255), 2)

        # ── Auto-Framing: Oberkörper einrahmen nach Ankerpunkt ────────────────
        # Aktiviert sich automatisch sobald der Ankerpunkt gesetzt ist.
        # Berechnet die Bounding-Box der sichtbaren Oberkörper-Landmarks,
        # glättet sie per EMA (kein Zittern) und zoomt sanft hinein.
        if analyse._ankerpunkt_gesetzt and ergebnis and ergebnis.pose_landmarks:
            lms = ergebnis.pose_landmarks[0]
            OBERKÖRPER_IDX = [
                HaltungsAnalyse.NASE,
                HaltungsAnalyse.LINKES_OHR,   HaltungsAnalyse.RECHTES_OHR,
                HaltungsAnalyse.LINKE_SCHULTER, HaltungsAnalyse.RECHTE_SCHULTER,
                HaltungsAnalyse.LINKER_ELLBOGEN, HaltungsAnalyse.RECHTER_ELLBOGEN,
                HaltungsAnalyse.LINKES_HANDGELENK, HaltungsAnalyse.RECHTES_HANDGELENK,
            ]
            pts_x, pts_y = [], []
            for idx in OBERKÖRPER_IDX:
                try:
                    lm = lms[idx]
                    if lm.visibility >= 0.25:
                        # gespiegelt (bild wird geflippt)
                        pts_x.append((1.0 - lm.x) * breite)
                        pts_y.append(lm.y * hoehe)
                except IndexError:
                    pass

            if len(pts_x) >= 4:
                min_x, max_x = min(pts_x), max(pts_x)
                min_y, max_y = min(pts_y), max(pts_y)
                spanne_x = max_x - min_x
                spanne_y = max_y - min_y

                # Großzügiges Padding damit nichts abgeschnitten wird
                pad_x = spanne_x * 0.45
                pad_y_oben  = spanne_y * 0.30   # mehr Raum oben (Kopf)
                pad_y_unten = spanne_y * 0.20

                tx1 = max(int(min_x - pad_x),     0)
                ty1 = max(int(min_y - pad_y_oben), 0)
                tx2 = min(int(max_x + pad_x),      breite)
                ty2 = min(int(max_y + pad_y_unten), hoehe)

                # EMA-Glättung: sehr langsam (alpha=0.04) → kein Zittern
                alpha_ema = 0.04
                if not auto_frame_crop:
                    auto_frame_crop.update(
                        {"x1": float(tx1), "y1": float(ty1),
                         "x2": float(tx2), "y2": float(ty2)})
                else:
                    auto_frame_crop["x1"] += alpha_ema * (tx1 - auto_frame_crop["x1"])
                    auto_frame_crop["y1"] += alpha_ema * (ty1 - auto_frame_crop["y1"])
                    auto_frame_crop["x2"] += alpha_ema * (tx2 - auto_frame_crop["x2"])
                    auto_frame_crop["y2"] += alpha_ema * (ty2 - auto_frame_crop["y2"])

                cx1 = int(auto_frame_crop["x1"])
                cy1 = int(auto_frame_crop["y1"])
                cx2 = int(auto_frame_crop["x2"])
                cy2 = int(auto_frame_crop["y2"])

                if cx2 - cx1 > 80 and cy2 - cy1 > 80:
                    crop = bild[cy1:cy2, cx1:cx2].copy()
                    bild[:] = cv2.resize(crop, (breite, hoehe),
                                         interpolation=cv2.INTER_LINEAR)

        # Bild anzeigen
        cv2.imshow("Haltungsanalyse für Geiger", bild)

        # Tastendruck prüfen
        taste = cv2.waitKey(1) & 0xFF
        if taste == ord('q') or taste == 27:  # q oder ESC
            break
        elif ord('0') <= taste <= ord('7'):
            aktiver_modus = taste - ord('0')
            print(f"Modus: {MODUS_NAMEN[aktiver_modus]}")
        elif taste == ord('k') or taste == ord(' '):  # k oder Leertaste (Pedal)
            if not analyse._kalibrierung_aktiv:
                analyse.starte_kalibrierung()
        elif taste == ord('b'):  # Bio-Anker (Ruhehaltung ohne Instrument)
            if not analyse._bio_kalibrierung_aktiv:
                analyse.starte_bio_kalibrierung()
        elif taste == ord('s'):  # Silhouetten-Modus ein/aus
            silhouette_aktiv = not silhouette_aktiv
            print(f"Silhouetten-Modus: {'AN' if silhouette_aktiv else 'AUS'}")

    # Aufräumen (Loop-Ende)
    kamera.release()
    cv2.destroyAllWindows()
    landmarker.close()
    print("Programm beendet.")


if __name__ == "__main__":
    main()
