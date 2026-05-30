# 9 — Results Screen Responsive

> **Typ**: HITL | **Eltern-PRD**: PRD-responsive-redesign.md

## What to build

Results-Screen responsive machen: Charts untereinander auf schmalen Screens, mit Reveal-Animation.

- Stats-Karten: `grid-cols-1 md:grid-cols-2`
- Donut + Timeline: `flex-col sm:flex-row` — untereinander auf Phone, nebeneinander auf Tablet+
- Donut-Chart: `animationDuration={800}` `animationEasing="ease-out"` via Recharts
- Timeline-Chart: `animationDuration={800}` via Recharts

## Acceptance criteria

- [ ] Auf Phone (<480px): Donut-Chart oben, Timeline-Chart darunter, beide volle Breite
- [ ] Auf Tablet+ (≥480px): Donut und Timeline nebeneinander
- [ ] Stats-Karten auf Phone untereinander, auf Desktop zweispaltig
- [ ] Beide Charts haben Reveal-Animation (~800ms) beim Öffnen des Results-Screens
- [ ] Charts sind in allen Größen gut lesbar (ResponsiveContainer von Recharts)
- [ ] **Manueller Test**: Session beenden, Results auf Phone und Desktop prüfen. Charts gut lesbar, Animation smooth.

## Blocked by

- #1 Layout-System Foundation