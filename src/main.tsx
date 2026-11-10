import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/archivo/400'
import '@fontsource/archivo/500'
import '@fontsource/archivo/600'
import '@fontsource/archivo/700'
import '@fontsource/archivo/800'
import '@fontsource/chivo-mono/400'
import '@fontsource/chivo-mono/500'
import '@fontsource/chivo-mono/600'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
