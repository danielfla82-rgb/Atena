import React, { useState } from 'react';
import { Type } from "@google/genai";
import { createAIClient } from '../utils/ai';
import { Loader2, Quote, Flame, BookOpen, ChevronDown } from 'lucide-react';

interface NietzscheResponse {
  aphorism: string;
  source: string;
  interpretation: string;
}

export const Nietzsche: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NietzscheResponse | null>(null);
  const [showInterpretation, setShowInterpretation] = useState(false);

  const cleanJsonString = (text: string) => {
    if (!text) return '{}';
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    return cleaned.trim();
  };

  const summonNietzsche = async () => {
    setLoading(true);
    setShowInterpretation(false);
    setData(null);

    try {
      const ai = createAIClient();
      const prompt = `
          Você é Nietzsche. Gere uma citação motivacional profunda (real) para um estudante em dificuldade.
          Sempre inclua uma interpretação prática em Markdown (use negrito **texto** para ênfase).
          JSON: { aphorism: string, source: string, interpretation: string }.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    aphorism: { type: Type.STRING },
                    source: { type: Type.STRING },
                    interpretation: { type: Type.STRING }
                },
                required: ["aphorism", "source", "interpretation"]
            }
        }
      });

      const result = JSON.parse(cleanJsonString(response.text || '{}'));
      setData(result);

    } catch (error: any) {
      console.error(error);
      const isKeyError = error.message === "MISSING_API_KEY";
      setData({
          aphorism: isKeyError ? "Onde falta a chave, falta o poder." : "Aquele que luta com monstros deve acautelar-se para não tornar-se também um monstro.",
          source: isKeyError ? "Erro de Configuração" : "Além do Bem e do Mal",
          interpretation: isKeyError ? "Adicione a **VITE_API_KEY** no Vercel." : "Mantenha a nobreza mesmo na dor."
      });
    } finally {
      setLoading(false);
    }
  };

  const renderInterpretation = (text: string) => {
      const parts = text.split(/\*\*(.*?)\*\*/g);
      return parts.map((part, i) => 
          i % 2 === 1 ? <strong key={i} className="text-emerald-400 font-bold">{part}</strong> : part
      );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col items-center justify-center relative overflow-hidden font-serif">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>
      <div className="z-10 text-center max-w-3xl px-6 w-full">
        <div className="flex justify-center mb-10">
            {/* MASSIVE IMAGE CONTAINER */}
            <div className="w-72 h-72 md:w-96 md:h-96 lg:w-[450px] lg:h-[450px] rounded-full border-4 border-slate-800 shadow-[0_0_100px_rgba(16,185,129,0.15)] overflow-hidden relative group transition-all duration-700 hover:shadow-[0_0_120px_rgba(16,185,129,0.3)] hover:scale-105">
                <img src="https://i.postimg.cc/rFFwpKjm/Gemini-Generated-Image-tchb4stchb4stchb.png" alt="Nietzsche" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none mix-blend-overlay"></div>
            </div>
        </div>
        
        {!data && !loading && <div className="animate-in fade-in duration-700"><h2 className="text-4xl md:text-5xl font-extrabold text-slate-200 mb-4 tracking-tight uppercase drop-shadow-2xl">A Vontade de Potência</h2></div>}
        
        {data && (
            <div className="mb-12 animate-in fade-in zoom-in duration-700 relative">
                <Quote className="text-emerald-800 w-16 h-16 mx-auto mb-6 opacity-40" />
                <p className="text-2xl md:text-4xl font-medium text-slate-100 leading-relaxed tracking-wide mb-8 drop-shadow-lg italic font-serif">"{data.aphorism}"</p>
                <div className="inline-flex items-center gap-2 text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-8"><BookOpen size={14} />{data.source}</div>
                <div className="mt-2">
                    {!showInterpretation ? (
                        <button onClick={() => setShowInterpretation(true)} className="text-slate-500 hover:text-white text-xs uppercase tracking-[0.2em] flex items-center gap-2 mx-auto transition-colors">
                            Contemplar Significado <ChevronDown size={14} />
                        </button>
                    ) : (
                        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl max-w-xl mx-auto animate-in slide-in-from-top-2 shadow-2xl">
                            <h4 className="text-emerald-500 text-xs font-bold uppercase mb-2 flex items-center justify-center gap-2"><Flame size={12}/> Interpretação</h4>
                            <p className="text-slate-300 text-base leading-relaxed italic">
                                {renderInterpretation(data.interpretation)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}
        <div className="mt-8">
            <button onClick={summonNietzsche} disabled={loading} className="group relative px-10 py-5 bg-transparent border border-slate-700 hover:border-emerald-500/50 text-slate-400 hover:text-white transition-all duration-300 rounded-lg overflow-hidden uppercase tracking-widest text-xs font-bold">
                <div className="absolute inset-0 w-0 bg-emerald-900/20 transition-all duration-[400ms] ease-out group-hover:w-full"></div>
                <span className="relative flex items-center gap-3">{loading ? <Loader2 className="animate-spin" size={16}/> : <Flame size={16} />}{loading ? "Consultando..." : data ? "Outra Máxima" : "Invocar Incentivo Brutal"}</span>
            </button>
        </div>
      </div>
    </div>
  );
};