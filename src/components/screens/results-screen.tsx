import { usePoseStore } from '@/store/pose-store'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { Home, RotateCcw } from 'lucide-react'
import { getPersonalBestStreak, getTotalHoldMilestones } from '@/core/persistence/session-db'

const LAYER_COLORS = {
  flow: '#2196F3',
  bewusst: '#F1C40F',
  achtung: '#FF9800',
  limit: '#9B59B6',
} as const

const LAYER_LABELS = {
  flow: 'Flow',
  bewusst: 'Bewusst',
  achtung: 'Achtung',
  limit: 'Limit',
} as const

const MODE_LABELS: Record<string, string> = {
  violin: '🎻 Geige',
  wrist: '🤚 Handgelenk',
  shoulder: '💪 Schulter',
}

const donutConfig: ChartConfig = {
  flow: { label: 'Flow', color: LAYER_COLORS.flow },
  bewusst: { label: 'Bewusst', color: LAYER_COLORS.bewusst },
  achtung: { label: 'Achtung', color: LAYER_COLORS.achtung },
  limit: { label: 'Limit', color: LAYER_COLORS.limit },
}

const timelineConfig: ChartConfig = {
  tension: { label: 'Spannung', color: LAYER_COLORS.flow },
}

export function ResultsScreen() {
  const lastStats = usePoseStore((s) => s.lastSessionStats)
  const focusMode = usePoseStore((s) => s.focusMode)
  const goToSession = usePoseStore((s) => s.goToSession)
  const goHome = usePoseStore((s) => s.goHome)

  if (!lastStats) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Keine Session-Daten vorhanden</p>
        <Button onClick={goHome}>Hauptmenü</Button>
      </div>
    )
  }

  const { durationMinutes, durationSeconds, zonePercentages, tensionTimeline, maxFlowStreak, anchorPoints, repairedTime, holdMilestones } = lastStats

  const durationStr = `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`

  // Personal best comparison
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [personalBest, setPersonalBest] = useState(0)
  const [totalMilestones, setTotalMilestones] = useState(0)

  useEffect(() => {
    getPersonalBestStreak().then((best) => {
      setPersonalBest(best)
      if (maxFlowStreak > 0 && maxFlowStreak >= best) {
        setIsNewRecord(true)
      }
    })
    getTotalHoldMilestones().then(setTotalMilestones)
  }, [maxFlowStreak])

  const donutData = [
    { name: 'flow', value: Math.round(zonePercentages.flow), fill: LAYER_COLORS.flow },
    { name: 'bewusst', value: Math.round(zonePercentages.bewusst), fill: LAYER_COLORS.bewusst },
    { name: 'achtung', value: Math.round(zonePercentages.achtung), fill: LAYER_COLORS.achtung },
    { name: 'limit', value: Math.round(zonePercentages.limit), fill: LAYER_COLORS.limit },
  ].filter((d) => d.value > 0)

  const avgTension = tensionTimeline.length > 0
    ? Math.round(tensionTimeline.reduce((s, e) => s + e.tension, 0) / tensionTimeline.length)
    : 0

  const peakTension = tensionTimeline.length > 0
    ? Math.round(Math.max(...tensionTimeline.map((e) => e.tension)))
    : 0

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8 gap-8">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Session-Übersicht</h1>
        <p className="text-lg text-muted-foreground">
          {MODE_LABELS[focusMode]} · {durationStr} Min
        </p>
      </div>

      <div className="w-full max-w-3xl grid gap-6 md:grid-cols-2">
        {/* Donut chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Schicht-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={donutConfig} className="mx-auto h-[220px] w-[220px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {(['flow', 'bewusst', 'achtung', 'limit'] as const).map((layer) => (
                <div key={layer} className="flex items-center gap-2 text-xs">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: LAYER_COLORS[layer] }}
                  />
                  <span className="text-muted-foreground">{LAYER_LABELS[layer]}</span>
                  <span className="ml-auto text-foreground font-mono font-medium tabular-nums">
                    {Math.round(zonePercentages[layer])}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Zusammenfassung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatRow label="Dauer" value={`${durationStr} Min`} />
            <StatRow label="Gute Haltung" value={`${Math.round(zonePercentages.flow)}%`} highlight />
            <StatRow label="Längste Serie" value={`${Math.floor(maxFlowStreak)}s am Stück`} highlight />
            {typeof anchorPoints === 'number' && (
              <StatRow label="Ankerpunkte" value={`${anchorPoints}`} highlight />
            )}
            {typeof anchorPoints === 'number' && (
              <div className="text-xs text-muted-foreground -mt-2 pl-1">
                Je 5 Sekunden blau = 1 Ankerpunkt
              </div>
            )}
            {isNewRecord && (
              <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-center animate-pulse">
                <span className="text-amber-400 text-sm font-semibold">🏆 Neuer persönlicher Rekord!</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline chart */}
      {tensionTimeline.length > 0 && (
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Spannungsverlauf</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={timelineConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tensionTimeline}>
                  <defs>
                    <linearGradient id="tensionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={LAYER_COLORS.flow} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={LAYER_COLORS.flow} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="t"
                    tickFormatter={(v: number) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`}
                    stroke="#5a6a7a"
                    fontSize={10}
                  />
                  <YAxis domain={[0, 100]} stroke="#5a6a7a" fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="tension"
                    stroke={LAYER_COLORS.flow}
                    fill="url(#tensionGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={goToSession}
        >
          <RotateCcw className="size-4" />
          Wiederholen
        </Button>
        <Button
          size="lg"
          className="gap-2 bg-sapphire hover:bg-sapphire-deep text-white"
          onClick={goHome}
        >
          <Home className="size-4" />
          Hauptmenü
        </Button>
      </div>
    </div>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-mono font-semibold tabular-nums ${highlight ? 'text-sapphire-light' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}
