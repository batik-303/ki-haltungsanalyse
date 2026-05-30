# 6 — Session Bottom Bar Layout

> **Typ**: HITL | **Eltern-PRD**: PRD-responsive-redesign.md

## What to build

Der Session-Screen bekommt auf schmalen Geräten (<480px) ein Bottom-Bar-Layout statt absoluter HUD-Elemente. Auf größeren Screens (≥480px) bleibt das bestehende Layout mit `clamp()`-Größen statt fixen Pixeln.

### Phone-Layout (<480px)
```
┌──────────────────────┐
│ 🎻 Geige      02:34 │  ← Badge + Timer, top-safe
│                      │
│      [Canvas]        │  ← maximaler Raum
│                      │
├──────────────────────┤
│ ████░ 63%  │ 🎤  🛑 │  ← Bottom-Bar: Tension inline + Controls
└──────────────────────┘
```

- Bottom-Bar: `flex row`, `gap-2`, `p-2`, `pb-safe`, `bg-surface/80 backdrop-blur`
- Mode-Badge + Timer: `top-safe`, kleiner auf Phone
- Fallback-Buttons: `py-3 min-h-[44px]` auf Phone (responsive Touch-Targets)
- Mic/Voice-Hint: inline in Bottom-Bar statt separat
- Tension-Bar: kompakt, inline mit Prozentwert

### Desktop/Tablet-Layout (≥480px)
- Bestehendes Layout bleibt
- Fixe Größen durch `clamp()` ersetzt: Tension-Bar `w-[clamp(160px,20vw,192px)]`, Abstände `top-[clamp(8px,2vh,16px)]`

## Acceptance criteria

- [ ] Auf Phone: HUD-Elemente in Bottom-Bar am unteren Rand, Canvas füllt restlichen Raum
- [ ] Bottom-Bar respektiert `safe-area-inset-bottom` (kein Überlapp mit Home Indicator)
- [ ] Mode-Badge und Timer sind oben, aber mit `top-safe` (respektieren Notch/Dynamic Island)
- [ ] Fallback-Buttons auf Phone mindestens 44px hoch, angenehm mit Finger tippbar
- [ ] Auf Desktop/Tablet: Bestehendes Layout unverändert (absolute Positionen an Rändern)
- [ ] Tension-Bar auf Desktop nutzt `clamp()` und skaliert mit Viewport
- [ ] **Manueller Test**: Session auf Phone und Desktop starten. Bottom-Bar auf Phone kompakt und funktional. Desktop-Layout unverändert.

## Blocked by

- #1 Layout-System Foundation