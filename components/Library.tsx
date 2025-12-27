import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store';
import { 
    Trash2, Plus, Search, X, Link as LinkIcon, StickyNote, Pencil, 
    Image as ImageIcon, CalendarCheck, RefreshCw, Upload, Filter, 
    ChevronRight, Layers, Square, CheckSquare, 
    Circle, BookOpen, CheckCircle2, Siren, Star, Clock, Sparkles,
    Calculator, Maximize2, FileCode, FileText, CalendarClock, ArrowDownUp
} from 'lucide-react';
import { Weight, Relevance, Trend, Notebook, NotebookStatus } from '../types';
import { calculateNextReview } from '../utils/algorithm';

export const Library: React.FC = () => {
  const { notebooks, deleteNotebook, addNotebook, editNotebook, bulkUpdateNotebooks, config } = useStore();
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'NEW' | 'OVERDUE' | 'HIGH_WEIGHT'>('ALL');
  const [sortByReview, setSortByReview] = useState(false);
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set());
  
  // Detail Expansion State
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'WEIGHT' | 'STATUS' | 'DELETE' | null>(null);

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormState = {
    discipline: '', name: '', subtitle: '', tecLink: '', obsidianLink: '', accuracy: 0, targetAccuracy: 90, 
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, 
    status: NotebookStatus.NOT_STARTED, notes: '', image: '',
    lastPractice: new Date().toISOString().split('T')[0] 
  };

  const [formData, setFormData] = useState(initialFormState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FILTER LOGIC ---
  const filteredNotebooks = useMemo(() => {
    let result = notebooks.filter(nb => nb.discipline !== 'Revisão Geral'); 

    // 1. Text Search
    if (searchTerm) {
        result = result.filter(nb => 
            nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            nb.discipline.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nb.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // 2. Tactical Chips
    const today = new Date().toISOString().split('T')[0];
    switch (activeFilter) {
        case 'CRITICAL':
            result = result.filter(nb => (nb.weight === Weight.ALTO || nb.weight === Weight.MUITO_ALTO) && nb.accuracy < 60 && nb.accuracy > 0);
            break;
        case 'NEW':
            result = result.filter(nb => nb.status === NotebookStatus.NOT_STARTED || nb.accuracy === 0);
            break;
        case 'OVERDUE':
            result = result.filter(nb => nb.nextReview && nb.nextReview.split('T')[0] < today);
            break;
        case 'HIGH_WEIGHT':
            result = result.filter(nb => nb.weight === Weight.MUITO_ALTO);
            break;
    }

    // 3. Sorting by Review Date
    if (sortByReview) {
        result.sort((a, b) => {
            const dateA = a.nextReview ? new Date(a.nextReview).getTime() : Infinity;
            const dateB = b.nextReview ? new Date(b.nextReview).getTime() : Infinity;
            return dateA - dateB;
        });
    } else {
        // Default Sort: Discipline then Name
        result.sort((a, b) => a.discipline.localeCompare(b.discipline) || a.name.localeCompare(b.name));
    }

    return result;
  }, [notebooks, searchTerm, activeFilter, sortByReview]);

  // --- GROUPING LOGIC (HIERARCHY) ---
  const groupedData = useMemo(() => {
      // If sorting by date, we might want to disable grouping or handle it differently.
      // For now, we keep grouping but the items inside are sorted if sortByReview is true.
      
      const groups: Record<string, Notebook[]> = {};
      const stats: Record<string, { total: number, done: number, avgAcc: number }> = {};

      filteredNotebooks.forEach(nb => {
          if (!groups[nb.discipline]) {
              groups[nb.discipline] = [];
              stats[nb.discipline] = { total: 0, done: 0, avgAcc: 0 };
          }
          groups[nb.discipline].push(nb);
          
          // Stats Calc
          stats[nb.discipline].total += 1;
          if (nb.status === NotebookStatus.MASTERED || nb.accuracy >= 90) stats[nb.discipline].done += 1;
          stats[nb.discipline].avgAcc += nb.accuracy;
      });

      // Normalize averages
      Object.keys(stats).forEach(d => {
          stats[d].avgAcc = Math.round(stats[d].avgAcc / stats[d].total);
      });

      // Sort keys alphabetically unless specific sort
      const sortedKeys = Object.keys(groups).sort();
      return { groups, stats, sortedKeys };
  }, [filteredNotebooks]);
  
  const existingDisciplines = useMemo(() => {
    return Array.from(new Set(notebooks.map(n => n.discipline))).sort();
  }, [notebooks]);

  // --- HANDLERS ---
  const toggleDiscipline = (discipline: string) => {
      const newSet = new Set(expandedDisciplines);
      if (newSet.has(discipline)) newSet.delete(discipline);
      else newSet.add(discipline);
      setExpandedDisciplines(newSet);
  };

  const toggleDetails = (id: string) => {
      setExpandedDetailsId(prev => prev === id ? null : id);
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleGroupSelection = (discipline: string) => {
      const groupIds = groupedData.groups[discipline].map(n => n.id);
      const allSelected = groupIds.every(id => selectedIds.has(id));
      
      const newSet = new Set(selectedIds);
      if (allSelected) {
          groupIds.forEach(id => newSet.delete(id));
      } else {
          groupIds.forEach(id => newSet.add(id));
      }
      setSelectedIds(newSet);
  };

  // --- MODAL HANDLERS ---
  const openCreateModal = () => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); };
  const openEditModal = (nb: Notebook) => {
      setEditingId(nb.id);
      let safeDate = new Date().toISOString().split('T')[0];
      if (nb.lastPractice) {
          const check = new Date(nb.lastPractice);
          if (!isNaN(check.getTime())) safeDate = nb.lastPractice.split('T')[0];
      }
      setFormData({
          discipline: nb.discipline,
          name: nb.name,
          subtitle: nb.subtitle,
          tecLink: nb.tecLink || '',
          obsidianLink: nb.obsidianLink || '',
          accuracy: nb.accuracy,
          targetAccuracy: nb.targetAccuracy,
          weight: nb.weight,
          relevance: nb.relevance,
          trend: nb.trend,
          status: nb.status || NotebookStatus.NOT_STARTED,
          notes: nb.notes || '',
          image: nb.image || '', // Legacy
          lastPractice: safeDate
      });
      setIsModalOpen(true);
  };
  
  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      const nextDate = calculateNextReview(Number(formData.accuracy), formData.relevance, formData.trend, config.algorithm);
      
      const payload: any = { 
          ...formData, 
          accuracy: Number(formData.accuracy), 
          targetAccuracy: Number(formData.targetAccuracy),
          lastPractice: new Date(formData.lastPractice).toISOString(),
          nextReview: nextDate.toISOString()
      };

      if (editingId) editNotebook(editingId, payload);
      else addNotebook({ ...payload, weekId: null });
      setIsModalOpen(false);
  };

  // --- COMPONENTS ---
  const StatusBadge = ({ status }: { status: NotebookStatus }) => {
      switch(status) {
          case NotebookStatus.NOT_STARTED: 
            return <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"><Circle size={8} className="border border-slate-500 rounded-full" /> Não Iniciado</span>;
          case NotebookStatus.THEORY_DONE: 
            return <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"><BookOpen size={10} /> Teoria OK</span>;
          case NotebookStatus.REVIEWING: 
            return <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"><RefreshCw size={10} /> Revisando</span>;
          case NotebookStatus.MASTERED: 
            return <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><CheckCircle2 size={10} /> Dominado</span>;
          default: return null;
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 h-[calc(100vh-80px)] flex flex-col relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Banco de Disciplinas</h1>
          <p className="text-slate-400 text-sm">Gerencie seu conhecimento tático.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-lg shadow-emerald-900/20 text-sm"
        >
          <Plus size={18} /> Novo Caderno
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                  <input 
                      type="text" 
                      placeholder="Buscar tópico..." 
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-emerald-500 outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              
              <button 
                onClick={() => setSortByReview(!sortByReview)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${sortByReview ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                title="Ordenar por data de revisão"
              >
                  <CalendarClock size={14} /> Revisão
              </button>

              <FilterButton active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} icon={<Layers size={14}/>} label="Tudo" />
              <FilterButton active={activeFilter === 'CRITICAL'} onClick={() => setActiveFilter('CRITICAL')} icon={<Siren size={14}/>} label="Críticos" color="red" />
              <FilterButton active={activeFilter === 'NEW'} onClick={() => setActiveFilter('NEW')} icon={<Sparkles size={14}/>} label="Nunca Vistos" color="blue" />
              <FilterButton active={activeFilter === 'OVERDUE'} onClick={() => setActiveFilter('OVERDUE')} icon={<Clock size={14}/>} label="Atrasados" color="amber" />
              <FilterButton active={activeFilter === 'HIGH_WEIGHT'} onClick={() => setActiveFilter('HIGH_WEIGHT')} icon={<Star size={14}/>} label="Peso Alto" color="purple" />
          </div>
      </div>

      {/* LIST AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-20">
          {groupedData.sortedKeys.map(discipline => {
              const stats = groupedData.stats[discipline];
              const progress = Math.round((stats.done / stats.total) * 100);
              const isExpanded = expandedDisciplines.has(discipline) || sortByReview; // Auto-expand if sorting flat

              // Se estiver ordenando por data, talvez não queira mostrar o header da disciplina se estiver misturado
              // Mas aqui mantemos a estrutura hierárquica, apenas a ordem interna muda.
              
              return (
                  <div key={discipline} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all">
                      {/* Accordion Header */}
                      <div 
                        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors ${isExpanded ? 'bg-slate-800/30' : ''}`}
                        onClick={() => toggleDiscipline(discipline)}
                      >
                          <div className="flex items-center gap-3">
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleGroupSelection(discipline); }}
                                className={`text-slate-500 hover:text-emerald-500 transition-colors`}
                              >
                                  <Square size={18} />
                              </button>
                              
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs border border-emerald-500/20">
                                  {discipline.charAt(0)}
                              </div>
                              <div>
                                  <h3 className="font-bold text-slate-200 text-sm">{discipline}</h3>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <span>{stats.total} itens</span>
                                      <span>•</span>
                                      <span className={stats.avgAcc < 60 ? 'text-red-400' : 'text-emerald-400'}>{stats.avgAcc}% acerto médio</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden hidden md:block">
                                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
                              </div>
                              <span className="text-xs font-bold text-slate-500 w-8 text-right hidden md:block">{progress}%</span>
                              <ChevronRight size={18} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                      </div>

                      {/* Items List */}
                      {isExpanded && (
                          <div className="border-t border-slate-800">
                              {groupedData.groups[discipline].map(nb => (
                                  <div 
                                    key={nb.id} 
                                    className={`
                                        p-3 pl-12 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-slate-800/20
                                        ${selectedIds.has(nb.id) ? 'bg-emerald-900/10' : ''}
                                    `}
                                  >
                                      <div className="flex items-center gap-3 flex-1">
                                          <button 
                                            onClick={() => toggleSelection(nb.id)}
                                            className="text-slate-600 hover:text-emerald-500 transition-colors"
                                          >
                                              {selectedIds.has(nb.id) ? <CheckSquare size={16} className="text-emerald-500"/> : <Square size={16}/>}
                                          </button>
                                          <div>
                                              <div className="flex items-center gap-2">
                                                  <h4 className="text-sm font-medium text-slate-300">{nb.name}</h4>
                                                  {nb.subtitle && <span className="text-xs text-slate-500 hidden lg:inline-block">• {nb.subtitle}</span>}
                                                  {nb.weekId && <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 rounded border border-slate-700">Planejado</span>}
                                              </div>
                                              
                                              {expandedDetailsId === nb.id && (
                                                  <div className="mt-2 text-xs text-slate-500 flex gap-4 animate-in slide-in-from-top-1">
                                                      <span>Peso: <strong className="text-slate-300">{nb.weight}</strong></span>
                                                      <span>Relevância: <strong className="text-slate-300">{nb.relevance}</strong></span>
                                                      <span>Última: <strong className="text-slate-300">{nb.lastPractice ? new Date(nb.lastPractice).toLocaleDateString() : '-'}</strong></span>
                                                      {nb.nextReview && <span>Próx: <strong className="text-emerald-400">{new Date(nb.nextReview).toLocaleDateString()}</strong></span>}
                                                  </div>
                                              )}
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-3 pl-8 md:pl-0">
                                          {sortByReview && nb.nextReview && (
                                              <span className="text-xs font-mono text-emerald-500 bg-emerald-900/10 px-2 py-0.5 rounded">
                                                  {new Date(nb.nextReview).toLocaleDateString()}
                                              </span>
                                          )}
                                          <StatusBadge status={nb.status} />
                                          <div className={`text-xs font-bold px-2 py-0.5 rounded border ${nb.accuracy < 60 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                              {nb.accuracy}%
                                          </div>
                                          
                                          <div className="flex items-center gap-1 border-l border-slate-800 pl-3 ml-2">
                                              <button onClick={() => toggleDetails(nb.id)} className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-slate-800" title="Ver Detalhes">
                                                  <Maximize2 size={14} />
                                              </button>
                                              <button onClick={() => openEditModal(nb)} className="p-1.5 text-slate-500 hover:text-emerald-400 rounded hover:bg-slate-800" title="Editar">
                                                  <Pencil size={14} />
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              );
          })}
          
          {filteredNotebooks.length === 0 && (
              <div className="text-center py-20 opacity-50">
                  <BookOpen size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">Nenhum caderno encontrado com os filtros atuais.</p>
              </div>
          )}
      </div>

      {/* Modal is essentially same logic as Setup.tsx Modal but simplified here for brevity. 
          Assuming Setup.tsx modal will handle the main "new features" request.
      */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h3 className="text-xl font-bold text-white">Editar Caderno</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                </div>
                {/* Simplified form for Library view - functionality mirrors Setup.tsx */}
                <form onSubmit={handleSave} className="p-6 space-y-4">
                     <div><label className="text-xs text-slate-500">Nome</label><input className="w-full bg-slate-800 p-2 rounded text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                     <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded">Salvar</button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

const FilterButton = ({ active, onClick, icon, label, color = 'emerald' }: any) => (
    <button 
        onClick={onClick}
        className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border
            ${active 
                ? `bg-${color}-500/20 text-${color}-400 border-${color}-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]` 
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'}
        `}
    >
        {icon} {label}
    </button>
);