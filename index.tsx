import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- POLYFILL PARA PROCESS.ENV (CRÍTICO PARA VERCEL/VITE) ---
// O SDK do Google e algumas libs esperam 'process.env', que não existe no browser.
if (typeof window !== 'undefined') {
  const env = (import.meta as any).env || {};
  
  // Tenta capturar a chave de várias formas possíveis
  const apiKey = env.VITE_API_KEY || 
                 env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || 
                 env.API_KEY || // Caso raro de estar exposto sem prefixo
                 '';

  (window as any).process = {
    env: {
      ...((window as any).process?.env || {}),
      NODE_ENV: env.MODE || 'production',
      API_KEY: apiKey
    }
  };

  // Log de Debug (Seguro: mostra apenas se existe ou não)
  if (!apiKey) {
    console.warn("⚠️ ATENÇÃO: API_KEY não encontrada. Verifique as Variáveis de Ambiente no Vercel (deve começar com VITE_API_KEY).");
  } else {
    console.log("✅ API Key carregada com sucesso.");
  }
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