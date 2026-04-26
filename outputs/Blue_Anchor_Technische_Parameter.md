**⚓ Blue Anchor Music AI**

Technische Parameter & Wissenschaftliche Grundlagen

Dokument für Fachprüfung durch Dr. Blum - Stand: April 2026

Dieses Dokument listet alle technischen Werte, Schwellenwerte und wissenschaftlichen Grundlagen auf, die im Blue Anchor Prototyp verwendet werden. Es ist bewusst transparent gehalten: bei jedem Wert ist angegeben, ob er wissenschaftlich fundiert, aus Fachliteratur abgeleitet, oder geschätzt ist.

# **1\. Technologie: Pose Estimation**

## **1.1 MediaPipe Pose Landmarker**

**Technologie:** Google MediaPipe Tasks Vision API v0.10.18

**Modell:** pose_landmarker_lite (Float16) - leichtgewichtig, läuft im Browser

**Genauigkeit:** Laut Google-Dokumentation ca. ±2-3 Pixel bei 640×480 Auflösung unter idealen Bedingungen. In der Praxis (Geige verdeckt Schulter) kann die Genauigkeit deutlich sinken.

**Quelle:** Google AI Research, „MediaPipe Pose: Real-time Body Pose Tracking" (2020). Peer-reviewed: Bazarevsky et al., CVPR 2020 Workshop.

## **1.2 Verwendete Landmarks (Körperpunkte)**

| **Landmark**   | **MediaPipe Index** | **Verwendung**                  |
| -------------- | ------------------- | ------------------------------- |
| LEFT_EAR       | 7                   | Schulter-Modus: Referenz oben   |
| LEFT_SHOULDER  | 11                  | Schulter-Modus: Ankerpunkt      |
| RIGHT_SHOULDER | 12                  | Distanzmessung (Schulterbreite) |
| LEFT_ELBOW     | 13                  | Handgelenk-Modus: Armlinie      |
| LEFT_WRIST     | 15                  | Handgelenk-Modus: Ankerpunkt    |
| LEFT_INDEX     | 19                  | Handgelenk-Modus: Handrichtung  |

**Wichtiger Hinweis:** Alle Landmarks sind „normalisiert" (0.0-1.0 relativ zum Bild). Die tatsächliche Millimeter-Genauigkeit hängt von Kamera-Auflösung und Abstand ab.

**Fundierung:** ✅ Wissenschaftlich validiert - MediaPipe Landmark-Positionen basieren auf COCO-Datensatz (Lin et al., 2014) und BlazePose-Architektur.

# **2\. Schulter-Modus: Schwellenwerte**

## **2.1 Messmethode**

Gemessen wird die euklidische Distanz zwischen linkem Ohr (Landmark 7) und linker Schulter (Landmark 11) in normalisierten Koordinaten. Die Abweichung wird als Prozentsatz der kalibrierten Referenzdistanz berechnet:

_Abweichung = (Referenzdistanz - aktuelle Distanz) / Referenzdistanz_

Positive Werte = Schulter näher am Ohr = Schulter zieht hoch.

## **2.2 Schwellenwerte nach Sensibilitätsstufe**

| **Stufe**         | **Start-Schwelle** | **Maximum** | **Ca. in mm\*** | **Fundierung** |
| ----------------- | ------------------ | ----------- | --------------- | -------------- |
| Profi (locker)    | 6%                 | 18%         | ~9-27mm         | ⚠ Geschätzt    |
| Standard          | 3%                 | 12%         | ~4.5-18mm       | ⚠ Abgeleitet   |
| Anfänger (streng) | 1.5%               | 8%          | ~2-12mm         | ⚠ Geschätzt    |

_\*Millimeter-Umrechnung basiert auf typischer Ohr-Schulter-Distanz von ~15cm bei Erwachsenen._

## **2.3 Wissenschaftliche Grundlage**

**Was fundiert ist:** Die Musikermedizin (Altenmüller, Jabusch - IMMM Hannover) dokumentiert, dass chronische Schultererhöhung beim Geigenspiel ein Hauptrisikofaktor für Fokale Dystonie und Überlastungssyndrome ist. Auch Tubiana & Amadio („Medical Problems of the Instrumentalist Musician") bestätigen: bereits minimale, unbewusste Schultererhöhung von 1-2cm über längere Spielzeit ist problematisch.

**Was NICHT fundiert ist:** Die konkreten Prozentwerte (3%, 6%, 1.5%) sind von mir (Claude) geschätzt, nicht aus einer spezifischen Studie entnommen. Es gibt keine publizierte Studie, die exakte Schwellenwerte für „ab wann Schultererhöhung beim Geigenspiel problematisch wird" in Prozent der Ohr-Schulter-Distanz definiert.

**Empfehlung für Dr. Blum:** Die Schwellenwerte sollten in einer kleinen Pilotstudie mit 5-10 Geigenschülern validiert werden. Ideal wäre ein Vergleich: EMG-Messung des M. trapezius (Goldstandard für Muskelspannung) vs. unser Kamera-basierter Distanzwert.

# **3\. Handgelenk-Modus: Schwellenwerte**

## **3.1 Messmethode**

Gemessen wird der Winkel am Handgelenk zwischen drei Punkten: Ellbogen (Landmark 13) → Handgelenk (Landmark 15) → Zeigefingerbasis (Landmark 19). Referenz = gerade Linie = 180°. Abweichung = Differenz zum kalibrierten Winkel.

Zusätzlich wird die Knickrichtung über das Kreuzprodukt der Vektoren bestimmt: positiv = nach außen, negativ = nach innen.

## **3.2 Schwellenwerte nach Sensibilitätsstufe**

| **Stufe** | **Start (Grad)** | **Maximum (Grad)** | **Reaktion ab** | **Fundierung** |
| --------- | ---------------- | ------------------ | --------------- | -------------- |
| Profi     | 8°               | 30°                | ~8° Abweichung  | ⚠ Geschätzt    |
| Standard  | 5°               | 25°                | ~5° Abweichung  | ⚠ Abgeleitet   |
| Anfänger  | 3°               | 18°                | ~3° Abweichung  | ⚠ Geschätzt    |

## **3.3 Wissenschaftliche Grundlage**

**Was fundiert ist:** Die Ergotherapie und Arbeitsmedizin dokumentiert: Handgelenk-Deviation über 15° erhöht das Risiko für Karpaltunnelsyndrom und Sehnenscheidenentzündung (Phalen, 1966; Armstrong & Chaffin, 1979). In der Violinpädagogik (Galamian, Flesch) wird ein „gerades Handgelenk" als Grundprinzip gelehrt - jeder Knick beeinträchtigt die Fingerbeweglichkeit.

**Was NICHT fundiert ist:** Die konkreten Gradzahlen (3°, 5°, 8° Startpunkt) sind geschätzt. Zudem misst MediaPipe den Winkel über 2D-Projektion, nicht den echten 3D-Winkel - die tatsächliche Genauigkeit im Handgelenkbereich bei Geigenhaltung ist nicht untersucht.

**Empfehlung:** Ein Handgelenksmessung mit Goniometer (manuelle Messung) parallel zur Kamera-Messung würde zeigen, wie zuverlässig die Kamera-Werte sind.

# **4\. Signal-Verarbeitung**

## **4.1 Glättung (Smoothing)**

| **Parameter** | **Wert & Begründung**                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Methode       | Gleitender Durchschnitt (Moving Average)                                                                         |
| Fenstergröße  | 30 Frames (~1 Sekunde bei 30fps)                                                                                 |
| Warum 30?     | Kompromiss: schnelle Reaktion vs. Rauschunterdrückung. 90 war zu langsam (3 Sek Verzögerung), 10 wäre zu nervös. |
| Fundierung    | ⚠ Pragmatische Wahl, kein Standard aus der Literatur                                                             |

## **4.2 Tension Score (Spannungswert)**

Der Tension Score (0-100) wird nicht direkt aus der Abweichung berechnet, sondern nähert sich dem Zielwert sanft an:

**Steigegeschwindigkeit:** tensionRate × dt × 60 (+ 8% direkte Annäherung pro Frame)

**Sinkgeschwindigkeit:** decayRate × dt × 40 (+ 8% direkte Annäherung pro Frame)

**Fundierung:** ⚠ Komplett geschätzt. Die Steig-/Sinkraten sind UX-Entscheidungen (wie schnell soll Feedback reagieren), keine medizinischen Werte.

# **5\. Distanzerkennung**

| **Parameter**   | **Wert**                                            | **Fundierung**                 |
| --------------- | --------------------------------------------------- | ------------------------------ |
| Methode         | Schulterbreite (normalisiert) als Proxy für Abstand | ⚠ Heuristik, kein Tiefensensor |
| Zu nah          | Schulterbreite > 0.45 (normalisiert)                | ⚠ Durch Testen bestimmt        |
| Zu weit         | Schulterbreite < 0.12 (normalisiert)                | ⚠ Durch Testen bestimmt        |
| Drift-Warnung   | \>25% Änderung nach Kalibrierung                    | ⚠ Geschätzt                    |
| Idealer Abstand | Ca. 1.5m (Oberkörper voll sichtbar)                 | ⚠ Empirisch aus Tests          |

# **6\. Bekannte Limitationen**

**6.1 Geige verdeckt Landmarks:** Die Geige und der Bogen können Schulter und Ohr teilweise verdecken. MediaPipe interpoliert dann, was zu ungenaueren Werten führt. Wir zeigen eine Warnung wenn die Landmark-Confidence unter 50% fällt.

**6.2 2D vs. 3D:** MediaPipe Pose liefert zwar z-Koordinaten, aber diese sind unzuverlässig. Unsere Messung ist effektiv 2D. Das bedeutet: Schulter nach VORNE ziehen (Rundrücken) wird NICHT erkannt, nur Schulter nach OBEN.

**6.3 Kamera-Winkel:** Die Messung ist abhängig vom Kamerawinkel. Frontalansicht ist am zuverlässigsten. Bei seitlicher Ansicht ändert sich die projizierte Ohr-Schulter-Distanz.

**6.4 Keine absolute Messung:** Wir messen nur relativ zur individuellen Kalibrierung, nicht absolute Millimeter. Zwei verschiedene Personen mit identischer Abweichung in Prozent können physisch unterschiedliche Millimeter-Werte haben.

**6.5 Lichtbedingungen:** Schlechte Beleuchtung verschlechtert die Pose-Erkennung erheblich. Die Genauigkeit wurde unter Tageslichtbedingungen getestet.

# **7\. Zusammenfassung: Was ist fundiert, was nicht**

| **Element**                             | **Status**    | **Quellen**                   |
| --------------------------------------- | ------------- | ----------------------------- |
| MediaPipe Pose Estimation Technologie   | ✅ Validiert  | Google, CVPR 2020             |
| Landmark-Positionen (COCO-Standard)     | ✅ Standard   | Lin et al., 2014              |
| Schultererhöhung = Risikofaktor         | ✅ Fundiert   | Altenmüller, Tubiana          |
| 1-2cm Erhöhung = problematisch          | ✅ Konsens    | Musikermedizin allgemein      |
| Handgelenk-Knick = Risiko ab 15°        | ✅ Fundiert   | Phalen, Armstrong             |
| Konkrete %-Schwellenwerte Schulter      | ⚠ Geschätzt   | Keine direkte Studie          |
| Konkrete Grad-Schwellenwerte Handgelenk | ⚠ Geschätzt   | Abgeleitet aus Arbeitsmedizin |
| Smoothing-Parameter (30 Frames)         | ⚠ Pragmatisch | UX-Test durch Entwicklerin    |
| Distanz-Schwellenwerte                  | ⚠ Empirisch   | Manuelles Testen              |
| Tension Score Berechnung                | ⚠ UX-Design   | Keine medizinische Basis      |
| Farbsystem (Blau/Gelb/Lila)             | ⚠ UX-Design   | Keine medizinische Basis      |
| Profi/Anfänger-Abstufung                | ⚠ Konzept     | Violinpädagogische Logik      |

# **8\. Fragen an Dr. Blum**

Folgende Fragen wären für die Weiterentwicklung besonders wertvoll:

**1\.** Ab welcher Schultererhöhung (in mm oder cm) würden Sie bei einem Geigenschüler eingreifen? Gibt es einen klinischen Schwellenwert?

**2\.** Ist die Ohr-Schulter-Distanz ein sinnvoller Proxy für Schultererhöhung, oder wäre ein anderer Messpunkt besser (z.B. Acromion-Referenz)?

**3\.** Wie relevant ist die Unterscheidung „Schulter hoch" vs. „Schulter nach vorne"? Unser System erkennt nur „hoch".

**4\.** Kennen Sie Studien, die kamerabasierte Haltungserkennung bei Musikern validiert haben?

**5\.** Wäre eine Pilotstudie (EMG + Kamera parallel) in Ihrem Umfeld möglich?

**6\.** Beim Handgelenk: Ist die 2D-Winkelprojektion überhaupt aussagekräftig, oder ist der 3D-Winkel so anders, dass es irreführend wäre?

**7\.** Welche anderen Haltungsprobleme beim Geigenspiel wären mit Kamera messbar und klinisch relevant?

_Erstellt am 23. April 2026 von Anne-Sophie Hueber (Blue Anchor Music AI) mit Unterstützung von Claude (Anthropic). Alle Angaben zur Fundierung sind nach bestem Wissen gemacht. Dieses Dokument ersetzt keine medizinische Validierung._