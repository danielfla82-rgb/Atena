
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- POLYFILL PARA PROCESS.ENV (CRÍTICO PARA VERCEL/VITE) ---
// O SDK do Google e algumas libs esperam 'process.env', que não existe no browser.
// Isso evita a tela preta "Uncaught ReferenceError: process is not defined".
if (typeof window !== 'undefined' && typeof process === 'undefined') {
  (window as any).process = {
    env: {
      // Mapeia automaticamente variáveis VITE_ para process.env.API_KEY
      // No Vercel, defina a variável como VITE_API_KEY ou VITE_GOOGLE_GENERATIVE_AI_API_KEY
      API_KEY: (import.meta as any).env?.VITE_API_KEY || 
               (import.meta as any).env?.VITE_GOOGLE_GENERATIVE_AI_API_KEY || 
               ''
    }
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);