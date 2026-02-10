import { useEffect, useState } from 'react'
import api from './lib/api'

function App() {
  const [status, setStatus] = useState('Testing...')

  useEffect(() => {
    api.get('/api/test')
      .then(() => setStatus('✅ Connected to Laravel!'))
      .catch(() => setStatus('❌ Connection failed'))
  }, [])

  return <div><h1>{status}</h1></div>
}

export default App
