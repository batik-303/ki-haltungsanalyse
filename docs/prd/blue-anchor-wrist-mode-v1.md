# PRD — Blue Anchor V1 · Gelenk-Modus (Wrist Mode)

> **Product Requirement Document.** Quelle: `PRD_Blue_Anchor_Wrist_Mode_DE` (von der Produktverantwortlichen, 2026-09-22). Vertraulich.
> Dieses Dokument ist die **fachliche Ground Truth** für den Wrist-Mode. Bei Konflikten zwischen Code und PRD gilt das PRD — Abweichungen werden als Ticket geklärt.

## 1. Vision & Philosophie: Der stille digitale Spiegel

Hauptziel: den Schülern einen **interaktiven digitalen Spiegel** bieten, damit sie zwischen den Unterrichtsstunden selbstständig an ihrer Haltung arbeiten. Das Werkzeug hilft, den eigenen Körper besser kennenzulernen und sich selbst zu korrigieren — **ohne den musikalischen Fluss zu unterbrechen**.

- **Interface-Philosophie (Anti-Stress)**: kein akustischer Alarm, keine aggressiven Erinnerungen, keine visuellen Störungen. So wenig Information auf dem Bildschirm wie möglich, um jede Ablenkung zu vermeiden.
- **Keine kalten Daten**: keine Anzeige von geometrischen Winkeln oder komplexen Spannungsverläufen.
- **100 % positive Analyse**: die Abschlussbilanz zeigt **keine** Fehlerprozente. Sie wertet nur den **Prozentanteil der Zeit in der richtigen Position** sowie **Fortschritte in der Stabilität** aus — um das Selbstvertrauen zu stärken.

## 2. Das biologisch-pädagogische Ziel

Das linke Handgelenk ist das entscheidende Übertragungsglied zwischen Arm und linker Hand. Echtzeit-Analyse ist aus drei Gründen zwingend:

- **Sichtbarmachen des Unsichtbaren**: Schüler merken beim häuslichen Üben oft nicht, dass sie aus der Achse geraten. Der Spiegel macht den Haltungsbruch sofort sichtbar, ohne das Spiel zu stoppen.
- **Erhalt der Fingermechanik (Kraft & Velozität)**: Knickt das Gelenk ein, blockiert die Biomechanik der Hand — die Finger verlieren Aufschlagskraft, der kleine Finger (4. Finger) hat nicht mehr die nötige Höhe, die Geläufigkeit bricht ein.
- **Prävention von Schmerzen (Musikermedizin)**: Ein dauerhaft eingeknicktes/verdrehtes Gelenk setzt die Sehnen unter extreme Spannung → Verkrampfungen, Muskelermüdung, langfristig chronische Schmerzen (Sehnenscheidenentzündungen).

## 3. Der Ankerpunkt & die Bewegungssteuerung (algorithmische Regeln)

- **Position des Ankers**: der Tracking-Punkt sitzt **exakt auf dem Knochen zwischen Handgelenk und Unterarm** — dem **Ellenkopf / der tastbar hervorstehenden Ulna** (Kleinfinger-Seite des Handgelenks).
- **Definition der geraden Linie**: Der Schüler nimmt mit dem Lehrer die ideale Spielhaltung ein und **speichert sie ab** (perfekte Ausrichtung Unterarm ↔ Handgelenk = gerade Linie). Das ist die **Referenzlinie (Master-Print)**.
- **Dynamischer Filter (Vibrato & Lagenwechsel)**:
  - Bei **Vibrato** oder **Lagenwechsel / Démanché** muss der Anker **blau und ruhig** bleiben. Der Algorithmus filtert diese natürlichen Bewegungen heraus.
  - Bei Bewegung in **hohe Lagen** (z. B. ab der 3. Lage) bleibt der Punkt **strikt blau**, solange die anatomisch gerade Achse eingehalten wird. Ein Farbwechsel wird **nur** ausgelöst, wenn die Linie **tatsächlich einknickt**.

## 4. Die 3 erfassten Haltungsfehler (Wechsel zu Gelb)

Sobald die gerade Linie bricht, wechselt der Punkt **augenblicklich zu Gelb**. Analysiert werden drei Fehlhaltungen:

1. **Einknicken zum Geigenhals (Einsinken)** — oft durch Müdigkeit oder um die Geige zu stützen. Folge: Finger verlieren Kraft, kleiner Finger zu tief, Velozität bricht ein.
2. **Einknicken nach rechts** — oft, um die E-Saite leichter zu erreichen.
3. **Einknicken Richtung Wirbelkasten (Überstreckung)** — verkrampfte Position, belastet die Sehnen, kann zu Schmerzen führen.

## 5. Grafische Oberfläche & Live-Autokorrektur

### A. Analyse-Modus (Kontaktaufnahme / Kalibrierung)
- Schüler sieht sein Live-Bild mit dem Ankerpunkt auf dem Arm.
- Durch bewusstes Bewegen sieht er den Punkt sofort von **Blau zu Gelb** wechseln.
- **Direkte Belohnung (Blink)**: sobald die gerade Linie wiederhergestellt ist, wechselt der Punkt zurück zu **Blau** und **leuchtet kurz intensiv auf** — visuelle Bestätigung der Korrektur.

### B. Periphere Sicht & Peripherie-Modus (linker Bildschirmrand)
- Ein sehr einfacher, **vertikaler blauer Strich** links. Eine kleine Markierung (= Handgelenk) bewegt sich je nach Armposition nach rechts/links; Ziel: die Linie gerade und blau halten.
- Bricht die Haltung, **knickt die periphere Linie ein** und das gesamte linke Segment färbt sich **gelb**.
- **Belohnung**: bei Korrektur schaltet die Peripherie sofort auf **Blau** und sendet ein **deutliches, pulsierendes Aufleuchten** über das ganze Segment.

### C. Flow-Modus (Sprachaktivierung)
- Codewort **„Flow"** sprechen → das Videobild verschwindet vollständig, Bildschirm wird dunkel/schwarz, es bleibt **nur das breitere, leuchtende Band der peripheren Sicht** am linken Rand (konstante Position).
- **Belohnung**: Der Blick ruht auf den Noten; Fehlhaltung nur über gelbes Leuchten am Rand wahrnehmbar. Zurück in der Achse → gelbe Warnung bricht ab, Linie wird kerzengerade und **schießt ein intensives blaues Aufleuchten** ins periphere Sichtfeld. Belohnung ohne Blick von den Noten.

## 6. Zukünftige Roadmap (V2)

- **Kompletter Dunkelmodus (Hintergrund-Aufnahme)**: Bildschirm bleibt während des Spielens vollständig aus (keine Live-Signale, keine peripheren Belohnungen). Analyse rein im Hintergrund, positive Stabilitätsbilanz erst am Ende der Session.
- **Violette Zone (medizinisch kritische Belastungsgrenzen)**: dritte Alarmstufe (Violett) bei extremen, dauerhaften Fehlhaltungen — gezielte Prävention von Sehnenüberlastung nach Kriterien der Musikermedizin.

---

## Umsetzungs-Notizen (Abgleich PRD ↔ Code, Stand 2026-09-22)

- **Ankerposition**: PRD will den Anker auf dem **Ulna-Höcker**. MediaPipe **`handLandmarks[0]`** liegt mittig an der Handwurzel, leicht Richtung Handfläche — nicht exakt auf der Ulna. → nach dem Live-Test von #79 ggf. **kleiner Versatz** Richtung Kleinfinger/Unterarm. Verfolgt in Karte #71 (#79 = Anker auf `handLandmarks[0]`).
- **Blau bei Vibrato/Lagenwechsel**: erfordert eine **rotationsinvariante, kalibrierungsrelative** Messung statt des heutigen 2D-projizierten Winkels → siehe Diagnose #78 und Farb-Semantik #75.
- **3 Fehlerrichtungen / Peripherie / Flow**: #75 (Farbe), #76 (periphere Leiste), #77 (Flow = nur Peripherie).
