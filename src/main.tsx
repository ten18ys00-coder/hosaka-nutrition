import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { IS_WEB } from './config';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// ホーム画面に追加したときにアプリとして起動・圏外でも起動できるようにする（独立アプリ版のみ）
if (IS_WEB && 'serviceWorker' in navigator && window.isSecureContext && window.self === window.top) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
