
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- GLOBAL ERROR TRAP ---
// Captura erros síncronos fora da árvore do React
window.onerror = function(message, source, lineno, colno, error) {
  showFatalError(`Erro de Script: ${message}\nOrigem: ${source}:${lineno}`);
  console.error("Global Error:", error);
};

// --- PROMISE REJECTION TRAP ---
// Captura erros assíncronos (como falhas no Supabase ou Imports)
window.onunhandledrejection = function(event) {
  showFatalError(`Erro Assíncrono: ${event.reason?.message || event.reason}`);
  console.error("Unhandled Rejection:", event.reason);
};

// --- MOUNT TIMEOUT WATCHDOG ---
// Se o React não montar em 3 segundos, assumimos que travou silenciosamente (tela preta)
setTimeout(() => {
    const root = document.getElementById('root');
    if (root && (!root.hasChildNodes() || root.innerHTML === '')) {
        showFatalError("Timeout de Inicialização: O aplicativo demorou muito para renderizar. Verifique o console (F12) para erros de módulo.");
    }
}, 3500);

function showFatalError(details: string) {
  const root = document.getElementById('root');
  if (root) {
    // Só sobrescreve se ainda não tiver conteúdo útil
    if (!root.innerHTML.includes("sidebar")) {
        root.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; padding:20px; background:#020617; color:#ef4444; font-family:sans-serif; text-align:center;">
            <div style="background:#ef444420; padding:20px; rounded:50%; margin-bottom:20px; border-radius:50%;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h1 style="font-size:24px; font-weight:bold; margin-bottom:10px; color:white;">Falha na Inicialização</h1>
            <p style="color:#94a3b8; max-width:500px; margin-bottom:20px;">O sistema encontrou um erro crítico antes de carregar a interface.</p>
            <pre style="background:#0f172a; padding:15px; border-radius:8px; border:1px solid #1e293b; color:#ef4444; font-size:12px; overflow:auto; max-width:100%; text-align:left;">${details}</pre>
            <button onclick="window.location.reload()" style="margin-top:20px; padding:12px 24px; background:#059669; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Tentar Novamente</button>
          </div>
        `;
    }
  }
}

// --- CONFIGURAÇÃO DE AMBIENTE ---
if (typeof window !== 'undefined') {
  console.log(`[System] Booting Atena v4.0.0 (Titan Prime)`);
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
