
import { GoogleGenAI } from "@google/genai";

/**
 * Recupera a API Key de forma robusta, tentando todas as fontes possíveis
 * em ambientes Vite, Vercel e Browser.
 */
export const getApiKey = (): string => {
  // 1. Tenta via import.meta.env (Padrão Vite)
  const metaEnv = (import.meta as any).env || {};
  if (metaEnv.VITE_API_KEY) return metaEnv.VITE_API_KEY;
  if (metaEnv.VITE_GOOGLE_GENERATIVE_AI_API_KEY) return metaEnv.VITE_GOOGLE_GENERATIVE_AI_API_KEY;
  
  // 2. Tenta via process.env (Node/Polyfill)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }

  // 3. Tenta via window.process (Fallback do nosso index.tsx)
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.process?.env?.API_KEY) return win.process.env.API_KEY;
  }

  return '';
};

/**
 * Cria uma instância do cliente Gemini com tratamento de erro prévio.
 */
export const createAIClient = () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  return new GoogleGenAI({ apiKey });
};
