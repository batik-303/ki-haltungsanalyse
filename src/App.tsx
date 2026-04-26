import { usePoseStore } from './store/pose-store'
import { HomeScreen } from './components/screens/home-screen'
import { SetupScreen } from './components/screens/setup-screen'
import { SessionScreen } from './components/screens/session-screen'
import { ResultsScreen } from './components/screens/results-screen'

export default function App() {
  const appScreen = usePoseStore((s) => s.appScreen)

  switch (appScreen) {
    case 'home':
      return <HomeScreen />
    case 'setup':
      return <SetupScreen />
    case 'session':
      return <SessionScreen />
    case 'results':
      return <ResultsScreen />
  }
}
