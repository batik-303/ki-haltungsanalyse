Phase 1: Fundament legen (Wochen 1–2)
Das Allerwichtigste zuerst — bevor eine Zeile Code geschrieben wird:
Für dich (CEO/Domain Expert):

Definiere 3–5 konkrete Fehlhaltungen bei der Geige, die die App erkennen soll (z. B. Schulter-Protraktion, falscher Handgelenkswinkel links, Kopfneigung). Starte bewusst klein — nur Geige, nur die häufigsten Probleme.
Filme dich selbst beim Spielen: einmal mit korrekter Haltung, einmal mit typischen Fehlern. Das werden eure ersten Trainingsdaten.
Schreib für jede Fehlhaltung auf: Was genau ist falsch? Welche Körperpunkte sind betroffen? Was wäre die Korrektur?

Für deinen Mann (CTO):

Evaluiere Pose-Estimation-Frameworks: MediaPipe (Google) oder MoveNet (TensorFlow) — beide laufen on-device und sind kostenlos. MediaPipe ist für den Start am besten geeignet, weil es 33 Körperpunkte in Echtzeit trackt und direkt auf Smartphones läuft.
Richte eine einfache Entwicklungsumgebung ein (React Native oder Flutter für die App, Python für erste Experimente).

Gemeinsam:

Erstellt ein gemeinsames GitHub-Repository.
Legt eine einfache Projektstruktur an.


Phase 2: Proof of Concept (Wochen 3–6)
Hier geht es darum zu beweisen, dass die Kernidee technisch funktioniert:
Ziel: Eine einfache Desktop-/Web-App, die per Webcam die Körperpunkte eines Geigers erkennt und auf dem Bildschirm anzeigt.

Dein Mann baut einen ersten Prototyp, der MediaPipe nutzt, um das "Skelett" des Spielers in Echtzeit zu zeichnen.
Du testest es beim Spielen: Werden die relevanten Punkte (Schultern, Ellbogen, Handgelenke, Kopf) zuverlässig erkannt?
Gemeinsam identifiziert ihr die Schwachstellen: Verdeckt die Geige wichtige Punkte? Ist das Tracking stabil genug?

Das ist der kritischste Moment — hier zeigt sich, ob der technische Ansatz grundsätzlich funktioniert.

Phase 3: Haltungslogik entwickeln (Wochen 7–10)
Jetzt wird aus dem Skelett-Tracking eine echte Haltungsanalyse:
Für dich:

Definiere für jede Fehlhaltung konkrete Regeln auf Basis der Körperpunkte, z. B.: "Wenn der Winkel zwischen Schulter-Ellbogen-Handgelenk links kleiner als X Grad ist → Warnung: Handgelenk zu stark abgeknickt."
Nutze dein Wissen aus der Bergmann-Methodik, um die "richtige" Haltung in messbare Winkel und Abstände zu übersetzen.

Für deinen Mann:

Implementiere Winkelberechnungen zwischen den erkannten Körperpunkten.
Baue ein einfaches Regel-System: Wenn ein Winkel einen Schwellenwert über-/unterschreitet → visuelles oder akustisches Feedback.
Noch keine KI nötig — einfache Regeln reichen für den Prototyp völlig aus.

Wichtig: Die genauen Grenzwerte (z. B. ab welchem Winkel wird es schädlich) könnt ihr zunächst auf Basis eurer eigenen Erfahrung festlegen. Die wissenschaftliche Validierung mit Prof. Blum kommt später.

Phase 4: Mobile App (Wochen 11–16)
Vom Desktop aufs Smartphone:

Portiert den Prototyp auf eine mobile App (React Native + MediaPipe oder Flutter + TensorFlow Lite).
Alle Berechnungen laufen lokal auf dem Gerät — das ist euer USP (kein Cloud-Upload).
Einfaches UI: Kamera-Ansicht mit Overlay der erkannten Punkte und farblichen Warnungen (grün = gut, gelb = Achtung, rot = korrigieren).
Testet auf verschiedenen Smartphones und bei unterschiedlichen Lichtverhältnissen.


Phase 5: Testen & Iterieren (Wochen 17–20)

Lade 5–10 befreundete Musiker (Studenten, Kollegen) ein, die App zu testen.
Sammle Feedback: Sind die Warnungen hilfreich? Kommen Fehlalarme? Fehlen wichtige Haltungsprobleme?
Iteriere basierend auf dem Feedback.


Phase 6: Demo-Ready Prototyp (Wochen 21–24)

Poliere die App für Demos (z. B. bei Prof. Bergmann, potenziellen Fördergebern).
Erstelle ein kurzes Demo-Video.
Bereite eine Präsentation vor, die den Prototyp, den USP (Datenschutz) und die Vision zeigt.

