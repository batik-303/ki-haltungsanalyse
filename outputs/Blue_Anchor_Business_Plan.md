⚓

**BLUE ANCHOR**

Music

**Business Plan**

_Erstes Echtzeit-Feedback-System speziell_

_für musikalische Bewegungen im Übealltag._

Stand: April 2026

_Vertraulich_

# **1\. Executive Summary**

Blue Anchor Music AI entwickelt das erste Echtzeit-Feedback-System, das Musiker während des Übens live auf Haltungsabweichungen aufmerksam macht - ohne Unterbrechung, ohne kognitive Überlastung.

84-89 % aller Berufsmusiker leiden unter spielbedingten Schmerzen. Während Sportler längst auf KI-gestützte Videoanalysen setzen, üben Musiker noch immer mit Methoden aus dem 19. Jahrhundert: dem Spiegel. Blue Anchor wird zum „digitalen Spiegel", der Haltungsschäden verhindert, bevor sie entstehen, und die künstlerische Freiheit durch körperliche Leichtigkeit fördert.

Die Innovation: Ein intuitives visuelles Biofeedback-System (das „Gummiband-Prinzip"), das Abweichungen von der optimalen Haltung in Echtzeit anzeigt - sanft, peripher und non-verbal. Der Nutzer bleibt im musikalischen Flow.

# **2\. Problem & Marktlücke**

## **2.1 Das Problem**

- 84-89 % der Berufsmusiker leiden unter spielbedingten Schmerzen (Fry 1986, Zaza 1998).
- Die häufigsten Ursachen: Fehlhaltungen, die sich durch jahrelanges Üben ohne Kontrolle einschleifen.
- Musikunterricht findet typischerweise 1 Stunde pro Woche statt - die restlichen 167 Stunden übt der Schüler allein, ohne Feedback zur Körperhaltung.
- Bisherige Hilfsmittel (Spiegel, Video-Selbstaufnahme) erfordern bewusste Aufmerksamkeit und unterbrechen den Übefluss.

## **2.2 Die Marktlücke**

Kein bestehendes Produkt adressiert dieses Problem spezifisch für Musiker im Echtzeit-Übekontext. Es gibt zwar allgemeine Haltungs-Apps und Sport-Tracking-Lösungen, doch diese sind nicht auf die besonderen Anforderungen des Musizierens ausgelegt (Instrumentenhaltung, Spielbewegungen, Flow-Erhalt). Musik-Apps wie Trala, Tonara, Modacity oder Metronaut konzentrieren sich auf Intonation, Übezeit-Tracking oder Play-Along - keine davon analysiert die Körperhaltung.

Akademische Forschung zu Musikergesundheit (z. B. HMT Hannover) liefert Erkenntnisse, aber keine Consumer-Produkte. Blue Anchor schließt diese Lücke.

# **3\. Lösung: Das Blue Anchor System**

## **3.1 Das Gummiband-Prinzip**

Anstatt technischer Fehlermeldungen nutzt Blue Anchor ein intuitives Biofeedback-System mit zwei Elementen:

- **Der Anker (blau):** Ein stabiler Referenzpunkt auf dem Körper des Nutzers, der die optimale Haltung repräsentiert.
- **Das Gummiband (Farbverlauf Blau → Indigo → Lila):** Entsteht bei Abweichung und erzeugt eine visuelle Spannung, die den Nutzer sanft zurück in die Balance erinnert.

Ziel für den Nutzer: „Das Band zurück zum Anker bringen."

Vorteile: Keine Pop-ups, keine Alarme, keine negativen Bewertungen. Das Feedback ist peripher, kontinuierlich und non-verbal - der Nutzer bleibt im musikalischen Flow.

## **3.2 Der Master Print**

Jeder Nutzer erhält einen individuellen „Master Print" - seinen persönlichen Referenzzustand für die optimale Haltung.

- **Keine Standard-Puppe:** Da jeder Körper einzigartig ist, wird der Master Print pro Nutzer individuell kalibriert.
- **Relationen statt Pixel:** Der Master Print arbeitet mit Gelenkwinkeln und Verhältnissen, sodass er unabhängig von Körpergröße funktioniert - für Erwachsene und wachsende Kinder gleichermaßen.
- **Kalibrierung in V1:** Der Lehrer filmt den Schüler in der optimalen Haltung und erstellt so den individuellen Master Print. Kann jederzeit neu gespeichert werden.
- **Speicherung:** Nur anonyme Pose-Daten (Skelett), keine Videos, kein Cloud-Upload.

## **3.3 Technologie**

- **Echtzeit-Pose-Recognition:** Basierend auf MediaPipe, ergänzt durch körperbezogene Inferenz (Position der linken Hand + Kinn als Proxy für den Geigenwinkel).
- **100 % on-device (Edge AI):** Vollständig lokale Verarbeitung auf Smartphone oder Tablet. Kein Cloud-Upload, kein Streaming.
- **Plattform:** iOS und Android (Cross-Platform).

# **4\. MVP-Strategie (Version 1)**

Blue Anchor verfolgt einen „Scharfschützen-Fokus": ein präzises Werkzeug statt eines Alles-Könner-Monsters.

| **Parameter**        | **V1 Spezifikation**                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| **Instrument**       | Geige (im Stehen)                                                          |
| **Kern-Parameter 1** | The Sinking Violin - Erkennt das Absinken des Instruments                  |
| **Kern-Parameter 2** | The Tense Shoulder - Erkennt das Hochziehen der linken Schulter            |
| **Technologie**      | MediaPipe Pose + körperbezogene Inferenz, lokal auf Smartphone/Tablet      |
| **Master Print**     | Individuell pro Schüler, vom Lehrer kalibriert, als Pose-Daten gespeichert |
| **Datenschutz**      | 100 % offline, keine Videos, nur Skelettdaten                              |

## **4.1 Ein Fokus pro Session**

Blue Anchor V1 arbeitet mit einem einzelnen aktiven Körperfokus pro Übesession. Der Nutzer wählt vor dem Üben zwischen spezifischen Haltungszielen (z. B. Schulterposition oder Instrumentstabilität). Das System liefert nur zu diesem einen Aspekt peripheres visuelles Feedback. Dieser Ansatz vermeidet widersprüchliche Signale, reduziert Fehlalarme und schafft eine klare Lernkurve: „Ich arbeite heute an genau diesem einen Punkt."

## **4.2 Individuelle Sensibilität**

Der Lehrer stellt bei der Kalibrierung nicht nur die optimale Haltung ein, sondern auch die Empfindlichkeit des Systems. Ein Anfänger profitiert von strengerem Feedback (Gelb ab 5 % Abweichung), ein fortgeschrittener Spieler braucht mehr Spielraum (Gelb erst ab 12 %), um seinen musikalischen Ausdruck nicht einzuschränken.

Zusätzlich nutzt das System ein Dämpfungs-Modell (Temporal Smoothing): Es zeigt nicht jeden einzelnen Messwert, sondern bildet einen gleitenden Durchschnitt über 2-3 Sekunden. Kleine, kurze Bewegungen (z. B. während schneller Läufe) werden „geschluckt". Erst wenn die Schulter konstant über dem Referenzwert bleibt, wandert die Farbe langsam weiter. Bei abrupten, großen Abweichungen reagiert das System hingegen sofort - damit der Nutzer sieht, dass es funktioniert.

**Erfolgs-Indikator:** 1 Lehrer + 5 Schüler im Pilotprojekt, die das Tool erfolgreich in ihren Alltag integrieren.

# **5\. UX-Design & Produktphilosophie**

## **5.1 Leitsatz**

_„Blue Anchor zeigt keine Fehler - es macht Rückkehr in Balance spürbar."_

Der Nutzer sieht seinen Körper nicht als Objekt, sondern spürt ihn über einen stabilen Referenzpunkt im peripheren Sichtfeld. Blue Anchor ist kein Feedback-System im klassischen Sinne, sondern ein körperbasiertes Selbstkorrektur-Interface ohne kognitive Unterbrechung. Das System arbeitet mit drei Wahrnehmungsschichten und einem separaten Analyse-Modus.

## **5.2 Das 3-Schichten-Modell**

Die zentrale Designentscheidung: Das System darf niemals Aufmerksamkeit vom Spielen wegziehen. Statt „mehr Feedback bei Problemen" nutzt Blue Anchor mehrstufige Wahrnehmung - von unsichtbar bis spürbar.

**Layer 1 - Flow (90-95 % der Zeit):** Musik bleibt komplett dominant. Nur das Gummiband ist sichtbar, in minimalem Blau. Keine Worte, keine Animationen, kein Eingriff. Das Kamerabild ist leicht entsättigt (ruhig, kein Spiegel-Effekt). Die Körpersilhouette erscheint nur als dezente Kontur (10-15 % Opazität). Der Spieler bemerkt: „eigentlich nichts - nur ein Gefühl."

**Layer 2 - Awareness (frühe Spannung):** Wahrnehmung aktivieren, ohne zu unterbrechen. Das Gummiband wird sichtbar, die Farbe wechselt von Blau zu warmem Gelb, eine leichte Zugrichtung erscheint. Keine Worte, keine Bewertung. Effekt beim Spieler: „Da stimmt gerade etwas nicht" - aber noch keine bewusste Interpretation nötig.

**Layer 3 - Limit Zone (Prävention):** Nur bei echter Belastungsschwelle, z. B. wenn die Schulter länger als 2-5 Minuten in ungünstiger Position verbleibt. Das Gummiband wird deutlich sichtbar, pulsiert leicht, Farbe wechselt zu Violett. Medizinische Schwellenwerte (z. B. von Dr. Blum) arbeiten im Hintergrund als Modellgrenzen - sie sind Infrastruktur, nicht Interface. Der Nutzer sieht keine Zahlen, keine Diagnosen, nur steigende Intensität.

## **5.3 Der Return-to-Anchor Loop**

Das zentrale Lernprinzip: Jede Abweichung endet in einer Rückkehr, nicht in einer Korrektur. Spannung steigt → Gummiband zeigt Zug → Musiker passt sich unbewusst an → Band verschwindet → Zustand = neutral. Kein „Fehler behoben", sondern: „Das System hat sich selbst reguliert." Die Rückkehr muss sich gut anfühlen - das sofortige Verschwinden des Bandes ist die Belohnung.

## **5.4 Analyse-Modus (auf Abruf)**

Im Analyse-Modus versteht das Gehirn - die UI erklärt. Dieser Modus wird nur aktiv ausgelöst (Tap auf Screen, Pause oder nach dem Üben). Flow und Analyse sind zwei komplett getrennte Wahrnehmungszustände.

- Schulterhöhe als Verlaufslinie der letzten 10-30 Sekunden.
- Optional: Hand-/Geigenwinkel-Verlauf auf einer Zeitachse.
- Klare, fokussierte UI - keine periphere Gestaltung mehr.

Der entscheidende UX-Check für jede neue Funktion: „Macht das den Flow ruhiger oder kognitiver?" Ruhiger → Flow-Modus. Kognitiver → nur Analyse-Modus.

## **5.5 UX-Regeln**

- Kein Pop-up, kein Alarm, keine negative Bewertung.
- Peripheres, visuelles Feedback - kontinuierlich, aber unaufdringlich.
- Feedback ist physisch (Spannung, Farbe, Bewegung), nicht digital (Text, Zahlen, Diagnosen).
- Medizinische Werte sind unsichtbar - sie steuern die Intensität, nicht das Interface.
- Der Nutzer bleibt im musikalischen Flow.

## **5.6 Tages-Feedback (V1 Pro)**

Anstatt „80 % gut / 20 % schlecht" zu zeigen, nutzt Blue Anchor positive, fortschrittsorientierte Rückmeldungen:

- „Viele stabile Momente im Anker."
- „Du bist schneller zurückgekommen als gestern."
- „Ruhige Phasen wurden länger."

## **5.7 Optionale Sprach-Cues (V1 Pro)**

Nur in der Limit Zone. Keine Anweisungen, sondern körperliche Re-Orientierung in einem einzigen Wort: „weich", „lösen", „atmen", „zurück". Maximal ein Cue pro 30-60 Sekunden. Nie während schwieriger Passagen. Nie bewertend.

# **6\. Wissenschaftliche Fundierung**

Blue Anchor basiert auf drei wissenschaftlich fundierten Säulen:

## **6.1 Prävalenz spielbedingter Schmerzen**

Die Studien von Fry (1986) und Zaza (1998) dokumentieren, dass 84-89 % aller Berufsmusiker unter spielbedingten Schmerzen leiden. Die Hauptursache sind nicht einzelne Fehlhaltungen, sondern wiederholte Mikrobelastungen über lange Zeiträume - genau das, was passiert, wenn ein Schüler täglich mit hochgezogener Schulter übt, ohne es zu bemerken. Blue Anchor setzt an diesem Punkt an: Frühere Wahrnehmung führt zu früherer Selbstkorrektur, was die kumulierte Belastung reduziert.

## **6.2 Biofeedback-Evidenz**

In der Physiotherapie und Rehabilitation ist visuelles Echtzeit-Biofeedback ein etabliertes Verfahren. Die Evidenz zeigt, dass Patienten mit Biofeedback ihre Haltung schneller und nachhaltiger korrigieren als Patienten ohne Feedback. Blue Anchor überträgt dieses Prinzip erstmals auf den Kontext des Musikübens - mit dem entscheidenden Unterschied, dass das Feedback peripher und non-verbal erfolgt, um den musikalischen Flow nicht zu stören.

## **6.3 External Focus of Attention (Wulf, 2007)**

Die Bewegungslernforschung von Gabriele Wulf zeigt: Wenn die Aufmerksamkeit auf ein externes Objekt gelenkt wird (z. B. das Gummiband) statt auf den eigenen Körper (z. B. „achte auf deine Schulter"), lernt man Bewegungen schneller und nachhaltiger. Blue Anchor nutzt genau dieses Prinzip - der Anker und das Band sind externe Fokuspunkte, keine internen Befehle. Dies erklärt, warum peripheres visuelles Feedback pädagogisch wirksamer ist als verbale Korrekturen.

## **6.4 Validierungsplan**

Die logische Kette - bessere Körperwahrnehmung → frühere Selbstkorrektur → weniger wiederholte Fehlbelastung → potenziell weniger Schmerzen - ist eine wissenschaftlich plausible Hypothese. Zur Validierung ist eine Pilotstudie in Kooperation mit Dr. Blum (Musikermedizin) geplant: Kann peripheres Echtzeit-Biofeedback die Häufigkeit und Dauer von Schulterelevation beim Üben messbar reduzieren?

# **7\. Datenschutz & Privatsphäre**

Blue Anchor löst das Datenschutz-Dilemma deutscher Musikschulen mit einem „Privacy First"-Ansatz:

- **100 % offline:** Alle Daten werden lokal auf dem Gerät verarbeitet. Kein Cloud-Upload, kein Tracking.
- **Skelett-Sharing:** Die App wandelt Übe-Videos in anonyme Skelett-Modelle um. Gesichter und private Räume bleiben unsichtbar.
- **User-Controlled Consent:** Nur der Schüler (bzw. die Eltern) entscheidet aktiv, welcher Clip an den Lehrer gesendet wird. Kein dauerhafter Zugriff.
- **Tool statt Plattform:** Blue Anchor ist ein eigenständiges Werkzeug. Es gibt keinen Marktplatz und keine Lehrer-Schüler-Plattform - damit entfällt die rechtliche Komplexität von DSGVO-Auftragsverarbeitung und Marktplatz-Recht in der Startphase.

# **7\. Markt & Wettbewerb**

## **7.1 Zielmarkt**

Primärer Markt: Geigenschüler (Kinder und Erwachsene) in Deutschland, Österreich und der Schweiz, die regelmäßig üben und Unterricht bei einem Lehrer nehmen.

Langfristiges Erweiterungspotenzial: Die Kerntechnologie (Echtzeit-Haltungsfeedback) ist auf weitere Anwendungsfelder übertragbar, z. B. Bildschirmarbeitsplätze (siehe Abschnitt 10). Dieser Ausbau ist jedoch erst nach erfolgreicher Validierung im Musikbereich vorgesehen.

## **7.2 Wettbewerbslandschaft**

Kein bestehendes Produkt adressiert Echtzeit-Körperhaltungsfeedback spezifisch für Musiker im Übekontext. Allgemeine Haltungs-Apps (z. B. für Büro oder Fitness) existieren, sind aber nicht auf Instrumentenhaltung ausgelegt. Die relevanten Musik-Wettbewerber adressieren andere Probleme:

| **Wettbewerber** | **Fokus**                    | **Haltung?** |
| ---------------- | ---------------------------- | ------------ |
| Trala            | Geigenunterricht, Intonation | Nein         |
| Tonara           | Übezeit-Tracking, Aufgaben   | Nein         |
| Modacity         | Übeplanung, Metronom         | Nein         |
| Metronaut        | Play-Along mit Orchester     | Nein         |
| MatchMySound     | Audio-Analyse, Bewertung     | Nein         |

Blue Anchor konkurriert nicht direkt mit diesen Apps, sondern ergänzt sie: Während Trala auf Intonation achtet, achtet Blue Anchor auf den Körper.

# **8\. Geschäftsmodell & Preise**

## **8.1 Positionierung**

Blue Anchor ist kein Lehrer-Ersatz, sondern das Werkzeug für die 167 Stunden der Woche, in denen der Lehrer nicht da ist. Slogan: „Die erste App, die dich beim Üben live korrigiert."

Blue Anchor Music ist das Produkt, das der Musiker in der Hand hält. Die Dachmarke Blue Anchor AI bleibt für die Technologie-Kommunikation und Investoren reserviert. Der Musiker sieht kein „AI" - er sieht ein professionelles Werkzeug, das ihm hilft.

## **8.2 Preismodell**

Das Preismodell folgt einer klaren Logik: fairer Einstieg, Vertrauen aufbauen, dann Mehrwert anbieten. Blue Anchor ist ein professionelles Werkzeug, kein Spielzeug - die Preise spiegeln das wider, bleiben aber bewusst niedrig im Vergleich zum Unterricht (30 € pro halbe Stunde).

| **Produkt**                | **Preis**        | **Enthält**                                                                                                                                                                                      |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kostenlose Testphase**   | 0 € (7 Tage)     | Volles Echtzeit-Feedback, alle drei Modi (Geige, Handgelenk, Schulter), Session-Auswertung. Keine Speicherung.                                                                                   |
| **Blue Anchor**            | 9,99 € einmalig  | Echtzeit-Feedback, Master Print, drei Anker-Modi, Session-Auswertung, Profi/Anfänger-Sensibilität. 100 % offline, kein Konto nötig.                                                              |
| **Video-Analyse**          | 3,99 € pro Video | Analyse eines bestehenden Videos (Konzert, Prüfung, Probe). Zeitachse zeigt stabile und kritische Phasen. Einstiegsprodukt ohne App-Kauf. Lokal auf dem Gerät.                                   |
| **Blue Anchor Plus (Abo)** | 4,99 €/Monat     | Zusätzlich: Wochen-Statistiken, persönliche Rekorde, Fortschrittsverlauf, Saphir-Badges (Meilensteine), Übungszeit-Erfassung. Für Musikschulen: Lehrer sieht Haltungsentwicklung über die Woche. |
| **Blue Anchor Pro**        | 29,99 €/Monat    | Für professionelle Musiker: Peripheres Live-Feedback während langer Übesessions und Konzertvorbereitung. Detaillierte Zeitachsen-Analyse, Stress-Haltungsanalyse bei schwierigen Passagen.       |

Strategische Logik: Die 7-Tage-Testphase senkt die Hürde - jeder Lehrer kann sagen „probier es aus." Nach einer Woche hat der Schüler erste Daten und Ergebnisse, die er nicht verlieren will. Der einmalige Kauf (9,99 €) ist weniger als ein Drittel einer Unterrichtsstunde. Das Plus-Abo kommt erst, wenn die Gamification-Features gebaut und der Mehrwert bewiesen ist.

## **8.3 Vertriebsstrategie**

Der Vertrieb ist Lehrer-first: Geigenlehrer sind die Multiplikatoren. Ein überzeugter Lehrer bringt 5-20 Schüler. Die ersten 50 Lehrer werden durch direkte Ansprache, Musikschul-Kooperationen und pädagogische Konferenzen gewonnen.

Die Video-Analyse (3,99 €) dient als Einstiegsprodukt: Wer einmal sieht, wo seine Haltung einbricht, will das beim nächsten Üben live sehen - und kauft die App.

# **9\. Roadmap**

| **Phase**               | **Zeitraum**      | **Meilensteine**                                                                         |
| ----------------------- | ----------------- | ---------------------------------------------------------------------------------------- |
| **Tech-PoC**            | Q2 2026           | Beweis: Geigenwinkel-Tracking in Echtzeit funktioniert zuverlässig (Hand-Kinn-Inferenz)  |
| **Lehrer-Validierung**  | Q2-Q3 2026        | 3-5 qualitative Lehrer-Interviews mit Mockup, Feedback-Integration                       |
| **MVP (V1 Basis)**      | Q3-Q4 2026        | Funktionsfähige App mit Anker, Gummiband, Master Print für Geige (Stehen)                |
| **Pilotprojekt**        | Q4 2026 - Q1 2027 | 1 Lehrer + 5 Schüler testen das Tool im realen Übealltag                                 |
| **V1 Pro + Skalierung** | Q1-Q2 2027        | Pro-Features, erste zahlende Kunden, Expansion auf weitere Instrumente (Bratsche, Cello) |

# **10\. Ausblick: Erweiterungspotenzial Arbeitsplatz**

Die Kerninnovation von Blue Anchor - das Gummiband-Prinzip als intuitives Echtzeit-Haltungsfeedback - ist technologisch nicht auf Musik beschränkt. Nach erfolgreicher Validierung und Marktdurchdringung im Musikbereich eröffnet sich ein zweites, deutlich größeres Anwendungsfeld: Haltungskorrektur am Bildschirmarbeitsplatz.

## **10.1 Warum erst später**

Blue Anchor verfolgt einen klaren Fokus: Zuerst das Musikprodukt validieren, Nutzer gewinnen und die Technologie reifen lassen. Erst wenn V1 Music am Markt funktioniert, wird das WORK-Modul als eigenständige Erweiterung entwickelt. Dieser sequenzielle Ansatz vermeidet Ressourcenzersplitterung und schafft Vertrauen bei Partnern und Investoren.

## **10.2 Konzept (Zukunft)**

- Minimalistische Sidebar oder peripheres Feedback-Element auf dem Desktop.
- Läuft im Hintergrund, keine Ablenkung, keine Überwachung.
- B2B-Positionierung: Datenschutz (offline), aktive Prävention, ROI durch weniger Krankheitstage.

# **11\. Risiken & Gegenmaßnahmen**

| **Risiko**                     | **Beschreibung**                                                                           | **Gegenmaßnahme**                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Technische Zuverlässigkeit** | Geigenwinkel-Erkennung funktioniert nicht zuverlässig bei verschiedenen Lichtverhältnissen | Früher Tech-PoC (2 Wochen) vor jedem weiteren Investment                                         |
| **Lehrer-Adoption**            | Konservative Geigenlehrer lehnen technische Hilfsmittel ab                                 | Lehrer-first-Vertrieb, frühe Validierung durch Interviews, Lehrer als Co-Creator einbinden       |
| **False Positives**            | Zu viele Fehlalarme zerstören Nutzervertrauen                                              | Großzügiger Toleranzkorridor, individuelle Kalibrierung, False-Positive-Messung im Pilot         |
| **Marktgröße (Nische)**        | Geiger im Stehen in DACH ist ein kleiner Markt                                             | Expansion auf weitere Instrumente (Bratsche, Cello) + langfristiges Potenzial Arbeitsplatz-Markt |
| **Wettbewerb**                 | Größere Startups kopieren das Konzept                                                      | Schnelle Marktpenetration durch Lehrer-Netzwerk, pädagogische Tiefe als Verteidigung             |

# **12\. Kernidee in einem Satz**

**_Blue Anchor verwandelt Haltung von einer bewussten Aufgabe in eine intuitive, visuell gesteuerte Selbstregulation._**3