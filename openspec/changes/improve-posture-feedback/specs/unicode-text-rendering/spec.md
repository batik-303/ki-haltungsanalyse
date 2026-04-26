## ADDED Requirements

### Requirement: Full Unicode support in on-screen text
All text rendered on the video feed SHALL support Unicode characters including German umlauts (ä, ö, ü), eszett (ß), and typographic characters (en-dash, em-dash).

#### Scenario: Umlaut in correction hint
- **WHEN** a warning displays the correction text "Kopf gerader halten – Kinnstütze prüfen"
- **THEN** the "ü" in "Kinnstütze" and "ü" in "prüfen" render correctly as their Unicode glyphs, not as "??"

#### Scenario: Umlaut in warning name
- **WHEN** a warning displays "Schultern asymmetrisch (Linke höher)"
- **THEN** the "ö" in "höher" renders correctly

#### Scenario: Window title with special characters
- **WHEN** the OpenCV window is created
- **THEN** the window title displays "Haltungsanalyse für Geiger" with the correct "ü" glyph

#### Scenario: Status bar text with special characters
- **WHEN** the status bar needs to display "nötig" or other German words
- **THEN** all umlauts and special characters render correctly

### Requirement: Fallback for missing font
The system SHALL gracefully handle the case where no suitable Unicode TTF font is available on the system by falling back to ASCII transliteration (ä→ae, ö→oe, ü→ue, ß→ss) with cv2.putText.

#### Scenario: Font available
- **WHEN** a TTF font supporting Latin Extended is found (bundled or system)
- **THEN** text is rendered via Pillow with full Unicode support

#### Scenario: No font available
- **WHEN** no suitable TTF font can be located
- **THEN** text is rendered via cv2.putText with umlauts replaced by ASCII equivalents (e.g., "ö" → "oe")

### Requirement: Text rendering performance
The Unicode text rendering SHALL NOT reduce the frame rate below 25fps on the target hardware (standard laptop with integrated graphics at 1280x720 resolution).

#### Scenario: Frame rate maintained
- **WHEN** the system renders 3 warning texts with correction hints using Pillow-based rendering
- **THEN** the total text rendering time per frame is under 5ms
