
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Mountain, Loader2, Quote, Flame, BookOpen, ChevronDown } from 'lucide-react';

interface NietzscheResponse {
  aphorism: string;
  source: string;
  interpretation: string;
}

export const Nietzsche: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NietzscheResponse | null>(null);
  const [showInterpretation, setShowInterpretation] = useState(false);

  // Helper to clean JSON from markdown blocks
  const cleanJsonString = (text: string) => {
    if (!text) return '{}';
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    }
    return cleaned.trim();
  };

  const summonNietzsche = async () => {
    setLoading(true);
    setShowInterpretation(false);
    setData(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
          Você é Friedrich Nietzsche. O usuário é um estudante de elite (concurseiro) enfrentando um desafio intelectual brutal.
          
          TAREFA: Gere uma citação motivacional profunda (baseada em sua obra real).
          
          REQUISITOS:
          1. A citação deve vir de um de seus livros (ex: Assim Falou Zaratustra, Além do Bem e do Mal, Ecce Homo, etc).
          2. Temas: Vontade de Potência, Amor Fati, Superação, Disciplina, O Abismo.
          3. Forneça também uma breve interpretação de como isso se aplica ao estudo difícil.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    aphorism: { type: Type.STRING, description: "A citação textual." },
                    source: { type: Type.STRING, description: "O nome do livro e capítulo/aforismo de onde veio (ex: 'Crepúsculo dos Ídolos, Máximas e Flechas, 12')." },
                    interpretation: { type: Type.STRING, description: "Uma explicação curta e direta de como aplicar essa filosofia aos estudos." }
                },
                required: ["aphorism", "source", "interpretation"]
            }
        }
      });

      const cleanedJson = cleanJsonString(response.text || '{}');
      const result = JSON.parse(cleanedJson);
      setData(result);

    } catch (error) {
      console.error(error);
      setData({
          aphorism: "Aquele que luta com monstros deve acautelar-se para não tornar-se também um monstro. E se tu olhares, durante muito tempo, para um abismo, o abismo também olha para dentro de ti.",
          source: "Além do Bem e do Mal, Aforismo 146",
          interpretation: "Cuidado para que a dificuldade do estudo não amargue sua alma. Mantenha a nobreza mesmo na dor."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col items-center justify-center relative overflow-hidden font-serif">
      {/* Atmosphere */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>
      
      <div className="z-10 text-center max-w-3xl px-6 w-full">
        
        {/* Nietzsche Illustration */}
        <div className="flex justify-center mb-8">
            <div className="w-48 h-48 rounded-full border-4 border-slate-800 shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden relative group">
                <img 
                    src="https://i.postimg.cc/rFFwpKjm/Gemini-Generated-Image-tchb4stchb4stchb.png" 
                    alt="Nietzsche Illustration" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0"
                />
            </div>
        </div>

        {!data && !loading && (
             <div className="animate-in fade-in duration-700">
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-200 mb-4 tracking-tight uppercase">A Vontade de Potência</h2>
                <p className="text-slate-500 mb-12 italic text-lg">"Torna-te quem tu és."</p>
             </div>
        )}

        {/* Content Card */}
        {data && (
            <div className="mb-12 animate-in fade-in zoom-in duration-700 relative">
                <Quote className="text-emerald-800 w-16 h-16 mx-auto mb-6 opacity-40" />
                
                <p className="text-2xl md:text-3xl font-medium text-slate-100 leading-relaxed tracking-wide mb-8 drop-shadow-lg">
                    "{data.aphorism}"
                </p>

                <div className="inline-flex items-center gap-2 text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-8">
                    <BookOpen size={14} />
                    {data.source}
                </div>

                {/* Interpretation Section */}
                <div className="mt-2">
                    {!showInterpretation ? (
                        <button 
                            onClick={() => setShowInterpretation(true)}
                            className="text-slate-500 hover:text-white text-xs uppercase tracking-[0.2em] flex items-center gap-2 mx-auto transition-colors"
                        >
                            Contemplar Significado <ChevronDown size={14} />
                        </button>
                    ) : (
                        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl max-w-xl mx-auto animate-in slide-in-from-top-2">
                            <h4 className="text-emerald-500 text-xs font-bold uppercase mb-2 flex items-center justify-center gap-2">
                                <Flame size={12}/> Interpretação
                            </h4>
                            <p className="text-slate-300 text-base leading-relaxed italic">
                                {data.interpretation}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Action Button */}
        <div className="mt-8">
            <button
                onClick={summonNietzsche}
                disabled={loading}
                className="group relative px-10 py-5 bg-transparent border border-slate-700 hover:border-emerald-500/50 text-slate-400 hover:text-white transition-all duration-300 rounded-lg overflow-hidden uppercase tracking-widest text-xs font-bold"
            >
                <div className="absolute inset-0 w-0 bg-emerald-900/20 transition-all duration-[400ms] ease-out group-hover:w-full"></div>
                <span className="relative flex items-center gap-3">
                    {loading ? <Loader2 className="animate-spin" size={16}/> : <Flame size={16} />}
                    {loading ? "Consultando o Zaratustra..." : data ? "Outra Máxima" : "Invocar Incentivo Brutal"}
                </span>
            </button>
        </div>

      </div>
    </div>
  );
};