
import React, { useState } from 'react';
import { useStore } from '../store';
import { Pill, Coffee, Utensils, Plus, Trash2, Check, Clock, AlertCircle } from 'lucide-react';
import { ProtocolItem } from '../types';

export const Protocol: React.FC = () => {
  const { protocol, addProtocolItem, toggleProtocolItem, deleteProtocolItem } = useStore();
  const [newItem, setNewItem] = useState({
      name: '',
      dosage: '',
      time: '',
      type: 'Suplemento' as const
  });

  const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if(newItem.name && newItem.time) {
          addProtocolItem({
              name: newItem.name,
              dosage: newItem.dosage,
              time: newItem.time,
              type: newItem.type as any
          });
          setNewItem({ name: '', dosage: '', time: '', type: 'Suplemento' });
      }
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'Medicamento': return <Pill size={18} className="text-red-400" />;
          case 'Refeição': return <Utensils size={18} className="text-orange-400" />;
          default: return <Coffee size={18} className="text-emerald-400" />;
      }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Pill className="text-blue-500" /> 
            Protocolo Fisiológico
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie suplementação, medicação e horários de refeição para otimizar a cognição.
          </p>
        </div>
        <div className="bg-blue-900/20 text-blue-300 px-4 py-2 rounded-lg text-xs flex items-center gap-2 border border-blue-500/20 max-w-xs">
            <AlertCircle size={16} className="flex-shrink-0" />
            Esta ferramenta é apenas organizacional. Não substitui orientação médica.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-1">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sticky top-6">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">Adicionar Item</h3>
                  <form onSubmit={handleAdd} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nome</label>
                          <input 
                            type="text" 
                            value={newItem.name}
                            onChange={e => setNewItem({...newItem, name: e.target.value})}
                            placeholder="Ex: Cafeína"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Dose / Detalhe</label>
                          <input 
                            type="text" 
                            value={newItem.dosage}
                            onChange={e => setNewItem({...newItem, dosage: e.target.value})}
                            placeholder="Ex: 200mg ou Almoço Low Carb"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Horário</label>
                            <input 
                                type="time" 
                                value={newItem.time}
                                onChange={e => setNewItem({...newItem, time: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                                required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tipo</label>
                            <select 
                                value={newItem.type}
                                onChange={e => setNewItem({...newItem, type: e.target.value as any})}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                            >
                                <option value="Suplemento">Suplem.</option>
                                <option value="Medicamento">Remédio</option>
                                <option value="Refeição">Refeição</option>
                            </select>
                          </div>
                      </div>
                      <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                          <Plus size={18} /> Adicionar
                      </button>
                  </form>
              </div>
          </div>

          {/* List */}
          <div className="md:col-span-2 space-y-4">
              {protocol.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      Nenhum item no protocolo.
                  </div>
              ) : (
                  protocol.map((item) => (
                      <div 
                        key={item.id} 
                        className={`
                            flex items-center justify-between p-4 rounded-xl border transition-all
                            ${item.checked 
                                ? 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60' 
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-md'}
                        `}
                      >
                          <div className="flex items-center gap-4">
                              <button 
                                onClick={() => toggleProtocolItem(item.id)}
                                className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${item.checked ? 'bg-emerald-500 border-emerald-500 text-slate-900 dark:text-white' : 'border-slate-600 hover:border-emerald-500'}`}
                              >
                                  {item.checked && <Check size={14} />}
                              </button>
                              
                              <div className={item.checked ? 'line-through text-slate-500' : ''}>
                                  <div className="flex items-center gap-2">
                                      {getIcon(item.type)}
                                      <h3 className="font-bold text-slate-900 dark:text-white">{item.name}</h3>
                                      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400">{item.dosage}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                      <Clock size={12} />
                                      {item.time} • {item.type}
                                  </div>
                              </div>
                          </div>
                          
                          <button 
                            onClick={() => deleteProtocolItem(item.id)}
                            className="text-slate-600 hover:text-red-500 p-2 transition-colors"
                          >
                              <Trash2 size={16} />
                          </button>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};
