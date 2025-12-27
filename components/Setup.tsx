import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Notebook, Weight, Relevance, Trend, WEIGHT_SCORE, NotebookStatus } from '../types';
import { GripVertical, Plus, Search, Copy, Pencil, TrendingUp, X, Save, Link as LinkIcon, RefreshCw, Upload, CalendarCheck, ImageIcon, StickyNote, BarChart3, Calendar, Lock, ChevronDown, ChevronUp, Layout, ArrowRightFromLine, ArrowLeftFromLine, FileCode, Square, CheckSquare, Check, Timer, Calculator, PieChart, AlertCircle, ArrowRight, Settings2, GanttChartSquare, ZoomIn, Trash2, CalendarClock, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateNextReview } from '../utils/algorithm';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';

const PACE_SETTINGS: Record<string, { hours: number, blocks: number }> = {
    'Iniciante': { hours: 10, blocks: 15 },
    'Básico': { hours: 20, blocks: 30 },
    'Intermediário': { hours: 30, blocks: 45 },
    'Avançado': { hours: 44, blocks: 66 }
};

export const Setup: React.FC = () => {
  const { notebooks, config, updateConfig, moveNotebookToWeek, addNotebook, editNotebook } = useStore();
  
  const [viewMode, setViewMode] = useState<'timeline' | 'calculator'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Gallery State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const initialFormState = {
    discipline: '',
    name: '',
    subtitle: '',
    tecLink: '',
    obsidianLink: '',
    accuracy: 0,
    targetAccuracy: 90,
    weight: Weight.MEDIO,
    relevance: Relevance.MEDIA,
    trend: Trend.ESTAVEL,
    notes: '',
    images: [] as string[]
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPace = config.studyPace || 'Intermediário';
  const paceTarget = PACE_SETTINGS[currentPace] || PACE_SETTINGS['Intermediário'];
  
  const allocationData = useMemo(() => {
    const data: Record<string, number> = {};
    const filteredNotebooks = notebooks.filter(n => n.discipline !== 'Revisão Geral' && n.weekId);
    filteredNotebooks.forEach(nb => {
      data[nb.discipline] = (data[nb.discipline] || 0) + 1;
    });
    return Object.keys(data).map(key => ({ name: key, count: data[key] })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [notebooks]);

  const totalAllocatedBlocks = useMemo(() => {
      return notebooks.filter(n => n.weekId && n.weekId.startsWith('week-')).length;
  }, [notebooks]);

  const libraryNotebooks = useMemo(() => {
    return notebooks.filter(nb => 
        !nb.weekId && 
        (nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        nb.discipline.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [notebooks, searchTerm]);

  const existingDisciplines = useMemo(() => {
    return Array.from(new Set(notebooks.map(n => n.discipline))).sort();
  }, [notebooks]);

  // --- DAYS REMAINING CALC ---
  const daysRemaining = useMemo(() => {
      if (!config.examDate) return null;
      const today = new Date();
      const exam = new Date(config.examDate);
      const diffTime = exam.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [config.examDate]);

  // --- DYNAMIC WEEKS GENERATION ---
  const weeksCount = useMemo(() => {
      if (config.startDate && config.examDate) {
          const start = new Date(config.startDate);
          const end = new Date(config.examDate);
          const diffWeeks = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
          return Math.max(1, diffWeeks);
      }
      return config.weeksUntilExam || 12;
  }, [config.startDate, config.examDate, config.weeksUntilExam]);

  const getWeekDateRange = (weekIndex: number, startDateStr?: string) => {
    if (!startDateStr) return { label: '', isPast: false, fullDate: '' };
    const start = new Date(startDateStr);
    start.setDate(start.getDate() + (weekIndex * 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const today = new Date();
    today.setHours(0,0,0,0);
    const endDateComparison = new Date(end);
    endDateComparison.setHours(23,59,59,999);
    const isPast = endDateComparison < today;
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return { label: `${fmt(start)} - ${fmt(end)}`, fullDate: `${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`, isPast };
  };

  const weeks = Array.from({ length: weeksCount }, (_, i) => {
    const { label, isPast, fullDate } = getWeekDateRange(i, config.startDate);
    return { id: `week-${i + 1}`, index: i + 1, label, isPast, fullDate };
  });

  // --- HANDLERS ---
  const onDragStart = (e: React.DragEvent, id: string, origin: 'library' | 'week') => {
    e.dataTransfer.setData("notebookId", id);
    e.dataTransfer.setData("origin", origin);
    e.dataTransfer.effectAllowed = origin === 'library' ? 'copy' : 'move';
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  
  // BUG FIX 3.1: Library items should move (assign weekId), not clone (addNotebook).
  const onDrop = (e: React.DragEvent, targetWeekId: string | null, isPast: boolean) => {
    if (isPast) { alert("Você não pode alterar o planejamento de semanas que já passaram."); return; }
    
    const id = e.dataTransfer.getData("notebookId");
    // We don't strictly need 'origin' anymore since logic is now same for both, but kept for clarity
    
    if (id && targetWeekId) {
      // Correct Logic: Just assign the weekId. The 'library' list filters by !weekId, so it will disappear from sidebar automatically.
      moveNotebookToWeek(id, targetWeekId);
    }
  };

  const handleEditClick = (notebook: Notebook) => {
    setEditingId(notebook.id);
    let currentImages = notebook.images || [];
    if (currentImages.length === 0 && notebook.image) currentImages = [notebook.image];
    setFormData({
      discipline: notebook.discipline,
      name: notebook.name,
      subtitle: notebook.subtitle,
      tecLink: notebook.tecLink || '',
      obsidianLink: notebook.obsidianLink || '',
      accuracy: notebook.accuracy,
      targetAccuracy: notebook.targetAccuracy,
      weight: notebook.weight,
      relevance: notebook.relevance,
      trend: notebook.trend,
      notes: notebook.notes || '',
      images: currentImages
    });
    setIsModalOpen(true);
  };

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      editNotebook(editingId, { ...formData, accuracy: Number(formData.accuracy), targetAccuracy: Number(formData.targetAccuracy) });
      setIsModalOpen(false);
    }
  };

  const navigateLightbox = (direction: 'next' | 'prev') => {
      if (lightboxIndex === null) return;
      if (direction === 'next') setLightboxIndex((lightboxIndex + 1) % formData.images.length);
      else setLightboxIndex((lightboxIndex - 1 + formData.images.length) % formData.images.length);
  };

  const handleToggleComplete = (id: string, isCompleted: boolean) => editNotebook(id, { isWeekCompleted: isCompleted });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950">
      
      {/* Lightbox */}
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

      {/* Sidebar Library */}
      {viewMode === 'timeline' && (
      <aside className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900/30 flex flex-col z-20 hidden md:flex">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider"><Layout size={14} className="text-emerald-500" /> Matérias não alocadas</h2>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                <input type="text" placeholder="Filtrar backlog..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-emerald-500 outline-none" />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                <span>Total: {libraryNotebooks.length}</span>
                <span className="text-emerald-500 flex items-center gap-1">Arraste <ArrowRight size={10} /></span>
            </div>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
            {libraryNotebooks.map(nb => <DraggableCard key={nb.id} notebook={nb} onDragStart={onDragStart} onEdit={() => handleEditClick(nb)} origin="library" />)}
            {libraryNotebooks.length === 0 && <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2 opacity-50"><Settings2 size={24} /><span className="text-xs text-center">Nenhum caderno no backlog.<br/>Crie um novo em "Banco de Dados".</span></div>}
          </div>
      </aside>
      )}

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
         <header className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30 shadow-lg">
            <div className="flex items-center gap-6 w-full lg:w-auto lg:flex-1">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Início</span>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
                        <Calendar size={14} className="text-emerald-500" />
                        <input type="date" value={config.startDate || ''} onChange={(e) => updateConfig({...config, startDate: e.target.value})} className="bg-transparent outline-none text-xs text-white cursor-pointer font-medium" />
                    </div>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Data da Prova</span>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
                        <CalendarClock size={14} className="text-red-500" />
                        <span className="text-xs text-white font-medium">{config.examDate ? new Date(config.examDate).toLocaleDateString() : '--/--/----'}</span>
                    </div>
                 </div>
                 {daysRemaining !== null && (
                     <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Restam</span>
                        <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${daysRemaining < 30 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800 text-white border-slate-700'}`}>
                            {daysRemaining} dias
                        </div>
                     </div>
                 )}
            </div>

            <div className="w-full lg:w-auto flex justify-center order-3 lg:order-2">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-xl">
                    <button onClick={() => setViewMode('timeline')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'timeline' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><GanttChartSquare size={16} /> Visão Tática</button>
                    <button onClick={() => setViewMode('calculator')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'calculator' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Calculator size={16} /> Ciclo</button>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto lg:flex-1 justify-between lg:justify-end order-2 lg:order-3">
                 <div className="relative group w-full md:w-auto max-w-[200px]">
                    <div className="absolute inset-0 bg-slate-800 rounded-xl border border-slate-700 pointer-events-none group-hover:border-emerald-500/50 transition-colors shadow-sm"></div>
                    <div className="relative flex items-center px-4 py-2 gap-3 cursor-pointer">
                        <div className="flex items-center justify-center bg-slate-900 p-1.5 rounded-lg border border-slate-700 text-emerald-500"><Timer size={16} /></div>
                        <div className="flex flex-col flex-1 min-w-0">
                             <span className="text-[9px] text-slate-500 font-bold uppercase leading-tight">Carga Semanal</span>
                             <select value={config.studyPace} onChange={(e) => updateConfig({...config, studyPace: e.target.value as any})} className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer w-full z-10 appearance-none">
                                <option value="Iniciante">Iniciante (15 bl)</option>
                                <option value="Básico">Básico (30 bl)</option>
                                <option value="Intermediário">Interm. (45 bl)</option>
                                <option value="Avançado">Avançado (66 bl)</option>
                             </select>
                        </div>
                    </div>
                 </div>
                 <button onClick={() => setShowStats(!showStats)} className={`h-[42px] w-[42px] flex items-center justify-center rounded-xl transition-all border flex-shrink-0 ${showStats ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'}`}><BarChart3 size={18} /></button>
            </div>
         </header>

         {viewMode === 'timeline' ? (
             <div className="flex flex-col h-full overflow-hidden">
                 <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-slate-900 border-b border-slate-800 flex-shrink-0 ${showStats ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 border-none'}`}>
                    <div className="p-4 h-64 flex gap-6">
                        <div className="flex-1">
                            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase flex items-center gap-2"><BarChart3 size={14} className="text-emerald-500"/> Distribuição de Matérias</h3>
                            <ResponsiveContainer width="100%" height="80%">
                                <BarChart data={allocationData} layout="vertical" margin={{left: 0, right: 30}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false}/>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{fontSize: 10}} width={120} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: '12px' }} cursor={{fill: '#1e293b'}} />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10}>
                                        {allocationData.map((entry, index) => (<Cell key={`cell-${index}`} fill={['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'][index % 4]} />))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-64 border-l border-slate-800 pl-6 flex flex-col justify-center gap-4">
                            <div><p className="text-xs text-slate-500 uppercase font-bold">Total Alocado</p><p className="text-lg font-bold text-white truncate">{totalAllocatedBlocks} Blocos</p></div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Progresso Temporal</p>
                                <div className="w-full bg-slate-800 h-2 rounded-full mt-1 overflow-hidden"><div className="h-full bg-emerald-500" style={{width: `${(weeks.filter(w => w.isPast).length / weeks.length) * 100}%`}}></div></div>
                                <p className="text-xs text-right text-slate-400 mt-1">{weeks.filter(w => w.isPast).length} / {weeks.length} Semanas</p>
                            </div>
                        </div>
                    </div>
                 </div>

                 <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                    <div className="flex h-full p-6 gap-6 min-w-max items-start">
                        {weeks.map(week => {
                        const weekNotebooks = notebooks.filter(nb => nb.weekId === week.id);
                        const blocksCount = weekNotebooks.length;
                        const loadPercentage = Math.min((blocksCount / paceTarget.blocks) * 100, 100);
                        const missingBlocks = Math.max(0, paceTarget.blocks - blocksCount);
                        const isOverloaded = blocksCount > paceTarget.blocks;
                        const isComplete = blocksCount >= paceTarget.blocks && !isOverloaded;
                        return (
                            <div key={week.id} className={`w-80 flex-shrink-0 flex flex-col rounded-2xl border transition-all duration-300 relative h-full max-h-full ${week.isPast ? 'bg-slate-900/30 border-slate-800/50 opacity-70' : 'bg-slate-900 border-slate-800 shadow-2xl hover:border-slate-700'}`} onDragOver={week.isPast ? undefined : onDragOver} onDrop={(e) => onDrop(e, week.id, week.isPast)}>
                            <div className={`p-4 rounded-t-2xl border-b flex flex-col gap-3 z-10 relative ${week.isPast ? 'bg-slate-950/30 border-slate-800/50 text-slate-600' : 'bg-slate-900 border-slate-700 text-slate-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div><span className="font-black block text-base flex items-center gap-2 text-white">SEMANA {week.index} {week.isPast && <Lock size={14} />}</span><span className={`text-[10px] font-bold uppercase tracking-widest ${week.isPast ? 'line-through decoration-slate-600 opacity-50' : 'text-slate-500'}`}>{week.label}</span></div>
                                    <div className="flex flex-col items-end"><span className={`text-lg font-black ${isOverloaded ? 'text-red-400' : isComplete ? 'text-emerald-400' : 'text-white'}`}>{blocksCount}</span><span className="text-[9px] text-slate-500 uppercase font-bold">blocos</span></div>
                                </div>
                                {!week.isPast && (
                                    <div className="space-y-2">
                                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex relative group border border-slate-800"><div className={`h-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`} style={{ width: `${loadPercentage}%` }}></div></div>
                                        <div className="flex justify-between items-center">{missingBlocks > 0 ? (<span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"><AlertCircle size={10} /> Meta: +{missingBlocks} blocos</span>) : (<span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><Check size={10} /> Meta Batida</span>)}</div>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 space-y-2 overflow-y-auto flex-1 custom-scrollbar relative bg-slate-900/50">
                                {week.isPast && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none z-0"></div>}
                                {weekNotebooks.map(nb => <DraggableCard key={nb.id} notebook={nb} onDragStart={onDragStart} onEdit={() => handleEditClick(nb)} onToggleComplete={handleToggleComplete} isCompact origin="week" disabled={week.isPast} />)}
                                {weekNotebooks.length === 0 && !week.isPast && <div className="h-full flex flex-col items-center justify-center text-slate-700 text-xs italic opacity-50 border-2 border-dashed border-slate-800 rounded-xl m-2 bg-slate-950/50 min-h-[100px]">Arraste matérias aqui</div>}
                            </div>
                            </div>
                        );
                        })}
                    </div>
                 </div>
             </div>
         ) : (<CycleCalculator paceTarget={paceTarget} />)}
      </main>

       {/* === EDIT MODAL === */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pencil size={20} className="text-emerald-500"/> Editar Caderno (Rápido)</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
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
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center gap-4">
                      <div className="flex-1 w-full">
                         <label className="block text-[10px] font-bold text-emerald-400 mb-1 uppercase">Taxa de Acerto Atual (%)</label>
                         <input type="number" min="0" max="100" value={formData.accuracy} onChange={e => handleChange('accuracy', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white font-mono text-center font-bold text-lg focus:border-emerald-500 outline-none" />
                      </div>
                      <div className="flex-1 w-full flex gap-2">
                         <button type="button" onClick={handleNotStudied} className="flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600">
                            <Flag size={16} /> Não estudei
                         </button>
                      </div>
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Rascunhos & Anotações</h4>
                <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Obsidian / Notion</label><div className="relative"><FileCode className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.obsidianLink} onChange={e => handleChange('obsidianLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="obsidian://open?vault=..." /></div></div>
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
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 font-medium transition-colors">Cancelar</button>
                <button type="button" onClick={handleSave} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20 transition-all">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CycleItem { id: string; name: string; weight: Weight; }
const CycleCalculator: React.FC<{ paceTarget: { hours: number, blocks: number } }> = ({ paceTarget }) => {
    const [items, setItems] = useState<CycleItem[]>([]);
    const [newName, setNewName] = useState('');
    const [newWeight, setNewWeight] = useState<Weight>(Weight.MEDIO);
    const handleAddItem = (e: React.FormEvent) => { e.preventDefault(); if(!newName) return; setItems([...items, { id: Math.random().toString(36), name: newName, weight: newWeight }]); setNewName(''); };
    const handleRemoveItem = (id: string) => { setItems(items.filter(i => i.id !== id)); };
    const calculation = useMemo(() => { if(items.length === 0) return []; const totalScore = items.reduce((sum, item) => sum + WEIGHT_SCORE[item.weight], 0); return items.map(item => { const share = WEIGHT_SCORE[item.weight] / totalScore; const suggestedBlocks = Math.round(share * paceTarget.blocks); return { ...item, share: (share * 100).toFixed(1), suggestedBlocks: Math.max(1, suggestedBlocks) }; }); }, [items, paceTarget.blocks]);
    const totalCalculatedBlocks = calculation.reduce((sum, item) => sum + item.suggestedBlocks, 0);
    return (
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-full md:w-1/3 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit shadow-xl">
                <div className="mb-6 pb-6 border-b border-slate-800"><h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><PieChart size={20} className="text-emerald-500" /> Distribuidor de Carga</h3><p className="text-sm text-slate-400">Insira as disciplinas do edital. O algoritmo matemático distribuirá seus <strong className="text-white bg-slate-800 px-1 rounded">{paceTarget.blocks} blocos semanais</strong> proporcionalmente ao peso.</p></div>
                <form onSubmit={handleAddItem} className="space-y-4 mb-6">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Disciplina</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors" placeholder="Ex: Direito Administrativo" autoFocus /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso no Edital</label><select value={newWeight} onChange={e => setNewWeight(e.target.value as Weight)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors">{Object.values(Weight).map(w => <option key={w} value={w}>{w}</option>)}</select></div>
                    <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700"><Plus size={18} /> Adicionar à Matriz</button>
                </form>
                <div className="space-y-2">{items.map(item => (<div key={item.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"><div><p className="font-bold text-slate-200 text-sm">{item.name}</p><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{item.weight}</p></div><button onClick={() => handleRemoveItem(item.id)} className="text-slate-600 hover:text-red-400 transition-colors"><X size={16} /></button></div>))} {items.length === 0 && <p className="text-center text-xs text-slate-600 italic py-4">A lista está vazia.</p>}</div>
            </div>
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col shadow-xl">
                <div className="flex justify-between items-center mb-6 bg-slate-950/50 p-4 rounded-xl border border-slate-800"><div><h3 className="text-xl font-bold text-white">Resultado do Cálculo</h3><p className="text-xs text-slate-500">Baseado no ritmo: <span className="text-emerald-500 font-bold">{paceTarget.hours} horas</span> semanais</p></div><div className="text-right"><p className="text-xs text-slate-500 uppercase font-bold">Capacidade Utilizada</p><p className={`text-2xl font-black ${totalCalculatedBlocks > paceTarget.blocks ? 'text-red-500' : 'text-emerald-500'}`}>{totalCalculatedBlocks} <span className="text-sm text-slate-500 font-normal">/ {paceTarget.blocks} blocos</span></p></div></div>
                {items.length > 0 ? ( <div className="flex-1 overflow-y-auto custom-scrollbar"><table className="w-full text-left border-collapse"><thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold tracking-wider sticky top-0 z-10"><tr><th className="p-3 rounded-tl-lg">Disciplina</th><th className="p-3">Importância Relativa</th><th className="p-3 text-right">Blocos Sugeridos</th><th className="p-3 text-right rounded-tr-lg">Tempo Semanal</th></tr></thead><tbody className="divide-y divide-slate-800/50 text-sm">{calculation.map((item) => (<tr key={item.id} className="hover:bg-slate-800/30 transition-colors group"><td className="p-4 font-medium text-slate-200">{item.name}</td><td className="p-4"><div className="flex items-center gap-3"><div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden max-w-[100px]"><div className="bg-emerald-500 h-full" style={{width: `${item.share}%`}}></div></div><span className="text-xs text-slate-500 font-mono">{item.share}%</span></div></td><td className="p-4 text-right"><span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg font-bold text-sm">{item.suggestedBlocks}</span></td><td className="p-4 text-right text-slate-400 text-xs font-mono">~{Math.round((item.suggestedBlocks * 40) / 60)}h {((item.suggestedBlocks * 40) % 60)}min</td></tr>))}</tbody></table><div className="mt-6 p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl flex gap-4 items-center animate-pulse"><div className="bg-emerald-500/20 p-2 rounded-full text-emerald-500"><ArrowRight size={20} /></div><div><h4 className="text-emerald-400 font-bold text-sm mb-0.5">Aplicação Tática</h4><p className="text-slate-400 text-xs">Volte para a aba "Visão Tática" e distribua os blocos sugeridos acima ao longo das suas semanas.</p></div></div></div> ) : ( <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-50"><Calculator size={64} className="mb-4 text-slate-700" /><p className="text-sm font-medium">Adicione disciplinas na esquerda para calcular.</p></div> )}
            </div>
        </div>
    );
};

const DraggableCard: React.FC<{ 
    notebook: Notebook; 
    onDragStart: (e: React.DragEvent, id: string, origin: 'library' | 'week') => void; 
    onEdit: () => void;
    onToggleComplete?: (id: string, isCompleted: boolean) => void;
    isCompact?: boolean;
    origin: 'library' | 'week';
    disabled?: boolean;
}> = ({ notebook, onDragStart, onEdit, onToggleComplete, isCompact, origin, disabled }) => {
  const getAccuracyColor = (acc: number, target: number) => {
    if(acc === 0) return 'text-slate-500';
    if(acc >= target) return 'text-emerald-400';
    if(acc < 60) return 'text-red-400';
    return 'text-amber-400';
  };
  const isCompleted = notebook.isWeekCompleted && origin === 'week';
  const hasImages = (notebook.images && notebook.images.length > 0) || !!notebook.image;

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, notebook.id, origin)}
      className={`bg-slate-800 border border-slate-700 rounded-xl p-3 transition-all shadow-sm group relative overflow-hidden flex flex-col ${isCompact ? 'text-xs' : 'text-sm'} ${origin === 'library' ? 'hover:bg-slate-700 hover:border-slate-500 hover:shadow-lg hover:shadow-black/50' : 'hover:bg-slate-800 hover:border-emerald-500/30'} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-grab active:cursor-grabbing hover:shadow-lg'} ${isCompleted ? 'opacity-50 grayscale border-slate-800 bg-slate-900' : ''}`}
    >
      {origin === 'library' && <div className="absolute right-0 top-0 p-1 bg-slate-900/80 rounded-bl text-[9px] text-emerald-500 uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-l border-b border-slate-700">Copiar</div>}
      <div className="flex justify-between items-start w-full">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 text-slate-600 group-hover:text-emerald-500 transition-colors cursor-grab p-1 hover:bg-slate-700 rounded"><GripVertical size={14} /></div>
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider mb-1 border ${isCompleted ? 'line-through decoration-slate-600 bg-slate-900 text-slate-700 border-slate-800' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>{notebook.discipline}</span>
              <p className={`font-bold text-slate-200 truncate leading-tight ${isCompact ? 'line-clamp-2' : ''} ${isCompleted ? 'line-through text-slate-600' : ''}`} title={notebook.name}>{notebook.name}</p>
              {!isCompact && <p className="text-xs text-slate-500 mt-1 truncate">{notebook.subtitle}</p>}
              <div className="flex items-center gap-2 mt-2">
                 <div className={`text-[10px] font-black flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 ${getAccuracyColor(notebook.accuracy, notebook.targetAccuracy)}`}><TrendingUp size={10} />{notebook.accuracy}%</div>
                 {notebook.tecLink && <LinkIcon size={12} className="text-slate-600 hover:text-sky-400 transition-colors" />}
                 {notebook.obsidianLink && <FileCode size={12} className="text-slate-600 hover:text-purple-400 transition-colors" />}
                 {notebook.notes && <StickyNote size={12} className="text-slate-600 hover:text-yellow-400 transition-colors" />}
                 {hasImages && <ImageIcon size={12} className="text-slate-600 hover:text-purple-400 transition-colors" />}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-slate-500 hover:text-white p-1.5 hover:bg-slate-700 rounded-lg transition-colors" title="Editar rapidamente"><Pencil size={12} /></button>
              {origin === 'week' && onToggleComplete && <button onClick={(e) => { e.stopPropagation(); onToggleComplete(notebook.id, !notebook.isWeekCompleted); }} className={`p-1.5 rounded-lg transition-colors ${isCompleted ? 'text-emerald-500 hover:text-emerald-400 bg-emerald-900/20' : 'text-slate-500 hover:text-emerald-500 hover:bg-slate-700'}`} title={isCompleted ? "Reabrir estudo" : "Marcar como estudado nesta semana"}>{isCompleted ? <CheckSquare size={12} /> : <Square size={12} />}</button>}
          </div>
      </div>
    </div>
  );
};