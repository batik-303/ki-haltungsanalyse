# Violin Anchor Redesign

## Problem

Im Violin Mode bewegt sich der Sapphire Anchor auf der X-Achse mit dem Handgelenk mit. Der `ViolinMasterPrint` speichert nur `calibWristY` — kein X. Dadurch fühlt sich der Ankerpunkt nicht verankert an: wenn die Geige sich bewegt, "schwimmt" er horizontal mit.

Zusätzlich zeigt das Golden Band (Trapez-Form) keinen visuellen Unterschied zwischen "Geige sinkt" und "Geige steigt". Die Richtung ist nur über einen kleinen Text-Pfeil erkennbar.

## Solution

1. **Fixer Anchor**: `ViolinMasterPrint` um `calibWristX` erweitern. Anchor wird an der kalibrierten Position fixiert (X + Y).

2. **Gerichtete Elastic Line statt Trapez-Band**: Das Golden Band wird durch eine gerichtete Linie ersetzt:
   - **Gold** (#DAA520 → #FFD700) bei Sinken (Linie geht vom Anchor nach unten)
   - **Silber-Blau** (#90CAF9 → #64B5F6) bei Steigen (Linie geht vom Anchor nach oben)
   - Dicke skaliert mit Tension (1px → 8px)
   - Opacity skaliert mit Tension (0.15 → 0.7)
   - Richtungspfeil am Wrist-Ende
   - Bei tension < 3: komplett unsichtbar → nur Anchor sichtbar

3. **Scope**: Nur Violin Mode. Wrist Mode und Shoulder Mode bleiben unberührt.

## Goal

Peripheres Feedback über 5 redundante Kanäle: Farbe, Richtung, Länge, Dicke, Pfeil. Ziel des Musikers: das Band zum Verschwinden bringen → Flow.
