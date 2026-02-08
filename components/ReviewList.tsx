import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { Notebook, NotebookStatus, Weight } from '../types';
import { DEFAULT_ALGO_CONFIG } from '../utils/algorithm';
import { 
    CalendarCheck, AlertCircle, Clock, CalendarCheck2, 
    Edit2, Search, ArrowRight, Calendar, Filter, ChevronDown, ChevronRight, CheckCircle2
} from 'lucide-react';

interface Props {
    onNavigate?: (view: string) => void;
}

type FilterType = 'all' | 'critical' | 'today' | 'future';

export const ReviewList: React.FC<Props> = ({ onNavigate }) => {
  const { notebooks, setFocusedNotebookId, config, cycles, activeCycleId } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  // New Filters
  const [disciplineFilter, setDisciplineFilter] = useState('');
  const [weightFilter, setWeightFilter] = useState('');
  
  // State for Accordions
  const [expandedSections, setExpandedSections] = useState({
      critical: true,
      today: true,
      future: false // Future closed by default to save space
  });

  const toggleSection = (section: 'critical' | 'today' | 'future') => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Derived Data
  const uniqueDisciplines = useMemo(() => Array.from(new Set(notebooks.map(n => n.discipline))).sort(), [notebooks]);

  // --- CHECK PLANNED STATUS ---
  // Identifica quais cadernos já estão agendados no ciclo ativo
  const scheduledIds = useMemo(() => {
      const activeCycle = cycles.find(c => c.id === activeCycleId);
      const ids = new Set<string>();
      
      if (activeCycle?.schedule) {
          Object.values(activeCycle.schedule).forEach((slots: any) => {
              if (Array.isArray(slots)) {
                  slots.forEach(s => {
                      if (s && s.notebookId) ids.add(s.notebookId);
                  });
              }
          });
      }
      return ids;
  }, [cycles, activeCycleId]);

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
          if (nb.status === NotebookStatus.NOT_STARTED && nb.accuracy === 0) return false;

          // Search Logic
          if (searchTerm && !nb.name.toLowerCase().includes(searchTerm.toLowerCase()) && !nb.discipline.toLowerCase().includes(searchTerm.toLowerCase())) return false;
          
          // Specific Filters
          if (disciplineFilter && nb.discipline !== disciplineFilter) return false;
          if (weightFilter && nb.weight !== weightFilter) return false;

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
  }, [notebooks, searchTerm, disciplineFilter, weightFilter]);

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

  // Helper to handle filter clicks (now also ensures the section is expanded)
  const handleFilterClick = (filter: FilterType) => {
      if (activeFilter === filter) {
          setActiveFilter('all');
      } else {
          setActiveFilter(filter);
          // Auto-expand the selected section
          setExpandedSections(prev => ({
              critical: filter === 'critical' ? true : prev.critical,
              today: filter === 'today' ? true : prev.today,
              future: filter === 'future' ? true : prev.future
          }));
      }
  };

  const clearAllFilters = () => {
      setActiveFilter('all');
      setSearchTerm('');
      setDisciplineFilter('');
      setWeightFilter('');
  };

  const hasActiveFilters = activeFilter !== 'all' || searchTerm || disciplineFilter || weightFilter;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20 relative h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end border-b border-slate-800 pb-6 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarCheck className="text-emerald-500" /> Lista de Revisão
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Organização inteligente baseada na urgência do algoritmo.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
            
            {/* Discipline Dropdown */}
            <div className="relative w-full md:w-48">
                <select 
                    value={disciplineFilter}
                    onChange={(e) => setDisciplineFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-3 pr-8 text-xs text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-800"
                >
                    <option value="">Todas Disciplinas</option>
                    {uniqueDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500"><ChevronDown size={12} /></div>
            </div>

            {/* Weight Dropdown */}
            <div className="relative w-full md:w-40">
                <select 
                    value={weightFilter}
                    onChange={(e) => setWeightFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-3 pr-8 text-xs text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-800"
                >
                    <option value="">Qualquer Peso</option>
                    {Object.values(Weight).map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500"><ChevronDown size={12} /></div>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 w-full md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-emerald-500 outline-none"
                />
            </div>

            {/* Clear Button */}
            {hasActiveFilters && (
                <button onClick={clearAllFilters} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 text-xs font-bold transition-colors whitespace-nowrap">
                    <Filter size={14} /> Limpar
                </button>
            )}
        </div>
      </div>

      {/* Stats Cards (Interactive) */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
          <button 
            onClick={() => handleFilterClick('critical')}
            className={`p-4 rounded-xl flex items-center gap-4 transition-all border text-left group
                ${activeFilter === 'critical' 
                    ? 'bg-red-900/30 border-red-500/50 shadow-lg shadow-red-900/20 scale-[1.02]' 
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
            onClick={() => handleFilterClick('today')}
            className={`p-4 rounded-xl flex items-center gap-4 transition-all border text-left group
                ${activeFilter === 'today' 
                    ? 'bg-emerald-900/30 border-emerald-500/50 shadow-lg shadow-emerald-900/20 scale-[1.02]' 
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
            onClick={() => handleFilterClick('future')}
            className={`p-4 rounded-xl flex items-center gap-4 transition-all border text-left group
                ${activeFilter === 'future' 
                    ? 'bg-blue-900/30 border-blue-500/50 shadow-lg shadow-blue-900/20 scale-[1.02]' 
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

      {/* Main Lists - Accordion Style */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
          
          {/* SECTION: OVERDUE */}
          {(activeFilter === 'all' || activeFilter === 'critical') && (
              <div className="bg-slate-900/50 border border-red-900/30 rounded-xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleSection('critical')}
                    className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800/80 transition-colors group"
                  >
                      <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${expandedSections.critical ? 'bg-red-500 text-white' : 'bg-red-900/20 text-red-500'}`}>
                              {expandedSections.critical ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                          <div className="text-left">
                              <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                                  Atrasados (Prioridade Máxima)
                              </h3>
                          </div>
                      </div>
                      <span className="text-xs font-bold bg-slate-950 text-slate-400 px-2 py-1 rounded border border-slate-800">
                          {categorizedData.overdue.length}
                      </span>
                  </button>

                  {expandedSections.critical && (
                      <div className="p-3 space-y-3 border-t border-red-900/20 bg-red-900/5">
                          {categorizedData.overdue.length === 0 && (
                              <div className="text-center py-4 text-slate-500 text-xs italic">Nenhum item atrasado.</div>
                          )}
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
                      </div>
                  )}
              </div>
          )}

          {/* SECTION: TODAY */}
          {(activeFilter === 'all' || activeFilter === 'today') && (
              <div className="bg-slate-900/50 border border-emerald-900/30 rounded-xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleSection('today')}
                    className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800/80 transition-colors group"
                  >
                      <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${expandedSections.today ? 'bg-emerald-500 text-white' : 'bg-emerald-900/20 text-emerald-500'}`}>
                              {expandedSections.today ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                          <div className="text-left">
                              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                  Para Hoje
                              </h3>
                          </div>
                      </div>
                      <span className="text-xs font-bold bg-slate-950 text-slate-400 px-2 py-1 rounded border border-slate-800">
                          {categorizedData.todayList.length}
                      </span>
                  </button>

                  {expandedSections.today && (
                      <div className="p-3 space-y-3 border-t border-emerald-900/20 bg-emerald-900/5">
                          {categorizedData.todayList.length === 0 && (
                              <div className="p-6 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-600 text-sm flex flex-col items-center">
                                  <CheckCircle2 size={24} className="mb-2 text-emerald-500/50" />
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
                      </div>
                  )}
              </div>
          )}

          {/* SECTION: FUTURE */}
          {(activeFilter === 'all' || activeFilter === 'future') && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleSection('future')}
                    className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800/80 transition-colors group"
                  >
                      <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${expandedSections.future ? 'bg-blue-500 text-white' : 'bg-slate-800 text-blue-500'}`}>
                              {expandedSections.future ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                          <div className="text-left">
                              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                  Próximos
                              </h3>
                          </div>
                      </div>
                      <span className="text-xs font-bold bg-slate-950 text-slate-400 px-2 py-1 rounded border border-slate-800">
                          {categorizedData.future.length}
                      </span>
                  </button>

                  {expandedSections.future && (
                      <div className="p-3 space-y-3 border-t border-slate-800 bg-slate-950/30">
                          {categorizedData.future.length === 0 && (
                              <div className="text-center py-4 text-slate-500 text-xs italic">Nenhum item futuro agendado.</div>
                          )}
                          {categorizedData.future.slice(0, activeFilter === 'future' ? 100 : 20).map(nb => {
                              const days = getDaysDiff(nb.nextReview!);
                              const weekLabel = getWeekLabel(nb.nextReview!);
                              const isPlanned = scheduledIds.has(nb.id);

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
                                                      <span className={`text-[10px] px-1.5 rounded border flex items-center gap-1 ${isPlanned ? 'bg-indigo-900/20 text-indigo-400 border-indigo-500/20' : 'bg-emerald-900/10 text-emerald-500 border-emerald-500/20'}`}>
                                                          <Calendar size={8} /> {weekLabel} {isPlanned && <CheckCircle2 size={8} className="ml-0.5" />}
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
                          {categorizedData.future.length > 20 && activeFilter === 'all' && (
                              <p className="text-center text-xs text-slate-600 pt-2 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleFilterClick('future')}>
                                  E mais {categorizedData.future.length - 20} agendados (clique para ver todos)
                              </p>
                          )}
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};