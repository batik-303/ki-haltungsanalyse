---
Status: accepted
---

# Marine-Serenity-Token-Architektur: helles Chrome, dunkler session-Teilbaum, bestehende Namen

Für die Integration des Stitch-Designs „Marine Serenity" bekommt das Chrome (`home`/`setup`/`results`) ein **helles** Theme, während der `session`-Screen als abgegrenzter dunkler Teilbaum (`data-theme="dark"`) bestehen bleibt. Die **umschaltbaren** semantischen Farb-Token werden als Rohvariablen in `:root` (hell) und `[data-theme="dark"]` (heutige Dunkelwerte) definiert und über `@theme inline` an Tailwind angebunden; **fixe** Marken-Token bleiben im klassischen `@theme`-Block. Die **bestehenden Token-Namen** (`sapphire`, `gold`, `--color-layer-*`, shadcn-Token) werden beibehalten — es werden nur Werte getauscht.

## Considered Options

- **Bestehende Namen behalten, Werte tauschen** (gewählt) — kein flächendeckender Refactor (~50 Fundstellen), Feedback-/Rendering-Logik bleibt stabil.
- **Material-Vokabular aus Stitch übernehmen** (`surface`, `primary-container`, `on-surface` …) — näher an der Design-Quelle, aber großer Refactor ohne funktionalen Gewinn. Verworfen.
- **Globales umschaltbares Hell/Dunkel-Theme** — mehr Aufwand, vom Nutzer nicht gewünscht; nur der `session`-Bereich muss dunkel sein. Als Nachrüst-Option im Nebel belassen.

## Consequences

- **`primary` ≠ `sapphire`** (überraschend ohne Kontext): `--color-primary` wird Tiefsee-Blau `#002b49` (Chrome), `sapphire` `#2196F3` bleibt eigenständig für die *Flow*-Semantik und die Kamera-Indikatoren. So entkoppeln sich Chrome-Umbau und Feedback-Logik.
- **Kein Rot**: `error`/`destructive` werden von Rot auf Amber bzw. ein gewichtetes Neutral (`#4a575f`) umgestellt — konsequent zur Feedback-Philosophie und zu Marine Serenity.
- **Kamera-Indikatoren unberührt**: `src/rendering/` nutzt literale Hex-Farben statt Token; der Token-Umbau ändert die Indikatoren nicht (sie werden später separat angepasst — aktuell out of scope).
- Nur Token, deren Wert auf eine pro-Teilbaum überschriebene Variable zeigt, gehören in `@theme inline`; fixe Literale bleiben in `@theme`.

Details & Quellen: `docs/research/16-tailwind-v4-tokens-fonts.md`. Vokabular: `CONTEXT.md`. Herkunft: Wegfindungs-Karte #15, Tickets #16/#17.
