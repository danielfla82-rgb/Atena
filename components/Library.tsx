import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { 
    Trash2, Plus, Search, X, Link as LinkIcon, Pencil, RefreshCw, 
    ChevronRight, ChevronLeft, Layers, Square, CheckSquare, 
    Circle, BookOpen, CheckCircle2, Siren, Star, Clock, Sparkles,
    Maximize2, FileCode, CalendarClock, ZoomIn, Flag, Save, Inbox, ScanSearch, Scale, Loader2, ArrowRight
} from 'lucide-react';
import { Weight, Relevance, Trend, Notebook, NotebookStatus } from '../types';
import { calculateNextReview } from '../utils/algorithm';

// --- SUB-COMPONENT: Status Badge ---
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

const AlgorithmProjection = ({ accuracy, relevance, trend, config }: any) => {
    const nextDate = calculateNextReview(accuracy, relevance, trend, config.algorithm);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col gap-2 mt-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none"><Clock size={40} /></div>
            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><RefreshCw size={10} /> Próxima Revisão (Algoritmo)</h5>
            <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-emerald-400">+{diffDays} dias</span>
                <ArrowRight size={14} className="text-slate-600" />
                <span className="text-sm font-mono text-slate-300">{nextDate.toLocaleDateString()}</span>
            </div>
            <div className="flex gap-2 text-[9px] text-slate-500 mt-1">
                <span className="bg-slate-900 px-1.5 py-0.5 rounded">Acc: {accuracy}%</span>
                <span className="bg-slate-900 px-1.5 py-0.5 rounded">Rel: {relevance}</span>
                <span className="bg-slate-900 px-1.5 py-0.5 rounded">Trend: {trend}</span>
            </div>
        </div>
    );
};

const FilterButton = ({ 
    active, 
    onClick, 
    icon, 
    label, 
    color = 'emerald' 
}: { 
    active: boolean; 
    onClick: () => void; 
    icon: React.ReactNode; 
    label: string; 
    color?: string; 
}) => {
    let activeStyle = '';
    switch (color) {
        case 'red': activeStyle = 'bg-red-600 text-white border-red-500/50 shadow-lg shadow-red-900/20'; break;
        case 'blue': activeStyle = 'bg-blue-600 text-white border-blue-500/50 shadow-lg shadow-blue-900/20'; break;
        case 'amber': activeStyle = 'bg-amber-600 text-white border-amber-500/50 shadow-lg shadow-amber-900/20'; break;
        case 'purple': activeStyle = 'bg-purple-600 text-white border-purple-500/50 shadow-lg shadow-purple-900/20'; break;
        default: activeStyle = 'bg-emerald-600 text-white border-emerald-500/50 shadow-lg shadow-emerald-900/20'; break;
    }

    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${active ? activeStyle : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-white hover:bg-slate-800/80'}`}
        >
            {icon} {label}
        </button>
    );
};

// --- OPTIMIZATION: Memoized List Item ---
const LibraryItem = React.memo(({ 
    nb, 
    isSelected, 
    isExpanded, 
    onToggleSelection, 
    onToggleDetails, 
    onEdit, 
    showDate 
}: { 
    nb: Notebook; 
    isSelected: boolean; 
    isExpanded: boolean; 
    onToggleSelection: (id: string) => void; 
    onToggleDetails: (id: string) => void; 
    onEdit: (nb: Notebook) => void;
    showDate: boolean;
}) => {
    return (
        <div 
          className={`
              p-3 pl-12 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-slate-800/20
              ${isSelected ? 'bg-emerald-900/10' : ''}
          `}
        >
            <div className="flex items-center gap-3 flex-1">
                <button 
                  onClick={() => onToggleSelection(nb.id)}
                  className="text-slate-600 hover:text-emerald-500 transition-colors"
                >
                    {isSelected ? <CheckSquare size={16} className="text-emerald-500"/> : <Square size={16}/>}
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-slate-300">{nb.name}</h4>
                        {nb.subtitle && <span className="text-xs text-slate-500 hidden lg:inline-block">• {nb.subtitle}</span>}
                        {nb.weekId && <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 rounded border border-slate-700">Planejado</span>}
                    </div>
                    
                    {isExpanded && (
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
                {showDate && nb.nextReview && (
                    <span className="text-xs font-mono text-emerald-500 bg-emerald-900/10 px-2 py-0.5 rounded">
                        {new Date(nb.nextReview).toLocaleDateString()}
                    </span>
                )}
                <StatusBadge status={nb.status} />
                <div className={`text-xs font-bold px-2 py-0.5 rounded border ${nb.accuracy < 60 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {nb.accuracy}%
                </div>
                
                <div className="flex items-center gap-1 border-l border-slate-800 pl-3 ml-2">
                    <button onClick={() => onToggleDetails(nb.id)} className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-slate-800" title="Ver Detalhes">
                        <Maximize2 size={14} />
                    </button>
                    <button onClick={() => onEdit(nb)} className="p-1.5 text-slate-500 hover:text-emerald-400 rounded hover:bg-slate-800" title="Editar">
                        <Pencil size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
});

export const Library: React.FC = () => {
  const { notebooks, deleteNotebook, addNotebook, editNotebook, bulkUpdateNotebooks, config, focusedNotebookId, setFocusedNotebookId, pendingCreateData, setPendingCreateData, loading } = useStore();
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'NEW' | 'OVERDUE' | 'HIGH_WEIGHT'>('ALL');
  const [sortByReview, setSortByReview] = useState(false);
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set());
  
  // Detail Expansion State
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Gallery State (Lightbox)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormState = {
    discipline: '', name: '', subtitle: '', tecLink: '', lawLink: '', obsidianLink: '', accuracy: 0, targetAccuracy: 90, 
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, 
    status: NotebookStatus.NOT_STARTED, notes: '', images: [] as string[],
    lastPractice: new Date().toISOString().split('T')[0],
    accuracyHistory: [] as { date: string, accuracy: number }[]
  };

  const [formData, setFormData] = useState(initialFormState);
  const [newHistoryDate, setNewHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [newHistoryAccuracy, setNewHistoryAccuracy] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- AUTO-FOCUS LOGIC (Robust Implementation) ---
  useEffect(() => {
      // Only proceed if not loading and we have a focused ID
      if (!loading && focusedNotebookId) {
          const target = notebooks.find(n => n.id === focusedNotebookId);
          if (target) {
              setSearchTerm(target.name);
              setExpandedDisciplines(new Set([target.discipline]));
              setActiveFilter('ALL');
              
              // Open modal
              setEditingId(target.id);
              let safeDate = new Date().toISOString().split('T')[0];
              if (target.lastPractice) {
                  const check = new Date(target.lastPractice);
                  if (!isNaN(check.getTime())) safeDate = target.lastPractice.split('T')[0];
              }
              let currentImages = target.images || [];
              if (currentImages.length === 0 && target.image) currentImages = [target.image];

              setFormData({
                  discipline: target.discipline,
                  name: target.name,
                  subtitle: target.subtitle,
                  tecLink: target.tecLink || '',
                  lawLink: target.lawLink || '',
                  obsidianLink: target.obsidianLink || '',
                  accuracy: target.accuracy,
                  targetAccuracy: target.targetAccuracy,
                  weight: target.weight,
                  relevance: target.relevance,
                  trend: target.trend,
                  status: target.status || NotebookStatus.NOT_STARTED,
                  notes: target.notes || '',
                  images: currentImages,
                  lastPractice: safeDate,
                  accuracyHistory: target.accuracyHistory || []
              });
              
              setIsModalOpen(true);
              // Clear focus AFTER successfully opening
              setFocusedNotebookId(null);
          } else if (notebooks.length > 0) {
              // If notebooks are loaded but ID not found, clear it
              setFocusedNotebookId(null);
          }
      }
  }, [focusedNotebookId, notebooks, loading, setFocusedNotebookId]);

  // --- PENDING CREATE LOGIC (From Verticalized Edital) ---
  useEffect(() => {
      if (pendingCreateData && !loading) {
          setEditingId(null);
          setFormData({
              ...initialFormState,
              name: pendingCreateData.name || '',
              discipline: pendingCreateData.discipline || '',
          });
          setIsModalOpen(true);
          setPendingCreateData(null);
      }
  }, [pendingCreateData, loading, setPendingCreateData]);

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

  const existingDisciplines = useMemo(() => {
    return Array.from(new Set(notebooks.map(n => n.discipline))).sort();
  }, [notebooks]);

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

      const sortedKeys = Object.keys(groups).sort();
      return { groups, stats, sortedKeys };
  }, [filteredNotebooks]);
  
  // --- HANDLERS ---
  const toggleDiscipline = useCallback((discipline: string) => {
      setExpandedDisciplines(prev => {
          const newSet = new Set(prev);
          if (newSet.has(discipline)) newSet.delete(discipline);
          else newSet.add(discipline);
          return newSet;
      });
  }, []);

  const toggleDetails = useCallback((id: string) => {
      setExpandedDetailsId(prev => prev === id ? null : id);
  }, []);

  const toggleSelection = useCallback((id: string) => {
      setSelectedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  }, []);

  const toggleGroupSelection = useCallback((discipline: string) => {
      const groupIds = groupedData.groups[discipline]?.map(n => n.id) || [];
      setSelectedIds(prev => {
          const allSelected = groupIds.every(id => prev.has(id));
          const newSet = new Set(prev);
          if (allSelected) {
              groupIds.forEach(id => newSet.delete(id));
          } else {
              groupIds.forEach(id => newSet.add(id));
          }
          return newSet;
      });
  }, [groupedData]);

  // --- MODAL HANDLERS ---
  const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      (Array.from(files) as File[]).forEach(file => {
          if (file.size > 2 * 1024 * 1024) { alert("Imagem muito grande (>2MB)."); return; }
          const reader = new FileReader();
          reader.onloadend = () => {
            if(reader.result) setFormData(prev => ({ ...prev, images: [...prev.images, reader.result as string] }));
          };
          reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
      setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleNotStudied = () => {
     setFormData(prev => ({ ...prev, accuracy: 0, status: NotebookStatus.NOT_STARTED }));
  };

  const addHistoryItem = () => {
      if (!newHistoryDate) return;
      
      const newEntry = { date: newHistoryDate, accuracy: Number(newHistoryAccuracy) };
      // Sort immediately by date
      const sortedHistory = [...formData.accuracyHistory, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Update form state with new history
      const latest = sortedHistory[sortedHistory.length - 1];
      
      setFormData(prev => ({
          ...prev,
          accuracyHistory: sortedHistory,
          accuracy: latest.accuracy, // Latest overwrites current
          lastPractice: latest.date
      }));
      
      setNewHistoryAccuracy(0);
  };

  const removeHistoryItem = (index: number) => {
      const newHistory = formData.accuracyHistory.filter((_, i) => i !== index);
      const sortedHistory = newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Recalculate current accuracy if we deleted the latest
      let updates: any = { accuracyHistory: sortedHistory };
      if (sortedHistory.length > 0) {
          const latest = sortedHistory[sortedHistory.length - 1];
          updates.accuracy = latest.accuracy;
          updates.lastPractice = latest.date;
      }

      setFormData(prev => ({ ...prev, ...updates }));
  };

  const navigateLightbox = (direction: 'next' | 'prev') => {
      if (lightboxIndex === null) return;
      if (direction === 'next') setLightboxIndex((lightboxIndex + 1) % formData.images.length);
      else setLightboxIndex((lightboxIndex - 1 + formData.images.length) % formData.images.length);
  };

  const openCreateModal = () => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); };
  
  const openEditModal = useCallback((nb: Notebook) => {
      setEditingId(nb.id);
      let safeDate = new Date().toISOString().split('T')[0];
      if (nb.lastPractice) {
          const check = new Date(nb.lastPractice);
          if (!isNaN(check.getTime())) safeDate = nb.lastPractice.split('T')[0];
      }
      
      let currentImages = nb.images || [];
      if (currentImages.length === 0 && nb.image) currentImages = [nb.image];

      setFormData({
          discipline: nb.discipline,
          name: nb.name,
          subtitle: nb.subtitle,
          tecLink: nb.tecLink || '',
          lawLink: nb.lawLink || '',
          obsidianLink: nb.obsidianLink || '',
          accuracy: nb.accuracy,
          targetAccuracy: nb.targetAccuracy,
          weight: nb.weight,
          relevance: nb.relevance,
          trend: nb.trend,
          status: nb.status || NotebookStatus.NOT_STARTED,
          notes: nb.notes || '',
          images: currentImages,
          lastPractice: safeDate,
          accuracyHistory: nb.accuracyHistory || []
      });
      setIsModalOpen(true);
  }, []);
  
  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      // Ensure calculation uses the latest date/accuracy
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

  // Save loading state
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 h-[calc(100vh-80px)] flex flex-col relative">
      
      {/* LIGHTBOX */}
      {lightboxIndex !== null && (
          <div className="fixed inset-0 z-[60] bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-sm">
             <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white hover:text-emerald-500 z-50"><X size={32} /></button>
             
             {formData.images.length > 1 && (
                 <>
                    <button onClick={() => navigateLightbox('prev')} className="absolute left-4 p-2 bg-slate-800/50 rounded-full hover:bg-emerald-600 text-white"><ChevronLeft size={32}/></button>
                    <button onClick={() => navigateLightbox('next')} className="absolute right-4 p-2 bg-slate-800/50 rounded-full hover:bg-emerald-600 text-white"><ChevronRight size={32}/></button>
                 </>
             )}

             <img src={formData.images[lightboxIndex]} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
             <div className="absolute bottom-4 bg-black/50 px-4 py-1 rounded-full text-white text-sm">
                 {lightboxIndex + 1} / {formData.images.length}
             </div>
          </div>
      )}

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
              const isExpanded = expandedDisciplines.has(discipline) || sortByReview; 
              
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

                      {/* Items List (Memoized via LibraryItem) */}
                      {isExpanded && (
                          <div className="border-t border-slate-800">
                              {groupedData.groups[discipline].map(nb => (
                                  <LibraryItem 
                                    key={nb.id} 
                                    nb={nb}
                                    isSelected={selectedIds.has(nb.id)}
                                    isExpanded={expandedDetailsId === nb.id}
                                    onToggleSelection={toggleSelection}
                                    onToggleDetails={toggleDetails}
                                    onEdit={openEditModal}
                                    showDate={sortByReview}
                                  />
                              ))}
                          </div>
                      )}
                  </div>
              );
          })}
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pencil size={20} className="text-emerald-500"/> {editingId ? "Editar Caderno" : "Novo Caderno"}</h3>
                <button onClick={() => !isSaving && setIsModalOpen(false)} className="text-slate-400 hover:text-white" disabled={isSaving}><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                  <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">1. Identificação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Disciplina</label><input required list="disciplines" value={formData.discipline} onChange={e => handleChange('discipline', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /><datalist id="disciplines">{existingDisciplines.map(d => <option key={d} value={d} />)}</datalist></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nome do Tópico</label><input required value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Subtópico / Foco</label><input value={formData.subtitle} onChange={e => handleChange('subtitle', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link do Caderno</label><div className="relative"><LinkIcon className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.tecLink} onChange={e => handleChange('tecLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" /></div></div>
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">2. Estratégia & Performance</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Peso</label><select value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Weight).map(w => <option key={w} value={w}>{w}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Relevância</label><select value={formData.relevance} onChange={(e) => handleChange('relevance', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Relevance).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Tendência</label><select value={formData.trend} onChange={(e) => handleChange('trend', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Trend).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Meta (%)</label><input type="number" min="0" max="100" value={formData.targetAccuracy} onChange={e => handleChange('targetAccuracy', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm text-center font-bold" /></div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-stretch gap-4">
                      {/* --- ALGORITHM PREVIEW --- */}
                      <AlgorithmProjection accuracy={formData.accuracy} relevance={formData.relevance} trend={formData.trend} config={config} />
                      
                      <div className="flex flex-col md:flex-row gap-4 items-end mt-4 pt-4 border-t border-slate-700/50">
                          <div className="flex-1 w-full">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Registrar Sessão de Estudo</label>
                              <div className="flex gap-2 items-center">
                                  <input type="date" value={newHistoryDate} onChange={e => setNewHistoryDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
                                  <input type="number" min="0" max="100" placeholder="%" value={newHistoryAccuracy} onChange={e => setNewHistoryAccuracy(Number(e.target.value))} className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white text-center font-bold" />
                                  <button type="button" onClick={addHistoryItem} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">Adicionar</button>
                              </div>
                          </div>
                      </div>

                      {/* HISTORY LIST */}
                      <div className="border-t border-slate-700/50 pt-2 flex flex-col gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                          {formData.accuracyHistory && formData.accuracyHistory.length > 0 ? (
                              formData.accuracyHistory.slice().reverse().map((h, i) => (
                                  <div key={i} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded border border-slate-800">
                                      <span className="text-xs text-slate-400 font-mono">{new Date(h.date).toLocaleDateString()}</span>
                                      <div className="flex items-center gap-3">
                                        <span className={`text-sm font-bold ${h.accuracy >= formData.targetAccuracy ? 'text-emerald-400' : h.accuracy < 60 ? 'text-red-400' : 'text-amber-400'}`}>{h.accuracy}%</span>
                                        <button type="button" onClick={() => removeHistoryItem(formData.accuracyHistory.length - 1 - i)} className="text-slate-600 hover:text-red-500"><Trash2 size={12} /></button>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <p className="text-xs text-slate-600 text-center italic py-2">Sem histórico de acertos.</p>
                          )}
                      </div>
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Rascunhos & Anotações</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Texto de Lei</label>
                        <div className="relative"><Scale className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.lawLink} onChange={e => handleChange('lawLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="https://planalto.gov.br..." /></div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Obsidian / Notion</label>
                        <div className="relative"><FileCode className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.obsidianLink} onChange={e => handleChange('obsidianLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="obsidian://open?vault=..." /></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Anotações / Resumo</label><textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-all min-h-[200px] resize-none text-sm" placeholder="Mnemônicos..." /></div>
                    <div className="flex flex-col h-full">
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Galeria de Mapas Mentais</label>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 min-h-[200px] flex flex-col">
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative group aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer">
                                        <img src={img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onClick={() => setLightboxIndex(idx)} />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none"><ZoomIn size={16} className="text-white" /></div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                                <div onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-slate-700/50 transition-colors text-slate-500 hover:text-emerald-500"><Plus size={24} /><span className="text-[10px] uppercase font-bold mt-1">Add Imagem</span></div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                            <p className="text-[10px] text-slate-500 mt-auto text-center italic">Suporta múltiplas imagens. Clique em uma imagem para ampliar.</p>
                        </div>
                    </div>
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex gap-4">
                <button type="button" onClick={() => !isSaving && setIsModalOpen(false)} disabled={isSaving} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 font-medium transition-colors disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:bg-emerald-800 disabled:text-emerald-400 disabled:cursor-wait">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};