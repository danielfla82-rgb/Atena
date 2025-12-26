
import { GoogleGenAI } from "@google/genai";

// Chave de emergência fornecida para garantir o funcionamento imediato
const FALLBACK_KEY = "AIzaSyC_seyhcmY1cKurGlH2qq_aB6fugcTkePc";

/**
 * Recupera a API Key de forma robusta, tentando todas as fontes possíveis.
 * Prioridade:
 * 1. Variável de Ambiente VITE_ (Vercel/Local)
 * 2. Variável process.env (Node)
 * 3. Chave Fallback (Hardcoded)
 */
export const getApiKey = (): string => {
  // 1. Tenta via import.meta.env (Padrão Vite)
  const metaEnv = (import.meta as any).env || {};
  
  // Verifica variáveis com prefixo VITE_ (Recomendado para Vercel)
  if (metaEnv.VITE_API_KEY) return metaEnv.VITE_API_KEY;
  if (metaEnv.VITE_GOOGLE_GENERATIVE_AI_API_KEY) return metaEnv.VITE_GOOGLE_GENERATIVE_AI_API_KEY;
  
  // Verifica variáveis sem prefixo (caso tenham sido expostas manualmente no vite config)
  if (metaEnv.API_KEY) return metaEnv.API_KEY;
  if (metaEnv.GOOGLE_API_KEY) return metaEnv.GOOGLE_API_KEY;

  // 2. Tenta via process.env (Node/Polyfill)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }

  // 3. Tenta via window.process (Fallback do index.tsx)
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.process?.env?.API_KEY) return win.process.env.API_KEY;
  }

  // 4. Retorna a chave direta para destravar o app agora
  return FALLBACK_KEY;
};

/**
 * Cria uma instância do cliente Gemini com tratamento de erro prévio.
 */
export const createAIClient = () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("CRITICAL: API Key not found anywhere.");
    throw new Error("MISSING_API_KEY");
  }

  return new GoogleGenAI({ apiKey });
};
