import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { initOneSignal } from './lib/notifications';

// Register Service Worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

// OneSignal is initialized via script in index.html


// Prevent pinch-to-zoom gestures on mobile devices
if (typeof document !== 'undefined') {
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
