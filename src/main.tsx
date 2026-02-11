import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './react/App';

// 🐛 DEBUG: Проверяем загрузку
console.log('=== APP LOADED - VERSION TEST ===');
console.log('Current time:', new Date().toISOString());

// ✅ BrowserLogger только для DEV режима — НЕ блокирует production
if (import.meta.env.DEV) {
  import('./utils/BrowserLogger').then(({ browserLogger }) => {
    browserLogger.startIntercepting();
    console.log('💡 Use downloadLogs() in console to download logs');
    console.log('💡 Use clearLogs() in console to clear logs');
    console.log('💡 Use getLogCount() in console to get log count');
  });
}

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
