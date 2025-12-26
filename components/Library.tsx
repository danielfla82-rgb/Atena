
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
  const { notebooks, deleteNotebook, addNotebook, editNotebook, bulkUpdateNotebooks } = useStore();
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'NEW' | 'OVERDUE' | 'HIGH_WEIGHT'>('ALL');
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set());
  
  // Detail Expansion State (New)
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
      let days = 1;
      const acc = Number(formData.accuracy);
      let reasons: string[] = [];

      // 1. Accuracy Base
      if (acc < 60) {
          days = 1;
          reasons.push("Reaprendizagem (Acerto < 60%)");
      } else if (acc >= 60 && acc <= 79) {
          days = 3;
          reasons.push("Fase de Consolidação");
      } else if (acc >= 80 && acc <= 89) {
          days = 7;
          reasons.push("Boa Performance");
      } else if (acc >= 90) {
          days = 15;
          reasons.push("Manutenção (Elite)");
      }

      // 2. Modifiers
      if (formData.relevance === Relevance.ALTISSIMA) {
          days = Math.max(1, Math.round(days * 0.7));
          reasons.push("Acelerador: Relevância Altíssima");
      } else if (formData.relevance === Relevance.ALTA) {
          days = Math.max(1, Math.round(days * 0.9));
          reasons.push("Acelerador: Relevância Alta");
      }

      if (formData.trend === Trend.ALTA) {
          days = Math.max(1, Math.round(days * 0.9));
          reasons.push("Ajuste de Tendência");
      }

      // Calculate Dates
      const lastPracticeDate = new Date(formData.lastPractice);
      const nextReviewDate = new Date(lastPracticeDate);
      nextReviewDate.setDate(lastPracticeDate.getDate() + days);

      return {
          daysToAdd: days,
          nextDate: nextReviewDate,
          reasons
      };
  }, [formData.accuracy, formData.relevance, formData.trend, formData.lastPractice]);


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
                              
                              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </div>
                              
                              <div>
                                  <h3 className="font-bold text-white text-sm">{discipline}</h3>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                      <span>{stats.total} Tópicos</span>
                                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                      <span>{stats.avgAcc}% Média Acerto</span>
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-4">
                              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-slate-400 w-8 text-right">{progress}%</span>
                          </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                          <div className="border-t border-slate-800">
                              <table className="w-full text-left border-collapse">
                                  <thead className="bg-slate-950/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                                      <tr>
                                          <th className="p-3 w-10 text-center"></th>
                                          <th className="p-3">Tópico</th>
                                          <th className="p-3">Status</th>
                                          <th className="p-3">Estratégia</th>
                                          <th className="p-3 text-right">Acurácia</th>
                                          <th className="p-3 w-10"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/50 text-sm">
                                      {groupedData.groups[discipline].map(nb => (
                                        <React.Fragment key={nb.id}>
                                          <tr className={`hover:bg-slate-800/30 transition-colors ${selectedIds.has(nb.id) ? 'bg-emerald-900/10' : ''} ${expandedDetailsId === nb.id ? 'bg-slate-800/50' : ''}`}>
                                              <td className="p-3 text-center">
                                                  <button onClick={() => toggleSelection(nb.id)} className="text-slate-600 hover:text-emerald-500">
                                                      {selectedIds.has(nb.id) ? <CheckSquare size={16} className="text-emerald-500"/> : <Square size={16}/>}
                                                  </button>
                                              </td>
                                              <td className="p-3">
                                                  <div className="flex items-start gap-2">
                                                      <button 
                                                          onClick={() => toggleDetails(nb.id)}
                                                          className={`mt-0.5 p-0.5 rounded transition-all ${expandedDetailsId === nb.id ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-600 hover:text-slate-300'}`}
                                                      >
                                                          {expandedDetailsId === nb.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                      </button>
                                                      <div>
                                                          <div className="font-medium text-slate-200">{nb.name}</div>
                                                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                              {nb.subtitle}
                                                              {nb.tecLink && <LinkIcon size={10} className="text-slate-600" />}
                                                              {(nb.notes || nb.image) && (
                                                                  <span className="flex items-center gap-0.5 text-[9px] bg-slate-800 px-1 rounded text-slate-400 border border-slate-700">
                                                                      {nb.notes && <FileText size={8} />}
                                                                      {nb.image && <ImageIcon size={8} />}
                                                                  </span>
                                                              )}
                                                          </div>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="p-3">
                                                  <StatusBadge status={nb.status} />
                                              </td>
                                              <td className="p-3">
                                                  <div className="flex gap-1">
                                                      <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${nb.weight === Weight.MUITO_ALTO ? 'border-red-900 text-red-400 bg-red-900/20' : 'border-slate-700 text-slate-500'}`}>{nb.weight.substring(0,3)}</span>
                                                      <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold border-slate-700 text-slate-500`}>{nb.relevance.substring(0,3)}</span>
                                                  </div>
                                              </td>
                                              <td className="p-3 text-right font-mono font-bold text-slate-400">
                                                  <span className={nb.accuracy >= nb.targetAccuracy ? 'text-emerald-400' : nb.accuracy < 60 ? 'text-red-400' : 'text-amber-400'}>
                                                      {nb.accuracy}%
                                                  </span>
                                              </td>
                                              <td className="p-3 text-center relative group/actions">
                                                  <button className="text-slate-600 hover:text-white"><MoreHorizontal size={16}/></button>
                                                  <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1 hidden group-hover/actions:flex flex-col z-20">
                                                      <button onClick={() => openEditModal(nb)} className="p-2 hover:bg-slate-800 text-slate-300 rounded text-xs flex items-center gap-2 whitespace-nowrap"><Pencil size={12}/> Editar</button>
                                                      <button onClick={() => deleteNotebook(nb.id)} className="p-2 hover:bg-red-900/30 text-red-400 rounded text-xs flex items-center gap-2 whitespace-nowrap"><Trash2 size={12}/> Excluir</button>
                                                  </div>
                                              </td>
                                          </tr>
                                          {expandedDetailsId === nb.id && (
                                              <tr>
                                                  <td colSpan={6} className="p-0 border-b border-slate-800/50">
                                                      <div className="bg-slate-900/50 p-4 shadow-inner flex flex-col md:flex-row gap-6 animate-in slide-in-from-top-2 duration-200">
                                                          {/* Notes Section */}
                                                          <div className="flex-1 min-w-0 space-y-2">
                                                              <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                                  <StickyNote size={14} className="text-emerald-500"/>
                                                                  Anotações Rápidas
                                                              </h4>
                                                              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 min-h-[120px] text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                                                                  {nb.notes || <span className="text-slate-600 italic">Nenhuma anotação registrada.</span>}
                                                              </div>
                                                          </div>

                                                          {/* Image Section */}
                                                          <div className="w-full md:w-1/3 space-y-2">
                                                              <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                                  <ImageIcon size={14} className="text-purple-500"/>
                                                                  Mapa Mental
                                                              </h4>
                                                              {nb.image ? (
                                                                  <div className="relative group/image overflow-hidden rounded-lg border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
                                                                      <img src={nb.image} alt="Mapa Mental" className="w-full h-full object-cover transition-transform group-hover/image:scale-105" />
                                                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                                                                          <button 
                                                                             onClick={() => {
                                                                                 const w = window.open();
                                                                                 if(w) {
                                                                                     w.document.write(`<img src="${nb.image}" style="width:100%"/>`);
                                                                                 }
                                                                             }}
                                                                             className="p-2 bg-slate-800 rounded-full text-white hover:bg-emerald-600"
                                                                          >
                                                                              <Maximize2 size={20} />
                                                                          </button>
                                                                      </div>
                                                                  </div>
                                                              ) : (
                                                                  <div className="aspect-video rounded-lg border-2 border-dashed border-slate-800 bg-slate-950/50 flex flex-col items-center justify-center text-slate-600 gap-2">
                                                                      <ImageIcon size={24} className="opacity-20"/>
                                                                      <span className="text-[10px]">Sem imagem</span>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  </td>
                                              </tr>
                                          )}
                                        </React.Fragment>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </div>
              );
          })}
          {groupedData.sortedKeys.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <Layers size={48} className="mb-4 opacity-20"/>
                  <p>Nenhum caderno encontrado para este filtro.</p>
              </div>
          )}
      </div>

      {/* MODAL: BULK ACTIONS */}
      {bulkActionOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">Ação em Massa</h3>
                  
                  {bulkActionType === 'WEIGHT' && (
                      <div className="space-y-2">
                          <p className="text-sm text-slate-400 mb-2">Definir Peso para {selectedIds.size} itens:</p>
                          {Object.values(Weight).map(w => (
                              <button key={w} onClick={() => executeBulkAction(w)} className="w-full text-left p-3 hover:bg-slate-800 rounded border border-slate-800 hover:border-slate-600 text-slate-300 text-sm">
                                  {w}
                              </button>
                          ))}
                      </div>
                  )}

                  {bulkActionType === 'STATUS' && (
                      <div className="space-y-2">
                          <p className="text-sm text-slate-400 mb-2">Definir Status para {selectedIds.size} itens:</p>
                          {Object.values(NotebookStatus).map(s => (
                              <button key={s} onClick={() => executeBulkAction(s)} className="w-full text-left p-3 hover:bg-slate-800 rounded border border-slate-800 hover:border-slate-600 text-slate-300 text-sm">
                                  {s}
                              </button>
                          ))}
                      </div>
                  )}
                  
                  <button onClick={() => setBulkActionOpen(false)} className="mt-4 w-full py-2 text-slate-500 hover:text-white text-sm">Cancelar</button>
              </div>
          </div>
      )}

      {/* MODAL: CREATE / EDIT (FULL FORM RESTORED) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                   {editingId ? <><Pencil size={20} className="text-emerald-500"/> Editar Caderno</> : <><Plus size={20} className="text-emerald-500"/> Novo Caderno</>}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* SECTION 1: IDENTIFICATION */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">1. Identificação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Disciplina</label>
                            <input 
                                required 
                                list="disciplines"
                                value={formData.discipline} 
                                onChange={e => setFormData({...formData, discipline: e.target.value})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" 
                            />
                            <datalist id="disciplines">
                                {existingDisciplines.map(d => <option key={d} value={d} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nome do Tópico</label>
                            <input 
                                required 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Subtópico / Foco</label>
                            <input 
                                value={formData.subtitle} 
                                onChange={e => setFormData({...formData, subtitle: e.target.value})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Caderno / Anki</label>
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
                </div>

                {/* SECTION 2: STRATEGY */}
                <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">2. Estratégia & Algoritmo</h4>
                    
                    {/* ALGORITHM CALCULATION BOX (AUTO) */}
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1 space-y-4 w-full">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={12}/> Data da Última Prática (Anki/Questões)
                                </label>
                                <input 
                                    type="date"
                                    required
                                    value={formData.lastPractice}
                                    onChange={e => setFormData({...formData, lastPractice: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 cursor-pointer"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-emerald-400 mb-1 uppercase">Acurácia (%)</label>
                                    <input type="number" min="0" max="100" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-center font-bold" value={formData.accuracy} onChange={e => setFormData({...formData, accuracy: Number(e.target.value)})} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Meta (%)</label>
                                    <input type="number" min="0" max="100" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-center font-bold" value={formData.targetAccuracy} onChange={e => setFormData({...formData, targetAccuracy: Number(e.target.value)})} />
                                </div>
                            </div>
                        </div>
                        
                        {/* THE AUTOMATIC PREDICTION BOX */}
                        <div className="w-full md:w-64 bg-slate-900 rounded-lg border border-slate-700 p-4 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                 <Calculator size={48} />
                             </div>
                             <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Previsão do Algoritmo</p>
                             <div className="text-2xl font-bold text-emerald-400 mb-1">
                                 {projection.nextDate.toLocaleDateString('pt-BR')}
                             </div>
                             <div className="text-xs text-slate-400 mb-3 font-mono">
                                 Intervalo: +{projection.daysToAdd} dias
                             </div>
                             <div className="flex flex-wrap gap-1">
                                 {projection.reasons.map((r, i) => (
                                     <span key={i} className="text-[9px] bg-emerald-900/30 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-900/50">
                                         {r}
                                     </span>
                                 ))}
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Cobertura</label>
                            <select 
                                value={formData.status} 
                                onChange={e => setFormData({...formData, status: e.target.value as NotebookStatus})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                            >
                                {Object.values(NotebookStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Peso</label>
                            <select 
                                value={formData.weight} 
                                onChange={e => setFormData({...formData, weight: e.target.value as Weight})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                            >
                                {Object.values(Weight).map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Relevância</label>
                            <select 
                                value={formData.relevance} 
                                onChange={e => setFormData({...formData, relevance: e.target.value as Relevance})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                            >
                                {Object.values(Relevance).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Tendência</label>
                            <select 
                                value={formData.trend} 
                                onChange={e => setFormData({...formData, trend: e.target.value as Trend})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                            >
                                {Object.values(Trend).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: CONTENT */}
                <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Conteúdo & Anotações</h4>
                    
                    {/* Obsidian / Notion Link Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Obsidian / Notion</label>
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
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Anotações / Resumo</label>
                            <textarea 
                                value={formData.notes} 
                                onChange={e => setFormData({...formData, notes: e.target.value})} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-all min-h-[140px] resize-none text-sm" 
                                placeholder="Mnemônicos e pontos chave..." 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Imagem / Mapa Mental</label>
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

            </form>

            <div className="p-6 border-t border-slate-800 bg-slate-900 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 font-medium transition-colors">Cancelar</button>
                <button type="button" onClick={handleSave} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Component for Filter Chips
const FilterButton = ({ active, onClick, icon, label, color = 'emerald' }: any) => {
    const activeClass = 
        color === 'red' ? 'bg-red-500 text-white border-red-400' : 
        color === 'blue' ? 'bg-blue-500 text-white border-blue-400' :
        color === 'amber' ? 'bg-amber-500 text-white border-amber-400' :
        color === 'purple' ? 'bg-purple-500 text-white border-purple-400' :
        'bg-emerald-600 text-white border-emerald-500';

    return (
        <button 
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap
                ${active ? activeClass : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}
            `}
        >
            {icon} {label}
        </button>
    );
};
