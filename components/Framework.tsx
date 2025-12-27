import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { FrameworkData } from '../types';
import { createAIClient } from '../utils/ai';
import { 
    Pyramid, Save, X, Info, Zap, Target, BookOpen, 
    Heart, Anchor, Pencil, Sparkles, CheckCircle2, 
    FileText, LayoutTemplate, Loader2, Quote, Copy
} from 'lucide-react';

export const Framework: React.FC = () => {
  const { framework, updateFramework, config } = useStore();
  const [editingLayer, setEditingLayer] = useState<keyof FrameworkData | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [viewMode, setViewMode] = useState<'pyramid' | 'manifesto'>('pyramid');
  const [isGenerating, setIsGenerating] = useState(false);

  const layers: { key: keyof FrameworkData; label: string; width: string; color: string; icon: React.ReactNode, hint: string, promptKey: string }[] = [
    { 
        key: 'habit', 
        label: 'HÁBITO ANGULAR', 
        width: 'w-full md:w-1/4', 
        color: 'from-emerald-400 to-emerald-600', 
        icon: <BookOpen size={18} className="text-emerald-950" />,
        hint: "O comportamento inegociável que puxa todos os outros. Ex: 'Acordar às 05:00 e fazer 50 questões antes do café'.",
        promptKey: "um hábito angular diário essencial"
    },
    { 
        key: 'action', 
        label: 'AÇÃO TÁTICA', 
        width: 'w-full md:w-2/4', 
        color: 'from-emerald-500 to-emerald-700', 
        icon: <Zap size={18} className="text-emerald-100" />,
        hint: "O método de execução. Ex: 'Ciclo de Estudos Reverso com foco 80% em questões e revisão ativa de erros'.",
        promptKey: "uma metodologia de ação prática e agressiva"
    },
    { 
        key: 'motivation', 
        label: 'MOTIVAÇÃO (O PORQUÊ)', 
        width: 'w-full md:w-3/4', 
        color: 'from-emerald-600 to-emerald-800', 
        icon: <Target size={18} className="text-emerald-200" />,
        hint: "A dor que você evita ou o prazer que busca. Autonomia, Maestria e Propósito. Por quem você luta?",
        promptKey: "uma motivação intrínseca profunda e resiliente"
    },
    { 
        key: 'dream', 
        label: 'VISÃO DE FUTURO', 
        width: 'w-full md:w-4/5', 
        color: 'from-slate-600 to-slate-800', 
        icon: <Heart size={18} className="text-slate-300" />,
        hint: "Visualização clara do sucesso. Onde você estará em 5 anos? Ex: 'Auditando grandes empresas em SP'.",
        promptKey: "uma visão de futuro inspiradora e detalhada"
    },
    { 
        key: 'values', 
        label: 'VALORES INEGOCIÁVEIS', 
        width: 'w-full', 
        color: 'from-slate-800 to-slate-950', 
        icon: <Anchor size={18} className="text-slate-400" />,
        hint: "Os princípios que sustentam sua jornada. Ex: Disciplina, Integridade, Excelência, Resiliência.",
        promptKey: "5 valores fundamentais estoicos ou de alta performance"
    },
  ];

  // Calculate Progress
  const progress = useMemo(() => {
      const filled = Object.values(framework).filter(v => typeof v === 'string' && v.length > 5).length;
      return Math.round((filled / 5) * 100);
  }, [framework]);

  const handleEdit = (layer: keyof FrameworkData) => {
    setEditingLayer(layer);
    setTempValue(framework[layer]);
  };

  const handleSave = () => {
    if (editingLayer) {
      updateFramework({
        ...framework,
        [editingLayer]: tempValue
      });
      setEditingLayer(null);
    }
  };

  const generateWithAI = async () => {
      if (!editingLayer) return;
      setIsGenerating(true);
      try {
          const layerDef = layers.find(l => l.key === editingLayer);
          const ai = createAIClient();
          const prompt = `
            Atue como um Coach de Alta Performance para Concursos.
            O usuário está estudando para o cargo: ${config.targetRole}.
            
            Gere uma sugestão curta, impactante e em primeira pessoa para o campo: "${layerDef?.label}".
            Contexto do campo: ${layerDef?.hint}.
            O que escreveria um candidato de elite (Top 1%) neste campo?
            Gere ${layerDef?.promptKey}.
            Máximo 2 frases. Tom: Sério, Determinado, Estoico.
          `;
          
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });
          
          if (response.text) {
              setTempValue(response.text.replace(/^"|"$/g, '').trim());
          }
      } catch (e) {
          console.error(e);
          alert("Erro ao conectar com a IA. Tente digitar manualmente.");
      } finally {
          setIsGenerating(false);
      }
  };

  const copyToClipboard = () => {
      const text = `MEU FRAMEWORK ESTRATÉGICO\n\n` + 
          layers.map(l => `[${l.label}]\n${framework[l.key] || 'Não definido'}`).join('\n\n');
      navigator.clipboard.writeText(text);
      alert("Copiado para a área de transferência!");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20 relative h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Pyramid className="text-emerald-500" /> 
            Framework de Alta Performance
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Construa sua identidade. A técnica sem mentalidade é frágil.
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-48 bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div 
                    className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <span className="text-xs font-mono text-emerald-400">{progress}%</span>
            
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button 
                    onClick={() => setViewMode('pyramid')}
                    className={`p-2 rounded transition-all ${viewMode === 'pyramid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}
                    title="Modo Construção"
                >
                    <LayoutTemplate size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('manifesto')}
                    className={`p-2 rounded transition-all ${viewMode === 'manifesto' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}
                    title="Modo Leitura (Manifesto)"
                >
                    <FileText size={18} />
                </button>
            </div>
        </div>
      </div>

      {viewMode === 'pyramid' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-4 relative animate-in fade-in zoom-in duration-500">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>

              <div className="w-full max-w-3xl flex flex-col gap-2 items-center z-10">
                  {layers.map((layer) => {
                      const isFilled = !!framework[layer.key];
                      
                      return (
                      <div 
                        key={layer.key}
                        onClick={() => handleEdit(layer.key)}
                        className={`
                            ${layer.width} transition-all duration-300 group cursor-pointer relative
                        `}
                      >
                          {/* Layer Card */}
                          <div className={`
                              relative flex flex-col items-center justify-center text-center p-6 border-b border-black/20
                              ${isFilled 
                                  ? `bg-gradient-to-br ${layer.color} shadow-lg hover:shadow-emerald-500/20` 
                                  : 'bg-slate-900/40 border-2 border-dashed border-slate-700 hover:bg-slate-900/80 hover:border-slate-500'}
                              ${layer.key === 'habit' ? 'rounded-t-3xl' : ''} 
                              ${layer.key === 'values' ? 'rounded-b-2xl' : ''}
                              transition-all hover:scale-[1.02] active:scale-[0.98]
                          `}>
                              
                              <div className={`flex items-center gap-2 mb-2 font-bold tracking-widest text-xs uppercase ${isFilled ? 'text-white/90' : 'text-slate-500'}`}>
                                  {layer.icon} {layer.label}
                                  {isFilled && <CheckCircle2 size={14} className="text-white ml-2" />}
                              </div>
                              
                              <div className={`font-medium text-sm md:text-lg w-full px-4 line-clamp-2 ${isFilled ? 'text-white' : 'text-slate-600 italic'}`}>
                                  {framework[layer.key] || "Toque para definir..."}
                              </div>

                              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Pencil size={16} className={isFilled ? "text-white/80" : "text-slate-400"} />
                              </div>
                          </div>

                          {/* Hover Hint */}
                          {!isFilled && (
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-64 hidden lg:block opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                  <div className="bg-slate-900 border border-emerald-500/30 p-3 rounded-xl text-xs text-slate-300 shadow-xl relative">
                                      <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-slate-900 border-l border-b border-emerald-500/30 rotate-45"></div>
                                      <p><strong className="text-emerald-400">Dica:</strong> {layer.hint}</p>
                                  </div>
                              </div>
                          )}
                      </div>
                  )})}
              </div>
          </div>
      ) : (
          <div className="max-w-2xl mx-auto w-full animate-in slide-in-from-bottom-8 duration-500">
              <div className="bg-slate-50 text-slate-900 p-12 rounded-lg shadow-2xl relative overflow-hidden font-serif">
                  {/* Paper Texture Overlay */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                      <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
                          <div>
                              <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Manifesto</h2>
                              <p className="text-sm font-sans font-bold uppercase tracking-widest text-slate-500">Protocolo de Identidade • {config.targetRole}</p>
                          </div>
                          <Quote size={48} className="text-slate-200" />
                      </div>

                      <div className="space-y-8">
                          {layers.map(l => (
                              <div key={l.key}>
                                  <h4 className="text-xs font-sans font-bold uppercase tracking-widest text-slate-400 mb-1">{l.label}</h4>
                                  <p className="text-xl font-medium leading-relaxed text-slate-800">
                                      {framework[l.key] || <span className="text-slate-300 italic">------------</span>}
                                  </p>
                              </div>
                          ))}
                      </div>

                      <div className="mt-12 pt-8 border-t-2 border-slate-900 flex justify-between items-center">
                          <p className="font-dancing text-2xl text-slate-600">Compromisso Pessoal</p>
                          <button 
                            onClick={copyToClipboard}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded font-sans text-xs font-bold uppercase hover:bg-slate-700 transition-colors"
                          >
                              <Copy size={14} /> Copiar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Modal */}
      {editingLayer && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className={`p-6 border-b border-slate-800 bg-gradient-to-r ${layers.find(l => l.key === editingLayer)?.color} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="relative z-10 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 uppercase">
                            {layers.find(l => l.key === editingLayer)?.icon}
                            {layers.find(l => l.key === editingLayer)?.label}
                        </h3>
                        <button onClick={() => setEditingLayer(null)} className="text-white/70 hover:text-white transition-colors bg-black/20 p-1 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex gap-3">
                        <Info className="text-emerald-500 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {layers.find(l => l.key === editingLayer)?.hint}
                            </p>
                        </div>
                    </div>

                    <div className="relative">
                        <textarea 
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            placeholder="Escreva sua definição aqui..."
                            className="w-full h-48 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-emerald-500 outline-none resize-none text-lg leading-relaxed custom-scrollbar"
                            autoFocus
                        />
                        <div className="absolute bottom-3 right-3">
                            <button 
                                onClick={generateWithAI}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Pedir sugestão para a IA"
                            >
                                {isGenerating ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />}
                                {isGenerating ? "Criando..." : "Invocar Sabedoria"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                    <button onClick={() => setEditingLayer(null)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors font-medium">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105 active:scale-95">
                        <Save size={18} /> Confirmar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};