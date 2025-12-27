import React, { useState, useCallback } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Lightbulb, Globe2, Brain, Swords, Zap, Loader2, ScrollText, Trophy, GraduationCap, RefreshCw } from 'lucide-react';

const ELITE_SOURCES = [
  { id: 'china', icon: <Globe2 size={24} className="text-red-500" />, title: 'Método Gaokao', description: 'Foco extremo e resistência mental.', promptContext: 'estudantes chineses Gaokao.' },
  { id: 'usa', icon: <GraduationCap size={24} className="text-blue-500" />, title: 'Ivy League / LSAT', description: 'Lógica e desconstrução de questões.', promptContext: 'estudantes de Harvard.' },
  { id: 'militar', icon: <Swords size={24} className="text-emerald-500" />, title: 'Forças Especiais', description: 'Disciplina espartana.', promptContext: 'Navy SEALs e IME/ITA.' },
  { id: 'neuro', icon: <Brain size={24} className="text-purple-500" />, title: 'Neurociência', description: 'Otimização biológica.', promptContext: 'neurocientistas cognitivos.' }
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
      const ai = createAIClient();
      const prompt = `Mentor de elite (${config.targetRole}). Baseado em: ${source?.promptContext}. Dê 1 conselho prático avançado. Markdown.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setCurrentTip(response.text || "Erro ao gerar.");
    } catch (error: any) {
      console.error(error);
      setCurrentTip(error.message === "MISSING_API_KEY" ? "Erro: API Key não configurada." : "Erro de comunicação.");
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedText = useCallback((text: string) => {
    return text.split('\n').map((line, index) => {
        // Handle Bold (**text**)
        const parseInline = (lineText: string) => lineText.split(/\*\*(.*?)\*\*/g).map((part, i) => 
            i % 2 === 1 ? <strong key={i} className="text-emerald-400 font-bold bg-emerald-950/30 px-1 rounded">{part}</strong> : part
        );

        const trimmed = line.trim();

        if (trimmed.startsWith('###')) 
            return <h4 key={index} className="text-lg font-bold text-emerald-100 mb-3 mt-6">{parseInline(trimmed.replace(/^###\s*/, ''))}</h4>;

        if (trimmed.startsWith('##')) 
            return <h3 key={index} className="text-xl font-bold text-emerald-200 mb-4 mt-8 border-b border-slate-700 pb-2">{parseInline(trimmed.replace(/^##\s*/, ''))}</h3>;
        
        if (trimmed.startsWith('# ')) 
            return <h2 key={index} className="text-3xl font-black text-white mb-6 mt-8">{parseInline(trimmed.replace(/^#\s*/, ''))}</h2>;

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) 
            return (
                <div key={index} className="flex gap-3 mb-3 ml-2">
                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                    <p className="text-slate-300 leading-relaxed">{parseInline(trimmed.replace(/^[-*]\s*/, ''))}</p>
                </div>
            );

        if (!trimmed) return <div key={index} className="h-4"></div>;
        
        return <p key={index} className="text-slate-300 mb-4 text-lg leading-7">{parseInline(line)}</p>;
    });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 relative min-h-full flex flex-col">
      <div className="border-b border-slate-800 pb-6"><h1 className="text-2xl font-bold text-white flex items-center gap-3"><Lightbulb className="text-yellow-500" /> Sabedoria de Elite</h1></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Fontes</h3>
          <div className="space-y-3">
            {ELITE_SOURCES.map((source) => (
              <button key={source.id} onClick={() => generateTip(source.id)} disabled={loading} className={`w-full p-4 rounded-xl border text-left transition-all ${activeSource === source.id ? 'bg-slate-800 border-emerald-500' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800`}>{source.icon}</div>
                  <div><h4 className={`font-bold text-sm ${activeSource === source.id ? 'text-white' : 'text-slate-200'}`}>{source.title}</h4><p className="text-xs text-slate-500 mt-1">{source.description}</p></div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-8">
            <div className={`h-full bg-slate-900 border border-slate-800 rounded-2xl p-8 md:p-10 relative flex flex-col transition-all shadow-2xl ${loading ? 'opacity-90' : 'opacity-100'}`}>
                {!currentTip && !loading && <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40"><ScrollText size={64} className="mb-4 text-slate-600"/><h3 className="text-xl font-bold text-white">Selecione uma Fonte</h3></div>}
                {loading && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-2xl"><Loader2 size={48} className="text-emerald-500 animate-spin mb-4"/><p className="text-emerald-400 font-mono text-sm animate-pulse">Consultando...</p></div>}
                {currentTip && !loading && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col"><div className="flex-1 overflow-y-auto custom-scrollbar pr-4">{renderFormattedText(currentTip)}</div></div>}
            </div>
        </div>
      </div>
    </div>
  );
};