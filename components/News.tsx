import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Newspaper, ExternalLink, RefreshCw, Globe, AlertTriangle, Radio, ShieldAlert, CheckCircle2 } from 'lucide-react';

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

  // Dados Estáticos de Fallback
  const STATIC_BRIEFING = `
### Panorama Estratégico (Modo de Segurança)

**Atenção:** O sistema de Inteligência Artificial está operando em modo restrito (API não ativada ou Chave Inválida). Exibindo dados de referência para ${config.targetRole}.

## 1. Perfil da Banca (Tendência Geral)
*   **Português:** Foco em interpretação de texto complexa e reescrita de frases. A gramática é cobrada de forma contextual.
*   **Direito Constitucional:** Jurisprudência do STF tem peso muito alto (Repercussão Geral e Súmulas Vinculantes).
*   **Raciocínio Lógico:** Ênfase em lógica de argumentação e análise combinatória.

## 2. Tópicos de Alta Incidência (Histórico)
*   Atos Administrativos (Vícios e Anulação).
*   Controle de Constitucionalidade (Concentrado vs Difuso).
*   Licitações (Lei 14.133/21 - Foco nas novas modalidades).

## 3. Dica de Preparação
Aumente a carga horária em **resolução de questões** e reduza a leitura passiva de teoria. O momento exige prática deliberada.
  `;

  const fetchNews = async () => {
    setLoading(true);
    setBriefing("");
    setSources([]);
    setErrorDetail(null);
    setMode('live');
    
    const ai = createAIClient();

    try {
      const promptLive = `
        Atue como Analista de Inteligência de Concursos (Alvo: ${config.targetRole}).
        Faça uma varredura nas últimas notícias sobre este concurso ou área.
        Busque: Movimentações de bancas, autorizações, boatos políticos e editais recentes.
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
      if (!text) throw new Error("Resposta vazia da IA");
      
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

    } catch (error: any) {
      console.warn("Falha no Google Search (Live Mode).", error);
      const errStr = JSON.stringify(error);
      
      if (errStr.includes("SERVICE_DISABLED") || errStr.includes("Generative Language API has not been used") || errStr.includes("API_KEY") || error.status === 403) {
          setMode('demo');
          setBriefing(STATIC_BRIEFING);
          setLastUpdate(new Date().toLocaleTimeString());
          setErrorDetail("⚠️ API Google Cloud não ativada ou Chave Incorreta.");
      } else {
          setMode('offline');
          try {
              const promptFallback = `
                Atue como Mentor de Concursos para o cargo: ${config.targetRole}.
                Como não conseguimos acessar as notícias em tempo real agora, forneça um:
                "Panorama Estratégico Atemporal"
                1. O que geralmente é cobrado para este cargo?
                2. Qual o perfil das bancas mais prováveis?
                3. Dicas de preparação de longo prazo.
                Formato: Markdown.
              `;
              
              const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: promptFallback
              });

              setBriefing(fallbackResponse.text || "Sem dados disponíveis.");
              setLastUpdate(new Date().toLocaleTimeString());
              
          } catch (fallbackError: any) {
              setMode('demo');
              setBriefing(STATIC_BRIEFING);
              setErrorDetail("Erro total de conexão com a IA.");
          }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Enhanced Markdown Renderer
  const renderNewsText = (text: string) => {
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
  };

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
              
              <div className="flex items-center justify-between mb-6 z-10 relative">
                  <h3 className="text-cyan-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${loading ? 'bg-slate-500' : mode === 'live' ? 'bg-green-500 animate-pulse' : mode === 'offline' ? 'bg-amber-500' : 'bg-red-500'}`}></span> 
                      {loading ? 'Sincronizando Satélite...' : mode === 'live' ? 'Conexão Viva (Live Web)' : mode === 'offline' ? 'Modo Offline (Base Interna)' : 'Modo Demonstração (Estático)'}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">{lastUpdate}</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar z-10 pr-2">
                  {loading ? (
                      <div className="space-y-4 animate-pulse mt-8">
                          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                          <div className="h-4 bg-slate-800 rounded w-full"></div>
                          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                      </div>
                  ) : briefing ? (
                      <div className="text-sm md:text-base">
                          {mode === 'offline' && (
                              <div className="mb-4 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg text-amber-200 text-xs flex items-center gap-2">
                                  <Radio size={14} />
                                  <span>O acesso em tempo real à web foi interrompido. Exibindo análise estratégica baseada em dados históricos.</span>
                              </div>
                          )}
                          {mode === 'demo' && (
                              <div className="mb-4 p-4 bg-red-900/20 border border-red-500/20 rounded-xl text-red-200 text-xs flex flex-col gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 font-bold text-sm mb-1"><ShieldAlert size={16} /> Conexão IA Interrompida</div>
                                    <p className="text-slate-300">
                                      Possíveis causas:
                                      <br/>1. API "Generative Language" desativada no Google Cloud.
                                      <br/>2. Nome da variável incorreto no Vercel (Deve ser <strong>VITE_API_KEY</strong>).
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                      <a href="https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors">
                                          1. Conferir Console Google
                                      </a>
                                      <button onClick={fetchNews} className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg shadow-red-900/20">
                                          <CheckCircle2 size={14} /> 2. Tentar Novamente
                                      </button>
                                  </div>
                              </div>
                          )}
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
                          <Globe size={32} className="mb-2 text-slate-700"/>
                          <p className="text-xs text-center italic">Nenhuma fonte externa indexada nesta varredura.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};