# Domain-Docs

Wie die Engineering-Skills die Domain-Dokumentation dieses Repos beim Erkunden des Codes konsumieren sollen.

## Vor dem Erkunden lesen

- **`CONTEXT.md`** im Repo-Wurzelverzeichnis, oder
- **`CONTEXT-MAP.md`** im Wurzelverzeichnis, falls vorhanden: sie verweist auf je eine `CONTEXT.md` pro Kontext. Jede zum Thema passende lesen.
- **`docs/adr/`**: die ADRs lesen, die den Bereich betreffen, in dem du gleich arbeitest. In Multi-Context-Repos zusätzlich `src/<context>/docs/adr/` auf kontextspezifische Entscheidungen prüfen.

Falls eine dieser Dateien nicht existiert, **still weiterarbeiten**. Ihr Fehlen nicht anmerken; nicht vorab vorschlagen, sie anzulegen. Der `/domain-modeling`-Skill (erreichbar über `/grill-with-docs` und `/improve-codebase-architecture`) legt sie bei Bedarf an, wenn Begriffe oder Entscheidungen tatsächlich geklärt werden.

## Dateistruktur

Single-Context-Repo (die meisten Repos):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-Context-Repo (Vorhandensein einer `CONTEXT-MAP.md` im Wurzelverzeichnis):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← systemweite Entscheidungen
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← kontextspezifische Entscheidungen
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Das Vokabular des Glossars verwenden

Wenn deine Ausgabe ein Domain-Konzept benennt (in einem Issue-Titel, einem Refactor-Vorschlag, einer Hypothese, einem Testnamen), den Begriff so verwenden, wie er in `CONTEXT.md` definiert ist. Nicht zu Synonymen abdriften, die das Glossar bewusst vermeidet.

Falls das benötigte Konzept noch nicht im Glossar steht, ist das ein Signal: Entweder erfindest du Sprache, die das Projekt nicht verwendet (überdenken) oder es gibt eine echte Lücke (für `/domain-modeling` notieren).

## ADR-Konflikte anmerken

Falls deine Ausgabe einem bestehenden ADR widerspricht, das explizit ansprechen, statt es still zu übergehen:

> _Widerspricht ADR-0007 (event-sourced orders), aber ein erneutes Aufgreifen lohnt sich, weil…_
