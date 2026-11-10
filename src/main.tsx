import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/instrument-sans/400'
import '@fontsource/instrument-sans/500'
import '@fontsource/instrument-sans/600'
import '@fontsource/spline-sans-mono/400'
import '@fontsource/spline-sans-mono/600'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
