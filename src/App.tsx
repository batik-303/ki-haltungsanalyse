import { CameraView } from './components/camera-view'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-8 gap-4">
      <h1 className="text-xl font-bold tracking-wide text-sapphire-light">
        ⚓ Blue Anchor – KI-Haltungsanalyse
      </h1>
      <CameraView />
    </div>
  )
}
