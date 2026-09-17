# CONTEXT — Glossar

Kanonisches Vokabular des Projekts. Nur Begriffsklärung, keine Implementierungsdetails.

## Farb- & Design-Vokabular

- **Chrome** — der UI-Rahmen der App (Screens `home`, `setup`, `results`, plus Steuer-Elemente). Seit der Marine-Serenity-Integration **hell**. Abzugrenzen von den *Indikatoren*. Chrome zieht seine Farben ausschließlich aus **Neutral + primary**; die Feedback-Farben (`sapphire`, Amber/`gold`) sind ihm verwehrt — sie gehören den *Indikatoren*, damit ein Steuer-Element nie wie ein Haltungssignal aussieht.
- **Canvas-Indikatoren** — das Kamera-Overlay auf dem `session`-Screen (Anker, Bögen, Landmarks). Leben auf dunklem Grund und nutzen **eigene, literale Farben** in `src/rendering/` — unabhängig vom Token-System. **Indikatoren sind feedback-tragend, nicht durchs Medium definiert:** auch DOM-HUD, das Haltungs-Feedback färbt (z. B. die *Tension-Bar* über `selectStatusColor`), zählt als Indikator — **nicht** als Chrome — und bleibt bei einem Chrome-Umbau unangetastet.
- **session-Teilbaum** — der abgegrenzte **dunkle** Kontext (`data-theme="dark"`) innerhalb der ansonsten hellen App. Nur hier gelten die dunklen Werte der umschaltbaren Token.
- **primary** — die **Marken-Primärfarbe des Chrome** (Buttons, Headlines): Tiefsee-Blau. **Nicht** identisch mit *sapphire*.
- **sapphire** — eigenständige Farbe der **Flow-Semantik** (gute, zentrierte Haltung) und der Kamera-Indikatoren. Ein helleres Blau als *primary*; bewusst getrennt gehalten, damit Chrome-Umbau und Feedback-Logik sich nicht gegenseitig beeinflussen.
- **gold** — die **funktionale Warnfarbe** der *Indikatoren*: Amber `#ffb800` („Instrumententafel"-Ton). Der Token-Name ist historisch; die Bedeutung ist *Amber-Warnung*. Gehört dem Feedback, nicht dem Chrome.
- **accent** — die **warme Aktions-/CTA-Farbe des hellen Chrome**: „Geigenholz-Gold" `#B07A24` mit dunkler Beschriftung `#2b1a00` (WCAG AA). Bewusst **abgesetzt von der Amber-Warnung** (`gold`), damit ein CTA nie wie ein Haltungssignal wirkt (#29 revidiert die geteilte Amber-Wahl aus #17). Im dunklen `session`-Teilbaum bleibt `accent` separat (`#DAA520`).
- **Layer** (`flow → bewusst → achtung → limit`) — die Aufmerksamkeitsschichten des Feedbacks. Sie **lenken Aufmerksamkeit, sie bestrafen nicht**. Ihre Farben sind an das Feedback-System gebunden und gehören auf den Canvas.
- **Kein Rot** — durchgängiges Prinzip (Feedback-Philosophie + Marine Serenity): Rot wird nicht verwendet. Warnungen = *Amber*; „destruktiv"/Abbruch = gewichtetes Neutral.

## Navigations- & Modus-Vokabular

- **Trichtermodell** — die App ist ein **linearer Ablauf** einer einzelnen Übungssitzung, **keine gleichrangigen Tabs**. Es gibt bewusst **keine funktionale Bottom-Navigation**: die Screens sind Phasen eines Sitzungs-Lebenszyklus, keine frei anspringbaren Ziele. **V1-Flow**: `home` → `session` → `results` → `home`. Der frühere `setup`-Screen ist **zurückgestellt** (Datei bleibt, aber aus dem Flow genommen), weil er nur Konfiguration ohne eigene Substanz war; die Kalibrierung läuft ohnehin im `session`-Screen.
- **Auswahlbühne** — der `home`-Screen ist die **vollständige Auswahlbühne**: Instrument und Fokus werden hier markiert, der CTA **„Übung starten"** (`enterSession`) geht **direkt in die Session** (überspringt `setup`).
- **Modus** — im Projekt **zwei getrennte Begriffe**, nie synonym:
  - **viewMode** (`flow` / `analyse`) — der **Ansichtsmodus** *innerhalb* der laufenden Session (Flow = reduziert, Analyse = mit Overlay). Ein Wechsel **bewahrt die Kalibrierung**.
  - **focusMode** (`violin` / `shoulder` / `wrist`) — der **Analysemodus / das Körperziel**, auf `home` (Auswahlbühne) gewählt. Ein Wechsel **verwirft die Kalibrierung bewusst**, weil ein anderes Körperziel eine neue Referenz braucht.
- **Zurück** — die **Anpassungs-Affordanz**: ein Schritt zurück *ohne* die Sitzung zu beenden. Bedeutung ist screen-abhängig: auf `session` = **neu kalibrieren an Ort und Stelle** (Sitzung läuft weiter); auf `results` = **neue Sitzung mit gleicher Konfiguration** starten; auf `setup` = zurück ins Hauptmenü (dort fällt „Zurück" mit „Home" zusammen, da noch keine Sitzung läuft).
- **Home / Hauptmenü** — die **Ausstiegs-Affordanz** zurück nach `home`. Auf `session` bedeutet Home **Abbruch ohne Auswertung** (Sitzung wird verworfen, kein `results`).
- **Beenden** — der **reguläre Abschluss** einer Sitzung *mit* Auswertung: `session` → `results`. Abzugrenzen von *Home* (Abbruch ohne Bilanz).
