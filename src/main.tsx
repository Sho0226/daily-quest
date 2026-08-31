import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// iOS Safari evicts script-written storage after 7 days without a visit. A PWA added to
// the home screen is exempt, but ask anyway — the monthly export is the real backstop.
if (navigator.storage?.persist) {
  void navigator.storage.persist()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
