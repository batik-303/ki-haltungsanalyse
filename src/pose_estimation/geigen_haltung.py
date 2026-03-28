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
import urllib.request
from dataclasses import dataclass
from typing import Optional
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision


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

    # Schulterhöhen-Differenz
    schulter_asymmetrie_max: float = 0.05  # Relative Differenz (% der Schulterbreite)

    # Ellbogen rechts (Bogenführung)
    ellbogen_rechts_min: float = 80.0  # Mindestwinkel
    ellbogen_rechts_max: float = 160.0  # Maximalwinkel


@dataclass
class Warnung:
    """Eine erkannte Fehlhaltung mit Schweregrad und Korrekturhinweis."""
    name: str
    schweregrad: str  # "leicht", "mittel", "stark"
    korrektur: str
    farbe: tuple  # BGR-Farbe für die Visualisierung


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

    def analysiere(self, landmarks, breite: int, hoehe: int) -> list[Warnung]:
        """
        Führt alle Haltungschecks durch und gibt eine Liste von Warnungen zurück.
        """
        warnungen = []

        # Check 1: Kopfneigung
        w = self._pruefe_kopfneigung(landmarks, breite, hoehe)
        if w:
            warnungen.append(w)

        # Check 2: Schulterhöhen-Asymmetrie
        w = self._pruefe_schulter_asymmetrie(landmarks, breite, hoehe)
        if w:
            warnungen.append(w)

        # Check 3: Handgelenkswinkel links (Griffhand)
        w = self._pruefe_handgelenk_links(landmarks, breite, hoehe)
        if w:
            warnungen.append(w)

        # Check 4: Ellbogen rechts (Bogenführung)
        w = self._pruefe_ellbogen_rechts(landmarks, breite, hoehe)
        if w:
            warnungen.append(w)

        # Check 5: Schulter-Protraktion
        w = self._pruefe_schulter_protraktion(landmarks)
        if w:
            warnungen.append(w)

        return warnungen

    def _pruefe_kopfneigung(self, landmarks, breite, hoehe) -> Optional[Warnung]:
        """Prüft ob der Kopf zu stark zur Seite geneigt ist."""
        linkes_ohr = hole_punkt(landmarks, self.LINKES_OHR, breite, hoehe)
        rechtes_ohr = hole_punkt(landmarks, self.RECHTES_OHR, breite, hoehe)

        if not linkes_ohr or not rechtes_ohr:
            return None

        # Neigungswinkel berechnen
        dx = rechtes_ohr[0] - linkes_ohr[0]
        dy = rechtes_ohr[1] - linkes_ohr[1]
        neigung = abs(math.degrees(math.atan2(dy, dx)))

        if neigung > self.grenzwerte.kopfneigung_max:
            schweregrad = "stark" if neigung > self.grenzwerte.kopfneigung_max * 1.5 else "mittel"
            return Warnung(
                name=f"Kopfneigung: {neigung:.0f}°",
                schweregrad=schweregrad,
                korrektur="Kopf gerader halten – Kinnstütze prüfen",
                farbe=(0, 0, 255) if schweregrad == "stark" else (0, 165, 255)
            )
        return None

    def _pruefe_schulter_asymmetrie(self, landmarks, breite, hoehe) -> Optional[Warnung]:
        """Prüft ob eine Schulter deutlich höher ist als die andere."""
        l_schulter = hole_punkt(landmarks, self.LINKE_SCHULTER, breite, hoehe)
        r_schulter = hole_punkt(landmarks, self.RECHTE_SCHULTER, breite, hoehe)

        if not l_schulter or not r_schulter:
            return None

        schulterbreite = abs(r_schulter[0] - l_schulter[0])
        if schulterbreite < 10:
            return None

        hoehen_diff = abs(l_schulter[1] - r_schulter[1]) / schulterbreite

        if hoehen_diff > self.grenzwerte.schulter_asymmetrie_max:
            hoehere = "Linke" if l_schulter[1] < r_schulter[1] else "Rechte"
            schweregrad = "stark" if hoehen_diff > self.grenzwerte.schulter_asymmetrie_max * 2 else "mittel"
            return Warnung(
                name=f"Schultern asymmetrisch ({hoehere} höher)",
                schweregrad=schweregrad,
                korrektur="Schultern entspannen und auf gleiche Höhe bringen",
                farbe=(0, 0, 255) if schweregrad == "stark" else (0, 165, 255)
            )
        return None

    def _pruefe_handgelenk_links(self, landmarks, breite, hoehe) -> Optional[Warnung]:
        """Prüft den Winkel des linken Handgelenks (Griffhand)."""
        schulter = hole_punkt(landmarks, self.LINKE_SCHULTER, breite, hoehe)
        ellbogen = hole_punkt(landmarks, self.LINKER_ELLBOGEN, breite, hoehe)
        handgelenk = hole_punkt(landmarks, self.LINKES_HANDGELENK, breite, hoehe)

        if not schulter or not ellbogen or not handgelenk:
            return None

        winkel = berechne_winkel(schulter, ellbogen, handgelenk)

        if winkel < self.grenzwerte.handgelenk_links_min:
            schweregrad = "stark" if winkel < self.grenzwerte.handgelenk_links_min - 20 else "leicht"
            return Warnung(
                name=f"Handgelenk links: {winkel:.0f}°",
                schweregrad=schweregrad,
                korrektur="Linkes Handgelenk gerader halten – nicht abknicken",
                farbe=(0, 0, 255) if schweregrad == "stark" else (0, 255, 255)
            )
        return None

    def _pruefe_ellbogen_rechts(self, landmarks, breite, hoehe) -> Optional[Warnung]:
        """Prüft den Winkel des rechten Ellbogens (Bogenführung)."""
        schulter = hole_punkt(landmarks, self.RECHTE_SCHULTER, breite, hoehe)
        ellbogen = hole_punkt(landmarks, self.RECHTER_ELLBOGEN, breite, hoehe)
        handgelenk = hole_punkt(landmarks, self.RECHTES_HANDGELENK, breite, hoehe)

        if not schulter or not ellbogen or not handgelenk:
            return None

        winkel = berechne_winkel(schulter, ellbogen, handgelenk)

        if winkel < self.grenzwerte.ellbogen_rechts_min:
            return Warnung(
                name=f"Bogenarm-Ellbogen zu eng: {winkel:.0f}°",
                schweregrad="mittel",
                korrektur="Rechten Ellbogen etwas anheben",
                farbe=(0, 165, 255)
            )
        elif winkel > self.grenzwerte.ellbogen_rechts_max:
            return Warnung(
                name=f"Bogenarm zu gestreckt: {winkel:.0f}°",
                schweregrad="mittel",
                korrektur="Rechten Ellbogen etwas mehr beugen",
                farbe=(0, 165, 255)
            )
        return None

    def _pruefe_schulter_protraktion(self, landmarks) -> Optional[Warnung]:
        """
        Prüft Schulter-Protraktion (Rundrücken) anhand der Z-Koordinaten.
        Wenn die Schultern deutlich weiter vorne sind als die Ohren,
        deutet das auf einen Rundrücken hin.
        """
        l_schulter_3d = hole_punkt_3d(landmarks, self.LINKE_SCHULTER)
        r_schulter_3d = hole_punkt_3d(landmarks, self.RECHTE_SCHULTER)
        nase_3d = hole_punkt_3d(landmarks, self.NASE)

        if not l_schulter_3d or not r_schulter_3d or not nase_3d:
            return None

        # Durchschnittliche Z-Position der Schultern vs. Nase
        schulter_z = (l_schulter_3d[2] + r_schulter_3d[2]) / 2
        z_diff = schulter_z - nase_3d[2]

        # Wenn Schultern deutlich vor der Nase liegen (in Z-Richtung)
        schwelle = self.grenzwerte.schulter_protraktion_max / 100.0
        if z_diff > schwelle:
            return Warnung(
                name="Rundrücken erkannt",
                schweregrad="mittel",
                korrektur="Brustbein heben, Schultern sanft zurückziehen",
                farbe=(0, 100, 255)
            )
        return None


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

    def zeichne_skelett(self, bild, landmarks):
        """Zeichnet das erkannte Skelett auf das Bild."""
        if not landmarks:
            return
        hoehe, breite = bild.shape[:2]

        for start_idx, end_idx in POSE_CONNECTIONS:
            start_lm = landmarks[start_idx]
            end_lm = landmarks[end_idx]
            if start_lm.visibility > 0.5 and end_lm.visibility > 0.5:
                start_pt = (int(start_lm.x * breite), int(start_lm.y * hoehe))
                end_pt = (int(end_lm.x * breite), int(end_lm.y * hoehe))
                cv2.line(bild, start_pt, end_pt, self.FARBE_KNOCHEN, 2)

        for lm in landmarks:
            if lm.visibility > 0.5:
                pt = (int(lm.x * breite), int(lm.y * hoehe))
                cv2.circle(bild, pt, 4, self.FARBE_GELENK, -1)
                cv2.circle(bild, pt, 4, (0, 0, 0), 1)

    def zeichne_warnungen(self, bild, warnungen: list[Warnung]):
        """Zeichnet Warnungen als Textfeld auf das Bild."""
        if not warnungen:
            # Alles gut – grüner Status
            cv2.putText(
                bild, "Haltung OK",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                self.FARBE_OK, 2
            )
            return

        y_position = 30
        for warnung in warnungen:
            # Warnung anzeigen
            cv2.putText(
                bild, f"! {warnung.name}",
                (10, y_position), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                warnung.farbe, 2
            )
            y_position += 25

            # Korrekturhinweis
            cv2.putText(
                bild, f"  -> {warnung.korrektur}",
                (10, y_position), cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                (200, 200, 200), 1
            )
            y_position += 30

    def zeichne_status_leiste(self, bild, warnungen: list[Warnung]):
        """Zeichnet eine Statusleiste am unteren Bildrand."""
        hoehe, breite = bild.shape[:2]

        # Hintergrund
        if not warnungen:
            farbe = self.FARBE_OK
            text = "Haltung gut – weiter so!"
        elif any(w.schweregrad == "stark" for w in warnungen):
            farbe = self.FARBE_FEHLER
            text = f"{len(warnungen)} Korrektur(en) noetig!"
        else:
            farbe = self.FARBE_WARNUNG
            text = f"{len(warnungen)} Hinweis(e)"

        cv2.rectangle(bild, (0, hoehe - 40), (breite, hoehe), farbe, -1)
        cv2.putText(
            bild, text,
            (10, hoehe - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
            (255, 255, 255), 2
        )


# ──────────────────────────────────────────────
# Hauptprogramm
# ──────────────────────────────────────────────

def main():
    """Startet die Echtzeit-Haltungsanalyse per Webcam."""

    print("=" * 50)
    print("  KI-Haltungsanalyse für Geiger")
    print("  Prototyp v0.1")
    print("=" * 50)
    print()

    sicherstellen_modell()

    print("Starte Webcam...")
    print("Drücke 'q' oder ESC zum Beenden.")
    print()

    # MediaPipe PoseLandmarker initialisieren (Tasks API)
    options = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = vision.PoseLandmarker.create_from_options(options)

    # Analyse und Visualisierung
    analyse = HaltungsAnalyse()
    vis = Visualisierung()

    # Webcam öffnen
    kamera = cv2.VideoCapture(0)
    if not kamera.isOpened():
        print("FEHLER: Webcam konnte nicht geöffnet werden!")
        print("Stelle sicher, dass eine Webcam angeschlossen ist.")
        return

    kamera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    kamera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("Webcam bereit. Nimm deine Geige und spiel los!")
    print()

    timestamp_ms = 0

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

        if ergebnis.pose_landmarks:
            landmarks = ergebnis.pose_landmarks[0]
            hoehe, breite = bild.shape[:2]

            # Haltung analysieren
            warnungen = analyse.analysiere(landmarks, breite, hoehe)

            # Visualisierung
            vis.zeichne_skelett(bild, landmarks)
            vis.zeichne_warnungen(bild, warnungen)
            vis.zeichne_status_leiste(bild, warnungen)
        else:
            cv2.putText(
                bild, "Kein Koerper erkannt – bitte in die Kamera stellen",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                (100, 100, 255), 2
            )

        # Bild anzeigen
        cv2.imshow("Haltungsanalyse fuer Geiger", bild)

        # Tastendruck prüfen
        taste = cv2.waitKey(1) & 0xFF
        if taste == ord('q') or taste == 27:  # q oder ESC
            break

    # Aufräumen
    kamera.release()
    cv2.destroyAllWindows()
    landmarker.close()
    print("Programm beendet.")


if __name__ == "__main__":
    main()
