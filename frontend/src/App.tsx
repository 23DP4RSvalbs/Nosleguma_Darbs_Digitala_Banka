import { HomePage } from './components/HomePage'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      <Navigation />
      <main>
        <HomePage />
      </main>
      <Footer />
    </div>
  )
}

export default App
