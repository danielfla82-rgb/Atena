import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Notebook, Weight, Relevance, Trend, NotebookStatus } from '../types';
import { Plus, Search, Copy, Pencil, X, Save, Link as LinkIcon, BarChart3, Calendar, Lock, ChevronDown, ChevronUp, Layout, FileCode, CheckSquare, Check, Timer, Calculator, AlertCircle, ArrowRight, Settings2, GanttChartSquare, ZoomIn, Trash2, CalendarClock, Flag, ChevronLeft, ChevronRight, Inbox, Layers, Star, ScanSearch, Scale, Loader2, TrendingUp, History, ListPlus, Minus, AlertTriangle, CheckCircle2, RotateCw, Zap, Activity, Info } from 'lucide-react';
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
    onDragStart, 
    onEdit, 
    origin, 
    isCompact, 
    disabled, 
    onToggleComplete,
    onRemove, // NEW: Remove action
    allocationCount
}: {
    notebook: Notebook;
    onDragStart: (e: React.DragEvent, id: string, origin: 'library' | 'week') => void;
    onEdit: (notebook: Notebook) => void;
    origin: 'library' | 'week';
    isCompact?: boolean;
    disabled?: boolean;
    onToggleComplete?: (id: string, isCompleted: boolean) => void;
    onRemove?: (id: string) => void;
    allocationCount?: number;
}) => {
    const statusColor = getStatusColor(notebook.accuracy, notebook.targetAccuracy);
    const isScheduled = !!notebook.weekId;

    return (
        <div 
            draggable={!disabled}
            onDragStart={(e) => onDragStart(e, notebook.id, origin)}
            className={`
                group relative bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-emerald-500/50 transition-all shadow-sm
                ${disabled ? 'opacity-50 pointer-events-none' : ''}
                ${isCompact ? 'text-xs' : 'text-sm'}
                ${notebook.isWeekCompleted && origin === 'week' ? 'opacity-60 bg-slate-900 border-slate-800' : ''}
            `}
        >
            {origin === 'library' && (
                <div className={`absolute right-0 top-0 p-1 rounded-bl text-[9px] uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-l border-b z-10 flex items-center gap-1 bg-slate-900/80 border-slate-700 text-emerald-500`}>
                    <Copy size={10}/> + Agendar
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
                        <h4 className={`font-bold truncate leading-tight ${notebook.isWeekCompleted && origin === 'week' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {notebook.discipline}
                        </h4>
                        {origin === 'library' && allocationCount && allocationCount > 0 ? (
                            <span className="text-[8px] bg-blue-900/30 text-blue-400 border border-blue-500/30 px-1.5 rounded flex items-center gap-1" title="Vezes alocado neste ciclo">
                                <RotateCw size={8} /> {allocationCount}x
                            </span>
                        ) : null}
                    </div>
                    <p className={`truncate mb-1 leading-tight ${notebook.isWeekCompleted && origin === 'week' ? 'text-slate-600' : 'text-slate-400'}`} title={notebook.name}>{notebook.name}</p>
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
                         {/* UNDO / REMOVE BUTTON */}
                         {origin === 'week' && onRemove && !disabled && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); onRemove(notebook.id); }} 
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-900/20 hover:border-red-500/30 border border-transparent transition-colors"
                                title="Remover do planejamento (Desfazer)"
                             >
                                 <Trash2 size={12} />
                             </button>
                         )}
                     </div>
                </div>
            </div>

            {origin === 'week' && onToggleComplete && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer group/check">
                        <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${notebook.isWeekCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 bg-slate-700 group-hover/check:border-emerald-500'}`}>
                             {notebook.isWeekCompleted && <Check size={8} strokeWidth={4} />}
                        </div>
                        <input 
                            type="checkbox" 
                            checked={!!notebook.isWeekCompleted} 
                            onChange={(e) => onToggleComplete(notebook.id, e.target.checked)}
                            className="hidden"
                        />
                        <span className={`text-[10px] ${notebook.isWeekCompleted ? 'text-emerald-400' : 'text-slate-500 group-hover/check:text-slate-300'}`}>
                            {notebook.isWeekCompleted ? 'Concluído' : 'Pendente'}
                        </span>
                    </label>
                </div>
            )}
        </div>
    );
});

// Helper for normalization
const normalizeStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const CycleCalculator = ({ paceTarget }: { paceTarget: { hours: number, blocks: number } }) => {
    const { notebooks, config, updateConfig } = useStore();
    const [newDiscName, setNewDiscName] = useState('');
    
    // --- PERSISTENT STATE MANAGEMENT ---
    
    // 1. Get Base Disciplines from Notebooks + Custom Disciplines from Config
    // FIX: Using strict deduping with Set and ensuring custom ones are merged correctly
    const availableDisciplines = useMemo<string[]>(() => {
        const set = new Set<string>();
        // Add from Notebooks
        notebooks.forEach(n => {
            if (n.discipline !== 'Revisão Geral') set.add(n.discipline);
        });
        // Add from Custom Config
        (config.calculatorState?.customDisciplines || []).forEach(d => set.add(d));
        
        return Array.from(set).sort();
    }, [notebooks, config.calculatorState?.customDisciplines]);

    // 2. Initialize or sync calculator state
    useEffect(() => {
        // Init if empty
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

    // --- ACTIONS ---

    const toggleDisc = (d: string) => {
        const newSet = new Set(selectedDiscs);
        if (newSet.has(d)) newSet.delete(d);
        else newSet.add(d);
        
        // Also update weight map if needed
        const newWeights = { ...weights };
        if (!newWeights[d]) newWeights[d] = 1;

        updateConfig({
            ...config,
            calculatorState: {
                ...config.calculatorState!,
                selectedDisciplines: Array.from(newSet),
                weights: newWeights
            }
        });
    };

    const updateWeight = (d: string, w: number) => {
        const safeW = Math.max(0.5, Math.min(10, w)); // Clamp between 0.5 and 10
        updateConfig({
            ...config,
            calculatorState: {
                ...config.calculatorState!,
                weights: { ...weights, [d]: safeW }
            }
        });
    };

    const handleAddDiscipline = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newDiscName.trim();
        if (!trimmed) return;

        // Check duplicates (Case insensitive, accent insensitive)
        const normNew = normalizeStr(trimmed);
        const exists = availableDisciplines.some(d => normalizeStr(d) === normNew);

        if (exists) {
            alert("Esta disciplina já existe na lista.");
            setNewDiscName('');
            return;
        }

        const newCustom = [...customDiscs, trimmed];
        const newSelected = [...Array.from(selectedDiscs), trimmed];
        const newWeights = { ...weights, [trimmed]: 1 };

        updateConfig({
            ...config,
            calculatorState: {
                weights: newWeights,
                selectedDisciplines: newSelected,
                customDisciplines: newCustom
            }
        });
        setNewDiscName('');
    };

    const handleRemoveDiscipline = (d: string) => {
        const isFromNotebooks = notebooks.some(n => n.discipline === d);
        
        if (isFromNotebooks) {
            // Just uncheck it
            const newSet = new Set(selectedDiscs);
            newSet.delete(d);
            updateConfig({
                ...config,
                calculatorState: {
                    ...config.calculatorState!,
                    selectedDisciplines: Array.from(newSet)
                }
            });
        } else {
            // Remove completely
            const newCustom = customDiscs.filter(c => c !== d);
            const newSet = new Set(selectedDiscs);
            newSet.delete(d);
            const newWeights = { ...weights };
            delete newWeights[d];

            updateConfig({
                ...config,
                calculatorState: {
                    weights: newWeights,
                    selectedDisciplines: Array.from(newSet),
                    customDisciplines: newCustom
                }
            });
        }
    };

    // --- CALCULATIONS ---
    const totalWeight = useMemo(() => {
        let sum = 0;
        selectedDiscs.forEach(d => {
            sum += (weights[d] || 1);
        });
        return sum;
    }, [selectedDiscs, weights]);

    const distribution = useMemo(() => {
        if (totalWeight === 0) return [];
        
        return availableDisciplines.map(d => {
            if (!selectedDiscs.has(d)) return null;
            
            const weight = weights[d] || 1;
            const percentage = weight / totalWeight;
            const blocks = Math.round(percentage * paceTarget.blocks);
            
            return {
                name: d,
                weight,
                percentage,
                blocks,
                topicCount: notebooks.filter(n => n.discipline === d).length
            };
        }).filter(Boolean) as {name: string, weight: number, percentage: number, blocks: number, topicCount: number}[];
    }, [availableDisciplines, selectedDiscs, weights, totalWeight, paceTarget.blocks, notebooks]);

    const totalAllocated = distribution.reduce((sum, item) => sum + item.blocks, 0);
    const diff = totalAllocated - paceTarget.blocks;
    
    // Status Logic
    const isBalanced = diff === 0;
    const isOver = diff > 0;
    const isUnder = diff < 0;

    // Info Stats
    const totalItems = notebooks.filter(n => n.discipline !== 'Revisão Geral').length;
    const cycleVelocity = paceTarget.blocks > 0 ? (totalItems / paceTarget.blocks) : 0;
    const giroDisplay = cycleVelocity === 0 ? "∞" : cycleVelocity < 1 ? `${(1/cycleVelocity).toFixed(1)}x / sem` : `${cycleVelocity.toFixed(1)} sem`;

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-500 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar">
            
            {/* Header / Summary */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-emerald-900/10 mx-auto border border-slate-700">
                    <Scale size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Planejamento de Ciclo</h2>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">
                    Defina os pesos estratégicos. O algoritmo Atena distribuirá sua carga de <strong className="text-white">{paceTarget.blocks} blocos/semana (Ritmo Padrão)</strong>.
                </p>
            </div>
            
            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto w-full">
                 <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={48} /></div>
                    <div className="bg-emerald-900/20 p-3 rounded-lg text-emerald-500 border border-emerald-500/20"><Timer size={24} /></div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Potência Semanal</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white">{paceTarget.hours}h</span>
                            <span className="text-xs text-emerald-400 font-bold">({paceTarget.blocks} blocos)</span>
                        </div>
                    </div>
                </div>
                 <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Layers size={48} /></div>
                    <div className="bg-blue-900/20 p-3 rounded-lg text-blue-500 border border-blue-500/20"><Layers size={24} /></div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Inventário Total</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white">{totalItems}</span>
                            <span className="text-xs text-slate-500">Tópicos</span>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={48} /></div>
                    <div className="bg-purple-900/20 p-3 rounded-lg text-purple-500 border border-purple-500/20"><RotateCw size={24} /></div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Giro do Edital</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white">{giroDisplay}</span>
                            <span className="text-xs text-slate-500">p/ Ciclo</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Input for Adding New Discipline */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 shadow-lg">
                <form onSubmit={handleAddDiscipline} className="flex gap-2 items-center">
                    <div className="bg-slate-800 p-2 rounded-lg text-emerald-500">
                        <ListPlus size={20} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Adicionar disciplina extra ao planejamento (ex: Direito Financeiro)" 
                        value={newDiscName}
                        onChange={e => setNewDiscName(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-slate-600 px-2"
                    />
                    <button 
                        type="submit" 
                        disabled={!newDiscName} 
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors"
                    >
                        Adicionar
                    </button>
                </form>
            </div>

            {/* Main Calculator List (Improved UX) */}
            <div className="flex-1 flex flex-col min-h-[400px]">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full">
                    <div className={`p-4 border-b transition-colors flex flex-wrap md:flex-nowrap justify-between items-center sticky top-0 z-10 backdrop-blur-sm 
                        ${isOver ? 'bg-red-950/40 border-red-900/50' : isUnder ? 'bg-amber-950/40 border-amber-900/50' : 'bg-slate-950/50 border-slate-800'}
                    `}>
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                            <Scale size={16} className={isBalanced ? "text-emerald-500" : isOver ? "text-red-500" : "text-amber-500"}/> 
                            Distribuição Ponderada
                        </h3>
                        
                        <div className="flex items-center gap-4 mt-2 md:mt-0">
                            {/* Alert Message */}
                            {!isBalanced && (
                                <span className={`text-xs font-bold flex items-center gap-2 animate-pulse ${isOver ? 'text-red-400' : 'text-amber-400'}`}>
                                    <AlertTriangle size={14} />
                                    {isOver ? `Remova ${Math.abs(diff)} blocos` : `Aloque +${Math.abs(diff)} blocos`}
                                </span>
                            )}

                            <div className={`text-xs font-mono px-3 py-1 rounded-full border flex items-center gap-2
                                ${isBalanced ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 
                                  isOver ? 'bg-red-900/20 text-red-400 border-red-500/30' : 
                                  'bg-amber-900/20 text-amber-400 border-amber-500/30'}
                            `}>
                                {isBalanced && <CheckCircle2 size={12} />}
                                Alocado: <strong>{totalAllocated}</strong> / {paceTarget.blocks}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-800/50 relative">
                        {/* Header Row */}
                        <div className="flex items-center p-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider bg-slate-950/30 sticky top-0 z-0">
                            <div className="w-12 text-center"><CheckSquare size={14} className="mx-auto" /></div>
                            <div className="flex-1 px-2">Disciplina</div>
                            <div className="w-20 text-center hidden md:block">Tópicos</div>
                            <div className="w-36 text-center">Peso Estratégico</div>
                            <div className="w-40 px-4">Sugestão</div>
                            <div className="w-10"></div>
                        </div>

                        {availableDisciplines.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-600 gap-4">
                                <Scale size={48} className="opacity-20" />
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-500">Nenhuma disciplina encontrada</p>
                                    <p className="text-xs">Adicione acima ou importe do banco de dados.</p>
                                </div>
                            </div>
                        ) : (
                            availableDisciplines.map(d => {
                                const isSelected = selectedDiscs.has(d);
                                const dist = distribution.find(x => x.name === d);
                                const blocks = dist?.blocks || 0;
                                const percent = dist ? Math.round(dist.percentage * 100) : 0;
                                const currentWeight = weights[d] || 1;

                                return (
                                    <div key={d} className={`flex items-center p-4 transition-colors hover:bg-slate-800/40 group ${isSelected ? '' : 'opacity-60 bg-slate-950/50 grayscale'}`}>
                                        {/* Checkbox */}
                                        <div className="w-12 flex justify-center">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected} 
                                                onChange={() => toggleDisc(d)}
                                                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-offset-slate-900 cursor-pointer"
                                            />
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 px-2 font-medium text-sm text-slate-200 truncate">
                                            {d}
                                        </div>

                                        {/* Topic Count Badge */}
                                        <div className="w-20 text-center hidden md:flex justify-center">
                                            {notebooks.some(n => n.discipline === d) ? (
                                                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-700">
                                                    {notebooks.filter(n => n.discipline === d).length}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-600">-</span>
                                            )}
                                        </div>

                                        {/* Weight Controls (Enhanced for Touch/Click) */}
                                        <div className="w-36 flex justify-center">
                                            <div className={`flex items-center bg-slate-950 border border-slate-700 rounded-lg overflow-hidden ${!isSelected ? 'opacity-50 pointer-events-none' : 'shadow-sm'}`}>
                                                <button 
                                                    onClick={() => updateWeight(d, currentWeight - 0.5)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-r border-slate-800 active:bg-slate-700"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <div className="w-10 text-center text-sm font-bold text-white bg-slate-900 h-8 flex items-center justify-center">
                                                    {currentWeight}
                                                </div>
                                                <button 
                                                    onClick={() => updateWeight(d, currentWeight + 0.5)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-l border-slate-800 active:bg-slate-700"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Result Bar */}
                                        <div className="w-40 px-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-lg font-black ${blocks > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{blocks}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-bold">blocos</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-800">
                                                <div 
                                                    className={`h-full transition-all duration-500 ease-out ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                    style={{ width: isSelected ? `${percent}%` : '0%' }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Delete */}
                                        <div className="w-10 flex justify-center">
                                            <button 
                                                onClick={() => handleRemoveDiscipline(d)} 
                                                className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remover ou Ocultar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {/* Footer Totals */}
                    <div className="bg-slate-950/80 border-t border-slate-800 p-4 flex justify-end items-center gap-6 text-sm">
                        <div className="text-right">
                            <span className="text-slate-500 text-xs uppercase font-bold mr-2">Peso Total Distribuído</span>
                            <span className="text-amber-400 font-bold">{totalWeight.toFixed(1)} pts</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl text-xs text-slate-400 flex items-start gap-3">
                <Settings2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <p>
                    <strong>Persistência Ativa:</strong> Suas configurações de pesos e disciplinas personalizadas são salvas automaticamente no seu perfil (Nuvem ou Local).
                </p>
            </div>

        </div>
    );
};

// ... Rest of Setup Component (Export) ...
export const Setup: React.FC = () => {
  const { notebooks, config, updateConfig, moveNotebookToWeek, addNotebook, editNotebook, deleteNotebook } = useStore();
  
  const [viewMode, setViewMode] = useState<'timeline' | 'calculator'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'unallocated' | 'fit' | 'smart'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Save loading state
  const [isSaving, setIsSaving] = useState(false);
  
  // Gallery State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const initialFormState = {
    discipline: '',
    name: '',
    subtitle: '',
    tecLink: '',
    lawLink: '',
    obsidianLink: '',
    accuracy: 0,
    targetAccuracy: 90,
    weight: Weight.MEDIO,
    relevance: Relevance.MEDIA,
    trend: Trend.ESTAVEL,
    notes: '',
    images: [] as string[],
    accuracyHistory: [] as { date: string, accuracy: number }[]
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

  // --- HELPER: Text Normalizer for Smart Match (Enhanced v3.2) ---
  const normalizeText = useCallback((text: string) => {
      return text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove accents
          .replace(/[\n\r]/g, " ") // Replace newlines with space
          .replace(/\s+/g, " ") // Collapse multiple spaces
          .replace(/[^a-z0-9\s]/g, ""); // Keep only alphanumeric and spaces
  }, []);

  // --- UPDATED: Library Logic with Filters ---
  const libraryNotebooks = useMemo(() => {
    const editalRaw = config.editalText || "";
    const editalNormalized = normalizeText(editalRaw);
    const hasEdital = editalRaw.length > 10;

    // Use Map to ensure uniqueness by content key
    const uniqueMap = new Map<string, Notebook>();
    const allocationCountMap = new Map<string, number>();
    
    // Sort so unallocated items come first (preferred as drag source)
    const sorted = [...notebooks].sort((a, b) => {
        if (!a.weekId && b.weekId) return -1;
        if (a.weekId && !b.weekId) return 1;
        return 0;
    });

    sorted.forEach(nb => {
        if (nb.discipline === 'Revisão Geral') return;

        // Generate Unique Content Key
        const key = `${normalizeText(nb.discipline)}|${normalizeText(nb.name)}|${normalizeText(nb.subtitle || '')}`;
        
        // Count allocations across the board
        if (nb.weekId) {
            allocationCountMap.set(key, (allocationCountMap.get(key) || 0) + 1);
        }

        // Apply filters
        const matchesSearch = 
            nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            nb.discipline.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return;

        // 2. Filter Logic (Modified: Unallocated logic just highlights or prioritizes, doesn't hard hide if it exists)
        if (libraryFilter === 'unallocated') {
            if (nb.weekId) return;
        }
        if (libraryFilter === 'fit') {
            if (!(nb.weight === Weight.MUITO_ALTO || nb.weight === Weight.ALTO || nb.relevance === Relevance.ALTISSIMA)) return;
        }
        if (libraryFilter === 'smart') {
            if (!hasEdital) return; 
            
            const discNorm = normalizeText(nb.discipline);
            const nameNorm = normalizeText(nb.name);
            
            const discParts = discNorm.split(' ');
            const discMatch = discParts.some(part => part.length > 3 && editalNormalized.includes(part));
            
            if (!(editalNormalized.includes(nameNorm) || editalNormalized.includes(discNorm) || discMatch)) return;
        }

        // Only add if not exists. Since we sorted unallocated first, 
        // this guarantees we pick the unallocated instance if available.
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, nb);
        }
    });

    // Attach allocation counts to return structure (helper only)
    return Array.from(uniqueMap.values())
        .sort((a, b) => a.discipline.localeCompare(b.discipline) || a.name.localeCompare(b.name))
        .map(nb => {
            const key = `${normalizeText(nb.discipline)}|${normalizeText(nb.name)}|${normalizeText(nb.subtitle || '')}`;
            return {
                ...nb,
                _allocationCount: allocationCountMap.get(key) || 0
            };
        });
  }, [notebooks, searchTerm, libraryFilter, config.editalText, normalizeText]);

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

  const getWeekPace = useCallback((weekId: string) => {
      const specific = config.weeklyPace?.[weekId];
      return specific || config.studyPace || 'Intermediário';
  }, [config.weeklyPace, config.studyPace]);

  const updateWeekPace = (weekId: string, newPace: string) => {
      updateConfig({
          ...config,
          weeklyPace: {
              ...(config.weeklyPace || {}),
              [weekId]: newPace
          }
      });
  };

  // --- HANDLERS (Memoized for Performance) ---
  const onDragStart = useCallback((e: React.DragEvent, id: string, origin: 'library' | 'week') => {
    e.dataTransfer.setData("notebookId", id);
    e.dataTransfer.setData("origin", origin);
    
    // Hack to access current notebooks state in DragStart without full re-render dependency
    // We infer copy status based on origin for drag image feedback (handled by browser mostly)
    if (origin === 'library') {
        e.dataTransfer.effectAllowed = 'copy';
    } else {
        e.dataTransfer.effectAllowed = 'move';
    }
  }, []); // Empty dependency array as logic is static, state access happens on Drop

  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  
  // --- UPDATED: Intelligent Drop Logic (DB PERSISTENCE FIX) ---
  const onDrop = async (e: React.DragEvent, targetWeekId: string | null, isPast: boolean) => {
    if (isPast) { alert("Você não pode alterar o planejamento de semanas que já passaram."); return; }
    
    const id = e.dataTransfer.getData("notebookId");
    const origin = e.dataTransfer.getData("origin");
    
    if (!id || !targetWeekId) return;

    if (origin === 'week') {
        // Simple move within timeline (Drag from Week A to Week B)
        await moveNotebookToWeek(id, targetWeekId);
    } else {
        // Library Logic: ALWAYS CLONE to create a new study instance.
        // This ensures the Library (DB Template) remains untouched and fixed.
        // The user can repeat the same notebook multiple times.
        const sourceNb = notebooks.find(n => n.id === id);
        if (!sourceNb) return;

        const payload = {
            discipline: sourceNb.discipline,
            name: sourceNb.name,
            subtitle: sourceNb.subtitle || '',
            weight: sourceNb.weight,
            relevance: sourceNb.relevance,
            trend: sourceNb.trend,
            targetAccuracy: sourceNb.targetAccuracy,
            tecLink: sourceNb.tecLink,
            lawLink: sourceNb.lawLink,
            obsidianLink: sourceNb.obsidianLink,
            notes: sourceNb.notes,
            images: sourceNb.images || [],
            weekId: targetWeekId,
            // Reset State for the new instance
            accuracy: 0,
            status: NotebookStatus.NOT_STARTED,
            accuracyHistory: [],
            isWeekCompleted: false,
            lastPractice: undefined, // Will be sanitized to null by store
            nextReview: undefined
        };
        
        try {
            await addNotebook(payload);
        } catch (err) {
            console.error("Cloning failed:", err);
            alert("Erro ao adicionar caderno.");
        }
    }
  };

  const handleEditClick = useCallback((notebook: Notebook) => {
    setEditingId(notebook.id);
    let currentImages = notebook.images || [];
    if (currentImages.length === 0 && notebook.image) currentImages = [notebook.image];
    setFormData({
      discipline: notebook.discipline,
      name: notebook.name,
      subtitle: notebook.subtitle,
      tecLink: notebook.tecLink || '',
      lawLink: notebook.lawLink || '',
      obsidianLink: notebook.obsidianLink || '',
      accuracy: notebook.accuracy,
      targetAccuracy: notebook.targetAccuracy,
      weight: notebook.weight,
      relevance: notebook.relevance,
      trend: notebook.trend,
      notes: notebook.notes || '',
      images: currentImages,
      accuracyHistory: notebook.accuracyHistory || []
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        const payload: any = { ...formData, accuracy: Number(formData.accuracy), targetAccuracy: Number(formData.targetAccuracy) };
        
        // --- History Logic ---
        let newHistory = [...(formData.accuracyHistory || [])];
        
        newHistory.push({
            date: new Date().toISOString(),
            accuracy: Number(formData.accuracy)
        });
        
        if (newHistory.length > 3) {
            newHistory = newHistory.slice(-3);
        }
        
        payload.accuracyHistory = newHistory;
        
        if (editingId) {
          await editNotebook(editingId, payload);
        }
        setIsModalOpen(false);
    } catch (error) {
        console.error("Failed to save:", error);
        alert("Erro ao salvar. Tente novamente.");
    } finally {
        setIsSaving(false);
    }
  };

  const navigateLightbox = (direction: 'next' | 'prev') => {
      if (lightboxIndex === null) return;
      if (direction === 'next') setLightboxIndex((lightboxIndex + 1) % formData.images.length);
      else setLightboxIndex((lightboxIndex - 1 + formData.images.length) % formData.images.length);
  };

  const handleToggleComplete = useCallback((id: string, isCompleted: boolean) => {
      const updates: Partial<Notebook> = { isWeekCompleted: isCompleted };
      if (isCompleted) {
          updates.lastPractice = new Date().toISOString();
      }
      editNotebook(id, updates);
  }, [editNotebook]);

  // --- UNDO / REMOVE ACTION ---
  const handleRemoveFromWeek = useCallback((id: string) => {
      const confirmRemove = window.confirm("Deseja remover este bloco do planejamento da semana? (O caderno original permanece no Banco de Dados)");
      if(confirmRemove) {
          deleteNotebook(id);
      }
  }, [deleteNotebook]);

  // --- QUICK RECORD ACTION ---
  const handleQuickRecord = async () => {
      setIsSaving(true);
      try {
          const newAccuracy = Number(formData.accuracy);
          const newHistory = [...(formData.accuracyHistory || []), { date: new Date().toISOString(), accuracy: newAccuracy }].slice(-3);
          
          if(editingId) {
              await editNotebook(editingId, { 
                  accuracy: newAccuracy, 
                  accuracyHistory: newHistory,
                  lastPractice: new Date().toISOString()
              });
              setFormData(prev => ({ ...prev, accuracyHistory: newHistory }));
          }
      } catch (err) {
          console.error("Quick save failed", err);
      } finally {
          setIsSaving(false);
      }
  };

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
            <h2 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider"><Layout size={14} className="text-emerald-500" /> Banco de Disciplinas</h2>
            
            {/* Filter Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
                <button 
                    onClick={() => setLibraryFilter('all')}
                    className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${libraryFilter === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Mostrar tudo (Arrastar cria cópia)"
                >
                    <Layers size={12} />
                </button>
                <button 
                    onClick={() => setLibraryFilter('unallocated')}
                    className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${libraryFilter === 'unallocated' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-emerald-400'}`}
                    title="Apenas pendentes (Move)"
                >
                    <Inbox size={12} />
                </button>
                <button 
                    onClick={() => setLibraryFilter('fit')}
                    className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${libraryFilter === 'fit' ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-amber-400'}`}
                    title="Alta Prioridade (Elite)"
                >
                    <Star size={12} />
                </button>
                <button 
                    onClick={() => setLibraryFilter('smart')}
                    className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${libraryFilter === 'smart' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:text-cyan-400'}`}
                    title="Filtro Smart (Cruza com Edital)"
                >
                    <ScanSearch size={12} />
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-emerald-500 outline-none" />
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                <span>Total: {libraryNotebooks.length}</span>
                <span className="text-emerald-500 flex items-center gap-1">Arraste para agendar <ArrowRight size={10} /></span>
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
                    allocationCount={nb._allocationCount}
                />
            ))}
            
            {libraryNotebooks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2 opacity-50 px-4 text-center">
                    <Settings2 size={24} />
                    <span className="text-xs">
                        {libraryFilter === 'smart' && (!config.editalText || config.editalText.length < 10) 
                            ? "Cole o texto do edital em 'Configurar Concurso' para usar o filtro Smart."
                            : "Nenhum caderno encontrado neste filtro."}
                    </span>
                </div>
            )}
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
                        
                        // Per-week Pace Logic
                        const weekPaceName = getWeekPace(week.id);
                        const weekTarget = PACE_SETTINGS[weekPaceName] || paceTarget;
                        
                        const loadPercentage = Math.min((blocksCount / weekTarget.blocks) * 100, 100);
                        const missingBlocks = Math.max(0, weekTarget.blocks - blocksCount);
                        const isOverloaded = blocksCount > weekTarget.blocks;
                        const isComplete = blocksCount >= weekTarget.blocks && !isOverloaded;
                        
                        return (
                            <div key={week.id} className={`w-80 flex-shrink-0 flex flex-col rounded-2xl border transition-all duration-300 relative h-full max-h-full ${week.isPast ? 'bg-slate-900/30 border-slate-800/50 opacity-70' : 'bg-slate-900 border-slate-800 shadow-2xl hover:border-slate-700'}`} onDragOver={week.isPast ? undefined : onDragOver} onDrop={(e) => onDrop(e, week.id, week.isPast)}>
                            <div className={`p-4 rounded-t-2xl border-b flex flex-col gap-3 z-10 relative ${week.isPast ? 'bg-slate-950/30 border-slate-800/50 text-slate-600' : 'bg-slate-900 border-slate-700 text-slate-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div><span className="font-black block text-base flex items-center gap-2 text-white">SEMANA {week.index} {week.isPast && <Lock size={14} />}</span><span className={`text-[10px] font-bold uppercase tracking-widest ${week.isPast ? 'line-through decoration-slate-600 opacity-50' : 'text-slate-500'}`}>{week.label}</span></div>
                                    <div className="flex flex-col items-end"><span className={`text-lg font-black ${isOverloaded ? 'text-red-400' : isComplete ? 'text-emerald-400' : 'text-white'}`}>{blocksCount}</span><span className="text-[9px] text-slate-500 uppercase font-bold">blocos</span></div>
                                </div>
                                
                                {/* Week Specific Pace Selector */}
                                {!week.isPast && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="relative w-full">
                                            <select 
                                                value={weekPaceName}
                                                onChange={(e) => updateWeekPace(week.id, e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 outline-none focus:border-emerald-500 appearance-none font-medium cursor-pointer hover:bg-slate-800"
                                            >
                                                <option value="Iniciante">Iniciante (15)</option>
                                                <option value="Básico">Básico (30)</option>
                                                <option value="Intermediário">Interm. (45)</option>
                                                <option value="Avançado">Avançado (66)</option>
                                            </select>
                                            <div className="absolute right-2 top-1.5 pointer-events-none text-slate-500">
                                                <ChevronDown size={10} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!week.isPast && (
                                    <div className="space-y-2 mt-1">
                                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex relative group border border-slate-800"><div className={`h-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`} style={{ width: `${loadPercentage}%` }}></div></div>
                                        <div className="flex justify-between items-center">{missingBlocks > 0 ? (<span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"><AlertCircle size={10} /> Meta: +{missingBlocks}</span>) : (<span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><Check size={10} /> Meta Batida</span>)}</div>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 space-y-2 overflow-y-auto flex-1 custom-scrollbar relative bg-slate-900/50">
                                {week.isPast && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none z-0"></div>}
                                {weekNotebooks.map(nb => <DraggableCard key={nb.id} notebook={nb} onDragStart={onDragStart} onEdit={handleEditClick} onToggleComplete={handleToggleComplete} onRemove={handleRemoveFromWeek} isCompact origin="week" disabled={week.isPast} />)}
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
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    value={formData.accuracy} 
                                    onChange={e => handleChange('accuracy', e.target.value)} 
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-2 text-white font-mono text-center font-bold text-lg focus:border-emerald-500 outline-none" 
                                />
                                <button 
                                    type="button" 
                                    onClick={handleQuickRecord}
                                    disabled={isSaving}
                                    className="px-4 bg-emerald-600/20 border border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                                    title="Salvar apenas o histórico de acerto agora"
                                >
                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Registrar
                                </button>
                             </div>
                          </div>
                          <div className="flex-1 w-full flex gap-2">
                             <button type="button" onClick={handleNotStudied} className="flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600">
                                <Flag size={16} /> Não estudei
                             </button>
                          </div>
                      </div>
                      
                      {/* Trend Analysis Visualization */}
                      {formData.accuracyHistory && formData.accuracyHistory.length > 0 && (
                          <div className="border-t border-slate-700/50 pt-2 flex gap-2 overflow-x-auto pb-1">
                              {formData.accuracyHistory.map((h, i) => (
                                  <div key={i} className="flex flex-col items-center bg-slate-900 px-2 py-1 rounded border border-slate-800 min-w-[60px]">
                                      <span className="text-[10px] text-slate-500 font-mono">{new Date(h.date).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}</span>
                                      <span className={`text-xs font-bold ${h.accuracy >= formData.targetAccuracy ? 'text-emerald-400' : h.accuracy < 60 ? 'text-red-400' : 'text-amber-400'}`}>
                                          {h.accuracy}%
                                      </span>
                                  </div>
                              ))}
                              <div className="flex items-center text-xs text-slate-500 gap-1 ml-2">
                                  <TrendingUp size={14} /> Tendência
                              </div>
                          </div>
                      )}
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Rascunhos & Anotações</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Texto de Lei</label>
                        <div className="relative">
                            <Scale className="absolute left-3 top-3.5 text-slate-500" size={16} />
                            <input type="url" value={formData.lawLink} onChange={e => handleChange('lawLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="https://planalto.gov.br..." />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Obsidian / Notion</label>
                        <div className="relative">
                            <FileCode className="absolute left-3 top-3.5 text-slate-500" size={16} />
                            <input type="url" value={formData.obsidianLink} onChange={e => handleChange('obsidianLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="obsidian://open?vault=..." />
                        </div>
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