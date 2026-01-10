import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { Notebook, NotebookStatus } from '../types';
import { 
    CalendarCheck, AlertCircle, Clock, CalendarCheck2, 
    Edit2, Search, ArrowRight, Calendar, Filter
} from 'lucide-react';

interface Props {
    onNavigate?: (view: string) => void;
}

type FilterType = 'all' | 'critical' | 'today' | 'future';

export const ReviewList: React.FC<Props> = ({ onNavigate }) => {
  const { notebooks, setFocusedNotebookId, config } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // --- DATA PROCESSING ---
  const categorizedData = useMemo(() => {
      const today = new Date();
      today.setHours(0,0,0,0);

      const overdue: Notebook[] = [];
      const todayList: Notebook[] = [];
      const future: Notebook[] = [];

      const filtered = notebooks.filter(nb => {
          if (nb.discipline === 'Revisão Geral') return false;
          
          // EXCLUDE NOT STARTED ITEMS
          // Items that haven't been started (0% accuracy + Not Started status) are "Acquisition", not "Review".
          if (nb.status === NotebookStatus.NOT_STARTED && nb.accuracy === 0) return false;

          if (searchTerm && !nb.name.toLowerCase().includes(searchTerm.toLowerCase()) && !nb.discipline.toLowerCase().includes(searchTerm.toLowerCase())) return false;
          return !!nb.nextReview;
      });

      filtered.forEach(nb => {
          if (!nb.nextReview) return;
          const reviewDate = new Date(nb.nextReview);
          reviewDate.setHours(0,0,0,0); // Normalize time for comparison

          if (reviewDate.getTime() < today.getTime()) {
              overdue.push(nb);
          } else if (reviewDate.getTime() === today.getTime()) {
              todayList.push(nb);
          } else {
              future.push(nb);
          }
      });

      // Sort: Oldest due date first (Most critical)
      overdue.sort((a, b) => new Date(a.nextReview!).getTime() - new Date(b.nextReview!).getTime());
      
      // Sort: Alphabetical for Today
      todayList.sort((a, b) => a.discipline.localeCompare(b.discipline));

      // Sort: Nearest future date first
      future.sort((a, b) => new Date(a.nextReview!).getTime() - new Date(b.nextReview!).getTime());

      return { overdue, todayList, future };
  }, [notebooks, searchTerm]);

  // --- NAVIGATION HANDLER ---
  const handleEdit = useCallback((notebook: Notebook) => {
      setFocusedNotebookId(notebook.id);
      if (onNavigate) {
          onNavigate('library');
      } else {
          console.warn("onNavigate is undefined in ReviewList");
      }
  }, [setFocusedNotebookId, onNavigate]);

  const getDaysDiff = (dateStr: string) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const target = new Date(dateStr);
      target.setHours(0,0,0,0);
      const diffTime = target.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getWeekLabel = (dateStr: string) => {
      if (!config.startDate) return null;
      const start = new Date(config.startDate);
      start.setHours(0,0,0,0);
      const target = new Date(dateStr);
      target.setHours(0,0,0,0);
      
      const diffTime = target.getTime() - start.getTime();
      if (diffTime < 0) return null; // Date is before start date
      
      const weekNum = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
      return `Semana ${weekNum}`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20 relative h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-6 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarCheck className="text-emerald-500" /> Lista de Revisão
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Organização inteligente baseada na urgência do algoritmo.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Filtrar revisões..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-emerald-500 outline-none"
                />
            </div>
            {activeFilter !== 'all' && (
                <button onClick={() => setActiveFilter('all')} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 text-xs font-bold transition-colors">
                    <Filter size={14} /> Limpar
                </button>
            )}
        </div>
      </div>

      {/* Stats Cards (Interactive) */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
          <button 
            onClick={() => setActiveFilter(activeFilter === 'critical' ? 'all' : 'critical')}
            className={`p-4 rounded-xl flex items-center gap-4 transition-all border text-left group
                ${activeFilter === 'critical' 
                    ? 'bg-red-900/30 border-red-500/50 shadow-lg shadow-red-900/20' 
                    : 'bg-slate-900/50 border-red-500/20 hover:bg-slate-900 hover:border-red-500/40'}
            `}
          >
              <div className={`p-3 rounded-lg transition-colors ${activeFilter === 'critical' ? 'bg-red-500 text-white' : 'bg-red-900/20 text-red-500 group-hover:text-red-400'}`}><AlertCircle size={20}/></div>
              <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${activeFilter === 'critical' ? 'text-red-300' : 'text-red-400'}`}>Críticos</p>
                  <p className="text-2xl font-bold text-white">{categorizedData.overdue.length}</p>
              </div>
          </button>

          <button 
            onClick={() => setActiveFilter(activeFilter === 'today' ? 'all' : 'today')}
            className={`p-4 rounded-xl flex items-center gap-4 transition-all border text-left group
                ${activeFilter === 'today' 
                    ? 'bg-emerald-900/30 border-emerald-500/50 shadow-lg shadow-emerald-900/20' 
                    : 'bg-slate-900/50 border-emerald-500/20 hover:bg-slate-900 hover:border-emerald-500/40'}
            `}
          >
              <div className={`p-3 rounded-lg transition-colors ${activeFilter === 'today' ? 'bg-emerald-500 text-white' : 'bg-emerald-900/20 text-emerald-500 group-hover:text-emerald-400'}`}><CalendarCheck2 size={20}/></div>
              <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${activeFilter === 'today' ? 'text-emerald-300' : 'text-emerald-400'}`}>Hoje</p>
                  <p className="text-2xl font-bold text-white">{categorizedData.todayList.length}</p>
              </div>
          </button>

          <button 
            onClick={() => setActiveFilter(activeFilter === 'future' ? 'all' : 'future')}
            className={`p-4 rounded-xl flex items-center gap-4 transition-all border text-left group
                ${activeFilter === 'future' 
                    ? 'bg-blue-900/30 border-blue-500/50 shadow-lg shadow-blue-900/20' 
                    : 'bg-slate-900/50 border-slate-800 hover:bg-slate-900 hover:border-slate-600'}
            `}
          >
              <div className={`p-3 rounded-lg transition-colors ${activeFilter === 'future' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}><Clock size={20}/></div>
              <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${activeFilter === 'future' ? 'text-blue-300' : 'text-slate-500'}`}>Futuros</p>
                  <p className="text-2xl font-bold text-white">{categorizedData.future.length}</p>
              </div>
          </button>
      </div>

      {/* Main Lists */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
          
          {/* SECTION: OVERDUE */}
          {categorizedData.overdue.length > 0 && (activeFilter === 'all' || activeFilter === 'critical') && (
              <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest text-xs mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Atrasados (Prioridade Máxima)
                  </div>
                  {categorizedData.overdue.map(nb => {
                      const days = Math.abs(getDaysDiff(nb.nextReview!));
                      return (
                          <div key={nb.id} className="group bg-slate-900 border border-red-900/30 hover:border-red-500/50 p-4 rounded-xl transition-all hover:bg-slate-800 flex items-center justify-between shadow-lg shadow-red-900/5 cursor-pointer" onClick={() => handleEdit(nb)}>
                              <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                                          Vencido há {days} {days === 1 ? 'dia' : 'dias'}
                                      </span>
                                      <h3 className="font-bold text-slate-200 truncate">{nb.discipline}</h3>
                                  </div>
                                  <p className="text-sm text-slate-400 truncate">{nb.name} <span className="opacity-50 text-xs">• {nb.subtitle}</span></p>
                              </div>
                              <div className="flex items-center gap-4">
                                  <div className="text-right hidden sm:block">
                                      <p className="text-[10px] text-slate-500 uppercase font-bold">Acurácia</p>
                                      <p className={`font-mono font-bold text-sm ${nb.accuracy < 60 ? 'text-red-400' : 'text-emerald-400'}`}>{nb.accuracy}%</p>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={(e) => { e.stopPropagation(); handleEdit(nb); }} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors group-hover:bg-slate-700" title="Abrir Editor Principal">
                                          <ArrowRight size={16} />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </section>
          )}

          {/* SECTION: TODAY */}
          {(activeFilter === 'all' || activeFilter === 'today') && (
              <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-xs mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Para Hoje
                  </div>
                  {categorizedData.todayList.length === 0 && (
                      <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-600 text-sm">
                          Tudo em dia! Nenhuma revisão agendada especificamente para hoje.
                      </div>
                  )}
                  {categorizedData.todayList.map(nb => (
                      <div key={nb.id} className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl transition-all hover:bg-slate-800 flex items-center justify-between cursor-pointer" onClick={() => handleEdit(nb)}>
                          <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                                      Hoje
                                  </span>
                                  <h3 className="font-bold text-slate-200 truncate">{nb.discipline}</h3>
                              </div>
                              <p className="text-sm text-slate-400 truncate">{nb.name} <span className="opacity-50 text-xs">• {nb.subtitle}</span></p>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                  <p className="text-[10px] text-slate-500 uppercase font-bold">Acurácia</p>
                                  <p className={`font-mono font-bold text-sm ${nb.accuracy < 60 ? 'text-red-400' : 'text-emerald-400'}`}>{nb.accuracy}%</p>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); handleEdit(nb); }} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors group-hover:bg-slate-700" title="Abrir Editor Principal">
                                      <Edit2 size={16} />
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </section>
          )}

          {/* SECTION: FUTURE */}
          {categorizedData.future.length > 0 && (activeFilter === 'all' || activeFilter === 'future') && (
              <section className="space-y-3 opacity-80 hover:opacity-100 transition-opacity animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-xs mb-2 mt-6">
                      <div className="w-2 h-2 rounded-full bg-slate-600"></div> Próximos
                  </div>
                  {categorizedData.future.slice(0, activeFilter === 'future' ? 100 : 10).map(nb => {
                      const days = getDaysDiff(nb.nextReview!);
                      const weekLabel = getWeekLabel(nb.nextReview!);
                      return (
                          <div key={nb.id} className="group bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center justify-between cursor-pointer" onClick={() => handleEdit(nb)}>
                              <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-slate-300 text-sm truncate">{nb.discipline}</h3>
                                      <div className="flex gap-2">
                                          <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 rounded border border-slate-800">
                                              Em {days} dias
                                          </span>
                                          {weekLabel && (
                                              <span className="text-[10px] text-emerald-500 bg-emerald-900/10 px-1.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                                  <Calendar size={8} /> {weekLabel}
                                              </span>
                                          )}
                                      </div>
                                  </div>
                                  <p className="text-xs text-slate-500 truncate">{nb.name}</p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleEdit(nb); }} className="text-slate-600 hover:text-white transition-colors" title="Abrir Editor">
                                  <Edit2 size={14} />
                              </button>
                          </div>
                      );
                  })}
                  {categorizedData.future.length > 10 && activeFilter === 'all' && (
                      <p className="text-center text-xs text-slate-600 pt-2">E mais {categorizedData.future.length - 10} agendados...</p>
                  )}
              </section>
          )}
      </div>
    </div>
  );
};