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
    check_index: int = 0  # 1–5, zugehöriger Check (für Segment-Highlighting)


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

    def analysiere(self, landmarks, breite: int, hoehe: int, modus: int = 0) -> list[Warnung]:
        """
        Führt Haltungschecks durch und gibt eine Liste von Warnungen zurück.

        Args:
            modus: 0 = alle Checks, 1–5 = einzelner Check
        """
        checks = {
            1: lambda: self._pruefe_kopfneigung(landmarks, breite, hoehe),
            2: lambda: self._pruefe_schulter_asymmetrie(landmarks, breite, hoehe),
            3: lambda: self._pruefe_handgelenk_links(landmarks, breite, hoehe),
            4: lambda: self._pruefe_ellbogen_rechts(landmarks, breite, hoehe),
            5: lambda: self._pruefe_schulter_protraktion(landmarks),
        }

        if modus == 0:
            auswahl = checks.values()
        else:
            auswahl = [checks[modus]] if modus in checks else []

        warnungen = []
        for check_fn in auswahl:
            w = check_fn()
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
                farbe=(0, 0, 255) if schweregrad == "stark" else (0, 165, 255),
                check_index=1,
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
                farbe=(0, 0, 255) if schweregrad == "stark" else (0, 165, 255),
                check_index=2,
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
                farbe=(0, 0, 255) if schweregrad == "stark" else (0, 255, 255),
                check_index=3,
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
                farbe=(0, 165, 255),
                check_index=4,
            )
        elif winkel > self.grenzwerte.ellbogen_rechts_max:
            return Warnung(
                name=f"Bogenarm zu gestreckt: {winkel:.0f}°",
                schweregrad="mittel",
                korrektur="Rechten Ellbogen etwas mehr beugen",
                farbe=(0, 165, 255),
                check_index=4,
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
                farbe=(0, 100, 255),
                check_index=5,
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

        # Gelenke zeichnen (Glow + Größenhierarchie)
        for idx, lm in enumerate(landmarks):
            if lm.visibility < 0.5:
                continue

            pt = (int(lm.x * breite), int(lm.y * hoehe))
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
            cv2.putText(
                bild, modus_text,
                (panel_x + 8, panel_y + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                (180, 180, 180), 1
            )
            cv2.putText(
                bild, "Haltung OK",
                (panel_x + 8, panel_y + 24 + zeilen_hoehe), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                self.FARBE_OK, 2
            )
            return

        # Modus-Zeile + pro Warnung 2 Zeilen (Name + Korrektur)
        panel_hoehe = zeilen_hoehe + len(warnungen) * (zeilen_hoehe * 2) + 16
        self._zeichne_panel(bild, panel_x, panel_y, panel_breite, panel_hoehe)

        # Modus-Zeile
        cv2.putText(
            bild, modus_text,
            (panel_x + 8, panel_y + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
            (180, 180, 180), 1
        )

        y_pos = panel_y + 24 + zeilen_hoehe
        for warnung in warnungen:
            cv2.putText(
                bild, f"! {warnung.name}",
                (panel_x + 8, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                warnung.farbe, 2
            )
            y_pos += zeilen_hoehe

            cv2.putText(
                bild, f"  -> {warnung.korrektur}",
                (panel_x + 8, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.42,
                (200, 200, 200), 1
            )
            y_pos += zeilen_hoehe

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
    print("Drücke 0-5 zum Moduswechsel, 'q' oder ESC zum Beenden.")
    print("  0 = Alle Checks | 1 = Kopfneigung | 2 = Schulter-Asymmetrie")
    print("  3 = Handgelenk links | 4 = Ellbogen rechts | 5 = Schulter-Protraktion")
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

    aktiver_modus = 0
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
            warnungen = analyse.analysiere(landmarks, breite, hoehe, modus=aktiver_modus)

            # Visualisierung
            vis.zeichne_skelett(bild, landmarks, warnungen=warnungen, modus=aktiver_modus)
            vis.zeichne_warnungen(bild, warnungen, modus=aktiver_modus)
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
        elif ord('0') <= taste <= ord('5'):
            aktiver_modus = taste - ord('0')
            print(f"Modus: {MODUS_NAMEN[aktiver_modus]}")

    # Aufräumen
    kamera.release()
    cv2.destroyAllWindows()
    landmarker.close()
    print("Programm beendet.")


if __name__ == "__main__":
    main()
