import { usePoseStore } from '@/store/pose-store'
import type { InstrumentMeta } from '@/core/types'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const INSTRUMENTS: InstrumentMeta[] = [
  {
    id: 'violin',
    name: 'Violine',
    icon: '🎻',
    description: 'Haltungsanalyse für Geiger',
    modes: ['violin', 'wrist', 'shoulder'],
  },
]

export function HomeScreen() {
  const goToSetup = usePoseStore((s) => s.goToSetup)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-12 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-sapphire-light">
          ⚓ Blue Anchor
        </h1>
        <p className="text-lg text-muted-foreground">
          KI-Haltungsanalyse
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 max-w-3xl w-full">
        {INSTRUMENTS.map((instrument, index) => (
          <InstrumentCard
            key={instrument.id}
            instrument={instrument}
            index={index}
            onClick={() => goToSetup(instrument.id)}
          />
        ))}
      </div>
    </div>
  )
}

function InstrumentCard({
  instrument,
  index,
  onClick,
}: {
  instrument: InstrumentMeta
  index: number
  onClick: () => void
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:ring-sapphire/50 hover:bg-card/80 hover:shadow-[0_0_30px_rgba(33,150,243,0.15)] animate-[card-enter_0.5s_ease-out_both]"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={onClick}
    >
      <CardHeader>
        <div className="text-5xl mb-2">{instrument.icon}</div>
        <CardTitle className="text-xl text-foreground">{instrument.name}</CardTitle>
        <CardDescription>{instrument.description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
