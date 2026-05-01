## Context

Der Wrist-Mode trackt die Handgelenk-Haltung beim Geigenspiel. MediaPipe Pose liefert 33 Body-Landmarks, darunter Elbow (13), Wrist (15), Index (19), Pinky (17). Der aktuelle Analyzer nutzt einen 3D-Gesamtwinkel zwischen drei Punkten, der alle Freiheitsgrade vermischt. Die Visualisierung verwendet einen künstlichen Knick-Offset perpendicular zur Armlinie.

Constraint: Alle Berechnungen laufen im Browser bei 30fps. Keine zusätzlichen ML-Modelle (kein MediaPipe Hands).

## Goals / Non-Goals

**Goals:**
- Nur Flexion/Extension messen (Hand nach innen/außen geneigt)
- Stabiler Handvektor durch MCP-Approximation
- Klare, minimal-ablenkende Visualisierung (gelbe gestrichelte Linie)
- Peripherie-Darstellung synchron zur Hauptansicht
- Markierungen folgen der Hand beim Bewegen (kein Screen-Space-Rendering)

**Non-Goals:**
- Radial/Ulnar-Deviation tracken
- MediaPipe Hands integrieren (21 Hand-Landmarks)
- Flow-Mode-Darstellung ändern (bleibt abstrakt)
- Tension-Kurve oder Layer-System ändern

## Decisions

### 1. MCP-Joint Approximation: Midpoint(17, 19)

**Entscheidung**: Midpoint von LEFT_PINKY (17) und LEFT_INDEX (19) als MCP-Proxy.

**Alternativen**:
- Nur Index (19): instabiler bei Fingerbewegungen, einseitig
- Nur Pinky (17): zu weit von der Geigenhand-Achse
- Gewichteter Mix (70% Index, 30% Pinky): marginaler Vorteil, mehr Komplexität

**Rationale**: Midpoint ist der geometrische Handmittelpunkt auf Knöchelhöhe. Beide Punkte bewegen sich bei Flexion/Extension gleich, gleichen sich bei individuellen Fingerbewegungen aus.

### 2. Ebenen-Projektion für Flexion/Extension-Isolation

**Entscheidung**: Flexion/Extension-Ebene durch Unterarm-Vektor und Schwerkraft definieren.

```
forearm = wrist - elbow
up = [0, -1, 0]
normal = normalize(forearm × up)

hand = MCP - wrist
hand_proj = hand - dot(hand, normal) * normal

flexAngle = angle(forearm, hand_proj)
```

**Alternativen**:
- 2D-Projektion (nur x,y ignorieren z): verliert Depth-Information bei Kamera-Winkel
- Schulter als dritter Punkt für Ebene: instabil, zu weit entfernt
- Cross-Product-Sign wie aktuell: mischt beide Achsen

**Rationale**: Die Schwerkraft ist eine stabile globale Referenz. Die Ebene forearm×up enthält genau die Flexion/Extension-Achse. Radial/Ulnar liegt senkrecht dazu und fällt durch die Projektion weg.

**Edge Case**: Arm fast vertikal → `forearm × up` wird klein. Mitigation: Wenn `|forearm × up| < 0.1`, Fallback auf 2D-Winkel (wie aktuell). Beim Geigenspielen kommt dieser Fall praktisch nicht vor.

### 3. Visualisierung: Gelbe gestrichelte Linie

**Entscheidung**: Bei Abweichung wird eine gelbe gestrichelte Linie von Wrist→MCP gezeichnet, die die aktuelle (falsche) Handposition zeigt.

```
┌─────────────────────────────────────────┐
│  Korrekt (Deadzone):                    │
│                                         │
│    Elbow ─── ● Anker ─── MCP            │
│              (leuchtet)                  │
│                                         │
│  Abweichung:                            │
│                                         │
│    Elbow ─── ● Anker                    │
│               ╲                         │
│                ╲ ← gelb gestrichelt      │
│                 MCP                     │
│                                         │
│  Referenzlinie: KEINE (weniger Clutter) │
└─────────────────────────────────────────┘
```

**Alternativen**:
- Permanente blaue Referenzlinie + gelbe Fehlerlinie: zu viel visuelles Rauschen
- Farbcodierter Knick (aktuell): schwer peripher lesbar
- Nur Anker-Farbe ändern: zu subtil

**Rationale**: Eine einzelne gelbe gestrichelte Linie ist peripher sofort erkennbar. Sie erscheint nur bei Abweichung → clean bei guter Haltung. Gestrichelt signalisiert "temporär, korrigierbar" statt fest/permanent.

### 4. Peripherie (Side-View): Vereinfachte Synchronkopie

**Entscheidung**: Side-View zeigt gleiche Kernelemente in abstrahierter Form:
- Vertikale Armlinie (statisch)
- Sapphire-Anker (Mitte)
- Hand-Linie (abgewinkelt, synchron zum Hauptbild)
- Gelbe Farbe bei Abweichung, Glow bei Rückkehr

Die Winkelabweichung wird 1:1 gespiegelt (gleiche Gradzahl, gleiche Richtung relativ zum Arm).

### 5. One-Euro-Filter beibehalten

**Entscheidung**: Bestehende gefilterte Koordinaten (`filteredWristCoords`) bleiben. MCP-Punkt wird zusätzlich gefiltert.

**Rationale**: Bewährt für Jitter-Reduktion, Beta-Werte sind bereits tuned (siehe repo memory).

## Risks / Trade-offs

- **[Ebenen-Instabilität bei vertikalem Arm]** → Fallback auf 2D-Winkel mit Confidence-Warning. Tritt beim Geigenspiel praktisch nicht auf.
- **[MCP Midpoint springt bei extremen Fingerspreizungen]** → One-Euro-Filter glättet. Beim Geigenspiel sind Finger ohnehin nah beieinander.
- **[Breaking Change: WristMasterPrint]** → Alte Kalibrierungen sind inkompatibel. Einfach neu kalibrieren (dauert 3 Sekunden). Keine persistierte Kalibrierung.
- **[Weniger Information als vorher]** → Bewusste Entscheidung: lieber korrekte Information zu einer Achse als vermischte Information zu beiden.
