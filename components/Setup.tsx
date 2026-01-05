import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Notebook, Weight, Relevance, Trend, NotebookStatus, ScheduleItem } from '../types';
import { Plus, Search, Copy, Pencil, X, Save, Link as LinkIcon, BarChart3, Calendar, Lock, ChevronDown, ChevronUp, Layout, FileCode, CheckSquare, Check, Timer, Calculator, AlertCircle, ArrowRight, Settings2, GanttChartSquare, ZoomIn, Trash2, CalendarClock, Flag, ChevronLeft, ChevronRight, Inbox, Layers, Star, ScanSearch, Scale, Loader2, TrendingUp, History, ListPlus, Minus, AlertTriangle, CheckCircle2, RotateCw, Zap, Activity, Info, Clock, Archive, Cloud, CloudOff, Download, PanelLeftClose, PanelLeftOpen, Sparkles, XCircle, Play, Forward } from 'lucide-react';
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
    onDropOnCard, // NEW: For reordering
    onEdit, 
    origin, 
    isCompact, 
    disabled, 
    onToggleComplete,
    onRemove, 
    allocationCount,
    isCompleted, // Passed from slot
    index // Passed from list
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
}) => {
    const statusColor = getStatusColor(notebook.accuracy, notebook.targetAccuracy);
    
    // Determine visuals based on origin
    const isLibrary = origin === 'library';
    const isWeek = origin === 'week';

    const isTargetMet = notebook.accuracy >= notebook.targetAccuracy;

    // Tooltip Content logic
    const getStatusTooltip = () => {
        if (!isCompleted) return "Pendente: Clique para marcar como concluído.";
        if (isTargetMet) return "Desempenho de Elite: Meta de acurácia atingida!";
        return "Concluído com Ressalvas: Meta de acurácia não atingida. Requer revisão.";
    };

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
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                         <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: statusColor }} 
                            title={`Acurácia: ${notebook.accuracy}%`}
                         />
                        <h4 className={`font-bold truncate leading-tight max-w-[140px] ${isCompleted && isWeek ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                            {notebook.discipline}
                        </h4>
                        
                        {/* REDESIGNED "NO CICLO" BADGE */}
                        {isLibrary && allocationCount && allocationCount > 0 ? (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-300 uppercase tracking-wide shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                                No Ciclo
                            </span>
                        ) : null}
                    </div>
                    <p className={`truncate mb-1 leading-tight font-medium ${isCompleted && isWeek ? 'text-slate-600' : 'text-slate-400'}`} title={notebook.name}>{notebook.name}</p>
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
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center relative group/tooltip">
                    <label className="flex items-center gap-2 cursor-pointer group/check w-full">
                        <div className={`
                            w-full py-1.5 px-3 rounded-lg border flex items-center justify-center gap-2 transition-all font-bold text-[10px] uppercase tracking-wider relative
                            ${isCompleted 
                                ? (isTargetMet 
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                                    : 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-900/20')
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

                    {/* TOOLTIP ON HOVER */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-slate-200 text-[10px] p-2 rounded-lg border border-slate-700 shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[60] text-center">
                        {getStatusTooltip()}
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

    // --- PROJECTION LOGIC (SMART FEATURE) ---
    // Simula o tempo necessário para zerar o edital considerando o atrito das revisões
    const projection = useMemo(() => {
        // 1. Inputs
        // Excluímos 'Revisão Geral' e itens já Dominados (opcional, mas seguro assumir que o usuário quer ver o edital TODO)
        // Vamos considerar todos os itens ativos que não são "Dominado"
        const totalItemsToStudy = notebooks.filter(n => n.discipline !== 'Revisão Geral' && n.status !== NotebookStatus.MASTERED).length;
        const weeklyCapacity = paceTarget.blocks;
        
        if (totalItemsToStudy === 0 || weeklyCapacity === 0) return null;

        // 2. Constants
        const REVIEW_COST_BLOCKS = 0.2; // 10 mins = 0.2 de um bloco de 50min
        
        // 3. Simulation
        let weeksElapsed = 0;
        let itemsCompleted = 0;
        let cumulativeReviews = 0; // Quantidade acumulada de itens que entraram no pool de revisão
        
        // Safety: Max 200 weeks simulation
        while (itemsCompleted < totalItemsToStudy && weeksElapsed < 200) {
            weeksElapsed++;
            
            // Heurística de Carga de Revisão (Review Tax)
            // A carga de revisão cresce conforme avançamos.
            // No início é 0. Conforme acumulamos itens, precisamos revisá-los.
            // Assumimos que o SRS estabiliza em torno de 30-40% do tempo gasto em revisão no longo prazo.
            // Modelo Logarítmico Simplificado:
            // ReviewLoad = (Itens Já Vistos) * Fator de Recorrência * Custo
            // Fator de Recorrência médio do SRS ~ 0.15 (revisa 15% do que sabe toda semana na média)
            
            const itemsInPool = itemsCompleted; // Itens que já estudei e agora geram "juros" (revisão)
            const estimatedReviewsNeeded = itemsInPool * 0.15; // Média estatística do Anki/SRS
            const reviewBlocksNeeded = estimatedReviewsNeeded * REVIEW_COST_BLOCKS;
            
            // Capacidade Líquida para Matéria Nova
            let netCapacity = weeklyCapacity - reviewBlocksNeeded;
            
            // Cap de Sanidade: Nunca deixe a matéria nova zerar, mas a revisão tem prioridade
            // Se a revisão comer tudo, o aluno entra no "Review Hell". O Atena limita a 50% para progresso mínimo.
            if (netCapacity < weeklyCapacity * 0.2) {
                netCapacity = weeklyCapacity * 0.2; // Garante 20% de avanço mesmo no caos
            }

            itemsCompleted += netCapacity;
        }

        // 4. Dates
        const today = new Date();
        const finishDate = new Date(today);
        finishDate.setDate(today.getDate() + (weeksElapsed * 7));
        
        // 5. Analysis vs Exam
        let status = 'safe'; // safe, warning, danger
        let suggestion = 0; // Blocks to add
        let diffWeeks = 0;

        if (config.examDate) {
            const exam = new Date(config.examDate);
            const timeToExam = exam.getTime() - today.getTime();
            const timeToFinish = finishDate.getTime() - today.getTime();
            
            // Margem de segurança de 2 semanas para revisão final
            const safeTime = timeToFinish + (1000 * 60 * 60 * 24 * 14); 

            if (safeTime > timeToExam) {
                status = 'danger';
                // Calculate needed pace
                // Simple proportion: needed / current = currentWeeks / availableWeeks
                const availableWeeks = Math.max(1, Math.floor(timeToExam / (1000 * 60 * 60 * 24 * 7)) - 2);
                const ratio = weeksElapsed / availableWeeks;
                suggestion = Math.ceil(weeklyCapacity * ratio) - weeklyCapacity;
            } else if (timeToFinish > timeToExam - (1000 * 60 * 60 * 24 * 30)) {
                // Menos de 1 mês de margem
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

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-500 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar">
             <div className="text-center mb-8">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-emerald-900/10 mx-auto border border-slate-700"><Scale size={32} className="text-emerald-500" /></div>
                <h2 className="text-2xl font-bold text-white mb-2">Planejamento de Ciclo</h2>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Defina os pesos estratégicos. O algoritmo Atena distribuirá sua carga de <strong className="text-white">{paceTarget.blocks} blocos/semana (Ritmo Padrão)</strong>.</p>
            </div>
            
            {/* --- SMART PROJECTION ENGINE (NEW) --- */}
            {projection && (
                <div className={`mb-8 border rounded-xl p-6 relative overflow-hidden transition-all duration-500 ${
                    projection.status === 'danger' ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 
                    projection.status === 'warning' ? 'bg-amber-950/20 border-amber-500/30' : 
                    'bg-slate-900/80 border-slate-700 shadow-xl'
                }`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <TrendingUp size={120} />
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start relative z-10">
                        {/* LEFT: Weeks & Date */}
                        <div className="flex-1 min-w-0 w-full">
                            <h3 className={`text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${
                                projection.status === 'danger' ? 'text-red-400' : 
                                projection.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                                <Activity size={16} /> Projeção Tática (1ª Passagem)
                            </h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-black text-white">{projection.weeks}</span>
                                <span className="text-slate-400 font-medium">Semanas estimadas</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/50 w-fit px-3 py-1.5 rounded-lg border border-slate-800">
                                <CalendarClock size={12} />
                                Conclusão Teórica: <strong className="text-slate-200">{projection.date.toLocaleDateString()}</strong>
                            </div>
                        </div>

                        {/* Divider - Adaptive */}
                        <div className="w-full h-px md:w-px md:h-auto md:self-stretch bg-slate-800 md:bg-slate-700/50"></div>

                        {/* RIGHT: Progress Bar & Details */}
                        <div className="flex-1 space-y-3 w-full min-w-0">
                            <div className="flex flex-wrap justify-between gap-2 text-xs font-bold text-slate-500 uppercase">
                                <span className="whitespace-nowrap flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                    Matéria Nova
                                </span>
                                <span className="flex items-center gap-2 whitespace-nowrap">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    Impacto Revisões (Atrito)
                                </span>
                            </div>
                            <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                                <div className="h-full bg-blue-600 w-[70%]" title="Matéria Nova"></div>
                                <div className="h-full bg-amber-500 w-[30%] relative" style={{backgroundImage: 'linear-gradient(45deg,rgba(0,0,0,0.1) 25%,transparent 25%,transparent 50%,rgba(0,0,0,0.1) 50%,rgba(0,0,0,0.1) 75%,transparent 75%,transparent)', backgroundSize: '10px 10px'}} title="Tempo perdido com Revisões (Atrito)"></div>
                            </div>
                            
                            <div className="flex items-start gap-2 mt-2 bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                                <Info size={14} className="text-slate-500 flex-shrink-0 mt-0.5"/>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    O sistema desconta automaticamente <strong>0.2 blocos (10min)</strong> da sua capacidade semanal para cada revisão acumulada de tópicos já estudados ({projection.totalItems} itens no radar).
                                </p>
                            </div>
                        </div>

                        {projection.suggestion > 0 && (
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl w-full md:max-w-[200px] flex-shrink-0 animate-pulse hover:animate-none transition-all">
                                <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                                    <Sparkles size={12} className="text-yellow-400"/> Sugestão da IA
                                </h4>
                                <p className="text-[10px] text-slate-300 leading-snug">
                                    Para terminar antes da prova com segurança, aumente seu ritmo para:
                                    <strong className="block text-base text-emerald-400 mt-1">{paceTarget.blocks + projection.suggestion} blocos / semana</strong>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full min-h-[400px]">
                 <div className={`p-4 border-b flex justify-between items-center ${isOver ? 'bg-red-950/40 border-red-900/50' : isUnder ? 'bg-amber-950/40 border-amber-900/50' : 'bg-slate-950/50 border-slate-800'}`}>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2"><Scale size={16} /> Distribuição Ponderada</h3>
                    <div className="flex items-center gap-4">
                        {!isBalanced && <span className={`text-xs font-bold ${isOver ? 'text-red-400' : 'text-amber-400'}`}>{isOver ? `Remova ${Math.abs(diff)} blocos` : `Aloque +${Math.abs(diff)} blocos`}</span>}
                        <div className={`text-xs font-mono px-3 py-1 rounded-full border ${isBalanced ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-white'}`}>Alocado: <strong>{totalAllocated}</strong> / {paceTarget.blocks}</div>
                    </div>
                 </div>

                 {/* ADD DISCIPLINE FORM */}
                 <form onSubmit={handleAddDiscipline} className="p-3 border-b border-slate-800/50 bg-slate-900/50 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                        <input 
                            type="text" 
                            value={newDiscName}
                            onChange={(e) => setNewDiscName(e.target.value)}
                            placeholder="Adicionar disciplina ao ciclo (ex: Direito Civil)..." 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <button type="submit" disabled={!newDiscName.trim()} className="px-4 py-2 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                        <Plus size={14} />
                    </button>
                 </form>

                 <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-800/50">
                    {availableDisciplines.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-500 opacity-50">
                            <ListPlus size={32} className="mb-2"/>
                            <p className="text-xs">Lista vazia. Adicione disciplinas acima.</p>
                        </div>
                    )}
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

const WeeklyPlanner = () => {
    const { notebooks, cycles, activeCycleId, moveNotebookToWeek, removeSlotFromWeek, toggleSlotCompletion } = useStore();
    const [searchTerm, setSearchTerm] = useState('');

    const activeCycle = cycles.find(c => c.id === activeCycleId);
    
    // Fallback if no cycle selected
    if (!activeCycle) return <div className="flex items-center justify-center h-full text-slate-500">Selecione um ciclo no Dashboard ou Projetos.</div>;

    const weeks = Array.from({ length: 12 }, (_, i) => `week-${i + 1}`);

    const handleDragStart = (e: React.DragEvent, id: string, origin: 'library' | 'week') => {
        e.dataTransfer.setData('notebookId', id);
        e.dataTransfer.setData('origin', origin);
    };

    const handleDropWeek = (e: React.DragEvent, weekId: string) => {
        e.preventDefault();
        const nbId = e.dataTransfer.getData('notebookId');
        const origin = e.dataTransfer.getData('origin');
        if (nbId && origin === 'library') {
            moveNotebookToWeek(nbId, weekId);
        }
    };

    // Library Filtering
    const libraryItems = notebooks.filter(n => 
        n.discipline !== 'Revisão Geral' &&
        (n.name.toLowerCase().includes(searchTerm.toLowerCase()) || n.discipline.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex h-full gap-4 pt-4 overflow-hidden">
             {/* LIBRARY SIDEBAR */}
             <div className="w-72 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shrink-0">
                 <div className="p-3 border-b border-slate-800 bg-slate-950">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Banco de Itens</h4>
                     <div className="relative">
                         <Search className="absolute left-2 top-2 text-slate-500" size={12} />
                         <input 
                            type="text" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 pl-7 text-xs text-white outline-none focus:border-emerald-500"
                            placeholder="Buscar..."
                         />
                     </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                     {libraryItems.map(nb => {
                         // Check allocation
                         let count = 0;
                         if (activeCycle.schedule) {
                             Object.values(activeCycle.schedule).forEach((slots: any) => {
                                 count += slots.filter((s: any) => s.notebookId === nb.id).length;
                             });
                         }
                         return (
                             <DraggableCard 
                                key={nb.id} 
                                notebook={nb} 
                                origin="library" 
                                onDragStart={handleDragStart} 
                                onEdit={() => {}} 
                                isCompact={true}
                                allocationCount={count}
                             />
                         );
                     })}
                 </div>
             </div>

             {/* WEEKS KANBAN */}
             <div className="flex-1 overflow-x-auto flex gap-4 pb-4 custom-scrollbar">
                 {weeks.map((weekId, idx) => {
                     const slots = (activeCycle.schedule?.[weekId] || []) as ScheduleItem[];
                     return (
                         <div 
                            key={weekId}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDropWeek(e, weekId)}
                            className="min-w-[260px] w-[260px] flex flex-col bg-slate-900/50 border border-slate-800 rounded-xl h-full"
                         >
                             <div className="p-3 border-b border-slate-800 bg-slate-900 rounded-t-xl sticky top-0 z-10 flex justify-between items-center">
                                 <span className="text-sm font-bold text-white">Semana {idx + 1}</span>
                                 <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">{slots.length}</span>
                             </div>
                             <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                                 {slots.length === 0 && (
                                     <div className="h-24 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-[10px]">
                                         Arraste itens aqui
                                     </div>
                                 )}
                                 {slots.map((slot) => {
                                     const nb = notebooks.find(n => n.id === slot.notebookId);
                                     if (!nb) return null;
                                     return (
                                         <DraggableCard 
                                            key={slot.instanceId}
                                            instanceId={slot.instanceId}
                                            notebook={nb}
                                            origin="week"
                                            onDragStart={handleDragStart}
                                            onEdit={() => {}}
                                            isCompact={true}
                                            isCompleted={slot.completed}
                                            onRemove={(iid) => removeSlotFromWeek(iid, weekId)}
                                            onToggleComplete={(iid, val) => toggleSlotCompletion(iid, weekId)}
                                         />
                                     )
                                 })}
                             </div>
                         </div>
                     );
                 })}
             </div>
        </div>
    );
};

export const Setup: React.FC = () => {
    const { config, updateConfig } = useStore();
    
    // Pace Selection
    const currentPace = config.studyPace || 'Intermediário';
    const paceSettings = PACE_SETTINGS[currentPace] || PACE_SETTINGS['Intermediário'];
    
    // Tab switching
    const [viewMode, setViewMode] = useState<'calculator' | 'kanban'>('calculator');
    
    return (
        <div className="h-full flex flex-col">
            {/* Header / Tabs */}
             <div className="p-6 pb-0 max-w-7xl mx-auto w-full flex justify-between items-center">
                <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button onClick={() => setViewMode('calculator')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'calculator' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <Calculator size={16} /> Calculadora de Ciclo
                    </button>
                    <button onClick={() => setViewMode('kanban')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'kanban' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <GanttChartSquare size={16} /> Quadro Tático (Semanas)
                    </button>
                </div>
                
                {/* Pace Selector */}
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ritmo:</span>
                    <select 
                        value={currentPace}
                        onChange={(e) => updateConfig({...config, studyPace: e.target.value as any})}
                        className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:border-emerald-500 font-bold"
                    >
                        {Object.keys(PACE_SETTINGS).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <span className="text-xs text-emerald-500 font-mono bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/20">
                        {paceSettings.blocks} blocos/sem
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'calculator' ? (
                    <CycleCalculator paceTarget={paceSettings} />
                ) : (
                    <WeeklyPlanner />
                )}
            </div>
        </div>
    )
};
