
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA functionality
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('새로운 버전이 있습니다.');
    // User can manually refresh or auto-refresh based on preferences
    // In production, you might want to show a user prompt
  },
  onOfflineReady() {
    console.log('앱이 오프라인 모드에서 사용 가능합니다.');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
