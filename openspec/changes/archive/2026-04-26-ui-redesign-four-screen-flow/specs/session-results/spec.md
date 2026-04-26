## ADDED Requirements

### Requirement: Results screen displays zone donut chart
The results screen SHALL render a donut/pie chart showing the percentage distribution of time spent in each layer (flow, bewusst, achtung, limit) using recharts via shadcn Chart.

#### Scenario: Donut chart with zone data
- **WHEN** the results screen renders with zone data `{ flow: 62, bewusst: 24, achtung: 9, limit: 5 }`
- **THEN** a donut chart displays four colored segments matching the layer colors with percentage labels

### Requirement: Results screen displays tension timeline
The results screen SHALL render an area chart showing tension values over the session duration using the tension timeline data.

#### Scenario: Timeline chart with tension data
- **WHEN** the results screen renders with a tension timeline array
- **THEN** an area chart displays tension over time, color-coded by layer thresholds

### Requirement: Results screen shows session summary
The results screen SHALL display session metadata: instrument, focus mode, duration, and aggregate stats (average tension, peak tension).

#### Scenario: Summary display
- **WHEN** the results screen renders for a 12-minute violin session
- **THEN** it shows "🎻 Geige · 12:00 Min" and summary statistics

### Requirement: Repeat button navigates to session
A "Wiederholen" button SHALL navigate back to the session screen with the same instrument, focus mode, and sensitivity settings.

#### Scenario: Repeat session
- **WHEN** user clicks "Wiederholen"
- **THEN** `goToSession()` is called and the session screen loads with previous configuration preserved

### Requirement: Home button navigates to home
A "Hauptmenü" button SHALL navigate to the home screen and reset all transient state.

#### Scenario: Go home
- **WHEN** user clicks "Hauptmenü"
- **THEN** `goHome()` is called and the home screen loads

### Requirement: Results use layer colors consistently
The donut chart and timeline SHALL use the established layer colors: flow = `#2196F3`, bewusst = `#F1C40F`, achtung = `#FF9800`, limit = `#9B59B6`.

#### Scenario: Consistent layer colors
- **WHEN** charts render
- **THEN** each layer segment uses its designated color from the theme
