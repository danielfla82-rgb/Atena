
import React, { useState, useRef, useEffect } from 'react';
import { createAIClient } from '../utils/ai';
import { Send, User, RefreshCcw, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const Psychoanalyst: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá. Percebo que o peso da jornada está sobre seus ombros. Como está o diálogo com sua Sombra hoje?' }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = createAIClient();
      
      const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: `
                Você é Carl Gustav Jung. O usuário é um estudante de elite (concurseiro).
                Ajude-o a integrar a Sombra (medos, preguiça) e fortalecer o Self.
                Seja profundo, simbólico e acolhedor. Use metáforas.
            `
        },
        history: history
      });

      const result = await chat.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: result.text }]);

    } catch (error: any) {
      console.error("Erro Junguiano:", error);
      let errorMsg = "O inconsciente está silencioso. Tente novamente.";
      
      if (error.message === "MISSING_API_KEY") {
          errorMsg = "⚠️ ERRO CRÍTICO: Chave de API não encontrada. Verifique se 'VITE_API_KEY' está configurada no Vercel.";
      } else if (error.message?.includes("429")) {
          errorMsg = "Muitas requisições. O oráculo precisa descansar um pouco.";
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const bgImage = "https://i.postimg.cc/nhrKqVFj/Gemini-Generated-Image-bxykegbxykegbxyk.png";

  return (
    <div className="relative h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-slate-950">
      
      {/* Imagem de Fundo Imersiva */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-slate-950/40 z-10 backdrop-blur-[2px]"></div>
          <img 
            src={bgImage} 
            alt="Atmosphere" 
            className="w-full h-full object-cover object-center opacity-80"
          />
      </div>

      {/* Header Flutuante */}
      <div className="relative z-20 p-6 flex items-center justify-between bg-gradient-to-b from-slate-950 to-transparent">
         <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-600 shadow-2xl">
                 <img src={bgImage} alt="Analyst" className="w-full h-full object-cover" />
             </div>
             <div>
                 <h2 className="text-2xl font-bold text-white drop-shadow-md">Analista Junguiano</h2>
                 <p className="text-slate-300 text-sm font-medium drop-shadow">Integração do Inconsciente e da Sombra.</p>
             </div>
         </div>
         <button 
            onClick={() => setMessages([{ role: 'model', text: 'Vamos olhar para dentro. O que sua Sombra está dizendo hoje?' }])}
            className="p-3 bg-slate-900/50 backdrop-blur-md hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-colors border border-slate-700"
         >
             <RefreshCcw size={20} />
         </button>
      </div>

      {/* Chat Area */}
      <div className="relative z-20 flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
         {messages.map((msg, idx) => (
             <div key={idx} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start max-w-3xl'}`}>
                 {msg.role === 'model' && (
                     <div className="hidden md:block w-10 h-10 rounded-full overflow-hidden flex-shrink-0 mt-2 border border-slate-600 shadow-lg">
                         <img src={bgImage} alt="AI" className="w-full h-full object-cover" />
                     </div>
                 )}
                 <div className={`relative p-5 rounded-3xl text-base leading-relaxed shadow-xl backdrop-blur-md ${msg.role === 'user' ? 'bg-emerald-600/90 text-white rounded-tr-sm border border-emerald-500/30 max-w-[85%]' : 'bg-slate-900/80 text-slate-100 rounded-tl-sm border border-slate-700/50'}`}>
                     {msg.text}
                 </div>
                 {msg.role === 'user' && (
                     <div className="hidden md:flex w-10 h-10 rounded-full bg-emerald-900/50 items-center justify-center flex-shrink-0 mt-2 border border-emerald-500/30">
                         <User size={18} className="text-emerald-400" />
                     </div>
                 )}
             </div>
         ))}
         {loading && (
             <div className="flex gap-4 max-w-3xl animate-pulse">
                 <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-slate-600">
                     <img src={bgImage} alt="AI" className="w-full h-full object-cover grayscale" />
                 </div>
                 <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-4 rounded-3xl rounded-tl-sm flex items-center gap-3 text-slate-300">
                     <Loader2 size={18} className="animate-spin text-emerald-500" />
                     <span className="text-sm font-medium">Analisando Arquétipos...</span>
                 </div>
             </div>
         )}
         <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="relative z-20 p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="max-w-4xl mx-auto relative">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl rounded-2xl -z-10 border border-slate-700/50"></div>
              <div className="flex gap-3 p-2">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Explore seus sentimentos..."
                    className="w-full bg-transparent border-none px-4 py-3 text-white placeholder-slate-400 focus:ring-0 outline-none text-lg"
                    disabled={loading}
                    autoFocus
                  />
                  <button onClick={handleSend} disabled={!input.trim() || loading} className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all shadow-lg hover:scale-105">
                      <Send size={20} />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
