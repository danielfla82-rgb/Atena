
import React, { useState } from 'react';
import { useStore } from '../store';
import { GoogleGenAI } from "@google/genai";
import { 
  Lightbulb, Globe2, Brain, Swords, Zap, Loader2, 
  ScrollText, Trophy, GraduationCap, RefreshCw
} from 'lucide-react';

const ELITE_SOURCES = [
  {
    id: 'china',
    icon: <Globe2 size={24} className="text-red-500" />,
    title: 'Método Gaokao (China)',
    description: 'Foco extremo, repetição exaustiva e resistência mental.',
    promptContext: 'a elite estudantil chinesa que se prepara para o Gaokao. Foque em resistência mental, "Deep Work" extremo e memorização bruta.'
  },
  {
    id: 'usa',
    icon: <GraduationCap size={24} className="text-blue-500" />,
    title: 'Ivy League / LSAT (EUA)',
    description: 'Pensamento crítico, lógica estruturada e desconstrução de questões.',
    promptContext: 'estudantes de Direito de Harvard/Yale se preparando para o LSAT/Bar Exam. Foque em lógica, eliminação de alternativas e engenharia reversa de questões.'
  },
  {
    id: 'militar',
    icon: <Swords size={24} className="text-emerald-500" />,
    title: 'Forças Especiais / IME-ITA',
    description: 'Disciplina espartana, resiliência e planejamento tático.',
    promptContext: 'candidatos do IME/ITA ou Navy SEALs. Foque em disciplina inegociável, tolerância ao desconforto e táticas de guerra aplicadas ao estudo.'
  },
  {
    id: 'neuro',
    icon: <Brain size={24} className="text-purple-500" />,
    title: 'Neurociência Cognitiva',
    description: 'Otimização biológica, sono, revisão espaçada e active recall.',
    promptContext: 'os maiores neurocientistas cognitivos do mundo. Foque em "Active Recall", otimização de dopamina, sono e plasticidade cerebral.'
  }
];

export const Tips: React.FC = () => {
  const { config } = useStore();
  const [loading, setLoading] = useState(false);
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);

  const generateTip = async (sourceId: string) => {
    setLoading(true);
    setActiveSource(sourceId);
    setCurrentTip(null);

    try {
      const source = ELITE_SOURCES.find(s => s.id === sourceId);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Aja como um mentor de alta performance mundialmente reconhecido.
        O usuário é um concurseiro de elite estudando para: ${config.targetRole}.
        
        FONTE DE INSPIRAÇÃO: Baseie seu conselho EXCLUSIVAMENTE na mentalidade d${source?.promptContext}
        
        TAREFA: Forneça UMA (1) técnica ou conselho prático, avançado e pouco óbvio.
        
        FORMATO:
        Use Markdown.
        1. Título Impactante (Use #).
        2. Explicação (Use parágrafos).
        3. Ação Prática (Use bullet points).
        Destaque palavras chave em **negrito**.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setCurrentTip(response.text || "Erro ao gerar conselho.");
    } catch (error) {
      console.error(error);
      setCurrentTip("Erro de comunicação com a base de conhecimento de elite.");
    } finally {
      setLoading(false);
    }
  };

  // Improved Markdown Renderer
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, index) => {
        // Parse inline bold: **text** -> <strong>text</strong>
        const parseInline = (lineText: string) => {
            const parts = lineText.split(/\*\*(.*?)\*\*/g);
            return parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i} className="text-emerald-400 font-bold bg-emerald-950/30 px-1 rounded">{part}</strong> : part
            );
        };

        const trimmedLine = line.trim();

        // Header 1 (# Title)
        if (trimmedLine.startsWith('# ')) {
            return (
                <h2 key={index} className="text-3xl font-black text-white mb-6 border-l-4 border-emerald-500 pl-4 mt-8 bg-gradient-to-r from-emerald-900/20 to-transparent py-2 rounded-r-lg">
                    {parseInline(trimmedLine.replace(/^#\s+/, ''))}
                </h2>
            );
        }
        
        // Header 2 (## Title)
        if (trimmedLine.startsWith('## ')) {
            return (
                <h3 key={index} className="text-xl font-bold text-emerald-200 mb-4 mt-8 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {parseInline(trimmedLine.replace(/^##\s+/, ''))}
                </h3>
            );
        }

        // Header 3 (### Title)
        if (trimmedLine.startsWith('### ')) {
            return (
                <h4 key={index} className="text-lg font-bold text-white mb-3 mt-6 border-b border-slate-700 pb-1 inline-block">
                    {parseInline(trimmedLine.replace(/^###\s+/, ''))}
                </h4>
            );
        }

        // Bullet Points
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            return (
                <div key={index} className="flex items-start gap-3 mb-3 ml-2 group">
                    <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <p className="text-slate-300 leading-relaxed text-base group-hover:text-slate-100 transition-colors">
                        {parseInline(trimmedLine.replace(/^[-*]\s+/, ''))}
                    </p>
                </div>
            );
        }

        // Numbered List (1. Item)
        if (/^\d+\.\s/.test(trimmedLine)) {
            return (
                <div key={index} className="flex items-start gap-3 mb-3 ml-2 group">
                    <span className="text-emerald-500 font-bold font-mono bg-emerald-900/20 px-1.5 rounded text-sm">
                        {trimmedLine.match(/^\d+\./)?.[0]}
                    </span>
                    <p className="text-slate-300 leading-relaxed text-base group-hover:text-slate-100 transition-colors">
                        {parseInline(trimmedLine.replace(/^\d+\.\s+/, ''))}
                    </p>
                </div>
            );
        }

        // Empty Lines
        if (trimmedLine === '') {
            return <div key={index} className="h-4"></div>;
        }

        // Regular Paragraph
        return (
            <p key={index} className="text-slate-300 mb-4 text-lg leading-7 tracking-wide">
                {parseInline(trimmedLine)}
            </p>
        );
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 relative min-h-full flex flex-col">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Lightbulb className="text-yellow-500" /> 
          Sabedoria de Elite Global
        </h1>
        <p className="text-slate-400 mt-1">
          Acesse estratégias utilizadas pelos estudantes mais competitivos do mundo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Sidebar Selection */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Fontes de Conhecimento</h3>
          <div className="space-y-3">
            {ELITE_SOURCES.map((source) => (
              <button
                key={source.id}
                onClick={() => generateTip(source.id)}
                disabled={loading}
                className={`w-full p-4 rounded-xl border text-left transition-all relative overflow-hidden group
                  ${activeSource === source.id 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500/50' 
                    : 'bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800'}
                `}
              >
                <div className="flex items-start gap-4 z-10 relative">
                  <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${activeSource === source.id ? 'scale-110' : ''} transition-transform`}>
                    {source.icon}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${activeSource === source.id ? 'text-white' : 'text-slate-200'}`}>
                      {source.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {source.description}
                    </p>
                  </div>
                  {activeSource === source.id && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        {loading && <Loader2 size={16} className="text-emerald-500 animate-spin mr-2"/>}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Quick Tip Card */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 p-5 rounded-xl mt-8">
             <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-sm">
                <Zap size={16} /> Dica Rápida
             </div>
             <p className="text-xs text-slate-300 italic leading-relaxed">
                "Não estude até acertar. Estude até não conseguir errar. A familiaridade gera desprezo, a repetição gera maestria."
             </p>
             <p className="text-[10px] text-slate-500 mt-2 text-right uppercase tracking-wider">— Mantra da Elite</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8">
            <div className={`h-full bg-slate-900 border border-slate-800 rounded-2xl p-8 md:p-10 relative flex flex-col transition-all shadow-2xl ${loading ? 'opacity-90' : 'opacity-100'}`}>
                
                {!currentTip && !loading && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                        <ScrollText size={64} className="mb-4 text-slate-600"/>
                        <h3 className="text-xl font-bold text-white">Selecione uma Fonte</h3>
                        <p className="text-slate-400 max-w-sm mt-2">
                            Escolha uma metodologia ao lado para extrair uma técnica de estudo avançada adaptada para o seu cargo de {config.targetRole}.
                        </p>
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-2xl">
                        <Loader2 size={48} className="text-emerald-500 animate-spin mb-4"/>
                        <p className="text-emerald-400 font-mono text-sm animate-pulse">Consultando Estrategistas...</p>
                    </div>
                )}

                {currentTip && !loading && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
                        <div className="absolute top-6 right-6 opacity-10 pointer-events-none">
                            <Trophy size={120} className="text-emerald-500 rotate-12"/>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                            {renderFormattedText(currentTip)}
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center bg-slate-900 z-10">
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Gerado via Gemini AI</span>
                            <button 
                                onClick={() => activeSource && generateTip(activeSource)}
                                className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20"
                            >
                                <RefreshCw size={14} /> Gerar Outra Dica
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};
