import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- CONFIGURAÇÃO DE AMBIENTE ---
if (typeof window !== 'undefined') {
  console.log(`[System] Booting Atena v4.0.0 (Olympus Edition)`);
  
  let envDetected = false;
  
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const k1 = import.meta.env.VITE_API_KEY;
      // @ts-ignore
      const k2 = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (k1 || k2) {
        envDetected = true;
      }
    }
  } catch (e) {
    // Ignora erro de acesso ao env
  }

  if (envDetected) {
    console.log(`[System] ✅ Variáveis de ambiente detectadas.`);
  } else {
    console.log(`[System] ℹ️ Usando chave de fallback ou modo manual.`);
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