import { GoogleGenAI } from "@google/genai";

// Chave fornecida pelo usuário para uso imediato
const HARDCODED_API_KEY = "AIzaSyCHa0-nBDcxi5_wRE3pKXuur8_jpsamSeI";

/**
 * Recupera a API Key de forma segura.
 * Prioridade:
 * 1. Variável de Ambiente (VITE_API_KEY)
 * 2. LocalStorage (Configurado via UI)
 * 3. Hardcoded (Fallback para desenvolvimento rápido)
 */
export const getApiKey = (): string => {
  try {
    // 1. Tenta Env Var
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const key1 = import.meta.env.VITE_API_KEY;
      // @ts-ignore
      const key2 = import.meta.env.VITE_GEMINI_API_KEY;

      if (key1 && typeof key1 === 'string' && key1.length > 10) return key1;
      if (key2 && typeof key2 === 'string' && key2.length > 10) return key2;
    }

    // 2. Tenta LocalStorage (Configuração do Usuário na UI)
    if (typeof window !== 'undefined') {
        const localKey = localStorage.getItem('atena_api_key');
        if (localKey && localKey.length > 10) return localKey;
    }

    // 3. Fallback Hardcoded
    if (HARDCODED_API_KEY && HARDCODED_API_KEY.length > 10) {
        return HARDCODED_API_KEY;
    }

  } catch (e) {
    console.error("[AI] Erro ao recuperar credenciais.");
  }

  return "";
};

/**
 * MOCK CLIENT IMPLEMENTATION
 * Ativado automaticamente se a chave não for encontrada.
 */
class MockGenerativeModel {
    async generateContent(params: any) {
        console.warn("[AI Mock] Chave API não encontrada. Usando resposta simulada.");
        const prompt = JSON.stringify(params).toLowerCase();
        
        // Simulação de delay para realismo
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (params.config?.responseMimeType === 'application/json') {
            if (prompt.includes('nietzsche')) {
                return {
                    text: JSON.stringify({
                        aphorism: "Onde falta a chave, falta o poder.",
                        source: "Sistema Atena",
                        interpretation: "Configure sua **Google API Key** nas configurações (engrenagem) para ativar a inteligência real."
                    })
                };
            }
            // Mock genérico para Edital/Diagnóstico
            return {
                text: JSON.stringify({
                    overallCoverage: 0,
                    passingProbability: 0,
                    readinessScore: "IA DESATIVADA",
                    disciplines: [],
                    missingDisciplines: [],
                    strategicInsight: "Por favor, insira sua Google API Key nas configurações (ícone de engrenagem no Dashboard) para ativar a análise de inteligência."
                })
            };
        }
        return { text: "⚠️ Modo Demonstração: Configure a API Key nas configurações (engrenagem) para ativar a IA real." };
    }
}

class MockChatSession {
    async sendMessage(params: any) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { text: "⚠️ IA Desativada. Vá em Configurações (Dashboard > Engrenagem) e insira sua Google API Key." };
    }
}

class MockGoogleGenAI {
    get models() { return new MockGenerativeModel(); }
    get chats() { return { create: () => new MockChatSession() }; }
}

export const createAIClient = () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("⚠️ [System] API KEY ausente. Alternando para Mock Client.");
    return new MockGoogleGenAI() as unknown as GoogleGenAI;
  }
  
  return new GoogleGenAI({ apiKey });
};