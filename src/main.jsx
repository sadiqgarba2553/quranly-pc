import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './desktop.css'
import './uniform.css'
import './liquid-glass.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Register Service Worker for PWA & iOS Safari installability
if (!window.quranlyDesktop && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/quranly/sw.js', { scope: '/quranly/' }).catch((err) => {
      console.log('SW registration note:', err);
    });
  });
}


