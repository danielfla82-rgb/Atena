import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Newspaper, ExternalLink, RefreshCw, Globe, AlertTriangle, Radio, ShieldAlert, CheckCircle2, SearchX } from 'lucide-react';

interface GroundingSource {
  title: string;
  url: string;
  domain: string;
}

export const News: React.FC = () => {
  const { config } = useStore();
  const [briefing, setBriefing] = useState<string>("");
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [mode, setMode] = useState<'live' | 'offline' | 'demo'>('live');

  // Dados Estáticos de Fallback (Último recurso)
  const STATIC_BRIEFING = `
### Panorama Estratégico (Modo de Segurança)

**Atenção:** O sistema não conseguiu conectar com a Inteligência Artificial (Cota Excedida ou Erro de Rede). Exibindo dados de referência estáticos para ${config.targetRole}.

## 1. Perfil da Banca (Tendência Geral)
*   **Português:** Foco em interpretação de texto complexa e reescrita de frases.
*   **Direito Constitucional:** Jurisprudência do STF tem peso muito alto.
*   **Raciocínio Lógico:** Ênfase em lógica de argumentação.

## 2. Recomendação
Verifique sua conexão ou a Chave de API nas configurações. Enquanto isso, foque em resolução de questões e revisão de lei seca.
  `;

  const fetchNews = async () => {
    setLoading(true);
    setBriefing("");
    setSources([]);
    setErrorDetail(null);
    setMode('live');
    
    const ai = createAIClient();

    try {
      // 1. TENTATIVA LIVE (Google Search)
      const promptLive = `
        Atue como Analista de Inteligência de Concursos (Alvo: ${config.targetRole}).
        Faça uma varredura nas últimas notícias sobre este concurso ou área.
        Busque: Movimentações de bancas, autorizações, boatos políticos e editais recentes.
        IMPORTANTE: Se não houver notícias desta semana, forneça um panorama do status atual do concurso.
        Formato: Briefing Tático em Markdown.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: promptLive,
        config: {
            tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text;
      if (!text) throw new Error("Resposta vazia da IA (Live)");
      
      setBriefing(text);

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const extractedSources: GroundingSource[] = [];
      const seenUrls = new Set();

      if (chunks) {
        chunks.forEach((chunk: any) => {
            if (chunk.web) {
                if (!seenUrls.has(chunk.web.uri)) {
                    seenUrls.add(chunk.web.uri);
                    extractedSources.push({
                        title: chunk.web.title || "Fonte Externa",
                        url: chunk.web.uri,
                        domain: new URL(chunk.web.uri).hostname.replace('www.', '')
                    });
                }
            }
        });
      }
      setSources(extractedSources);
      setLastUpdate(new Date().toLocaleTimeString());

    } catch (liveError: any) {
      console.warn("Falha no Google Search (Live Mode). Tentando Fallback Offline...", liveError);
      
      // Identificar erro de cota para mensagem adequada
      const errStr = JSON.stringify(liveError);
      const isQuota = errStr.includes("429") || liveError.status === 429;
      
      // 2. TENTATIVA OFFLINE (Base de Conhecimento do Modelo sem Search)
      setMode('offline');
      setSources([]); 
      
      try {
          const promptFallback = `
            Atue como Mentor de Concursos para o cargo: ${config.targetRole}.
            Como não conseguimos acessar as notícias em tempo real agora, forneça um:
            "Panorama Estratégico Baseado em Histórico"
            1. O que geralmente é cobrado para este cargo?
            2. Qual o perfil das bancas mais prováveis?
            3. Dicas de preparação de longo prazo.
            Formato: Markdown.
          `;
          
          // Tenta usar um modelo standard (sem search) para ver se passa
          // Se o 3-flash estiver com cota, talvez o 2.5-flash passe
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest',
            contents: promptFallback
          });

          if (!fallbackResponse.text) throw new Error("Resposta vazia no fallback");

          setBriefing(fallbackResponse.text);
          setLastUpdate(new Date().toLocaleTimeString());
          
          let msg = "Acesso à Web instável. Exibindo análise baseada no histórico interno da IA.";
          if (isQuota) msg = "Cota de busca (Search) excedida. Exibindo análise estratégica interna.";
          
          setErrorDetail(msg);

      } catch (fallbackError: any) {
          // 3. FALLBACK ESTÁTICO (Demo Mode - Falha Total)
          console.error("Falha total na IA.", fallbackError);
          setMode('demo');
          setBriefing(STATIC_BRIEFING);
          setLastUpdate(new Date().toLocaleTimeString());
          
          let msg = "Erro crítico de conexão com a IA.";
          if (isQuota || JSON.stringify(fallbackError).includes("429")) {
              msg = "Cota da API esgotada (429). Modo de Segurança Ativo.";
          } else if (errStr.includes("API_KEY")) {
              msg = "Chave de API inválida.";
          }
          
          setErrorDetail(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Enhanced Markdown Renderer (Memoized)
  const renderNewsText = useCallback((text: string) => {
    return text.split('\n').map((line, index) => {
        // Função para processar negrito (**texto**)
        const parseInline = (lineText: string) => {
            const parts = lineText.split(/\*\*(.*?)\*\*/g);
            return parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i} className="text-cyan-400 font-bold">{part}</strong> : part
            );
        };

        const trimmedLine = line.trim();

        // H3 (###)
        if (trimmedLine.startsWith('###')) {
             return <h3 key={index} className="text-lg font-bold text-white mt-6 mb-2 flex items-center gap-2"><div className="w-1 h-4 bg-cyan-500 rounded"></div>{parseInline(trimmedLine.replace(/^###\s*/, ''))}</h3>;
        }
        
        // H2 (##)
        if (trimmedLine.startsWith('##')) {
             return <h2 key={index} className="text-xl font-bold text-emerald-400 mt-6 mb-3 border-b border-slate-700 pb-2">{parseInline(trimmedLine.replace(/^##\s*/, ''))}</h2>;
        }

        // H1 (#) - Raro, mas tratado como H2 grande
        if (trimmedLine.startsWith('# ')) {
             return <h1 key={index} className="text-2xl font-black text-white mt-8 mb-4">{parseInline(trimmedLine.replace(/^#\s*/, ''))}</h1>;
        }

        // Listas (- ou *)
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
             return (
                <div key={index} className="flex gap-3 mb-2 ml-1">
                    <span className="text-cyan-500 mt-1.5 min-w-[6px] h-[6px] rounded-full bg-cyan-500 block"></span>
                    <p className="text-slate-300 leading-relaxed text-sm md:text-base flex-1">
                        {parseInline(trimmedLine.replace(/^[-*]\s*/, ''))}
                    </p>
                </div>
             );
        }

        // Espaço vazio
        if (!trimmedLine) return <div key={index} className="h-3"></div>;

        // Parágrafo Normal
        return <p key={index} className="text-slate-300 mb-2 leading-relaxed text-sm md:text-base">{parseInline(trimmedLine)}</p>;
    });
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 h-full flex flex-col">
       <div className="flex justify-between items-center border-b border-slate-800 pb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Newspaper className="text-cyan-500" /> Radar de Inteligência</h1>
          <p className="text-slate-400 mt-1">Alvo: <span className="text-emerald-400 font-bold uppercase tracking-wider">{config.targetRole}</span></p>
        </div>
        <button onClick={fetchNews} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm border border-slate-700"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />{loading ? "Varrendo..." : "Atualizar Radar"}</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Globe size={120} /></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 z-10 relative gap-2">
                  <h3 className="text-cyan-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${loading ? 'bg-slate-500' : mode === 'live' ? 'bg-green-500 animate-pulse' : mode === 'offline' ? 'bg-amber-500' : 'bg-red-500'}`}></span> 
                      {loading ? 'Sincronizando Satélite...' : mode === 'live' ? 'Conexão Viva (Live Web)' : mode === 'offline' ? 'Modo Offline (Base Interna)' : 'Modo Demonstração (Estático)'}
                  </h3>
                  {lastUpdate && <span className="text-[10px] text-slate-500 font-mono">Atualizado: {lastUpdate}</span>}
              </div>

              {errorDetail && mode !== 'live' && (
                  <div className={`mb-6 p-4 rounded-xl text-xs flex flex-col gap-2 z-10 relative
                      ${mode === 'demo' ? 'bg-red-900/20 border border-red-500/20 text-red-200' : 'bg-amber-900/20 border border-amber-500/20 text-amber-200'}
                  `}>
                      <div className="flex items-center gap-2 font-bold"><AlertTriangle size={16} /> Status do Sistema</div>
                      <p>{errorDetail}</p>
                      {mode === 'demo' && (
                          <div className="flex items-center gap-3 mt-2">
                              <a href="https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Verificar Console Google</a>
                          </div>
                      )}
                  </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar z-10 pr-2">
                  {loading ? (
                      <div className="space-y-4 animate-pulse mt-8">
                          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                          <div className="h-4 bg-slate-800 rounded w-full"></div>
                          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                      </div>
                  ) : briefing ? (
                      <div className="text-sm md:text-base">
                          {renderNewsText(briefing)}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500">
                          <p>Aguardando varredura...</p>
                      </div>
                  )}
              </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col h-full overflow-hidden">
              <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2"><ExternalLink size={14} /> Fontes Detectadas</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                  {loading ? <div className="text-center py-10 text-slate-600 text-xs">Validando...</div> : sources.length > 0 ? sources.map((source, idx) => (
                      <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 p-4 rounded-xl transition-all group">
                          <div className="flex justify-between items-start"><span className="text-[10px] font-bold text-cyan-600 uppercase mb-1 block">{source.domain}</span><ExternalLink size={12} className="text-slate-600 group-hover:text-cyan-400" /></div>
                          <h4 className="text-sm font-medium text-slate-300 group-hover:text-white line-clamp-2 leading-snug">{source.title}</h4>
                      </a>
                  )) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
                          {mode === 'offline' ? <SearchX size={32} className="mb-2 text-slate-700" /> : <Globe size={32} className="mb-2 text-slate-700"/>}
                          <p className="text-xs text-center italic max-w-[200px]">
                              {mode === 'offline' ? "Busca web indisponível. Exibindo análise interna." : "Nenhuma fonte externa indexada."}
                          </p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
