import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Emergency Error Logger to prevent blank pages without feedback
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global Error caught:', { message, source, lineno, colno, error });
  const root = document.getElementById('root');
  // Only show error UI if the app hasn't rendered or has crashed visibly
  if (root && (root.innerHTML === '' || root.dataset.crashed === 'true')) {
    root.dataset.crashed = 'true';
    root.innerHTML = `
      <div style="padding: 20px; color: #ff4444; font-family: 'Plus Jakarta Sans', sans-serif; background: #020617; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
        <h1 style="font-size: 24px; margin-bottom: 10px; color: white; font-weight: 800; text-transform: uppercase;">System Failure</h1>
        <p style="opacity: 0.7; max-width: 400px; line-height: 1.5; color: #94a3b8; font-size: 14px;">The brainstorming engine encountered a critical logic loop. Please refresh to reset the state.</p>
        <div style="margin: 20px 0; padding: 10px; background: rgba(255,0,0,0.1); border-radius: 8px; font-family: monospace; font-size: 10px; color: #f87171; max-width: 80vw; overflow-x: auto;">
          ${message}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 32px; background: linear-gradient(135deg, #c084fc, #f472b6); border: none; border-radius: 16px; color: white; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 0.1em; transition: transform 0.2s;">Force Reload</button>
      </div>
    `;
  }
  return false;
};

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('Initial render failed:', err);
    // Trigger the global error handler manually if catch blocks it
    window.onerror?.('Render process crashed. Check console for details.', '', 0, 0, err as Error);
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('ServiceWorker registered with scope:', reg.scope);
    }).catch(err => {
      console.debug('ServiceWorker registration failed: ', err);
    });
  });
}