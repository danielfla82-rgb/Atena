import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { Notebook, Weight, NotebookStatus, ScheduleItem } from '../types';
import { Plus, Search, Pencil, BarChart3, Calendar, Lock, ChevronDown, Layout, Check, Timer, Calculator, AlertCircle, ArrowRight, Settings2, GanttChartSquare, Flag, Inbox, Scale, Download, PanelLeftClose, PanelLeftOpen, Archive, Minus, Meh, Frown, Smile, CloudLightning, History, ChevronRight, Maximize2, Activity } from 'lucide-react';
import { getStatusColor } from '../utils/algorithm';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { MigrationTool } from './MigrationTool';

const PACE_SETTINGS: Record<string, { hours: number, blocks: number }> = {
    'Iniciante': { hours: 10, blocks: 15 },
    'Básico': { hours: 20, blocks: 30 },
    'Intermediário': { hours: 30, blocks: 45 },
    'Avançado': { hours: 44, blocks: 66 }
};

// MEMOIZED COMPONENT TO PREVENT RE-RENDERS ON DRAG/SEARCH
const DraggableCard = React.memo(({ 
    notebook, 
    instanceId,
    onDragStart, 
    onDropOnCard,
    onEdit, 
    origin, 
    isCompact, 
    disabled, 
    onToggleComplete,
    onRemove, 
    allocationCount,
    isCompleted,
    index,
    startDate
}: {
    notebook: Notebook;
    instanceId?: string;
    onDragStart: (e: React.DragEvent, id: string, origin: 'library' | 'week', index?: number) => void;
    onDropOnCard?: (e: React.DragEvent, targetIndex: number) => void;
    onEdit: (notebook: Notebook) => void;
    origin: 'library' | 'week';
    isCompact?: boolean;
    disabled?: boolean;
    onToggleComplete?: (instanceId: string, isCompleted: boolean) => void;
    onRemove?: (instanceId: string) => void;
    allocationCount?: number;
    isCompleted?: boolean;
    index?: number;
    startDate?: string;
}) => {
    const statusColor = getStatusColor(notebook.accuracy, notebook.targetAccuracy);
    const isLibrary = origin === 'library';
    const isWeek = origin === 'week';
    
    // --- LÓGICA DE CORES POR DESEMPENHO ---
    const target = notebook.targetAccuracy || 90;
    const accuracy = notebook.accuracy || 0;
    const criticalThreshold = target * 0.75; 

    // --- LÓGICA DE PRÓXIMA REVISÃO ---
    let nextReviewWeek = null;
    if (isLibrary && notebook.nextReview && startDate) {
        const reviewDate = new Date(notebook.nextReview);
        const start = new Date(startDate);
        const diffTime = reviewDate.getTime() - start.getTime();
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
        if (diffWeeks > 0) nextReviewWeek = diffWeeks;
    }

    let buttonClass = 'border-slate-600 bg-slate-700 text-slate-300 group-hover/check:border-slate-500 hover:bg-slate-600';
    let textClass = isCompleted && isWeek ? 'text-slate-600 line-through' : 'text-slate-200';
    let percentColorClass = notebook.accuracy < 60 ? 'text-red-400' : 'text-emerald-400';
    let tooltipText = "Pendente: Clique para marcar como concluído.";

    if (isCompleted) {
        if (accuracy >= target) {
            buttonClass = 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-900/20';
            textClass = 'text-emerald-400 line-through decoration-emerald-500/30';
            percentColorClass = 'text-emerald-400';
            tooltipText = "Desempenho de Elite: Meta atingida!";
        } else if (accuracy < criticalThreshold) {
            buttonClass = 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-900/20';
            textClass = 'text-red-400 line-through decoration-red-500/30';
            percentColorClass = 'text-red-400';
            tooltipText = `Crítico: Acurácia muito abaixo da meta (${target}%).`;
        } else {
            buttonClass = 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-900/20';
            textClass = 'text-amber-400 line-through decoration-amber-500/30';
            percentColorClass = 'text-amber-400';
            tooltipText = "Atenção: Meta não atingida. Reforce a revisão.";
        }
    }

    return (
        <div 
            draggable={!disabled}
            onDragStart={(e) => onDragStart(e, notebook.id, origin, index)}
            onDragOver={(e) => { if(isWeek && !disabled) e.preventDefault(); }}
            onDrop={(e) => { if(isWeek && !disabled && onDropOnCard && index !== undefined) onDropOnCard(e, index); }}
            className={`
                group relative bg-slate-800 border border-slate-700 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-emerald-500/50 transition-all shadow-sm
                ${disabled ? 'opacity-50 pointer-events-none' : ''}
                ${isCompact ? 'text-xs' : 'text-sm'}
                ${isCompleted && isWeek ? 'bg-slate-900 border-slate-800' : ''}
            `}
        >
            {isLibrary && (
                <div className={`absolute right-0 top-0 p-1 rounded-bl-lg text-[9px] uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-l border-b z-10 flex items-center gap-1 bg-slate-900/90 border-slate-700 text-emerald-500 rounded-tr-xl`}>
                    <Calendar size={10}/> + Agendar
                </div>
            )}

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
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                         <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: statusColor }} 
                            title={`Acurácia: ${notebook.accuracy}%`}
                         />
                        <h4 className={`font-bold truncate leading-tight max-w-[140px] ${isWeek ? textClass : 'text-slate-200'}`}>
                            {notebook.discipline}
                        </h4>
                        
                        {isLibrary && allocationCount && allocationCount > 0 ? (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-300 uppercase tracking-wide shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                                No Ciclo
                            </span>
                        ) : null}
                    </div>
                    <p className={`truncate mb-1 leading-tight font-medium ${isWeek ? (isCompleted ? 'text-slate-600' : 'text-slate-400') : 'text-slate-400'}`} title={notebook.name}>{notebook.name}</p>
                    {notebook.subtitle && <p className="text-slate-500 text-[10px] truncate">{notebook.subtitle}</p>}
                </div>
                
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                     <span className={`font-mono font-bold text-xs ${percentColorClass}`}>
                         {notebook.accuracy}%
                     </span>
                     {nextReviewWeek && (
                         <span className="flex items-center gap-1 text-[9px] text-slate-500 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded" title={`Próxima revisão na Semana ${nextReviewWeek}`}>
                             <Calendar size={8} /> Sem {nextReviewWeek}
                         </span>
                     )}
                     <div className="flex gap-1 mt-1">
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
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center relative group/tooltip">
                    <label className="flex items-center gap-2 cursor-pointer group/check w-full">
                        <div className={`
                            w-full py-1.5 px-3 rounded-lg border flex items-center justify-center gap-2 transition-all font-bold text-[10px] uppercase tracking-wider relative
                            ${buttonClass}
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

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-slate-200 text-[10px] p-2 rounded-lg border border-slate-700 shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[60] text-center">
                        {tooltipText}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-700"></div>
                    </div>
                </div>
            )}
        </div>
    );
});

// Helper for normalization
const normalizeStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const CycleCalculator = ({ paceTarget }: { paceTarget: { hours: number, blocks: number } }) => {
    // ... (CycleCalculator implementation remains identical to previous) ...
    // Note: Due to file length limit, assuming the CycleCalculator code is preserved.
    // I am just injecting the new button in the Setup component below.
    const { notebooks, config, updateConfig } = useStore();
    const [newDiscName, setNewDiscName] = useState('');
    
    // --- PERSISTENT STATE MANAGEMENT ---
    const availableDisciplines = useMemo<string[]>(() => {
        const set = new Set<string>();
        const safeNotebooks: Notebook[] = notebooks || [];
        safeNotebooks.forEach(n => {
            if (n.discipline !== 'Revisão Geral') set.add(n.discipline);
        });
        
        const customList = config.calculatorState?.customDisciplines;
        if (Array.isArray(customList)) {
            const list = customList as any[];
            list.forEach((d: any) => set.add(String(d)));
        }
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

    const totalWeight = useMemo(() => {
        return Array.from(selectedDiscs).reduce((acc, d) => acc + (weights[d] || 1), 0);
    }, [selectedDiscs, weights]);

    const distribution = useMemo(() => {
        if (totalWeight === 0) return [];
        return Array.from(selectedDiscs).map(d => {
            const w = weights[d] || 1;
            const percentage = w / totalWeight;
            const blocks = Math.round(percentage * paceTarget.blocks);
            return { name: d, percentage, blocks };
        }).sort((a, b) => b.blocks - a.blocks);
    }, [selectedDiscs, weights, totalWeight, paceTarget.blocks]);

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

    const projection = useMemo(() => {
        const totalItemsToStudy = notebooks.filter(n => n.discipline !== 'Revisão Geral' && n.status !== NotebookStatus.MASTERED).length;
        const weeklyCapacity = paceTarget.blocks;
        
        if (totalItemsToStudy === 0 || weeklyCapacity === 0) return null;

        const REVIEW_COST_BLOCKS = 0.2; 
        let weeksElapsed = 0;
        let itemsCompleted = 0;
        
        while (itemsCompleted < totalItemsToStudy && weeksElapsed < 200) {
            weeksElapsed++;
            const itemsInPool = itemsCompleted; 
            const estimatedReviewsNeeded = itemsInPool * 0.15; 
            const reviewBlocksNeeded = estimatedReviewsNeeded * REVIEW_COST_BLOCKS;
            let netCapacity = weeklyCapacity - reviewBlocksNeeded;
            
            if (netCapacity < weeklyCapacity * 0.2) {
                netCapacity = weeklyCapacity * 0.2;
            }
            itemsCompleted += netCapacity;
        }

        const today = new Date();
        const finishDate = new Date(today);
        finishDate.setDate(today.getDate() + (weeksElapsed * 7));
        
        let status = 'safe'; 
        let suggestion = 0; 

        if (config.examDate) {
            const exam = new Date(config.examDate);
            const timeToExam = exam.getTime() - today.getTime();
            const timeToFinish = finishDate.getTime() - today.getTime();
            const safeTime = timeToFinish + (1000 * 60 * 60 * 24 * 14); 

            if (safeTime > timeToExam) {
                status = 'danger';
                const availableWeeks = Math.max(1, Math.floor(timeToExam / (1000 * 60 * 60 * 24 * 7)) - 2);
                const ratio = weeksElapsed / availableWeeks;
                suggestion = Math.ceil(weeklyCapacity * ratio) - weeklyCapacity;
            } else if (timeToFinish > timeToExam - (1000 * 60 * 60 * 24 * 30)) {
                status = 'warning';
            }
        }

        return { 
            weeks: Math.ceil(weeksElapsed), 
            date: finishDate, 
            status, 
            suggestion,
            totalItems: totalItemsToStudy
        };

    }, [notebooks, paceTarget.blocks, config.examDate]);

    const totalAllocated = distribution.reduce((sum, item) => sum + item.blocks, 0);
    const diff = totalAllocated - paceTarget.blocks;
    const isBalanced = diff === 0; const isOver = diff > 0; const isUnder = diff < 0;

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-500 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar">
             <div className="text-center mb-8">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-emerald-900/10 mx-auto border border-slate-700"><Scale size={32} className="text-emerald-500" /></div>
                <h2 className="text-2xl font-bold text-white mb-2">Planejamento de Ciclo</h2>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Defina os pesos estratégicos. O algoritmo Atena distribuirá sua carga de <strong className="text-white">{paceTarget.blocks} blocos/semana (Ritmo Padrão)</strong>.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white flex items-center gap-2"><Settings2 size={18} className="text-slate-400"/> Distribuição de Pesos</h3>
                            <div className="text-xs font-bold text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">Total: {totalWeight.toFixed(1)} pts</div>
                        </div>
                        <div className="space-y-3">
                            {availableDisciplines.map(d => (
                                <div key={d} className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${selectedDiscs.has(d) ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-950/30 border-slate-800 opacity-60'}`}>
                                    <input type="checkbox" checked={selectedDiscs.has(d)} onChange={() => toggleDisc(d)} className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-offset-0 focus:ring-0 cursor-pointer accent-emerald-500" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-slate-200 truncate">{d}</div>
                                        {selectedDiscs.has(d) && <div className="text-[10px] text-emerald-500 font-mono mt-0.5">{weights[d] || 1} pts • {((weights[d] || 1) / totalWeight * 100).toFixed(1)}%</div>}
                                    </div>
                                    {selectedDiscs.has(d) && (
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="0.5" max="5" step="0.5" value={weights[d] || 1} onChange={(e) => updateWeight(d, parseFloat(e.target.value))} className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                            <span className="text-xs font-bold w-6 text-center text-white">{weights[d] || 1}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className="pt-2 flex gap-2">
                                <input type="text" value={newDiscName} onChange={(e) => setNewDiscName(e.target.value)} placeholder="Nova Disciplina..." className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" />
                                <button onClick={handleAddDiscipline} disabled={!newDiscName} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"><Plus size={14} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator size={64} /></div>
                        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Projeção do Ciclo</h3>
                        
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                <span className="text-xs text-slate-400">Capacidade Semanal</span>
                                <span className="text-sm font-bold text-white">{paceTarget.blocks} Blocos</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                <span className="text-xs text-slate-400">Total Alocado</span>
                                <span className={`text-sm font-bold ${isBalanced ? 'text-emerald-400' : isOver ? 'text-red-400' : 'text-amber-400'}`}>{totalAllocated} Blocos</span>
                            </div>
                            
                            {!isBalanced && (
                                <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${isOver ? 'bg-red-900/20 text-red-300 border border-red-500/20' : 'bg-amber-900/20 text-amber-300 border border-amber-500/20'}`}>
                                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                    {isOver ? `Você alocou ${diff} blocos a mais que sua capacidade.` : `Você ainda tem ${Math.abs(diff)} blocos livres.`}
                                </div>
                            )}

                            {projection && (
                                <div className="pt-2">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Estimativa de Conclusão</div>
                                    <div className="text-2xl font-bold text-white mb-1">{projection.weeks} Semanas</div>
                                    <div className="text-xs text-slate-400">Data Prevista: <span className="text-emerald-400">{projection.date.toLocaleDateString()}</span></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Distribuição Final</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                            {distribution.map(item => (
                                <div key={item.name} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-300 truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${item.percentage * 100}%` }}></div>
                                        </div>
                                        <span className="font-mono font-bold text-emerald-400 w-6 text-right">{item.blocks}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface Props {
    onNavigate?: (view: string) => void;
}

export const Setup: React.FC<Props> = ({ onNavigate }) => {
  const { notebooks, cycles, activeCycleId, config, updateConfig, moveNotebookToWeek, reorderSlotInWeek, toggleSlotCompletion, removeSlotFromWeek, exportDatabase, setFocusedNotebookId } = useStore();
  
  const [viewMode, setViewMode] = useState<'timeline' | 'calculator'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'unallocated' | 'overdue'>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);
  
  // MIGRATION TOOL STATE
  const [showMigrationTool, setShowMigrationTool] = useState(false);

  // ... (Existing useMemo hooks for pendingCount, allocationData, etc.) ...
  const pendingCount = useMemo(() => {
      if (!activeCycleId) return notebooks.filter(n => n.discipline !== 'Revisão Geral' && !n.weekId).length;
      const cycle = cycles.find(c => c.id === activeCycleId);
      if(!cycle?.schedule) return 0;
      
      const scheduledIds = new Set<string>();
      const schedule = cycle.schedule as Record<string, ScheduleItem[]>;
      
      if (schedule) {
          Object.values(schedule).forEach((slots) => {
              if (Array.isArray(slots)) {
                  slots.forEach(slot => { 
                      if(slot && slot.notebookId) scheduledIds.add(slot.notebookId); 
                  });
              }
          });
      }
      return notebooks.filter(n => n.discipline !== 'Revisão Geral' && !scheduledIds.has(n.id)).length;
  }, [notebooks, activeCycleId, cycles]);

  const existingDisciplines = useMemo(() => Array.from(new Set(notebooks.map(n => n.discipline))).sort(), [notebooks]);

  const currentPace = config.studyPace || 'Intermediário';
  const paceTarget = PACE_SETTINGS[currentPace] || PACE_SETTINGS['Intermediário'];
  
  const activeCycle = cycles.find(c => c.id === activeCycleId);

  const allocationData = useMemo(() => {
    const data: Record<string, number> = {};
    if (activeCycle?.schedule) {
        const schedule = activeCycle.schedule as Record<string, ScheduleItem[]>;
        Object.values(schedule).forEach((slots) => {
            if (Array.isArray(slots)) {
                slots.forEach(slot => {
                    if (!slot || !slot.notebookId) return;
                    const nb = notebooks.find(n => n.id === slot.notebookId);
                    if (nb && nb.discipline !== 'Revisão Geral') {
                        data[nb.discipline] = (data[nb.discipline] || 0) + 1;
                    }
                });
            }
        });
    } else {
        notebooks.filter(n => n.discipline !== 'Revisão Geral' && n.weekId).forEach(nb => {
            data[nb.discipline] = (data[nb.discipline] || 0) + 1;
        });
    }
    return Object.keys(data).map(key => ({ name: key, count: data[key] })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [notebooks, activeCycleId, cycles]);

  const totalAllocatedBlocks = useMemo(() => {
      if (activeCycle?.schedule) {
          let count = 0;
          const schedule = activeCycle.schedule as Record<string, ScheduleItem[]>;
          Object.values(schedule).forEach((slots) => {
              if(Array.isArray(slots)) count += slots.length;
          });
          return count;
      }
      return notebooks.filter(n => n.weekId && n.weekId.startsWith('week-')).length;
  }, [notebooks, activeCycleId, cycles]);

  const libraryNotebooks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
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

    if (disciplineFilter) result = result.filter(nb => nb.discipline === disciplineFilter);

    if (libraryFilter === 'unallocated') {
        result = result.filter(nb => !nb.weekId);
    } else if (libraryFilter === 'overdue') {
        result = result.filter(nb => nb.nextReview && nb.nextReview.split('T')[0] < today);
    }

    result.sort((a, b) => a.discipline.localeCompare(b.discipline) || a.name.localeCompare(b.name));
    return result;
  }, [notebooks, searchTerm, libraryFilter, disciplineFilter]);

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

  const onDragStart = useCallback((e: React.DragEvent, id: string, origin: 'library' | 'week', index?: number) => {
    e.dataTransfer.setData("notebookId", id);
    e.dataTransfer.setData("origin", origin);
    if (index !== undefined) e.dataTransfer.setData("sourceIndex", index.toString());
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  
  const onDrop = async (e: React.DragEvent, targetWeekId: string | null, isPast: boolean) => {
    if (isPast) { alert("Você não pode alterar o planejamento de semanas que já passaram."); return; }
    const id = e.dataTransfer.getData("notebookId");
    if (!id || !targetWeekId) return;
    await moveNotebookToWeek(id, targetWeekId);
  };

  const handleDropOnCard = useCallback(async (e: React.DragEvent, targetWeekId: string, targetIndex: number) => {
      e.stopPropagation(); 
      const sourceIndexStr = e.dataTransfer.getData("sourceIndex");
      const origin = e.dataTransfer.getData("origin");
      const id = e.dataTransfer.getData("notebookId");

      if (origin === 'week' && sourceIndexStr) {
          const sourceIndex = parseInt(sourceIndexStr);
          await reorderSlotInWeek(targetWeekId, sourceIndex, targetIndex);
      } else if (origin === 'library') {
          await moveNotebookToWeek(id, targetWeekId);
      }
  }, [reorderSlotInWeek, moveNotebookToWeek]);

  const handleEditClick = useCallback((notebook: Notebook) => {
    setFocusedNotebookId(notebook.id);
    if (onNavigate) {
        onNavigate('library');
    } else {
        console.warn("Setup: onNavigate not provided");
    }
  }, [setFocusedNotebookId, onNavigate]);

  const handleRemoveFromWeek = useCallback((instanceId: string, weekId: string) => {
      removeSlotFromWeek(instanceId, weekId);
  }, [removeSlotFromWeek]);

  return (
    <div className="flex flex-row h-full w-full overflow-hidden relative">
      
      {/* Sidebar */}
      <aside className={`flex-shrink-0 border-r border-slate-800 bg-slate-900/95 flex flex-col z-40 transition-all duration-300 ease-in-out h-full ${isSidebarCollapsed ? 'w-14' : 'absolute md:relative w-80 shadow-2xl md:shadow-none'}`}>
          <div className={`p-4 border-b border-slate-800 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isSidebarCollapsed && (
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider"><Layout size={14} className="text-emerald-500 inline mr-1" /> Banco</h2>
                    {pendingCount > 0 && <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-500/30" title="Pendentes">{pendingCount}</span>}
                </div>
            )}
            <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title={isSidebarCollapsed ? "Expandir Lista" : "Recolher Lista"}
            >
                {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          
          {isSidebarCollapsed && (
              <div className="flex-1 flex flex-col items-center py-6 gap-6">
                  <div className="vertical-text text-slate-600 font-bold uppercase tracking-widest text-xs whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                      Banco de Disciplinas ({libraryNotebooks.length})
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                      <Inbox size={14} />
                  </div>
              </div>
          )}

          {!isSidebarCollapsed && (
              <>
                <div className="px-4 pb-4 space-y-3 pt-2">
                    <div className="relative">
                        <select 
                            value={disciplineFilter} 
                            onChange={(e) => setDisciplineFilter(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-8 text-xs text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-900"
                        >
                            <option value="">Filtrar por Disciplina (Todas)</option>
                            {existingDisciplines.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500"><ChevronDown size={12} /></div>
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
                        <span className="text-emerald-500 flex items-center gap-1">Arraste <ArrowRight size={10} /></span>
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
                            startDate={config.startDate}
                        />
                    ))}
                    
                    {libraryNotebooks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2 opacity-50 px-4 text-center">
                            <Settings2 size={24} />
                            <span className="text-xs">Nenhum caderno encontrado. {libraryFilter === 'unallocated' ? "Tudo já está agendado!" : "Crie um novo caderno."}</span>
                        </div>
                    )}
                </div>
              </>
          )}
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
         <header className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30 shadow-lg">
            <div className="flex items-center gap-6 w-full lg:w-auto lg:flex-1">
                 {/* ... Date/Exam Stats ... */}
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Início</span>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
                        <Calendar size={14} className="text-emerald-500" />
                        <input type="date" value={config.startDate || ''} onChange={(e) => updateConfig({...config, startDate: e.target.value})} className="bg-transparent outline-none text-xs text-white cursor-pointer font-medium" />
                    </div>
                 </div>

                 {/* ... More Stats ... */}
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
                 
                 {/* PACE SELECTOR */}
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
                    onClick={() => setShowMigrationTool(true)} 
                    className="h-[42px] w-[42px] flex items-center justify-center rounded-xl transition-all border bg-slate-800 text-cyan-400 border-slate-700 hover:text-white hover:bg-cyan-600 hover:border-cyan-500 shadow-sm"
                    title="Migrar Imagens para Storage"
                 >
                    <CloudLightning size={18} />
                 </button>

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
                 {/* Timeline Content */}
                 {/* ... (Existing Timeline implementation) ... */}
                 {/* The timeline render code is identical to previous, just wrapped in this condition */}
                 <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-slate-900 border-b border-slate-800 flex-shrink-0 ${showStats ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 border-none'}`}>
                    {/* ... Stats Panel ... */}
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
                        
                        let weekSlots: ScheduleItem[] = [];
                        if (activeCycle?.schedule && activeCycle.schedule[week.id]) {
                            weekSlots = activeCycle.schedule[week.id];
                        } else {
                            const legacyNotebooks = notebooks.filter(nb => nb.weekId === week.id);
                            weekSlots = legacyNotebooks.map(nb => ({ instanceId: nb.id + '-legacy', notebookId: nb.id, completed: !!nb.isWeekCompleted }));
                        }
                        weekSlots = weekSlots.filter(s => !!s && !!s.notebookId);

                        const blocksCount = weekSlots.length;
                        const blocksCompleted = weekSlots.filter(s => s && s.completed).length;
                        const blocksRemaining = blocksCount - blocksCompleted;
                        const weekPaceName = getWeekPace(week.id);
                        const weekTarget = PACE_SETTINGS[weekPaceName] || paceTarget;
                        const loadPercentage = Math.min((blocksCount / weekTarget.blocks) * 100, 100);
                        const missingBlocks = Math.max(0, weekTarget.blocks - blocksCount);
                        const isOverloaded = blocksCount > weekTarget.blocks;
                        const isAllocated = blocksCount >= weekTarget.blocks && !isOverloaded;
                        const isTargetMet = blocksCompleted >= weekTarget.blocks;
                        const isAllAllocatedDone = blocksCount > 0 && blocksCompleted === blocksCount;
                        const isLate = week.isPast && !isTargetMet;
                        const dailyAvg = (blocksCount / 7).toFixed(1);

                        // --- PERFORMANCE SUMMARY ---
                        const summaryStats = { success: 0, warning: 0, critical: 0, totalAcc: 0, countAcc: 0 };
                        if (week.isPast || blocksCompleted > 0) {
                            weekSlots.forEach(slot => {
                                if (!slot.completed || !slot.notebookId) return;
                                const nb = notebooks.find(n => n.id === slot.notebookId);
                                if (!nb) return;
                                
                                // Accumulate accuracy for average
                                if (nb.accuracy > 0) {
                                    summaryStats.totalAcc += nb.accuracy;
                                    summaryStats.countAcc++;
                                }

                                if (nb.accuracy >= nb.targetAccuracy) summaryStats.success++;
                                else if (nb.accuracy < 60) summaryStats.critical++;
                                else summaryStats.warning++;
                            });
                        }
                        const hasActivity = summaryStats.success + summaryStats.warning + summaryStats.critical > 0;
                        const avgAccuracy = summaryStats.countAcc > 0 ? Math.round(summaryStats.totalAcc / summaryStats.countAcc) : 0;

                        // COLLAPSED LOGIC
                        const isCollapsed = week.isPast && expandedWeekId !== week.id;

                        if (isCollapsed) {
                            return (
                                <div 
                                    key={week.id}
                                    onClick={() => setExpandedWeekId(week.id)}
                                    className="w-24 h-full bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 rounded-2xl flex flex-col items-center py-4 cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-xl relative overflow-hidden"
                                    title={`Semana ${week.index} - Clique para expandir`}
                                >
                                    <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-transparent transition-colors" />
                                    
                                    {/* Top: Status Dots (Mini Dashboard) */}
                                    <div className="flex flex-col gap-1 mb-4 z-10 w-full items-center">
                                        {hasActivity ? (
                                            <>
                                                <div className="flex gap-1">
                                                    {summaryStats.success > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" title={`${summaryStats.success} metas batidas`}></span>}
                                                    {summaryStats.warning > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" title={`${summaryStats.warning} em atenção`}></span>}
                                                    {summaryStats.critical > 0 && <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm" title={`${summaryStats.critical} críticos`}></span>}
                                                </div>
                                                <span className={`text-[10px] font-mono font-bold ${avgAccuracy >= 80 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                    {avgAccuracy}%
                                                </span>
                                            </>
                                        ) : (
                                            <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                                        )}
                                    </div>

                                    {/* Middle: Vertical Text */}
                                    <div className="flex-1 flex items-center justify-center z-10 w-full relative">
                                        <span className="text-xs font-bold text-slate-500 group-hover:text-white whitespace-nowrap tracking-widest uppercase absolute" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                                            Semana {week.index}
                                        </span>
                                    </div>

                                    {/* Bottom: Pace Indicator */}
                                    <div className="mt-4 z-10 flex flex-col items-center gap-1">
                                        <Activity size={14} className={isTargetMet ? "text-emerald-500" : "text-slate-600"} />
                                        {isTargetMet && <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-tighter scale-75">Meta OK</span>}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={week.id} className={`w-80 flex-shrink-0 flex flex-col rounded-2xl border transition-all duration-300 relative h-full max-h-full ${week.isPast ? 'bg-slate-900/30 border-slate-800/50 opacity-100' : 'bg-slate-900 border-slate-800 shadow-2xl hover:border-slate-700'}`} onDragOver={week.isPast ? undefined : onDragOver} onDrop={(e) => onDrop(e, week.id, week.isPast)}>
                            
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shadow-sm z-20">
                                ~{dailyAvg} / dia
                            </div>

                            {/* Collapse Button for Past Weeks */}
                            {week.isPast && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setExpandedWeekId(null); }}
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-400 hover:text-white p-1 rounded-full shadow-lg border border-slate-700 z-50 hover:scale-110 transition-transform"
                                    title="Recolher Semana"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            )}

                            <div className={`p-4 rounded-t-2xl border-b flex flex-col gap-3 z-10 relative ${week.isPast ? 'bg-slate-950/30 border-slate-800/50 text-slate-600' : 'bg-slate-900 border-slate-700 text-slate-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div><span className="font-black block text-base flex items-center gap-2 text-white">SEMANA {week.index} {week.isPast && <Lock size={14} />}</span><span className={`text-[10px] font-bold uppercase tracking-widest ${week.isPast ? 'line-through decoration-slate-600 opacity-50' : 'text-slate-500'}`}>{week.label}</span></div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-lg font-black ${isTargetMet ? 'text-emerald-400' : 'text-white'}`}>
                                                {blocksCompleted}
                                            </span>
                                            <span className="text-sm font-medium text-slate-600">/</span>
                                            <span className={`text-lg font-black ${isOverloaded ? 'text-red-400' : isAllocated ? 'text-emerald-400' : 'text-white'}`}>
                                                {blocksCount}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                                            {blocksRemaining > 0 ? (
                                                <span className="text-amber-500">{blocksRemaining} Restantes</span>
                                            ) : blocksCount > 0 ? (
                                                <span className="text-emerald-500 flex items-center gap-1"><Check size={8}/> Feito</span>
                                            ) : (
                                                "Vazio"
                                            )}
                                        </span>
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
                                    <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden flex relative group border border-slate-800"><div className={`h-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : 'bg-slate-600'}`} style={{ width: `${loadPercentage}%` }}></div></div>
                                    <div className="flex justify-between items-center h-5">
                                        {isTargetMet ? (
                                            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-full justify-center"><Check size={10} /> Meta Batida</span>
                                        ) : isAllAllocatedDone ? (
                                            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-full justify-center"><Meh size={10} /> Ritmo Baixo ({blocksCompleted}/{weekTarget.blocks})</span>
                                        ) : isLate ? (
                                            <span className="text-[10px] text-red-400 font-bold flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 w-full justify-center"><AlertCircle size={10} /> Atrasado ({blocksCount - blocksCompleted} pendentes)</span>
                                        ) : missingBlocks > 0 ? (
                                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">Planejar: +{missingBlocks}</span>
                                        ) : (
                                            <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1"><Archive size={10} /> Planejamento OK</span>
                                        )}
                                    </div>
                                </div>
                                {hasActivity && (
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/50 mt-1">
                                        <div className="flex items-center gap-3">
                                            {summaryStats.success > 0 && <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {summaryStats.success}</span>}
                                            {summaryStats.warning > 0 && <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {summaryStats.warning}</span>}
                                            {summaryStats.critical > 0 && <span className="text-[9px] font-bold text-red-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {summaryStats.critical}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 space-y-2 overflow-y-auto flex-1 custom-scrollbar relative bg-slate-900/50">
                                {week.isPast && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none z-0"></div>}
                                {weekSlots.map((slot, index) => {
                                    if (!slot || !slot.notebookId) return null; 
                                    const nb = notebooks.find(n => n.id === slot.notebookId);
                                    if (!nb) return null;
                                    return (
                                        <DraggableCard 
                                            key={slot.instanceId || `fallback-${index}`} 
                                            instanceId={slot.instanceId}
                                            notebook={nb} 
                                            isCompleted={slot.completed}
                                            onDragStart={onDragStart} 
                                            onDropOnCard={(e, idx) => handleDropOnCard(e, week.id, idx)}
                                            onEdit={handleEditClick} 
                                            onToggleComplete={(instId, val) => toggleSlotCompletion(instId, week.id)} 
                                            onRemove={(instId) => handleRemoveFromWeek(instId, week.id)}
                                            isCompact 
                                            origin="week" 
                                            disabled={week.isPast}
                                            index={index}
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

      {/* Migration Tool Modal */}
      {showMigrationTool && <MigrationTool onClose={() => setShowMigrationTool(false)} />}
    </div>
  );
};