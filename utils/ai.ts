import { GoogleGenAI } from "@google/genai";

/**
 * Recupera a API Key.
 * Tenta obter via variáveis de ambiente (Vite) e usa uma chave de fallback se falhar.
 */
export const getApiKey = (): string => {
  // Chave fornecida manualmente para garantir funcionamento imediato
  const FALLBACK_KEY = 'AIzaSyC_seyhcmY1cKurGlH2qq_aB6fugcTkePc';

  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const key1 = import.meta.env.VITE_API_KEY;
      // @ts-ignore
      const key2 = import.meta.env.VITE_GEMINI_API_KEY;

      if (key1 && typeof key1 === 'string' && key1.length > 10) {
        console.log("[AI] Usando VITE_API_KEY do ambiente.");
        return key1;
      }
      if (key2 && typeof key2 === 'string' && key2.length > 10) {
        console.log("[AI] Usando VITE_GEMINI_API_KEY do ambiente.");
        return key2;
      }
    }
  } catch (e) {
    console.warn("Erro ao acessar variáveis de ambiente:", e);
  }

  console.log("[AI] Variáveis de ambiente ausentes. Usando chave de Fallback.");
  return FALLBACK_KEY;
};

/**
 * MOCK CLIENT IMPLEMENTATION
 * Usado apenas se, por algum motivo, a chave for string vazia.
 */
class MockGenerativeModel {
    async generateContent(params: any) {
        console.warn("[AI Mock] Gerando resposta simulada.");
        const prompt = JSON.stringify(params).toLowerCase();
        
        if (params.config?.responseMimeType === 'application/json') {
            if (prompt.includes('nietzsche')) {
                return {
                    text: JSON.stringify({
                        aphorism: "O que não me mata me fortalece.",
                        source: "Modo Demo",
                        interpretation: "A adversidade é o combustível da grandeza."
                    })
                };
            }
            return {
                text: JSON.stringify({
                    overallCoverage: 50,
                    passingProbability: 20,
                    readinessScore: "MODO DEMO",
                    disciplines: [],
                    missingDisciplines: [],
                    strategicInsight: "Modo de demonstração ativo."
                })
            };
        }
        return { text: "Resposta simulada do sistema (Modo Demo)." };
    }
}

class MockChatSession {
    async sendMessage(params: any) {
        return { text: "Estou em modo de demonstração. Verifique sua conexão ou API Key." };
    }
}

class MockGoogleGenAI {
    get models() { return new MockGenerativeModel(); }
    get chats() { return { create: () => new MockChatSession() }; }
}

export const createAIClient = () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("⚠️ [System] Nenhuma API Key disponível. Usando Mock.");
    return new MockGoogleGenAI() as unknown as GoogleGenAI;
  }
  
  return new GoogleGenAI({ apiKey });
};