
import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store';
import { 
    Trash2, Plus, Search, X, Link as LinkIcon, StickyNote, Pencil, 
    Image as ImageIcon, CalendarCheck, RefreshCw, Upload, Filter, 
    ChevronDown, ChevronRight, Layers, Square, CheckSquare, 
    MoreHorizontal, Circle, BookOpen, CheckCircle2, Siren, Star, Clock, Sparkles,
    Calendar, Calculator, ChevronUp, FileText, Maximize2, FileCode
} from 'lucide-react';
import { Weight, Relevance, Trend, Notebook, NotebookStatus, WEIGHT_SCORE } from '../types';
import { calculateNextReview } from '../utils/algorithm';

export const Library: React.FC = () => {
  const { notebooks, deleteNotebook, addNotebook, editNotebook, bulkUpdateNotebooks, config } = useStore();
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'NEW' | 'OVERDUE' | 'HIGH_WEIGHT'>('ALL');
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
    lastPractice: new Date().toISOString().split('T')[0] // Default to today
  };

  const [formData, setFormData] = useState(initialFormState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FILTER LOGIC ---
  const filteredNotebooks = useMemo(() => {
    let result = notebooks.filter(nb => nb.discipline !== 'Revisão Geral'); // Filter out system items

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

    return result;
  }, [notebooks, searchTerm, activeFilter]);

  // --- GROUPING LOGIC (HIERARCHY) ---
  const groupedData = useMemo(() => {
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

      // Sort keys alphabetically
      const sortedKeys = Object.keys(groups).sort();
      return { groups, stats, sortedKeys };
  }, [filteredNotebooks]);
  
  // Existing disciplines for datalist
  const existingDisciplines = useMemo(() => {
    return Array.from(new Set(notebooks.map(n => n.discipline))).sort();
  }, [notebooks]);

  // --- REAL-TIME ALGORITHM PROJECTION ---
  const projection = useMemo(() => {
      // Use config directly for calculation
      const nextDate = calculateNextReview(
          Number(formData.accuracy),
          formData.relevance,
          formData.trend,
          config.algorithm
      );

      const lastPracticeDate = new Date(formData.lastPractice);
      const diffTime = Math.abs(nextDate.getTime() - lastPracticeDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      return {
          daysToAdd: diffDays,
          nextDate: nextDate,
          reasons: ["Baseado em Config"] 
      };
  }, [formData.accuracy, formData.relevance, formData.trend, formData.lastPractice, config.algorithm]);


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

  const executeBulkAction = (value: any) => {
      if (bulkActionType === 'DELETE') {
          if (confirm(`Tem certeza que deseja excluir ${selectedIds.size} cadernos?`)) {
              bulkUpdateNotebooks(Array.from(selectedIds), 'DELETE');
              setSelectedIds(new Set());
              setBulkActionOpen(false);
          }
      } else if (bulkActionType === 'WEIGHT') {
          bulkUpdateNotebooks(Array.from(selectedIds), { weight: value });
          setBulkActionOpen(false);
      } else if (bulkActionType === 'STATUS') {
          bulkUpdateNotebooks(Array.from(selectedIds), { status: value });
          setBulkActionOpen(false);
      }
  };

  // --- HELPER COMPONENTS ---
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

  // --- MODAL HANDLERS (Create/Edit) ---
  const openCreateModal = () => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); };
  const openEditModal = (nb: Notebook) => {
      setEditingId(nb.id);
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
          image: nb.image || '',
          lastPractice: nb.lastPractice ? nb.lastPractice.split('T')[0] : new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(true);
  };
  
  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Use the projection calculation for consistency
      const nextReviewDate = projection.nextDate.toISOString();
      const lastPracticeDate = new Date(formData.lastPractice).toISOString();

      const payload: any = { 
          ...formData, 
          accuracy: Number(formData.accuracy), 
          targetAccuracy: Number(formData.targetAccuracy),
          lastPractice: lastPracticeDate,
          nextReview: nextReviewDate
      };

      if (editingId) editNotebook(editingId, payload);
      else addNotebook({ ...payload, weekId: null }); // New notes go to library, unscheduled
      setIsModalOpen(false);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
             alert("Imagem muito grande. Máximo 2MB.");
             return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setFormData(prev => ({ ...prev, image: reader.result as string }));
        reader.readAsDataURL(file);
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
              
              <FilterButton active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} icon={<Layers size={14}/>} label="Tudo" />
              <FilterButton active={activeFilter === 'CRITICAL'} onClick={() => setActiveFilter('CRITICAL')} icon={<Siren size={14}/>} label="Críticos" color="red" />
              <FilterButton active={activeFilter === 'NEW'} onClick={() => setActiveFilter('NEW')} icon={<Sparkles size={14}/>} label="Nunca Vistos" color="blue" />
              <FilterButton active={activeFilter === 'OVERDUE'} onClick={() => setActiveFilter('OVERDUE')} icon={<Clock size={14}/>} label="Atrasados" color="amber" />
              <FilterButton active={activeFilter === 'HIGH_WEIGHT'} onClick={() => setActiveFilter('HIGH_WEIGHT')} icon={<Star size={14}/>} label="Peso Alto" color="purple" />
          </div>
      </div>

      {/* BULK ACTION BAR (Floating) */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
              <span className="text-sm font-bold text-white">{selectedIds.size} selecionados</span>
              <div className="h-6 w-px bg-slate-700"></div>
              <div className="flex gap-2">
                  <button onClick={() => { setBulkActionType('WEIGHT'); setBulkActionOpen(true); }} className="hover:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white text-xs font-medium transition-colors">
                      Peso
                  </button>
                  <button onClick={() => { setBulkActionType('STATUS'); setBulkActionOpen(true); }} className="hover:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white text-xs font-medium transition-colors">
                      Status
                  </button>
                  <button onClick={() => { setBulkActionType('DELETE'); setBulkActionOpen(true); }} className="hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300 text-xs font-medium transition-colors">
                      Excluir
                  </button>
              </div>
              <button onClick={() => setSelectedIds(new Set())} className="bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white">
                  <X size={14} />
              </button>
          </div>
      )}

      {/* LIST AREA (HIERARCHICAL) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-20">
          {groupedData.sortedKeys.map(discipline => {
              const stats = groupedData.stats[discipline];
              const progress = Math.round((stats.done / stats.total) * 100);
              const isExpanded = expandedDisciplines.has(discipline);
              const groupIds = groupedData.groups[discipline].map(n => n.id);
              const isAllSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id));
              const isPartialSelected = !isAllSelected && groupIds.some(id => selectedIds.has(id));

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
                                  {isAllSelected ? <CheckSquare size={18} className="text-emerald-500" /> : isPartialSelected ? <Square size={18} className="text-emerald-500 fill-emerald-500/20" /> : <Square size={18} />}
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
                  <button onClick={() => {setSearchTerm(''); setActiveFilter('ALL');}} className="text-emerald-500 text-sm mt-2 hover:underline">
                      Limpar Filtros
                  </button>
              </div>
          )}
      </div>

      {/* MODAL - CREATE / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {editingId ? <Pencil size={20} className="text-emerald-500"/> : <Plus size={20} className="text-emerald-500"/>} 
                    {editingId ? 'Editar Caderno Tático' : 'Novo Caderno Tático'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* 1. Identification */}
                    <section>
                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <BookOpen size={14}/> Identificação
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Disciplina</label>
                                <input 
                                    required 
                                    list="disciplines"
                                    value={formData.discipline} 
                                    onChange={e => setFormData({...formData, discipline: e.target.value})} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500"
                                    placeholder="Ex: Direito Constitucional"
                                />
                                <datalist id="disciplines">
                                    {existingDisciplines.map(d => <option key={d} value={d} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Tópico</label>
                                <input 
                                    required 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500"
                                    placeholder="Ex: Controle de Constitucionalidade"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Subtópico / Foco</label>
                                <input 
                                    value={formData.subtitle} 
                                    onChange={e => setFormData({...formData, subtitle: e.target.value})} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500"
                                    placeholder="Ex: ADI, ADC, ADPF"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Link Externo (Tec/QConcursos)</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-3.5 text-slate-500" size={16} />
                                    <input 
                                        type="url"
                                        value={formData.tecLink} 
                                        onChange={e => setFormData({...formData, tecLink: e.target.value})} 
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-slate-800"></div>

                    {/* 2. Strategy & Algorithm */}
                    <section>
                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Calculator size={14}/> Parâmetros do Algoritmo
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Peso</label>
                                <select 
                                    value={formData.weight} 
                                    onChange={(e) => setFormData({...formData, weight: e.target.value as Weight})} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                                >
                                    {Object.values(Weight).map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Relevância</label>
                                <select 
                                    value={formData.relevance} 
                                    onChange={(e) => setFormData({...formData, relevance: e.target.value as Relevance})} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                                >
                                    {Object.values(Relevance).map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Tendência</label>
                                <select 
                                    value={formData.trend} 
                                    onChange={(e) => setFormData({...formData, trend: e.target.value as Trend})} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                                >
                                    {Object.values(Trend).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Meta (%)</label>
                                <input 
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.targetAccuracy} 
                                    onChange={e => setFormData({...formData, targetAccuracy: Number(e.target.value)})} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm text-center font-bold" 
                                />
                            </div>
                        </div>

                        {/* Interactive Algorithm Preview */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row gap-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10"><Calculator size={120} /></div>
                            
                            <div className="flex-1 space-y-4 z-10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-emerald-400 mb-1 uppercase">Acurácia Atual (%)</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.accuracy}
                                            onChange={e => setFormData({...formData, accuracy: Number(e.target.value)})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-center font-bold text-lg focus:border-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Data da Prática</label>
                                        <input 
                                            type="date"
                                            value={formData.lastPractice}
                                            onChange={e => setFormData({...formData, lastPractice: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 border-l border-slate-800 pl-8 flex flex-col justify-center z-10">
                                <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Previsão do Algoritmo</span>
                                <div className="text-3xl font-black text-white flex items-baseline gap-2">
                                    +{projection.daysToAdd} <span className="text-sm font-medium text-slate-400">dias</span>
                                </div>
                                <div className="text-emerald-400 text-sm font-bold mt-1 flex items-center gap-2">
                                    <CalendarCheck size={14}/>
                                    {projection.nextDate.toLocaleDateString()}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-2">
                                    Fatores: {projection.reasons.join(', ')}
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-slate-800"></div>

                    {/* 3. Resources */}
                    <section>
                         <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileText size={14}/> Material de Apoio
                        </h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Link Obsidian / Notion</label>
                                <div className="relative">
                                    <FileCode className="absolute left-3 top-3.5 text-slate-500" size={16} />
                                    <input 
                                        type="url"
                                        value={formData.obsidianLink} 
                                        onChange={e => setFormData({...formData, obsidianLink: e.target.value})} 
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500"
                                        placeholder="obsidian://open?vault=..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Anotações Rápidas</label>
                                    <textarea 
                                        value={formData.notes} 
                                        onChange={e => setFormData({...formData, notes: e.target.value})} 
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-all min-h-[140px] resize-none text-sm" 
                                        placeholder="Mnemônicos, dicas, erros comuns..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Imagem / Mapa Mental</label>
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-[140px] bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-slate-800/80 transition-all relative overflow-hidden group"
                                    >
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                        {formData.image ? (
                                            <img src={formData.image} alt="Upload" className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                                        ) : (
                                            <div className="text-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                                                <Upload size={24} className="mx-auto mb-2" />
                                                <span className="text-xs font-bold">Clique para enviar</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between gap-4">
                     {editingId && (
                         <button 
                            type="button" 
                            onClick={() => { 
                                if(confirm('Tem certeza que deseja excluir este caderno?')) { 
                                    deleteNotebook(editingId); 
                                    setIsModalOpen(false); 
                                } 
                            }} 
                            className="text-red-400 hover:text-red-300 px-4 py-2 text-sm font-bold flex items-center gap-2"
                        >
                             <Trash2 size={16} /> Excluir
                         </button>
                     )}
                     <div className="flex gap-4 ml-auto">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancelar</button>
                        <button type="button" onClick={handleSave} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition-all">
                            Salvar Alterações
                        </button>
                     </div>
                </div>
            </div>
        </div>
      )}

      {/* BULK ACTION MODAL */}
      {bulkActionOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">Ação em Massa</h3>
                  <p className="text-sm text-slate-400 mb-6">
                      Aplicar alteração para {selectedIds.size} itens selecionados.
                  </p>
                  
                  {bulkActionType === 'WEIGHT' && (
                      <div className="space-y-2 mb-6">
                          {Object.values(Weight).map(w => (
                              <button key={w} onClick={() => executeBulkAction(w)} className="w-full text-left px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm">
                                  Definir como {w}
                              </button>
                          ))}
                      </div>
                  )}

                  {bulkActionType === 'STATUS' && (
                      <div className="space-y-2 mb-6">
                          {Object.values(NotebookStatus).map(s => (
                              <button key={s} onClick={() => executeBulkAction(s)} className="w-full text-left px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm">
                                  Definir como {s}
                              </button>
                          ))}
                      </div>
                  )}

                  <button onClick={() => setBulkActionOpen(false)} className="w-full py-2 text-slate-500 hover:text-white">Cancelar</button>
              </div>
          </div>
      )}

    </div>
  );
};

// Filter Button Helper
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
