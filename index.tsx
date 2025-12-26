
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// Chave de emergência para garantir boot do sistema
const FALLBACK_KEY = "AIzaSyC_seyhcmY1cKurGlH2qq_aB6fugcTkePc";

// --- POLYFILL ROBUSTO PARA PROCESS.ENV ---
// Garante que bibliotecas que dependem de process.env não quebrem no navegador.
if (typeof window !== 'undefined') {
  const env = (import.meta as any).env || {};
  
  // Captura a chave prioritariamente do VITE_API_KEY, ou usa o Fallback
  const apiKey = env.VITE_API_KEY || 
                 env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || 
                 env.API_KEY || 
                 FALLBACK_KEY;

  const processEnv = {
    ...((window as any).process?.env || {}),
    NODE_ENV: env.MODE || 'production',
    API_KEY: apiKey,
    VITE_API_KEY: apiKey // Redundância para garantir compatibilidade
  };

  (window as any).process = {
    env: processEnv
  };

  // Log de Diagnóstico (Apenas no Console)
  console.log(`[System] Booting Atena v2.1.0`);
  console.log(`[System] Environment: ${env.MODE || 'production'}`);
  
  if (apiKey === FALLBACK_KEY) {
     console.log(`[System] ⚠️ Usando chave de recuperação interna (Hardcoded).`);
  } else if (apiKey) {
    console.log(`[System] ✅ API Key detectada via Variáveis de Ambiente.`);
  } else {
    console.warn(`[System] ⚠️ Nenhuma API Key detectada.`);
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
