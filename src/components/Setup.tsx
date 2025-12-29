import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Notebook, Weight, Relevance, Trend, NotebookStatus, ScheduleItem } from '../types';
import { Plus, Search, Copy, Pencil, X, Save, Link as LinkIcon, BarChart3, Calendar, Lock, ChevronDown, ChevronUp, Layout, FileCode, CheckSquare, Check, Timer, Calculator, AlertCircle, ArrowRight, Settings2, GanttChartSquare, ZoomIn, Trash2, CalendarClock, Flag, ChevronLeft, ChevronRight, Inbox, Layers, Star, ScanSearch, Scale, Loader2, TrendingUp, History, ListPlus, Minus, AlertTriangle, CheckCircle2, RotateCw, Zap, Activity, Info, Clock, Archive, Cloud, CloudOff, Download, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { calculateNextReview, getStatusColor } from '../utils/algorithm';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';

const PACE_SETTINGS: Record<string, { hours: number, blocks: number }> = {
    'Iniciante': { hours: 10, blocks: 15 },
    'Básico': { hours: 20, blocks: 30 },
    'Intermediário': { hours: 30, blocks: 45 },
    'Avançado': { hours: 44, blocks: 66 }
};

// MEMOIZED COMPONENT TO PREVENT RE-RENDERS ON DRAG/SEARCH
const DraggableCard = React.memo(({ 
    notebook, 
    instanceId, // NEW: Specific instance ID for slots
    onDragStart, 
    onEdit, 
    origin, 
    isCompact, 
    disabled, 
    onToggleComplete,
    onRemove, 
    allocationCount,
    isCompleted // Passed from slot
}: {
    notebook: Notebook;
    instanceId?: string;
    onDragStart: (e: React.DragEvent, id: string, origin: 'library' | 'week') => void;
    onEdit: (notebook: Notebook) => void;
    origin: 'library' | 'week';
    isCompact?: boolean;
    disabled?: boolean;
    onToggleComplete?: (instanceId: string, isCompleted: boolean) => void;
    onRemove?: (instanceId: string) => void;
    allocationCount?: number;
    isCompleted?: boolean;
}) => {
    const statusColor = getStatusColor(notebook.accuracy, notebook.targetAccuracy);
    
    // Determine visuals based on origin
    const isLibrary = origin === 'library';
    const isWeek = origin === 'week';

    return (
        <div 
            draggable={!disabled}
            onDragStart={(e) => onDragStart(e, notebook.id, origin)}
            className={`
                group relative bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-emerald-500/50 transition-all shadow-sm
                ${disabled ? 'opacity-50 pointer-events-none' : ''}
                ${isCompact ? 'text-xs' : 'text-sm'}
                ${isCompleted && isWeek ? 'bg-slate-900 border-slate-800' : ''}
            `}
        >
            {isLibrary && (
                <div className={`absolute right-0 top-0 p-1 rounded-bl text-[9px] uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-l border-b z-10 flex items-center gap-1 bg-slate-900/80 border-slate-700 text-emerald-500`}>
                    <Calendar size={10}/> + Agendar
                </div>
            )}

            {/* IMPROVED REMOVE BUTTON FOR WEEK VIEW */}
            {isWeek && onRemove && instanceId && !disabled && (
                <div 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onRemove(instanceId); 
                    }} 
                    className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-slate-900 text-slate-500 hover:text-white hover:bg-amber-600 border border-slate-700 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-50 cursor-pointer"
                    title="Remover do planejamento"
                >
                    <Minus size={12} />
                </div>
            )}

            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                         <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: statusColor }} 
                            title={`Acurácia: ${notebook.accuracy}%`}
                         />
                        <h4 className={`font-bold truncate leading-tight ${isCompleted && isWeek ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                            {notebook.discipline}
                        </h4>
                        {isLibrary && allocationCount && allocationCount > 0 ? (
                            <span className="text-[8px] bg-blue-900/30 text-blue-400 border border-blue-500/30 px-1.5 rounded flex items-center gap-1" title="Alocado no planejamento">
                                <CheckCircle2 size={8} /> No Ciclo
                            </span>
                        ) : null}
                    </div>
                    <p className={`truncate mb-1 leading-tight ${isCompleted && isWeek ? 'text-slate-600' : 'text-slate-400'}`} title={notebook.name}>{notebook.name}</p>
                    {notebook.subtitle && <p className="text-slate-500 text-[10px] truncate">{notebook.subtitle}</p>}
                </div>
                
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                     <span className={`font-mono font-bold text-xs ${notebook.accuracy < 60 ? 'text-red-400' : 'text-emerald-400'}`}>
                         {notebook.accuracy}%
                     </span>
                     <div className="flex gap-1">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(notebook); }} 
                            className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
                            title="Editar"
                         >
                             <Pencil size={12} />
                         </button>
                     </div>
                </div>
            </div>

            {isWeek && onToggleComplete && instanceId && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer group/check w-full">
                        <div className={`
                            w-full py-1.5 px-3 rounded-lg border flex items-center justify-center gap-2 transition-all font-bold text-[10px] uppercase tracking-wider
                            ${isCompleted 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                                : 'border-slate-600 bg-slate-700 text-slate-300 group-hover/check:border-slate-500 hover:bg-slate-600'}
                        `}>
                             {isCompleted ? <><Check size={12} strokeWidth={4} /> Concluído</> : "Em Andamento"}
                        </div>
                        <input 
                            type="checkbox" 
                            checked={!!isCompleted} 
                            onChange={(e) => onToggleComplete(instanceId, e.target.checked)}
                            className="hidden"
                        />
                    </label>
                </div>
            )}
        </div>
    );
});

// Helper for normalization
const normalizeStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const CycleCalculator = ({ paceTarget }: { paceTarget: { hours: number, blocks: number } }) => {
    // ... [CycleCalculator logic remains unchanged] ...
    // Assuming identical content as previous file
    const { notebooks, config, updateConfig } = useStore();
    const [newDiscName, setNewDiscName] = useState('');
    
    // --- PERSISTENT STATE MANAGEMENT ---
    const availableDisciplines = useMemo<string[]>(() => {
        const set = new Set<string>();
        notebooks.forEach(n => {
            if (n.discipline !== 'Revisão Geral') set.add(n.discipline);
        });
        (config.calculatorState?.customDisciplines || []).forEach(d => set.add(d));
        return Array.from(set).sort();
    }, [notebooks, config.calculatorState?.customDisciplines]);

    useEffect(() => {
        if (!config.calculatorState) {
            const initialWeights: Record<string, number> = {};
            availableDisciplines.forEach((d: string) => initialWeights[d] = 1);
            updateConfig({
                ...config,
                calculatorState: {
                    weights: initialWeights,
                    selectedDisciplines: availableDisciplines,
                    customDisciplines: []
                }
            });
        }
    }, [availableDisciplines.length]); 

    const weights: Record<string, number> = config.calculatorState?.weights || {};
    const selectedDiscs = new Set<string>(config.calculatorState?.selectedDisciplines || []);
    const customDiscs: string[] = config.calculatorState?.customDisciplines || [];

    const toggleDisc = (d: string) => {
        const newSet = new Set(selectedDiscs);
        if (newSet.has(d)) newSet.delete(d); else newSet.add(d);
        const newWeights = { ...weights }; if (!newWeights[d]) newWeights[d] = 1;
        updateConfig({ ...config, calculatorState: { ...config.calculatorState!, selectedDisciplines: Array.from(newSet), weights: newWeights } });
    };

    const updateWeight = (d: string, w: number) => {
        const safeW = Math.max(0.5, Math.min(10, w));
        updateConfig({ ...config, calculatorState: { ...config.calculatorState!, weights: { ...weights, [d]: safeW } } });
    };

    const handleAddDiscipline = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newDiscName.trim();
        if (!trimmed) return;
        const normNew = normalizeStr(trimmed);
        const exists = availableDisciplines.some(d => normalizeStr(d) === normNew);
        if (exists) { alert("Esta disciplina já existe na lista."); setNewDiscName(''); return; }
        updateConfig({ ...config, calculatorState: { weights: { ...weights, [trimmed]: 1 }, selectedDisciplines: [...Array.from(selectedDiscs), trimmed], customDisciplines: [...customDiscs, trimmed] } });
        setNewDiscName('');
    };

    const handleRemoveDiscipline = (d: string) => {
        const isFromNotebooks = notebooks.some(n => n.discipline === d);
        if (isFromNotebooks) {
            const newSet = new Set(selectedDiscs); newSet.delete(d);
            updateConfig({ ...config, calculatorState: { ...config.calculatorState!, selectedDisciplines: Array.from(newSet) } });
        } else {
            const newCustom = customDiscs.filter(c => c !== d);
            const newSet = new Set(selectedDiscs); newSet.delete(d);
            const newWeights = { ...weights }; delete newWeights[d];
            updateConfig({ ...config, calculatorState: { weights: newWeights, selectedDisciplines: Array.from(newSet), customDisciplines: newCustom } });
        }
    };

    const totalWeight = useMemo(() => {
        let sum = 0; selectedDiscs.forEach(d => { sum += (weights[d] || 1); }); return sum;
    }, [selectedDiscs, weights]);

    const distribution = useMemo(() => {
        if (totalWeight === 0) return [];
        return availableDisciplines.map(d => {
            if (!selectedDiscs.has(d)) return null;
            const weight = weights[d] || 1;
            const percentage = weight / totalWeight;
            const blocks = Math.round(percentage * paceTarget.blocks);
            return { name: d, weight, percentage, blocks, topicCount: notebooks.filter(n => n.discipline === d).length };
        }).filter(Boolean) as {name: string, weight: number, percentage: number, blocks: number, topicCount: number}[];
    }, [availableDisciplines, selectedDiscs, weights, totalWeight, paceTarget.blocks, notebooks]);

    const totalAllocated = distribution.reduce((sum, item) => sum + item.blocks, 0);
    const diff = totalAllocated - paceTarget.blocks;
    const isBalanced = diff === 0; const isOver = diff > 0; const isUnder = diff < 0;
    const totalItems = notebooks.filter(n => n.discipline !== 'Revisão Geral').length;
    const cycleVelocity = paceTarget.blocks > 0 ? (totalItems / paceTarget.blocks) : 0;
    const giroDisplay = cycleVelocity === 0 ? "∞" : cycleVelocity < 1 ? `${(1/cycleVelocity).toFixed(1)}x / sem` : `${cycleVelocity.toFixed(1)} sem`;

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-500 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar">
            {/* ... Render Logic for Calculator ... */}
             <div className="text-center mb-8">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-emerald-900/10 mx-auto border border-slate-700"><Scale size={32} className="text-emerald-500" /></div>
                <h2 className="text-2xl font-bold text-white mb-2">Planejamento de Ciclo</h2>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Defina os pesos estratégicos. O algoritmo Atena distribuirá sua carga de <strong className="text-white">{paceTarget.blocks} blocos/semana (Ritmo Padrão)</strong>.</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full min-h-[400px]">
                 <div className={`p-4 border-b flex justify-between items-center ${isOver ? 'bg-red-950/40 border-red-900/50' : isUnder ? 'bg-amber-950/40 border-amber-900/50' : 'bg-slate-950/50 border-slate-800'}`}>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2"><Scale size={16} /> Distribuição Ponderada</h3>
                    <div className="flex items-center gap-4">
                        {!isBalanced && <span className={`text-xs font-bold ${isOver ? 'text-red-400' : 'text-amber-400'}`}>{isOver ? `Remova ${Math.abs(diff)} blocos` : `Aloque +${Math.abs(diff)} blocos`}</span>}
                        <div className={`text-xs font-mono px-3 py-1 rounded-full border ${isBalanced ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-white'}`}>Alocado: <strong>{totalAllocated}</strong> / {paceTarget.blocks}</div>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-800/50">
                    {availableDisciplines.map(d => {
                        const isSelected = selectedDiscs.has(d);
                        const dist = distribution.find(x => x.name === d);
                        const blocks = dist?.blocks || 0;
                        const percent = dist ? Math.round(dist.percentage * 100) : 0;
                        const currentWeight = weights[d] || 1;
                        return (
                            <div key={d} className={`flex items-center p-4 ${isSelected ? '' : 'opacity-60 bg-slate-950/50 grayscale'}`}>
                                <div className="w-12 flex justify-center"><input type="checkbox" checked={isSelected} onChange={() => toggleDisc(d)} className="w-5 h-5 rounded bg-slate-800 text-emerald-600 cursor-pointer" /></div>
                                <div className="flex-1 px-2 font-medium text-sm text-slate-200">{d}</div>
                                <div className="w-36 flex justify-center"><div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg overflow-hidden"><button onClick={() => updateWeight(d, currentWeight - 0.5)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-400"><Minus size={14} /></button><div className="w-10 text-center text-sm font-bold text-white bg-slate-900 h-8 flex items-center justify-center">{currentWeight}</div><button onClick={() => updateWeight(d, currentWeight + 0.5)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-400"><Plus size={14} /></button></div></div>
                                <div className="w-40 px-4"><div className="flex items-center gap-2 mb-1"><span className="text-lg font-black text-emerald-400">{blocks}</span></div><div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: isSelected ? `${percent}%` : '0%' }}></div></div></div>
                            </div>
                        )
                    })}
                 </div>
            </div>
        </div>
    );
};

// ... Rest of Setup Component (Export) ...
export const Setup: React.FC = () => {
  const { notebooks, cycles, activeCycleId, config, updateConfig, moveNotebookToWeek, editNotebook, toggleSlotCompletion, removeSlotFromWeek, isSyncing, isGuest, exportDatabase } = useStore();
  
  const [viewMode, setViewMode] = useState<'timeline' | 'calculator'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'unallocated' | 'overdue'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true); // NEW STATE FOR COLLAPSE
  
  const initialFormState = {
    discipline: '', name: '', subtitle: '', tecLink: '', lawLink: '', obsidianLink: '', accuracy: 0, targetAccuracy: 90,
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, notes: '', images: [] as string[], accuracyHistory: [] as { date: string, accuracy: number }[]
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPace = config.studyPace || 'Intermediário';
  const paceTarget = PACE_SETTINGS[currentPace] || PACE_SETTINGS['Intermediário'];
  
  // Calculate allocation from slots
  const allocationData = useMemo(() => {
    const data: Record<string, number> = {};
    const activeCycle = cycles.find(c => c.id === activeCycleId);
    
    if (activeCycle?.schedule) {
        Object.values(activeCycle.schedule).forEach((slots: ScheduleItem[]) => {
            slots.forEach(slot => {
                const nb = notebooks.find(n => n.id === slot.notebookId);
                if (nb && nb.discipline !== 'Revisão Geral') {
                    data[nb.discipline] = (data[nb.discipline] || 0) + 1;
                }
            });
        });
    } else {
        // Legacy fallback
        notebooks.filter(n => n.discipline !== 'Revisão Geral' && n.weekId).forEach(nb => {
            data[nb.discipline] = (data[nb.discipline] || 0) + 1;
        });
    }
    
    return Object.keys(data).map(key => ({ name: key, count: data[key] })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [notebooks, activeCycleId, cycles]);

  const totalAllocatedBlocks = useMemo(() => {
      const activeCycle = cycles.find(c => c.id === activeCycleId);
      if (activeCycle?.schedule) {
          let count = 0;
          Object.values(activeCycle.schedule).forEach((slots: ScheduleItem[]) => count += slots.length);
          return count;
      }
      return notebooks.filter(n => n.weekId && n.weekId.startsWith('week-')).length;
  }, [notebooks, activeCycleId, cycles]);

  const normalizeText = useCallback((text: string) => {
      return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\n\r]/g, " ").replace(/\s+/g, " ").replace(/[^a-z0-9\s]/g, "");
  }, []);

  // --- UPDATED: Library Logic (Pure Templates with Filters) ---
  const libraryNotebooks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Sort to prioritize "Library" items (weekId == null)
    const sorted = [...notebooks].sort((a, b) => {
        if (!a.weekId && b.weekId) return -1;
        if (a.weekId && !b.weekId) return 1;
        return 0;
    });

    let result = sorted.filter(nb => {
        if (nb.discipline === 'Revisão Geral') return false;
        const matchesSearch = nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || nb.discipline.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    if (libraryFilter === 'unallocated') {
        result = result.filter(nb => !nb.weekId);
    } else if (libraryFilter === 'overdue') {
        result = result.filter(nb => nb.nextReview && nb.nextReview.split('T')[0] < today);
    }

    result.sort((a, b) => a.discipline.localeCompare(b.discipline) || a.name.localeCompare(b.name));
    return result;
  }, [notebooks, searchTerm, libraryFilter, normalizeText]);

  const existingDisciplines = useMemo(() => {
    return Array.from(new Set(notebooks.map(n => n.discipline))).sort();
  }, [notebooks]);

  const daysRemaining = useMemo(() => {
      if (!config.examDate) return null;
      const today = new Date();
      const exam = new Date(config.examDate);
      const diffTime = exam.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [config.examDate]);

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

  const getWeekPace = useCallback((weekId: string) => {
      const specific = config.weeklyPace?.[weekId];
      return specific || config.studyPace || 'Intermediário';
  }, [config.weeklyPace, config.studyPace]);

  const updateWeekPace = (weekId: string, newPace: string) => {
      updateConfig({ ...config, weeklyPace: { ...(config.weeklyPace || {}), [weekId]: newPace } });
  };

  // --- DRAG HANDLERS ---
  const onDragStart = useCallback((e: React.DragEvent, id: string, origin: 'library' | 'week') => {
    e.dataTransfer.setData("notebookId", id);
    e.dataTransfer.setData("origin", origin);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  
  const onDrop = async (e: React.DragEvent, targetWeekId: string | null, isPast: boolean) => {
    if (isPast) { alert("Você não pode alterar o planejamento de semanas que já passaram."); return; }
    const id = e.dataTransfer.getData("notebookId");
    if (!id || !targetWeekId) return;
    await moveNotebookToWeek(id, targetWeekId);
  };

  const handleEditClick = useCallback((notebook: Notebook) => {
    setEditingId(notebook.id);
    let currentImages = notebook.images || [];
    if (currentImages.length === 0 && notebook.image) currentImages = [notebook.image];
    setFormData({
      discipline: notebook.discipline, name: notebook.name, subtitle: notebook.subtitle,
      tecLink: notebook.tecLink || '', lawLink: notebook.lawLink || '', obsidianLink: notebook.obsidianLink || '',
      accuracy: notebook.accuracy, targetAccuracy: notebook.targetAccuracy, weight: notebook.weight,
      relevance: notebook.relevance, trend: notebook.trend, notes: notebook.notes || '',
      images: currentImages, accuracyHistory: notebook.accuracyHistory || []
    });
    setIsModalOpen(true);
  }, []);

  const handleChange = (field: keyof typeof initialFormState, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      (Array.from(files) as File[]).forEach(file => {
          if (file.size > 2 * 1024 * 1024) { alert("Imagem muito grande (>2MB)."); return; }
          const reader = new FileReader();
          reader.onloadend = () => { if(reader.result) setFormData(prev => ({ ...prev, images: [...prev.images, reader.result as string] })); };
          reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => { setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) })); };
  const handleNotStudied = () => { setFormData(prev => ({ ...prev, accuracy: 0, status: NotebookStatus.NOT_STARTED })); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const payload: any = { ...formData, accuracy: Number(formData.accuracy), targetAccuracy: Number(formData.targetAccuracy) };
        if (editingId) await editNotebook(editingId, payload);
        setIsModalOpen(false);
    } catch (error) {
        console.error("Failed to save:", error);
        alert("Erro ao salvar.");
    } finally {
        setIsSaving(false);
    }
  };

  const navigateLightbox = (direction: 'next' | 'prev') => {
      if (lightboxIndex === null) return;
      if (direction === 'next') setLightboxIndex((lightboxIndex + 1) % formData.images.length);
      else setLightboxIndex((lightboxIndex - 1 + formData.images.length) % formData.images.length);
  };

  const handleToggleSlot = useCallback((instanceId: string, isCompleted: boolean) => {
      // Logic handled via props
  }, []);

  const handleRemoveFromWeek = useCallback((instanceId: string, weekId: string) => {
      removeSlotFromWeek(instanceId, weekId);
  }, [removeSlotFromWeek]);

  const handleQuickRecord = async () => {
      setIsSaving(true);
      try {
          const newAccuracy = Number(formData.accuracy);
          const newHistory = [...(formData.accuracyHistory || []), { date: new Date().toISOString(), accuracy: newAccuracy }].slice(-3);
          if(editingId) {
              await editNotebook(editingId, { accuracy: newAccuracy, accuracyHistory: newHistory, lastPractice: new Date().toISOString() });
              setFormData(prev => ({ ...prev, accuracyHistory: newHistory }));
          }
      } catch (err) { console.error("Quick save failed", err); } finally { setIsSaving(false); }
  };

  const activeCycle = cycles.find(c => c.id === activeCycleId);

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
             <div className="absolute bottom-4 bg-black/50 px-4 py-1 rounded-full text-white text-sm">{lightboxIndex + 1} / {formData.images.length}</div>
          </div>
      )}

      {/* Sidebar Library - NOW COLLAPSIBLE */}
      {viewMode === 'timeline' && isLibraryOpen && (
      <aside className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900/30 flex flex-col z-20 hidden md:flex transition-all">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider"><Layout size={14} className="text-emerald-500" /> Banco de Disciplinas</h2>
                <button onClick={() => setIsLibraryOpen(false)} className="text-slate-500 hover:text-white" title="Recolher Menu">
                    <PanelLeftClose size={16} />
                </button>
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => setLibraryFilter('all')} className={`flex-1 py-1.5 text-[10px] rounded border font-bold ${libraryFilter === 'all' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-transparent border-slate-800 text-slate-500'}`}>Todos</button>
                <button onClick={() => setLibraryFilter('unallocated')} className={`flex-1 py-1.5 text-[10px] rounded border font-bold ${libraryFilter === 'unallocated' ? 'bg-blue-900/20 border-blue-500/30 text-blue-400' : 'bg-transparent border-slate-800 text-slate-500'}`}>Pendentes</button>
                <button onClick={() => setLibraryFilter('overdue')} className={`flex-1 py-1.5 text-[10px] rounded border font-bold ${libraryFilter === 'overdue' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-transparent border-slate-800 text-slate-500'}`}>Atrasados</button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-emerald-500 outline-none" />
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                <span>Total: {libraryNotebooks.length}</span>
                <span className="text-emerald-500 flex items-center gap-1">Arraste para Agendar <ArrowRight size={10} /></span>
            </div>
          </div>
          
          <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
            {libraryNotebooks.map((nb: any) => (
                <DraggableCard 
                    key={nb.id} 
                    notebook={nb} 
                    onDragStart={onDragStart} 
                    onEdit={handleEditClick} 
                    origin="library" 
                    allocationCount={nb.weekId ? 1 : 0}
                />
            ))}
            
            {libraryNotebooks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2 opacity-50 px-4 text-center">
                    <Settings2 size={24} />
                    <span className="text-xs">Nenhum caderno encontrado. {libraryFilter === 'unallocated' ? "Tudo já está agendado!" : "Crie um novo caderno."}</span>
                </div>
            )}
          </div>
      </aside>
      )}

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
         
         {/* Reopen Sidebar Toggle (Visible when sidebar is closed in timeline view) */}
         {viewMode === 'timeline' && !isLibraryOpen && (
             <button 
                onClick={() => setIsLibraryOpen(true)}
                className="absolute left-0 top-24 z-30 p-2 bg-slate-800 rounded-r-lg shadow-lg border-y border-r border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Expandir Banco de Disciplinas"
             >
                 <PanelLeftOpen size={16} />
             </button>
         )}

         <header className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30 shadow-lg">
            {/* Header Content... */}
            <div className="flex items-center gap-6 w-full lg:w-auto lg:flex-1">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Início</span>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
                        <Calendar size={14} className="text-emerald-500" />
                        <input type="date" value={config.startDate || ''} onChange={(e) => updateConfig({...config, startDate: e.target.value})} className="bg-transparent outline-none text-xs text-white cursor-pointer font-medium" />
                    </div>
                 </div>
                 
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Status</span>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 min-w-[120px]">
                        {isSyncing ? (
                            <Loader2 size={14} className="text-amber-500 animate-spin" />
                        ) : isGuest ? (
                            <CloudOff size={14} className="text-slate-500" />
                        ) : (
                            <Cloud size={14} className="text-emerald-500" />
                        )}
                        <span className={`text-xs font-bold ${isSyncing ? 'text-amber-500' : isGuest ? 'text-slate-500' : 'text-emerald-500'}`}>
                            {isSyncing ? "Salvando..." : isGuest ? "Local (Visitante)" : "Sincronizado"}
                        </span>
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
                    <button onClick={() => setViewMode('calculator')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'calculator' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Calculator size={16} /> Planejamento</button>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto lg:flex-1 justify-between lg:justify-end order-2 lg:order-3">
                 <div className="relative group w-full md:w-auto max-w-[200px]">
                    <div className="absolute inset-0 bg-slate-800 rounded-xl border border-slate-700 pointer-events-none group-hover:border-emerald-500/50 transition-colors shadow-sm"></div>
                    <div className="relative flex items-center px-4 py-2 gap-3 cursor-pointer">
                        <div className="flex items-center justify-center bg-slate-900 p-1.5 rounded-lg border border-slate-700 text-emerald-500"><Timer size={16} /></div>
                        <div className="flex flex-col flex-1 min-w-0">
                             <span className="text-[9px] text-slate-500 font-bold uppercase leading-tight">Ritmo Padrão</span>
                             <select value={config.studyPace} onChange={(e) => updateConfig({...config, studyPace: e.target.value as any})} className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer w-full z-10 appearance-none">
                                <option value="Iniciante">Iniciante (15 bl)</option>
                                <option value="Básico">Básico (30 bl)</option>
                                <option value="Intermediário">Interm. (45 bl)</option>
                                <option value="Avançado">Avançado (66 bl)</option>
                             </select>
                        </div>
                    </div>
                 </div>
                 
                 <button 
                    onClick={exportDatabase} 
                    className="h-[42px] w-[42px] flex items-center justify-center rounded-xl transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700 hover:border-emerald-500/50"
                    title="Fazer Backup Manual (.json)"
                 >
                    <Download size={18} />
                 </button>

                 <button onClick={() => setShowStats(!showStats)} className={`h-[42px] w-[42px] flex items-center justify-center rounded-xl transition-all border flex-shrink-0 ${showStats ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'}`}><BarChart3 size={18} /></button>
            </div>
         </header>

         {viewMode === 'timeline' ? (
             <div className="flex flex-col h-full overflow-hidden">
                 {/* ... (Timeline content remains identical) ... */}
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
                        
                        // NEW LOGIC: Get slots from schedule OR fallback to single instances
                        let weekSlots: ScheduleItem[] = [];
                        
                        if (activeCycle?.schedule && activeCycle.schedule[week.id]) {
                            weekSlots = activeCycle.schedule[week.id];
                        } else {
                            // Legacy fallback display
                            const legacyNotebooks = notebooks.filter(nb => nb.weekId === week.id);
                            weekSlots = legacyNotebooks.map(nb => ({
                                instanceId: nb.id + '-legacy', // Fake instance ID
                                notebookId: nb.id,
                                completed: !!nb.isWeekCompleted
                            }));
                        }

                        const blocksCount = weekSlots.length;
                        const blocksCompleted = weekSlots.filter(s => s.completed).length;
                        
                        const weekPaceName = getWeekPace(week.id);
                        const weekTarget = PACE_SETTINGS[weekPaceName] || paceTarget;
                        const loadPercentage = Math.min((blocksCount / weekTarget.blocks) * 100, 100);
                        const missingBlocks = Math.max(0, weekTarget.blocks - blocksCount);
                        
                        // Status Logic
                        const isOverloaded = blocksCount > weekTarget.blocks;
                        const isAllocated = blocksCount >= weekTarget.blocks && !isOverloaded;
                        const isWeekFullyDone = blocksCount > 0 && blocksCompleted === blocksCount;
                        const isLate = week.isPast && !isWeekFullyDone;
                        
                        return (
                            <div key={week.id} className={`w-80 flex-shrink-0 flex flex-col rounded-2xl border transition-all duration-300 relative h-full max-h-full ${week.isPast ? 'bg-slate-900/30 border-slate-800/50 opacity-90' : 'bg-slate-900 border-slate-800 shadow-2xl hover:border-slate-700'}`} onDragOver={week.isPast ? undefined : onDragOver} onDrop={(e) => onDrop(e, week.id, week.isPast)}>
                            <div className={`p-4 rounded-t-2xl border-b flex flex-col gap-3 z-10 relative ${week.isPast ? 'bg-slate-950/30 border-slate-800/50 text-slate-600' : 'bg-slate-900 border-slate-700 text-slate-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div><span className="font-black block text-base flex items-center gap-2 text-white">SEMANA {week.index} {week.isPast && <Lock size={14} />}</span><span className={`text-[10px] font-bold uppercase tracking-widest ${week.isPast ? 'line-through decoration-slate-600 opacity-50' : 'text-slate-500'}`}>{week.label}</span></div>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-lg font-black ${isOverloaded ? 'text-red-400' : isAllocated ? 'text-emerald-400' : 'text-white'}`}>
                                            {blocksCount}
                                        </span>
                                        <span className="text-[9px] text-slate-500 uppercase font-bold">blocos</span>
                                    </div>
                                </div>
                                {!week.isPast && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="relative w-full">
                                            <select value={weekPaceName} onChange={(e) => updateWeekPace(week.id, e.target.value)} className="w-full bg-slate-950/50 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 outline-none focus:border-emerald-500 appearance-none font-medium cursor-pointer hover:bg-slate-800">
                                                <option value="Iniciante">Iniciante (15)</option>
                                                <option value="Básico">Básico (30)</option>
                                                <option value="Intermediário">Interm. (45)</option>
                                                <option value="Avançado">Avançado (66)</option>
                                            </select>
                                            <div className="absolute right-2 top-1.5 pointer-events-none text-slate-500"><ChevronDown size={10} /></div>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2 mt-1">
                                    {/* Barra de Alocação (Planejamento) */}
                                    <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden flex relative group border border-slate-800"><div className={`h-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : 'bg-slate-600'}`} style={{ width: `${loadPercentage}%` }}></div></div>
                                    
                                    {/* Status Message */}
                                    <div className="flex justify-between items-center h-5">
                                        {isWeekFullyDone ? (
                                            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-full justify-center">
                                                <Check size={10} /> Meta Batida
                                            </span>
                                        ) : isLate ? (
                                            <span className="text-[10px] text-red-400 font-bold flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 w-full justify-center">
                                                <AlertCircle size={10} /> Atrasado ({blocksCount - blocksCompleted} pendentes)
                                            </span>
                                        ) : missingBlocks > 0 ? (
                                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                Planejar: +{missingBlocks}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                                                <Archive size={10} /> Planejamento OK
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 space-y-2 overflow-y-auto flex-1 custom-scrollbar relative bg-slate-900/50">
                                {week.isPast && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none z-0"></div>}
                                
                                {weekSlots.map(slot => {
                                    const nb = notebooks.find(n => n.id === slot.notebookId);
                                    if (!nb) return null;
                                    
                                    return (
                                        <DraggableCard 
                                            key={slot.instanceId} 
                                            instanceId={slot.instanceId}
                                            notebook={nb} 
                                            isCompleted={slot.completed}
                                            onDragStart={onDragStart} 
                                            onEdit={handleEditClick} 
                                            onToggleComplete={(instId, val) => toggleSlotCompletion(instId, week.id)} 
                                            onRemove={(instId) => handleRemoveFromWeek(instId, week.id)}
                                            isCompact 
                                            origin="week" 
                                            disabled={week.isPast} 
                                        />
                                    );
                                })}
                                
                                {weekSlots.length === 0 && !week.isPast && <div className="h-full flex flex-col items-center justify-center text-slate-700 text-xs italic opacity-50 border-2 border-dashed border-slate-800 rounded-xl m-2 bg-slate-950/50 min-h-[100px]">Arraste matérias aqui</div>}
                            </div>
                            </div>
                        );
                        })}
                    </div>
                 </div>
             </div>
         ) : (<CycleCalculator paceTarget={paceTarget} />)}
      </main>

       {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pencil size={20} className="text-emerald-500"/> Editar Caderno (Rápido)</h3>
                <button onClick={() => !isSaving && setIsModalOpen(false)} className="text-slate-400 hover:text-white" disabled={isSaving}><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* ... Form Content Identical ... */}
              {/* Simplified for brevity as changes are only in the DraggableCard render logic above */}
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
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 w-full">
                             <div className="flex justify-between mb-1">
                                <label className="block text-[10px] font-bold text-emerald-400 uppercase">Taxa de Acerto Atual (%)</label>
                                {formData.accuracyHistory && formData.accuracyHistory.length > 0 && (
                                    <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                                        <History size={10}/> Últimos 3
                                    </span>
                                )}
                             </div>
                             <div className="flex gap-2">
                                <input type="number" min="0" max="100" value={formData.accuracy} onChange={e => handleChange('accuracy', e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-2 text-white font-mono text-center font-bold text-lg focus:border-emerald-500 outline-none" />
                                <button type="button" onClick={handleQuickRecord} disabled={isSaving} className="px-4 bg-emerald-600/20 border border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2">{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Registrar</button>
                             </div>
                          </div>
                          <div className="flex-1 w-full flex gap-2">
                             <button type="button" onClick={handleNotStudied} className="flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600">
                                <Flag size={16} /> Não estudei
                             </button>
                          </div>
                      </div>
                      {formData.accuracyHistory && formData.accuracyHistory.length > 0 && (
                          <div className="border-t border-slate-700/50 pt-2 flex gap-2 overflow-x-auto pb-1">
                              {formData.accuracyHistory.map((h, i) => (
                                  <div key={i} className="flex flex-col items-center bg-slate-900 px-2 py-1 rounded border border-slate-800 min-w-[60px]">
                                      <span className="text-[10px] text-slate-500 font-mono">{new Date(h.date).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}</span>
                                      <span className={`text-xs font-bold ${h.accuracy >= formData.targetAccuracy ? 'text-emerald-400' : h.accuracy < 60 ? 'text-red-400' : 'text-amber-400'}`}>{h.accuracy}%</span>
                                  </div>
                              ))}
                              <div className="flex items-center text-xs text-slate-500 gap-1 ml-2"><TrendingUp size={14} /> Tendência</div>
                          </div>
                      )}
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