import React, { useState } from 'react';
import { useStore } from '../store';
import { FrameworkData } from '../types';
import { Pyramid, Save, X, Info, Zap, Target, BookOpen, Heart, Anchor, Pencil, Trophy } from 'lucide-react';

export const Framework: React.FC = () => {
  const { framework, updateFramework } = useStore();
  const [editingLayer, setEditingLayer] = useState<keyof FrameworkData | null>(null);
  const [tempValue, setTempValue] = useState('');

  const layers: { key: keyof FrameworkData; label: string; width: string; color: string; icon: React.ReactNode, hint: string }[] = [
    { 
        key: 'habit', // Mantido 'habit' internamente para integridade do DB
        label: 'RESULTADO', // UX atualizada
        width: 'w-1/3 md:w-1/4', // Aumentado de w-1/5 para caber "RESULTADO" e "APROVAÇÃO" sem quebrar
        color: 'bg-emerald-400', 
        icon: <Trophy size={18} className="text-emerald-950" />,
        hint: "A consequência inevitável da constância. A Aprovação, a Posse, a mudança de vida."
    },
    { 
        key: 'action', 
        label: 'AÇÃO', 
        width: 'w-2/5', 
        color: 'bg-emerald-600', 
        icon: <Zap size={18} className="text-emerald-100" />,
        hint: "O que deve ser feito? 80% do tempo em Técnica/Estudo Ativo. +60min de foco progressivo."
    },
    { 
        key: 'motivation', 
        label: 'MOTIVAÇÃO', 
        width: 'w-3/5', 
        color: 'bg-emerald-700', 
        icon: <Target size={18} className="text-emerald-200" />,
        hint: "Motivação 3.0 (Daniel Pink): Autonomia, Maestria, Propósito. Por quem você luta?"
    },
    { 
        key: 'dream', 
        label: 'SONHO', 
        width: 'w-4/5', 
        color: 'bg-slate-700', 
        icon: <Heart size={18} className="text-slate-300" />,
        hint: "A visão clara do futuro. Ex: Auditor Fiscal - Bahia - Salvador. Vroom: Valor x Expectativa."
    },
    { 
        key: 'values', 
        label: 'VALORES', 
        width: 'w-full', 
        color: 'bg-slate-800', 
        icon: <Anchor size={18} className="text-slate-400" />,
        hint: "A base inabalável. Ex: Ambição, Calma, Integridade, Segurança, Relevância."
    },
  ];

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20 relative h-full flex flex-col">
      <div className="flex justify-between items-start border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Pyramid className="text-emerald-500" /> 
            Framework de Alta Performance
          </h1>
          <p className="text-slate-400 mt-1">
            Da Visão à Disciplina Inabalável. Construa sua pirâmide estratégica.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-8 relative">
          
          {/* Background Triangle Indicator */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
             <div className="w-0 h-0 border-l-[300px] border-l-transparent border-r-[300px] border-r-transparent border-b-[500px] border-b-white"></div>
          </div>

          <div className="w-full max-w-2xl flex flex-col gap-1 items-center z-10">
              {layers.map((layer) => (
                  <div 
                    key={layer.key}
                    onClick={() => handleEdit(layer.key)}
                    className={`${layer.width} transition-all duration-300 group cursor-pointer relative`}
                  >
                      {/* Pyramid Block */}
                      <div className={`${layer.color} h-24 md:h-28 flex flex-col items-center justify-center text-center p-4 relative shadow-lg hover:brightness-110 hover:scale-[1.02] transition-all border-b border-black/20 ${layer.key === 'habit' ? 'rounded-t-3xl' : ''} ${layer.key === 'values' ? 'rounded-b-lg' : ''}`}>
                          
                          <div className="flex items-center gap-2 mb-1 opacity-80 font-bold tracking-widest text-xs uppercase text-white/70">
                              {layer.icon} {layer.label}
                          </div>
                          
                          <div className="font-medium text-white text-sm md:text-base line-clamp-2 md:line-clamp-3 w-full px-2 md:px-4">
                              {framework[layer.key] || <span className="italic opacity-40">Clique para definir...</span>}
                          </div>

                          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Pencil size={16} className="text-white/80" />
                          </div>
                      </div>

                      {/* Side Hint (Desktop only) */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-48 hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-slate-900 border border-slate-700 p-2 rounded text-[10px] text-slate-400">
                              {layer.hint}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* Edit Modal */}
      {editingLayer && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all scale-100">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 uppercase">
                        {layers.find(l => l.key === editingLayer)?.icon}
                        Definir {layers.find(l => l.key === editingLayer)?.label}
                    </h3>
                    <button onClick={() => setEditingLayer(null)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-lg flex gap-3">
                        <Info className="text-emerald-500 flex-shrink-0" size={20} />
                        <p className="text-sm text-emerald-200">
                            {layers.find(l => l.key === editingLayer)?.hint}
                        </p>
                    </div>

                    <textarea 
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        placeholder="Escreva aqui..."
                        className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-emerald-500 outline-none resize-none text-lg custom-scrollbar"
                        autoFocus
                    />
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
                    <button onClick={() => setEditingLayer(null)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all">
                        <Save size={18} /> Salvar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};