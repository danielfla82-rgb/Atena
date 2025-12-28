
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { QuadrantChart } from './QuadrantChart';
import { LiquidityGauge } from './LiquidityGauge';
import { BrainCircuit, Save, Activity, Target, Trophy } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { notebooks, config, updateConfig, user } = useStore();
  // Local state for editing config before saving
  const [localConfig, setLocalConfig] = useState(config);
  
  // Sync local config with store config when it changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSaveConfig = () => {
      updateConfig(localConfig);
      alert("Configurações salvas!");
  };

  const totalReviews = notebooks.filter(n => n.accuracy > 0).length;
  const masteryCount = notebooks.filter(n => n.accuracy >= 90).length;
  const globalAccuracy = totalReviews > 0 
    ? Math.round(notebooks.reduce((acc, n) => acc + n.accuracy, 0) / notebooks.filter(n => n.accuracy > 0).length) 
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
       {/* Header Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center gap-4">
               <div className="p-3 bg-emerald-900/30 rounded-lg text-emerald-500"><Activity size={24} /></div>
               <div><p className="text-slate-500 text-xs uppercase font-bold">Acurácia Global</p><h3 className="text-2xl font-black text-white">{globalAccuracy}%</h3></div>
           </div>
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center gap-4">
               <div className="p-3 bg-blue-900/30 rounded-lg text-blue-500"><Target size={24} /></div>
               <div><p className="text-slate-500 text-xs uppercase font-bold">Tópicos Ativos</p><h3 className="text-2xl font-black text-white">{totalReviews}</h3></div>
           </div>
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center gap-4">
               <div className="p-3 bg-amber-900/30 rounded-lg text-amber-500"><Trophy size={24} /></div>
               <div><p className="text-slate-500 text-xs uppercase font-bold">Maestria (90%+)</p><h3 className="text-2xl font-black text-white">{masteryCount}</h3></div>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <QuadrantChart data={notebooks} />
           <LiquidityGauge notebooks={notebooks} />
       </div>

       {/* Config Section */}
       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
           <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-white flex items-center gap-2"><BrainCircuit className="text-purple-500" /> Configuração de Inteligência</h3>
               <button onClick={handleSaveConfig} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition-colors">
                   <Save size={16} /> Salvar Contexto
               </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                   <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Conteúdo Programático (Edital)</label>
                   <textarea 
                       value={localConfig.editalText || ''} 
                       onChange={e => setLocalConfig({...localConfig, editalText: e.target.value})} 
                       className="w-full h-40 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 text-xs font-mono resize-none focus:border-purple-500 outline-none custom-scrollbar"
                       placeholder="Cole o texto do edital aqui..."
                   />
               </div>
               <div>
                   <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Legislação / Lei Seca</label>
                   <textarea 
                       value={localConfig.legislationText || ''} 
                       onChange={e => setLocalConfig({...localConfig, legislationText: e.target.value})} 
                       className="w-full h-40 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 text-xs font-mono resize-none focus:border-purple-500 outline-none custom-scrollbar"
                       placeholder="Cole artigos de lei importantes aqui..."
                   />
               </div>
           </div>
       </div>
    </div>
  );
};
