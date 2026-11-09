# Recherche: Landingpage – Was darf man versprechen? (Werbe- und Datenschutz-Grenzen DE/FR)

- **Ticket**: #137 (`wayfinder:research`), Karte #133
- **Branch**: `research/landingpage-werbe-grenzen` (wird nie gemergt)
- **Datum**: 2026-11-09
- **Links**: Bei französischen Gesetzbüchern führt der Link zum ganzen Code auf Légifrance; dort den genannten Artikel suchen.
- **Quellenpolitik**: Gesetzestexte (gesetze-im-internet.de, EUR-Lex, Légifrance), Behörden (DSK, CNIL, DGCCRF), Urteile. Wo nur Sekundärquellen den Stand bestätigen, steht das dabei.

> **Wichtig: Das ist keine Rechtsberatung.** Diese Datei sammelt, was in Gesetzen und Behörden-Texten steht, und übersetzt es in einfache Sprache. Vor dem Live-Schalten (Karte C) und spätestens vor dem Abo (Karte B) sollte eine Anwältin / ein Anwalt für IT- und Wettbewerbsrecht (DE) und eine *avocate* / ein *avocat* (FR) die fertigen Texte prüfen. Alternativ: IHK-Beratung, Händlerbund o. ä. mit Rechtstext-Service für DE und FR.

## Kurzantwort

1. **„Der erste …“** nur, wenn es nachweisbar stimmt – sonst irreführend (DE § 5 UWG, FR Art. L121-2 Code de la consommation). Die Karte hat das schon gestrichen: gut so.
2. **Gesundheit**: Das Wort **„Prävention“ ist heikel.** Im EU-Medizinprodukte-Recht (MDR) macht genau der Zweck „Vorbeugung von Krankheiten/Verletzungen“ eine Software zum Medizinprodukt – und der Zweck ergibt sich auch aus der **Werbung**. Sicherer: über **Körperwahrnehmung, bewusstes Üben, Haltungs-Rückmeldung** sprechen, **nicht** über Schmerzen, Sehnenscheiden-Entzündung, Verletzungen oder „Vorbeugung“.
3. **Datenschutz**: „Ihr Kamerabild verlässt nie Ihr Gerät“ stimmt und darf so stehen. **„100 % offline“ stimmt heute nicht** (Modelle kommen von Google und jsDelivr, dabei geht die IP-Adresse raus). Das muss in die Datenschutzerklärung; langfristig Modelle selbst ausliefern (wie beim Google-Fonts-Urteil).
4. **„Bald“-Funktionen** sind erlaubt, wenn klar als „geplant / in Arbeit“ markiert und nicht so dargestellt, als könne man sie schon kaufen.
5. **Gratis-Test + Abo** (erst Karte B): Kündigungsbutton (DE § 312k BGB), „Résilier en 3 clics“ (FR L215-1-1), klarer Bestell-Knopf, klare Info zum Übergang in das bezahlte Abo, Widerrufsrecht.
6. **Pflichttexte schon für die Warteliste**: Impressum (DE § 5 DDG) / *mentions légales* (FR LCEN Art. 1-1), Datenschutzerklärung (Art. 13 DSGVO), Einwilligung mit Double-Opt-in für die E-Mail-Liste.

## So ja / so nicht

| Thema | So ja | So nicht | Warum (Quelle) |
|---|---|---|---|
| Alleinstellung | „Von einer Geigenpädagogin entwickelt, mit eigenen Schülern erprobt.“ | „Die erste App, die …“, „einzigartig“, „die beste“ (ohne Beleg) | Irreführung über Eigenschaften/Spitzenstellung, DE § 5 UWG, FR L121-2 |
| Alleinstellung FR | « Conçue par une professeure de violon » | « La première application au monde … » | FR L121-2 Code de la consommation |
| Gesundheit | „Mehr Körperwahrnehmung beim Üben“, „Rückmeldung zur Haltung des Handgelenks“, „bewusster üben“ | „Beugt Sehnenscheiden-Entzündung vor“, „gegen Schmerzen“, „Prävention von Verletzungen“, „von Ärzten empfohlen“ | Zweck „Vorbeugung/Linderung von Krankheit/Verletzung“ = Medizinprodukt (MDR Art. 2 Nr. 1, Nr. 12); dann gilt HWG (§ 1 Abs. 1 Nr. 1a) |
| Gesundheit (Wort „Prävention“) | „Achtsam spielen – für eine entspannte Haltung“ | „Prävention für bessere Körperhaltung“ (Wort „Prävention“ rückt in die Medizin-Ecke) | MDR Art. 2 Nr. 1 nennt ausdrücklich „prevention“; Erwägungsgrund 19: Lifestyle/Wohlbefinden ≠ Medizinprodukt |
| Gesundheit FR | « Mieux sentir sa posture en jouant » | « Prévient les tendinites », « soulage les douleurs » | MDR (gilt direkt in FR); Werbung für Medizinprodukte: Code de la santé publique L5213-1 ff. |
| Kamera | „Ihr Kamerabild verlässt nie Ihr Gerät. Die Analyse läuft direkt in Ihrem Browser.“ | „100 % offline“, „keinerlei Daten werden übertragen“, „DSGVO-zertifiziert“ | Modelle werden von storage.googleapis.com / cdn.jsdelivr.net geladen → IP-Übertragung (§ 5 UWG, Art. 5 Abs. 1 lit. a, Art. 13 DSGVO) |
| Kamera (später, nach PWA + eigenen Modellen) | „Läuft nach dem ersten Laden auch offline.“ | – | erst wenn technisch wahr |
| Kinder | „Für Kinder ab … mit Begleitung der Eltern“; Warteliste: „Eltern tragen sich ein“ | Kinder direkt auffordern: „Sag deinen Eltern, sie sollen es kaufen!“; E-Mail-Einwilligung von unter 16 (DE) / 15 (FR) ohne Eltern | Art. 8 DSGVO, § 3 Abs. 3 UWG Anhang Nr. 28, FR Art. 45 Loi Informatique et Libertés |
| „Bald“ | „Geplant: Kopfhaltung, Instrumentenhöhe, Fortschritt über Wochen“ – optisch abgesetzt, z. B. Etikett „in Arbeit“ | Geplante Funktionen in der Funktionsliste neben fertigen, ohne Kennzeichnung; feste Termine, die man nicht halten kann | Irreführung über Verfügbarkeit/Eigenschaften, DE § 5 Abs. 2 Nr. 1 UWG, FR L121-2 2° b) |
| Preis (vor Karte B) | „Geplant: ca. 6 €/Monat, 7 Tage gratis testen“ – als Vorschau | „Jetzt 7 Tage gratis testen“-Knopf, der nur zur Warteliste führt | Lockangebot/Irreführung (§ 5 UWG, Anhang Nr. 5) |
| Gratis-Test (Karte B) | „7 Tage gratis, danach 6 €/Monat, monatlich kündbar“ direkt am Knopf | Kleingedrucktes, das den Abo-Übergang versteckt | § 312j Abs. 2/3 BGB; FR L221-5, L221-14 |
| Bestell-Knopf (Karte B) | DE: „zahlungspflichtig bestellen“ / „Jetzt kaufen“ · FR: « Commande avec obligation de paiement » | „Weiter“, „Test starten“ allein | § 312j Abs. 3 BGB; FR L221-14 |
| Kündigung (Karte B) | DE: Knopf „Verträge hier kündigen“ · FR: « Résilier votre contrat » in max. 3 Klicks | Kündigung nur per E-Mail/Brief | § 312k BGB; FR L215-1-1 + D215-1 ff. |
| Warteliste | Häkchen (nicht vorausgewählt) + Bestätigungs-Mail (Double-Opt-in), Zweck klar: „Info zum Start + VIP-Codes“ | Vorausgewähltes Häkchen, Newsletter heimlich mit dazu | Art. 6 Abs. 1 lit. a, Art. 7 DSGVO; § 7 Abs. 2 UWG; FR L34-5 CPCE; EuGH „Planet49“ |
| Erfahrungsberichte | Echte Zitate mit Einwilligung, „Schülerin, 12 Jahre“ | Erfundene oder gekaufte Bewertungen | § 5b Abs. 3 UWG, Anhang Nr. 23b/23c; FR L121-4 |

## Detailbefunde

### 1. Alleinstellungswerbung („der erste“)

- **DE**: § 5 UWG verbietet irreführende Angaben, u. a. über „wesentliche Merkmale“ und über die Person des Unternehmers. Eine Spitzenstellung („erste“, „einzige“, „beste“) ist nur zulässig, wenn sie **stimmt, belegbar ist und dauerhaft** ist. Die Beweislast liegt im Streit praktisch beim Werbenden. Bei Apps ist „die erste“ kaum belegbar (weltweit unzählige Pose-Apps). → [§ 5 UWG](https://www.gesetze-im-internet.de/uwg_2004/__5.html)
- **FR**: Art. L121-2 Code de la consommation (*pratique commerciale trompeuse*): falsche oder irreführende Angaben u. a. über die *caractéristiques essentielles*, die *disponibilité* und die *qualités* des Anbieters. → [L121-2](https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069565)
- **Ergebnis**: Die Entscheidung der Karte (kein „der erste“) ist richtig. Stark und sicher ist das **Vertrauens-Badge**, weil es wahr ist: „von einer Geigenpädagogin, mit eigenen Schülern erprobt“.

### 2. Gesundheit, Prävention, Medizinprodukt (MDR) und HWG

- **MDR Art. 2 Nr. 1** (Verordnung (EU) 2017/745): Medizinprodukt ist auch **Software**, die der Hersteller für einen medizinischen Zweck bestimmt, u. a. „Diagnose, **Verhütung**, Überwachung, Vorhersage, Prognose, Behandlung oder Linderung von **Krankheiten**“ sowie „Diagnose, Überwachung, Behandlung, Linderung von oder Kompensierung von **Verletzungen oder Behinderungen**“. → [MDR auf EUR-Lex](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32017R0745)
- **MDR Art. 2 Nr. 12** – die **Zweckbestimmung** ergibt sich aus den Angaben des Herstellers „auf der Kennzeichnung, in der Gebrauchsanweisung **oder dem Werbe- oder Verkaufsmaterial** bzw. den Werbe- oder Verkaufsangaben“. Heißt einfach: **Was auf der Landingpage steht, entscheidet mit**, ob die App ein Medizinprodukt ist.
- **MDR Erwägungsgrund 19**: Software „für Lebensstil und Wohlbefinden“ ist **kein** Medizinprodukt. Leitfaden dazu: [MDCG 2019-11 (EU-Kommission)](https://health.ec.europa.eu/medical-devices-sector/new-regulations/guidance-mdcg-endorsed-documents-and-other-guidance_en).
- **Folge bei Medizinprodukt**: Konformitätsbewertung, CE-Kennzeichen, Qualitätsmanagement, Medizinprodukte-Software meist mindestens Klasse IIa (MDR Anhang VIII Regel 11). Für ein Ein-Personen-Projekt praktisch nicht machbar → **unbedingt vermeiden**.
- **HWG (DE)**: gilt für Werbung für Medizinprodukte (§ 1 Abs. 1 Nr. 1a) **und** für „andere Mittel, Verfahren, Behandlungen und Gegenstände“, soweit sich die Werbung auf die **Erkennung, Beseitigung oder Linderung von Krankheiten, Leiden, Körperschäden oder krankhaften Beschwerden** bezieht (§ 1 Abs. 1 Nr. 2 a). Dann greifen strenge Verbote, z. B. § 3 (Irreführung, Heilversprechen) und § 11 (z. B. Werbung mit Gutachten, Angst, Werbung, die sich an Kinder unter 14 richtet). → [§ 1 HWG](https://www.gesetze-im-internet.de/heilmwerbg/__1.html), [§ 3 HWG](https://www.gesetze-im-internet.de/heilmwerbg/__3.html), [§ 11 HWG](https://www.gesetze-im-internet.de/heilmwerbg/__11.html)
- **FR**: Die MDR gilt direkt. Werbung für Medizinprodukte regeln Art. L5213-1 ff. Code de la santé publique (Aufsicht: ANSM). Für Nicht-Medizinprodukte bleibt die allgemeine Irreführung (L121-2). → [L5213-1 CSP](https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006072665)
- **Einordnung für Blue Anchor**: Die App gibt Rückmeldung zur **Spiel-Haltung** – das ist **Üben/Pädagogik**, kein Krankheitsbezug. Das bleibt so, solange die Seite **keine** Krankheiten, Schmerzen, Verletzungen oder deren Vorbeugung nennt. Die Karte hatte notiert: „Gesundheit nur als ‚Prävention für bessere Körperhaltung / Körperwahrnehmung‘“. **Empfehlung**: Das Wort **„Prävention“ ganz weglassen** und nur von **Körperwahrnehmung, entspannter Haltung, bewusstem Üben** sprechen. „Haltung“ ist hier eine **musikalische Technik** (wie bei Geigenlehrkräften), kein medizinischer Befund.

### 3. Datenschutz-Aussagen, Modelle von Google/jsDelivr, Kinder

**Was die App heute technisch tut** (`src/hooks/use-pose-detection.ts` Z. 130–134 und 189–193):
- WASM-Laufzeit von `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm`
- Modelle von `https://storage.googleapis.com/mediapipe-models/...`
- Das Kamerabild wird nur im Browser verarbeitet und **nicht** hochgeladen.

**Rechtliche Einordnung:**
- **IP-Adresse = personenbezogenes Datum**, wenn der Betreiber rechtliche Mittel hat, die Person zu bestimmen: [EuGH, Urteil vom 19.10.2016, C-582/14 (Breyer)](https://curia.europa.eu/juris/liste.jsf?num=C-582/14).
- **LG München I, Urteil vom 20.01.2022, Az. 3 O 17493/20**: Wer Google Fonts **dynamisch von Google-Servern** lädt, gibt die IP-Adresse ohne Einwilligung an Google weiter; das war **nicht** durch berechtigtes Interesse gedeckt, weil man die Schriften auch **selbst ausliefern** kann. 100 € Schadensersatz + Unterlassung. → Fundstelle: GRUR-RS 2022, 612
- **Übertragbar auf die Modelle**: gleiche Lage – technisch wäre Selbst-Ausliefern möglich (genau das ist der geplante PWA-Umbau). Bis dahin: **in der Datenschutzerklärung offenlegen** (Empfänger Google LLC / jsDelivr, Zweck, Rechtsgrundlage) und sauber abwägen; die vorsichtigste Lösung ist, die Dateien selbst zu hosten.
- **Drittland**: Google LLC (USA) ist unter dem **EU-US Data Privacy Framework** zertifiziert; der Angemessenheitsbeschluss der Kommission vom 10.07.2023 deckt Übermittlungen an zertifizierte Firmen (Art. 45 DSGVO). → [Angemessenheitsbeschluss](https://eur-lex.europa.eu/eli/dec_impl/2023/1795/oj), [DPF-Liste](https://www.dataprivacyframework.gov/list). jsDelivr wird laut eigener Angabe von Prospect One sp. z o.o. (Krakau, Polen) betrieben und nutzt mehrere CDN-Netze → [jsDelivr Privacy Policy](https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net) (nur Sekundärquellen bestätigen den Betreiber; vor Veröffentlichung prüfen).
- **Wichtig: Das betrifft die App, nicht nur die Landingpage.** Auf der Landingpage selbst gilt dasselbe für **Schriften, Videos, Analyse-Tools, Karten**: alles selbst ausliefern, dann braucht es dafür kein Cookie-Banner. Für Speichern/Auslesen im Endgerät (Cookies, LocalStorage) gilt **§ 25 TDDDG** (DE) bzw. **Art. 82 Loi Informatique et Libertés** (FR): Einwilligung, außer „unbedingt erforderlich“. → [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html), [CNIL Cookies](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies)
- **Aussage „Ihr Kamerabild verlässt nie Ihr Gerät“**: stimmt technisch → zulässig. Sie muss aber **genau** bleiben: nicht „keine Daten“ oder „100 % offline“, denn IP-Adresse (Modell-Download), Warteliste-E-Mail und Hosting-Logs sind Daten. Unwahre Datenschutz-Werbung ist selbst irreführend (§ 5 UWG / L121-2) und verletzt den Transparenz-Grundsatz (Art. 5 Abs. 1 lit. a, Art. 12, 13 DSGVO). → [DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- **Kinder (Art. 8 DSGVO)**: Stützt sich ein Dienst der Informationsgesellschaft für Kinder auf **Einwilligung**, braucht es unter der Altersgrenze die Zustimmung der Eltern. **DE: 16 Jahre** (Standard, Deutschland hat nicht abgesenkt). **FR: 15 Jahre** (Art. 45 Loi Informatique et Libertés; darunter gemeinsame Einwilligung Kind + Eltern). → [Art. 45 Loi n° 78-17](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000886460), [CNIL zu Minderjährigen](https://www.cnil.fr/fr/recommandations-pour-renforcer-la-protection-des-mineurs-en-ligne)
  - **Praktisch für die Warteliste**: Formular ausdrücklich an **Eltern und Erwachsene** richten („Ich bin mindestens 16 Jahre alt bzw. Elternteil“). Keine Kinder-Daten (Name, Alter des Kindes) abfragen, wenn nicht nötig (Datensparsamkeit, Art. 5 Abs. 1 lit. c).
  - **Werbung an Kinder**: Verboten ist die **unmittelbare Aufforderung an Kinder**, ein Produkt zu kaufen oder die Eltern zum Kauf zu bewegen ([§ 3 Abs. 3 UWG i. V. m. Anhang Nr. 28](https://www.gesetze-im-internet.de/uwg_2004/anhang.html); FR: Liste aggressiver Praktiken, [Art. L121-7 Nr. 5 Code de la consommation](https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069565)).

### 4. Werbung mit Funktionen, die erst „bald“ kommen

- Nicht verboten, aber **Irreführung über Verfügbarkeit und Eigenschaften** ist verboten: DE § 5 Abs. 2 Nr. 1 UWG („Verfügbarkeit“, „Merkmale“), FR L121-2 2° (u. a. *disponibilité*, *caractéristiques essentielles*).
- **Faustregel**: Jede Funktion auf der Seite ist entweder **„jetzt verfügbar“** oder klar **„geplant / in Arbeit“**. Kein Datum versprechen, das man nicht halten kann. Der Preis darf nicht so beworben werden, als bekäme man für 6 € schon die geplanten Module.
- **Lockangebot** (Anhang Nr. 5 UWG): Ein Kauf-Knopf für etwas, das es noch nicht gibt, ist riskant. Bis Karte B nur „Auf die Warteliste“.

### 5. Gratis-Test und Abo (gehört zu Karte B, hier nur als Vorschau)

**Deutschland:**
- **Bestell-Knopf**: „zahlungspflichtig bestellen“ oder eindeutig gleichwertig ([§ 312j Abs. 3 BGB](https://www.gesetze-im-internet.de/bgb/__312j.html)); Preis, Laufzeit, Kündigung unmittelbar davor sichtbar (§ 312j Abs. 2). Gilt auch, wenn die ersten 7 Tage gratis sind, weil danach automatisch bezahlt wird.
- **Kündigungsbutton** [§ 312k BGB](https://www.gesetze-im-internet.de/bgb/__312k.html): Schaltfläche „Verträge hier kündigen“ (o. ä.), führt zu einer Bestätigungsseite mit Knopf „jetzt kündigen“; ständig verfügbar, leicht erreichbar, Eingangsbestätigung. Fehlt er, können Verbraucher **jederzeit fristlos** kündigen.
- **Laufzeit/Verlängerung**: [§ 309 Nr. 9 BGB](https://www.gesetze-im-internet.de/bgb/__309.html) – stillschweigende Verlängerung nur auf unbestimmte Zeit mit höchstens 1 Monat Kündigungsfrist. Monatsabo ist unproblematisch.
- **Widerrufsrecht** 14 Tage ([§ 355, § 356 Abs. 5 BGB](https://www.gesetze-im-internet.de/bgb/__356.html)): erlischt bei digitalen Inhalten/Diensten nur mit ausdrücklicher Zustimmung + Bestätigung der Kenntnis. Widerrufsbelehrung nötig.

**Frankreich:**
- **Résiliation en trois clics**: [Art. L215-1-1 Code de la consommation](https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069565) (Gesetz vom 16.08.2022) + [Décret n° 2023-417](https://www.economie.gouv.fr/dgccrf/laconso/resiliation-dun-contrat-par-voie-electronique) (Art. D215-1 ff.): Funktion „résilier votre contrat“, leicht erreichbar, seit 01.06.2023 Pflicht; Kontrolle durch DGCCRF. → [DGCCRF-Infoseite](https://www.economie.gouv.fr/dgccrf/laconso/resiliation-dun-contrat-par-voie-electronique)
- **Bestell-Knopf**: « commande avec obligation de paiement » o. ä. ([L221-14](https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069565)).
- **Vorvertragliche Infos** ([L221-5](https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069565)), **Widerruf 14 Tage** (L221-18) und Ausnahme für digitale Inhalte/Dienste (L221-28).
- **Sprache**: Werbung und Verträge in Frankreich **auf Französisch** ([Loi Toubon n° 94-665, Art. 2](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000349929)) – passt zur geplanten FR-Seite.

### 6. Impressum und Rechtstexte für Landingpage + Warteliste

**Deutschland:**
- **Impressum** nach [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html) (Digitale-Dienste-Gesetz, ersetzt seit 14.05.2024 § 5 TMG): Name, ladungsfähige Anschrift (kein Postfach), schnelle elektronische Kontaktaufnahme (E-Mail + zweiter Weg, z. B. Telefon oder Kontaktformular), ggf. USt-IdNr., Rechtsform. Gilt für **geschäftsmäßige** Angebote – eine Warteliste für ein geplantes Bezahl-Abo ist geschäftsmäßig.
- **Redaktionell Verantwortliche** nach [§ 18 Abs. 2 MStV](https://www.revosax.sachsen.de/vorschrift/18751-Medienstaatsvertrag#p18), falls es einen Blog / journalistische Texte gibt.
- **Datenschutzerklärung** nach [Art. 13 DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679): Verantwortliche, Zwecke, Rechtsgrundlagen, Empfänger (Hosting, Newsletter-Dienst, Google/jsDelivr bei App-Nutzung), Drittland, Speicherdauer, Rechte, Beschwerderecht bei der Aufsicht. Mit dem Warteliste-Dienst (z. B. Brevo, Mailchimp) einen **Auftragsverarbeitungsvertrag** (Art. 28) schließen.
- **E-Mail-Warteliste**: Einwilligung + **Double-Opt-in** (Nachweis, Art. 7 Abs. 1 DSGVO; BGH, Urteil vom 10.02.2011, I ZR 164/09 „Double-opt-in-Verfahren“ – Bestätigungsmail selbst ist zulässig). E-Mail-Werbung ohne Einwilligung = unzumutbare Belästigung ([§ 7 Abs. 2 UWG](https://www.gesetze-im-internet.de/uwg_2004/__7.html)). Kein vorausgefülltes Häkchen ([EuGH C-673/17 Planet49](https://curia.europa.eu/juris/liste.jsf?num=C-673/17)).
- **OS-Plattform-Link**: **nicht mehr nötig** – die EU-Streitbeilegungsplattform wurde durch [Verordnung (EU) 2024/3228](https://eur-lex.europa.eu/eli/reg/2024/3228/oj) zum 20.07.2025 abgeschafft (bestätigt u. a. durch [IHK](https://www.ihk.de/fulda/handel-dienstleistungen/eu-plattform-zur-streitbeilegung-wird-abgeschafft-6503696)). **VSBG-Hinweis** ([§ 36 VSBG](https://www.gesetze-im-internet.de/vsbg/__36.html)) nur, wenn mehr als 10 Beschäftigte – für Blue Anchor aktuell nicht nötig, wird oft trotzdem freiwillig angegeben („nicht bereit/verpflichtet“).
- **AGB/Widerrufsbelehrung** erst mit dem Abo (Karte B).

**Frankreich:**
- **Mentions légales** nach [Art. 1-1 LCEN (Loi n° 2004-575)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164) (seit Loi SREN vom 21.05.2024): Name, Wohnsitz/Sitz, Telefon, ggf. Handelsregister/Kapital, **directeur de la publication**, **Hoster** mit Name, Anschrift, Telefon. Bei Unternehmen zusätzlich Infos nach L221-5 / L111-1 Code de la consommation.
- **Politique de confidentialité** (Art. 13 DSGVO) auf Französisch; Cookies nach Art. 82 Loi Informatique et Libertés und den [CNIL-Leitlinien](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies).
- **E-Mail-Werbung**: Einwilligung nach [Art. L34-5 Code des postes et des communications électroniques](https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006070987); CNIL-Hinweise zur [prospection commerciale par e-mail](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique).
- **Médiation de la consommation**: In Frankreich muss **jeder** Unternehmer gegenüber Verbrauchern einen Verbraucher-Schlichter (*médiateur*) benennen und angeben ([L612-1](https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069565), [L616-1](https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069565)) – relevant, sobald an französische Verbraucher verkauft wird (Karte B), keine Kleinunternehmer-Ausnahme wie in DE.

## Offene Punkte / vor dem Live-Schalten klären

- **Wer ist Anbieter?** (Einzelunternehmen der Nutzerin, Sitz DE?) – bestimmt Impressum, USt, und ob das französische Recht über den Verbraucher-Wohnsitz greift (Rom-I-VO Art. 6: Verbraucherrecht des Wohnsitzlandes gilt, wenn die Seite sich gezielt an FR richtet – das tut eine FR-Seite).
- **Warteliste-Dienst** auswählen (EU-Anbieter bevorzugen), AV-Vertrag, Double-Opt-in.
- **Modelle selbst ausliefern** (App-Karte, PWA): erst dann „offline“ und ohne Google/jsDelivr-Übertragung werben.
- **jsDelivr-Betreiber** im Original-Dokument prüfen (hier nur Sekundärquellen).
- Fertige DE/FR-Texte von einer Fachperson prüfen lassen.

> **Keine Rechtsberatung.** Stand der Quellen: 09.11.2026. Gesetze ändern sich (z. B. wurde § 5 TMG 2024 zu § 5 DDG, die OS-Plattform 2025 abgeschafft). Vor Veröffentlichung neu prüfen.
