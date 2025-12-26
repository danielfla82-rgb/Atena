
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { GoogleGenAI } from "@google/genai";
import { Newspaper, ExternalLink, Loader2, RefreshCw, Globe, AlertTriangle } from 'lucide-react';

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

  const fetchNews = async () => {
    setLoading(true);
    setBriefing("");
    setSources([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Atue como um analista de inteligência de concursos públicos.
        Faça uma varredura na web por notícias RECENTES (últimas 4 semanas) sobre concursos para o cargo: ${config.targetRole}.
        Foco: Publicação de editais, escolha de bancas, autorizações, suspensões ou movimentações políticas relevantes no Brasil.
        
        Saída: Escreva um "Briefing Tático" curto e direto em Markdown.
        - Use Bullet Points para listar os fatos.
        - Destaque entidades importantes em **negrito**.
        - Se não houver notícias urgentes nesta semana, forneça um panorama geral.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', 
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
      });

      // 1. Get the text summary
      const text = response.text || "Sem dados de inteligência disponíveis no momento.";
      setBriefing(text);

      // 2. Extract sources from Grounding Metadata
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

    } catch (error) {
      console.error("News fetch error", error);
      setBriefing("Erro na conexão com o satélite de notícias. Verifique sua conexão ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Formatter for News Briefing
  const renderNewsText = (text: string) => {
    return text.split('\n').map((line, index) => {
        // Parse inline bold
        const parseInline = (lineText: string) => {
            const parts = lineText.split(/\*\*(.*?)\*\*/g);
            return parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i} className="text-cyan-400 font-bold">{part}</strong> : part
            );
        };

        if (line.startsWith('### ')) return <h3 key={index} className="text-lg font-bold text-white mt-4 mb-2">{parseInline(line.replace('### ', ''))}</h3>;
        if (line.startsWith('## ')) return <h2 key={index} className="text-xl font-bold text-white mt-5 mb-3 border-b border-slate-700 pb-1">{parseInline(line.replace('## ', ''))}</h2>;
        
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
                <li key={index} className="text-slate-300 ml-4 mb-2 list-disc marker:text-cyan-500 pl-2 leading-relaxed">
                    {parseInline(line.replace(/^[-*]\s/, ''))}
                </li>
            );
        }
        
        if (!line.trim()) return <div key={index} className="h-2"></div>;

        return <p key={index} className="text-slate-300 mb-2 leading-relaxed">{parseInline(line)}</p>;
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 h-full flex flex-col">
       <div className="flex justify-between items-center border-b border-slate-800 pb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Newspaper className="text-cyan-500" /> 
            Radar de Inteligência
          </h1>
          <p className="text-slate-400 mt-1">
            Alvo: <span className="text-emerald-400 font-bold uppercase tracking-wider">{config.targetRole}</span>
          </p>
        </div>
        <button 
            onClick={fetchNews} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm border border-slate-700"
        >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Varrendo..." : "Atualizar Radar"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
          
          {/* Main Briefing Column */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Globe size={120} />
              </div>
              
              <h3 className="text-cyan-500 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2 z-10">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                  Briefing Tático • {lastUpdate || '--:--'}
              </h3>

              <div className="flex-1 overflow-y-auto custom-scrollbar z-10 pr-2">
                  {loading ? (
                      <div className="space-y-4 animate-pulse mt-8">
                          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                          <div className="h-4 bg-slate-800 rounded w-full"></div>
                          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                          <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                      </div>
                  ) : briefing ? (
                      <div className="text-sm md:text-base">
                           {renderNewsText(briefing)}
                      </div>
                  ) : (
                       <div className="flex flex-col items-center justify-center h-full text-slate-500">
                           <AlertTriangle size={48} className="mb-4 opacity-20"/>
                           <p>Sem dados. Inicie uma varredura.</p>
                       </div>
                  )}
              </div>
          </div>

          {/* Sources Column */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col h-full overflow-hidden">
              <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                  <ExternalLink size={14} /> Fontes Verificadas
              </h3>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                  {loading ? (
                      <div className="text-center py-10 text-slate-600 text-xs">Validando fontes...</div>
                  ) : sources.length > 0 ? (
                      sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 p-4 rounded-xl transition-all group"
                          >
                              <div className="flex justify-between items-start">
                                  <span className="text-[10px] font-bold text-cyan-600 uppercase mb-1 block">
                                      {source.domain}
                                  </span>
                                  <ExternalLink size={12} className="text-slate-600 group-hover:text-cyan-400" />
                              </div>
                              <h4 className="text-sm font-medium text-slate-300 group-hover:text-white line-clamp-2 leading-snug">
                                  {source.title}
                              </h4>
                          </a>
                      ))
                  ) : (
                      <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-xl">
                          <p className="text-slate-600 text-xs px-4">
                              Nenhuma fonte direta retornada pelo Google Search para este resumo.
                          </p>
                      </div>
                  )}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-center text-slate-600">
                  Dados fornecidos por Google Search Grounding
              </div>
          </div>

      </div>
    </div>
  );
};
