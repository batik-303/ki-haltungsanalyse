import { useRef, useState, useEffect } from 'react'
import { usePoseStore } from './store/pose-store'
import { HomeScreen } from './components/screens/home-screen'
import { SetupScreen } from './components/screens/setup-screen'
import { SessionScreen } from './components/screens/session-screen'
import { ResultsScreen } from './components/screens/results-screen'

type ScreenKey = 'home' | 'setup' | 'session' | 'results'

const SCREEN_MAP: Record<ScreenKey, () => JSX.Element> = {
  home: HomeScreen,
  setup: SetupScreen,
  session: SessionScreen,
  results: ResultsScreen,
}

const TRANSITION_DURATION = 200

export default function App() {
  const appScreen = usePoseStore((s) => s.appScreen)
  const [exitingScreen, setExitingScreen] = useState<ScreenKey | null>(null)
  const prevScreenRef = useRef<ScreenKey>(appScreen)
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      prevScreenRef.current = appScreen
      return
    }

    if (appScreen === prevScreenRef.current) return

    setExitingScreen(prevScreenRef.current)
    prevScreenRef.current = appScreen

    const timer = setTimeout(() => {
      setExitingScreen(null)
    }, TRANSITION_DURATION)

    return () => clearTimeout(timer)
  }, [appScreen])

  const EnteringComponent = SCREEN_MAP[appScreen]
  const ExitingComponent = exitingScreen ? SCREEN_MAP[exitingScreen] : null
  const isTransitioning = exitingScreen !== null

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden' }}>
      {ExitingComponent && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            animation: `page-exit ${TRANSITION_DURATION}ms ease-out both`,
            pointerEvents: 'none',
          }}
        >
          <ExitingComponent />
        </div>
      )}

      <div
        style={{
          minHeight: '100dvh',
          animation: isTransitioning
            ? `page-enter ${TRANSITION_DURATION}ms ease-out both`
            : undefined,
        }}
      >
        <EnteringComponent />
      </div>
    </div>
  )
}
