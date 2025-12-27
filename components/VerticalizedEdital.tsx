import React, { useMemo } from 'react';
import { useStore } from '../store';
import { Weight, Relevance, WEIGHT_SCORE, RELEVANCE_SCORE } from '../types';
import { CheckSquare, Square, AlertCircle, ArrowUpCircle, CheckCircle2, ListChecks, Search } from 'lucide-react';

export const VerticalizedEdital: React.FC = () => {
  const { notebooks, updateNotebookAccuracy, moveNotebookToWeek } = useStore();
  const [searchTerm, setSearchTerm] = React.useState('');

  const verticalizedData = useMemo(() => {
    let filtered = notebooks.filter(n => n.discipline !== 'Revisão Geral');

    if (searchTerm) {
        filtered = filtered.filter(n => 
            n.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            n.discipline.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Sort by Discipline then Name
    filtered.sort((a, b) => a.discipline.localeCompare(b.discipline) || a.name.localeCompare(b.name));

    // Grouping
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(nb => {
        if (!groups[nb.discipline]) groups[nb.discipline] = [];
        groups[nb.discipline].push(nb);
    });

    return groups;
  }, [notebooks, searchTerm]);

  const getSuggestion = (nb: any) => {
      const score = WEIGHT_SCORE[nb.weight] + RELEVANCE_SCORE[nb.relevance];
      const isScheduled = !!nb.weekId;
      
      if (!isScheduled && score >= 6) {
          return {
              text: "Prioridade: Inserir no Ciclo",
              icon: <AlertCircle size={14} />,
              color: "text-red-400",
              bg: "bg-red-500/10 border-red-500/20"
          };
      }
      
      if (isScheduled && score >= 7 && nb.accuracy < 60) {
          return {
              text: "Aumentar Frequência",
              icon: <ArrowUpCircle size={14} />,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/20"
          };
      }

      if (isScheduled) {
          return {
            text: "No Planejamento",
            icon: <CheckCircle2 size={14} />,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-500/20"
          };
      }

      return null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ListChecks className="text-emerald-500" /> Edital Verticalizado Inteligente
          </h1>
          <p className="text-slate-400 mt-1">
            Auditoria de cobertura do conteúdo programático cruzado com seu ciclo de estudos.
          </p>
        </div>
        <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
             <input 
                type="text" 
                placeholder="Filtrar tópicos..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-emerald-500 outline-none"
             />
        </div>
      </div>

      <div className="space-y-6">
          {Object.keys(verticalizedData).length === 0 && (
              <div className="text-center py-20 opacity-50">
                  <ListChecks size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">Nenhum tópico encontrado. Cadastre suas disciplinas no "Banco de Dados".</p>
              </div>
          )}

          {Object.keys(verticalizedData).map(discipline => (
              <div key={discipline} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-white">{discipline}</h3>
                      <span className="text-xs text-slate-500 font-mono">{verticalizedData[discipline].length} tópicos</span>
                  </div>
                  <div className="divide-y divide-slate-800/50">
                      {verticalizedData[discipline].map(nb => {
                          const suggestion = getSuggestion(nb);
                          return (
                              <div key={nb.id} className="px-6 py-3 flex flex-col md:flex-row items-center gap-4 hover:bg-slate-800/20 transition-colors">
                                  <div className="flex items-center gap-3 flex-1 w-full">
                                      <div className={`text-slate-500`}>
                                          {nb.weekId ? <CheckSquare size={18} className="text-emerald-500"/> : <Square size={18} />}
                                      </div>
                                      <div>
                                          <p className={`text-sm font-medium ${nb.weekId ? 'text-slate-200' : 'text-slate-400'}`}>{nb.name}</p>
                                          {nb.subtitle && <p className="text-xs text-slate-500">{nb.subtitle}</p>}
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                      <div className="flex flex-col items-end">
                                          <span className="text-[10px] uppercase font-bold text-slate-500">Peso</span>
                                          <span className="text-xs text-white">{nb.weight}</span>
                                      </div>
                                      
                                      <div className="flex flex-col items-end min-w-[100px]">
                                          <span className="text-[10px] uppercase font-bold text-slate-500">Relevância</span>
                                          <span className="text-xs text-white">{nb.relevance}</span>
                                      </div>

                                      <div className="min-w-[160px] flex justify-end">
                                          {suggestion && (
                                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-bold ${suggestion.bg} ${suggestion.color}`}>
                                                  {suggestion.icon} {suggestion.text}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
