import { useState } from 'react'
import { NewApp } from './components/next'
import ToteOrganizer from './components/ToteOrganizer'

function App() {
  const [useLegacyApp, setUseLegacyApp] = useState(false)

  if (useLegacyApp) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setUseLegacyApp(false)}
          className="fixed right-4 top-4 z-50 rounded-full bg-black/80 px-4 py-2 text-xs font-semibold text-white shadow-lg"
        >
          Switch to New UI
        </button>
        <ToteOrganizer />
      </div>
    )
  }

  return <NewApp onOpenLegacy={() => setUseLegacyApp(true)} />
}

export default App
