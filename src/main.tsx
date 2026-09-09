import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (Capacitor.isNativePlatform()) {
  void StatusBar.setStyle({ style: Style.Dark })
  void StatusBar.setBackgroundColor({ color: '#07080d' })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
