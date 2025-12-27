
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Notebook, Weight, Relevance, Trend, NotebookStatus, PaceType } from '../types';
import { Plus, Search, Copy, Pencil, X, Link as LinkIcon, BarChart3, Calendar, Lock, ChevronDown, Layout, FileCode, CheckSquare, Check, Timer, Calculator, AlertCircle, ArrowRight, Settings2, GanttChartSquare, ZoomIn, Trash2, CalendarClock, Flag, ChevronLeft, ChevronRight, Inbox, Layers, Star, ScanSearch, Scale, Loader2, CalendarDays, Sun, Save } from 'lucide-react';
import { calculateNextReview, getStatusColor } from '../utils/algorithm';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';

const PACE_SETTINGS: Record<string, { hours: number, blocks: number }> = {
    'Iniciante': { hours: 10, blocks: 15 },
    'Básico': { hours: 20, blocks: 30 },
    'Intermediário': { hours: 30, blocks: 45 },
    'Avançado': { hours: 44, blocks: 66 }
};

// --- CONSTANTS ---
const BRAZIL_HOLIDAYS = [
    { d: 1, m: 0, name: 'Confraternização Universal' },
    { d: 12, m: 1, name: 'Carnaval (Est.)' }, // Aproximado
    { d: 29, m: 2, name: 'Paixão de Cristo (Est.)' }, // Aproximado
    { d: 21, m: 3, name: 'Tiradentes' },
    { d: 1, m: 4, name: 'Dia do Trabalho' },
    { d: 30, m: 4, name: 'Corpus Christi (Est.)' },
    { d: 7, m: 8, name: 'Independência' },
    { d: 12, m: 9, name: 'Nossa Sra. Aparecida' },
    { d: 2, m: 10, name: 'Finados' },
    { d: 15, m: 10, name: 'Proclamação da República' },
    { d: 25, m: 11, name: 'Natal' }
];

// MEMOIZED COMPONENT TO PREVENT RE-RENDERS ON DRAG/SEARCH
const DraggableCard = React.memo(({ 
    notebook, 
    onDragStart, 
    onEdit, 
    origin, 
    isCompact, 
    disabled, 
    onToggleComplete 
}: {
    notebook: Notebook;
    onDragStart: (e: React.DragEvent, id: string, origin: 'library' | 'week') => void;
    onEdit: (notebook: Notebook) => void;
    origin: 'library' | 'week';
    isCompact?: boolean;
    disabled?: boolean;
    onToggleComplete?: (id: string, isCompleted: boolean) => void;
}) => {
    const statusColor = getStatusColor(notebook.accuracy, notebook.targetAccuracy);
    
    // Check if it's already scheduled (for visual cue in Library)
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
                <div className={`absolute right-0 top-0 p-1 rounded-bl text-[9px] uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-l border-b z-10 flex items-center gap-1 ${isScheduled ? 'bg-blue-900/80 border-blue-700 text-blue-300' : 'bg-slate-900/80 border-slate-700 text-emerald-500'}`}>
                    {isScheduled ? <><Copy size={10}/> Repetir</> : "Mover"}
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
                        {origin === 'library' && isScheduled && <span className="text-[8px] bg-blue-900/30 text-blue-400 border border-blue-500/30 px-1 rounded">Alocado</span>}
                    </div>
                    <p className={`truncate mb-1 leading-tight ${notebook.isWeekCompleted && origin === 'week' ? 'text-slate-600' : 'text-slate-400'}`} title={notebook.name}>{notebook.name}</p>
                    {notebook.subtitle && <p className="text-slate-500 text-[10px] truncate">{notebook.subtitle}</p>}
                </div>
                
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                     <span className={`font-mono font-bold text-xs ${notebook.accuracy < 60 ? 'text-red-400' : 'text-emerald-400'}`}>
                         {notebook.accuracy}%
                     </span>
                     <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(notebook); }} 
                        className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
                        title="Editar"
                     >
                         <Pencil size={12} />
                     </button>
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

// --- COMPONENT: MACRO CALENDAR (Revised v3.5) ---
const MacroCalendar = () => {
    const { config, updateConfig } = useStore();
    const [year, setYear] = useState(new Date().getFullYear());
    
    const cyclePace = (current: PaceType): PaceType => {
        const order: PaceType[] = ['Off', 'Iniciante', 'Basico', 'Intermediario', 'Avancado', 'Revisao'];
        const idx = order.indexOf(current || 'Off');
        return order[(idx + 1) % order.length];
    };

    const getPaceColor = (pace: PaceType) => {
        switch(pace) {
            case 'Iniciante': return 'bg-cyan-900/30 text-cyan-400 border-cyan-500/50 hover:bg-cyan-900/50';
            case 'Basico': return 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50 hover:bg-emerald-900/50';
            case 'Intermediario': return 'bg-blue-900/30 text-blue-400 border-blue-500/50 hover:bg-blue-900/50';
            case 'Avancado': return 'bg-purple-900/30 text-purple-400 border-purple-500/50 hover:bg-purple-900/50';
            case 'Revisao': return 'bg-amber-900/30 text-amber-400 border-amber-500/50 hover:bg-amber-900/50';
            default: return 'bg-slate-900 text-slate-600 border-slate-800 hover:border-slate-700';
        }
    };

    const toggleWeekPace = (weekKey: string) => {
        const currentPace = config.longTermPlanning?.[weekKey] || 'Off';
        const newPace = cyclePace(currentPace);
        updateConfig({
            ...config,
            longTermPlanning: {
                ...config.longTermPlanning,
                [weekKey]: newPace
            }
        });
    };

    // Robust Date Check (Timezone Agnostic)
    const checkHoliday = (monthIndex: number, dayStart: number, dayEnd: number) => {
        return BRAZIL_HOLIDAYS.find(h => h.m === monthIndex && h.d >= dayStart && h.d <= dayEnd);
    };

    const checkExamDate = (examDateStr: string | undefined, currentYear: number, monthIndex: number, dayStart: number, dayEnd: number) => {
        if (!examDateStr) return false;
        // Parse "YYYY-MM-DD" strictly to numbers to avoid Timezone offset of Date()
        const parts = examDateStr.split('-');
        if (parts.length !== 3) return false;
        
        const eYear = parseInt(parts[0]);
        const eMonth = parseInt(parts[1]) - 1; // Month is 0-indexed
        const eDay = parseInt(parts[2]);

        return eYear === currentYear && eMonth === monthIndex && eDay >= dayStart && eDay <= dayEnd;
    };

    const getMonths = (y: number) => {
        const months = [];
        for (let m = 0; m < 12; m++) {
            const date = new Date(y, m, 1);
            const monthName = date.toLocaleString('pt-BR', { month: 'long' });
            const lastDay = new Date(y, m + 1, 0).getDate();

            const weeks = [];
            
            // Logic: W1 (1-7), W2 (8-14), W3 (15-21), W4 (22-End)
            const ranges = [
                { start: 1, end: 7 },
                { start: 8, end: 14 },
                { start: 15, end: 21 },
                { start: 22, end: lastDay }
            ];

            for(let w=0; w<4; w++) {
                const range = ranges[w];
                const holiday = checkHoliday(m, range.start, range.end);
                const hasExam = checkExamDate(config.examDate, y, m, range.start, range.end);

                weeks.push({
                    id: `${y}-${m+1}-W${w+1}`,
                    label: `S${w+1}`,
                    dateRange: `${String(range.start).padStart(2, '0')}-${String(range.end).padStart(2, '0')}`,
                    holiday,
                    hasExam
                });
            }
            
            months.push({ name: monthName, weeks });
        }
        return months;
    };

    const months = useMemo(() => getMonths(year), [year, config.examDate]);

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CalendarDays className="text-emerald-500" /> Calendário Macro
                    </h2>
                    <p className="text-slate-400 text-sm">Defina o ritmo estratégico anual. <span className="text-emerald-500 font-bold">v2.0</span></p>
                </div>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button 
                        onClick={() => setYear(year - 1)} 
                        className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-lg font-bold text-white min-w-[60px] text-center">{year}</span>
                    <button 
                        onClick={() => setYear(year + 1)} 
                        className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {months.map((month) => (
                    <div key={month.name} className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                        <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-widest mb-4 border-b border-slate-800 pb-2">{month.name}</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {month.weeks.map(week => {
                                const pace = config.longTermPlanning?.[week.id] || 'Off';
                                return (
                                    <button 
                                        key={week.id}
                                        onClick={() => toggleWeekPace(week.id)}
                                        className={`
                                            aspect-square rounded-lg border flex flex-col items-center justify-center transition-all hover:scale-[1.03] active:scale-95 relative group
                                            ${getPaceColor(pace)}
                                            ${week.hasExam ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-slate-950 z-10 shadow-lg shadow-red-900/50' : ''}
                                        `}
                                    >
                                        {/* Exam Flag - Pulsing */}
                                        {week.hasExam && (
                                            <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 z-20 shadow-md border border-slate-900 animate-pulse">
                                                <Flag size={12} fill="currentColor" />
                                            </div>
                                        )}

                                        {/* Holiday Indicator */}
                                        {week.holiday && !week.hasExam && (
                                            <div className="absolute top-1 right-1 text-yellow-400 z-10" title={`Feriado: ${week.holiday.name}`}>
                                                <Sun size={10} fill="currentColor" />
                                            </div>
                                        )}

                                        <span className="text-xs font-bold mb-0.5">{week.label}</span>
                                        
                                        <span className="text-[8px] uppercase font-bold opacity-80 truncate w-full text-center px-0.5 leading-tight">
                                            {pace === 'Intermediario' ? 'INTER' : pace === 'Iniciante' ? 'INIC' : pace}
                                        </span>
                                        
                                        {/* Micro-date range */}
                                        <span className={`text-[8px] font-mono mt-1 tracking-tighter ${pace === 'Off' ? 'text-slate-600' : 'text-white/60'}`}>
                                            {week.dateRange}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4 justify-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-cyan-600/50 border border-cyan-500"></div><span className="text-xs text-slate-400">Iniciante</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-600/50 border border-emerald-500"></div><span className="text-xs text-slate-400">Básico (Fundação)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-600/50 border border-blue-500"></div><span className="text-xs text-slate-400">Intermediário</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-purple-600/50 border border-purple-500"></div><span className="text-xs text-slate-400">Avançado (Elite)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-600/50 border border-amber-500"></div><span className="text-xs text-slate-400">Revisão Final</span></div>
            </div>
        </div>
    );
};

const CycleCalculator = ({ paceTarget }: { paceTarget: { hours: number, blocks: number } }) => {
    const { notebooks } = useStore();
    
    // --- STATE FOR CALCULATOR ---
    // Extract unique disciplines
    const disciplines = useMemo(() => {
        const unique = Array.from(new Set(notebooks.filter(n => n.discipline !== 'Revisão Geral').map(n => n.discipline))).sort();
        return unique;
    }, [notebooks]);

    const [weights, setWeights] = useState<Record<string, number>>({});
    const [selectedDiscs, setSelectedDiscs] = useState<Set<string>>(new Set());

    // Initialize state when disciplines change
    useEffect(() => {
        const initialWeights: Record<string, number> = {};
        const initialSelected = new Set<string>();
        
        disciplines.forEach(d => {
            initialWeights[d] = 1; // Default weight 1
            initialSelected.add(d); // All selected by default
        });
        
        setWeights(prev => ({...initialWeights, ...prev})); // Preserve user changes if possible
        if (selectedDiscs.size === 0) setSelectedDiscs(initialSelected);
    }, [disciplines]);

    const toggleDisc = (d: string) => {
        const newSet = new Set(selectedDiscs);
        if (newSet.has(d)) newSet.delete(d);
        else newSet.add(d);
        setSelectedDiscs(newSet);
    };

    const updateWeight = (d: string, w: number) => {
        setWeights(prev => ({ ...prev, [d]: Math.max(0.5, w) }));
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
        
        return disciplines.map(d => {
            if (!selectedDiscs.has(d)) return null;
            
            const weight = weights[d] || 1;
            const percentage = weight / totalWeight;
            const blocks = Math.round(percentage * paceTarget.blocks);
            // Count actual topics in DB for info
            const topicCount = notebooks.filter(n => n.discipline === d).length;

            return {
                name: d,
                weight,
                percentage,
                blocks,
                topicCount
            };
        }).filter(Boolean) as {name: string, weight: number, percentage: number, blocks: number, topicCount: number}[];
    }, [disciplines, selectedDiscs, weights, totalWeight, paceTarget.blocks, notebooks]);

    const totalAllocated = distribution.reduce((sum, item) => sum + item.blocks, 0);
    const diff = paceTarget.blocks - totalAllocated;

    // Info Stats
    const totalItems = notebooks.filter(n => n.discipline !== 'Revisão Geral').length;
    const weeksNeeded = paceTarget.blocks > 0 ? Math.ceil(totalItems / paceTarget.blocks) : 0;

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-500 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar">
            
            {/* Header / Summary */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-emerald-900/10 mx-auto border border-slate-700">
                    <Scale size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Planejamento de Ciclo</h2>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">
                    Defina os pesos estratégicos de cada disciplina. O algoritmo Atena distribuirá sua carga de <strong className="text-white">{paceTarget.blocks} blocos/semana</strong> para maximizar a cobertura.
                </p>
            </div>
            
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Estimativa</p>
                        <p className="text-2xl font-black text-white">{weeksNeeded} <span className="text-sm font-medium text-slate-500">Semanas</span></p>
                    </div>
                    <CalendarClock className="text-slate-700" size={24} />
                </div>
                 <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Carga Líquida</p>
                        <p className="text-2xl font-black text-emerald-400">~{paceTarget.hours}h <span className="text-sm font-medium text-slate-500">/ sem</span></p>
                    </div>
                    <Timer className="text-emerald-900" size={24} />
                </div>
                 <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Base de Dados</p>
                        <p className="text-2xl font-black text-blue-400">{totalItems} <span className="text-sm font-medium text-slate-500">Tópicos</span></p>
                    </div>
                    <Layers className="text-blue-900" size={24} />
                </div>
            </div>

            {/* Main Calculator Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2"><Scale size={18} className="text-emerald-500"/> Distribuição Ponderada</h3>
                    <div className="text-xs font-mono text-slate-500">
                        Alocado: <span className={diff !== 0 ? 'text-amber-400' : 'text-emerald-400'}>{totalAllocated}</span> / {paceTarget.blocks} blocos
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                <th className="p-4 w-12 text-center">
                                    <CheckSquare size={14} />
                                </th>
                                <th className="p-4">Disciplina</th>
                                <th className="p-4 text-center">Tópicos DB</th>
                                <th className="p-4 w-32 text-center">Peso Edital</th>
                                <th className="p-4 w-48">Blocos Sugeridos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {disciplines.map(d => {
                                const isSelected = selectedDiscs.has(d);
                                const dist = distribution.find(x => x.name === d);
                                const blocks = dist?.blocks || 0;
                                const percent = dist ? Math.round(dist.percentage * 100) : 0;

                                return (
                                    <tr key={d} className={`transition-colors ${isSelected ? 'hover:bg-slate-800/30' : 'bg-slate-950 opacity-50'}`}>
                                        <td className="p-4 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected} 
                                                onChange={() => toggleDisc(d)}
                                                className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4 accent-emerald-500"
                                            />
                                        </td>
                                        <td className="p-4 font-medium text-slate-200">
                                            {d}
                                        </td>
                                        <td className="p-4 text-center text-slate-500">
                                            {notebooks.filter(n => n.discipline === d).length}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center">
                                                <input 
                                                    type="number" 
                                                    step="0.5"
                                                    min="0.5"
                                                    value={weights[d] || 1}
                                                    disabled={!isSelected}
                                                    onChange={(e) => updateWeight(d, parseFloat(e.target.value))}
                                                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-center text-white font-bold focus:border-emerald-500 outline-none disabled:opacity-50 transition-all focus:bg-slate-700"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-emerald-500 transition-all duration-500" 
                                                        style={{ width: isSelected ? `${percent}%` : '0%' }}
                                                    ></div>
                                                </div>
                                                <div className="flex flex-col items-end w-12 flex-shrink-0">
                                                    <span className={`font-bold ${blocks > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{blocks}</span>
                                                    <span className="text-[9px] text-slate-500 uppercase">bl</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-950/80 border-t border-slate-800 font-bold text-white">
                                <td colSpan={3} className="p-4 text-right text-xs uppercase text-slate-500">Totais</td>
                                <td className="p-4 text-center text-amber-400">{totalWeight.toFixed(1)} pts</td>
                                <td className="p-4 flex justify-end items-center gap-2">
                                    <span className="text-lg">{totalAllocated}</span> 
                                    <span className="text-xs font-normal text-slate-500">/ {paceTarget.blocks} blocos</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            <div className="mt-6 p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl text-xs text-slate-400 flex items-start gap-3">
                <Settings2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <p>
                    <strong>Como usar:</strong> Esta ferramenta serve como guia para montar seu quadro horário. Anote a quantidade de blocos sugerida para cada disciplina e distribua-os manualmente na aba "Visão Tática" arrastando os cadernos para as semanas correspondentes.
                </p>
            </div>

        </div>
    );
};

export const Setup: React.FC = () => {
  const { notebooks, config, updateConfig, moveNotebookToWeek, addNotebook, editNotebook } = useStore();
  
  const [viewMode, setViewMode] = useState<'timeline' | 'calculator' | 'calendar'>('timeline');
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
    // Pre-process Edital Text for Smart Filter
    const editalRaw = config.editalText || "";
    const editalNormalized = normalizeText(editalRaw);
    const hasEdital = editalRaw.length > 10;

    return notebooks.filter(nb => {
        // 1. Base Search
        const matchesSearch = 
            nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            nb.discipline.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        // 2. Filter Logic
        if (libraryFilter === 'unallocated') {
            return !nb.weekId;
        }
        if (libraryFilter === 'fit') {
            return nb.weight === Weight.MUITO_ALTO || nb.weight === Weight.ALTO || nb.relevance === Relevance.ALTISSIMA;
        }
        if (libraryFilter === 'smart') {
            if (!hasEdital) return true; 
            
            const discNorm = normalizeText(nb.discipline);
            const nameNorm = normalizeText(nb.name);
            
            const discParts = discNorm.split(' ');
            const discMatch = discParts.some(part => part.length > 3 && editalNormalized.includes(part));
            
            return editalNormalized.includes(nameNorm) || editalNormalized.includes(discNorm) || discMatch;
        }
        
        return true;
    }).sort((a, b) => {
        if (libraryFilter === 'all') {
            if (!a.weekId && b.weekId) return -1;
            if (a.weekId && !b.weekId) return 1;
        }
        return a.discipline.localeCompare(b.discipline) || a.name.localeCompare(b.name);
    });
  }, [notebooks, searchTerm, libraryFilter, config.editalText, normalizeText]);

  const existingDisciplines = useMemo(() => {
    return Array.from(new Set(notebooks.map(n => n.discipline))).sort();
  }, [notebooks]);

  // --- DAYS REMAINING CALC ---
  const daysRemaining = useMemo(() => {
      if (!config.examDate) return null;
      const today = new Date();
      // Ensure we parse correctly without timezone shift for simple day diff
      const parts = config.examDate.split('-');
      const exam = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      
      const diffTime = exam.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [config.examDate]);

  // --- DYNAMIC WEEKS GENERATION ---
  const weeksCount = useMemo(() => {
      if (config.startDate && config.examDate) {
          const sParts = config.startDate.split('-');
          const start = new Date(parseInt(sParts[0]), parseInt(sParts[1])-1, parseInt(sParts[2]));
          
          const eParts = config.examDate.split('-');
          const end = new Date(parseInt(eParts[0]), parseInt(eParts[1])-1, parseInt(eParts[2]));
          
          const diffWeeks = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
          return Math.max(1, diffWeeks);
      }
      return config.weeksUntilExam || 12;
  }, [config.startDate, config.examDate, config.weeksUntilExam]);

  const getWeekDateRange = (weekIndex: number, startDateStr?: string) => {
    if (!startDateStr) return { label: '', isPast: false, fullDate: '' };
    
    // Robust parsing
    const sParts = startDateStr.split('-');
    const start = new Date(parseInt(sParts[0]), parseInt(sParts[1])-1, parseInt(sParts[2]));
    
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
  
  // --- UPDATED: Intelligent Drop Logic ---
  const onDrop = (e: React.DragEvent, targetWeekId: string | null, isPast: boolean) => {
    if (isPast) { alert("Você não pode alterar o planejamento de semanas que já passaram."); return; }
    
    const id = e.dataTransfer.getData("notebookId");
    const origin = e.dataTransfer.getData("origin");
    
    if (!id || !targetWeekId) return;

    const sourceNotebook = notebooks.find(n => n.id === id);
    if (!sourceNotebook) return;

    if (origin === 'library') {
        if (sourceNotebook.weekId) {
            // Clone if already allocated
            const { id: _, weekId: __, accuracy: ___, status: ____, lastPractice: _____, nextReview: ______, ...props } = sourceNotebook;
            addNotebook({
                ...props,
                weekId: targetWeekId,
                accuracy: 0,
                status: NotebookStatus.NOT_STARTED,
            });
        } else {
            // Move if unallocated
            moveNotebookToWeek(id, targetWeekId);
        }
    } else {
        // Move within timeline
        moveNotebookToWeek(id, targetWeekId);
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
  }, []);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        if (editingId) {
          // Await the promise to ensure data persistence before closing
          await editNotebook(editingId, { ...formData, accuracy: Number(formData.accuracy), targetAccuracy: Number(formData.targetAccuracy) });
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
      editNotebook(id, { isWeekCompleted: isCompleted });
  }, [editNotebook]);

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
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')} 
                        className="absolute right-3 top-2.5 text-slate-600 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                <span>Total: {libraryNotebooks.length}</span>
                <span className="text-emerald-500 flex items-center gap-1">Arraste <ArrowRight size={10} /></span>
            </div>
          </div>
          
          <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
            {libraryNotebooks.map(nb => <DraggableCard key={nb.id} notebook={nb} onDragStart={onDragStart} onEdit={handleEditClick} origin="library" />)}
            
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
                        <span className="text-xs text-white font-medium">{config.examDate ? new Date(config.examDate + 'T00:00:00').toLocaleDateString() : '--/--/----'}</span>
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
                    <button onClick={() => setViewMode('calendar')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><CalendarDays size={16} /> Calendário</button>
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

         {viewMode === 'timeline' && (
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
                                {weekNotebooks.map(nb => <DraggableCard key={nb.id} notebook={nb} onDragStart={onDragStart} onEdit={handleEditClick} onToggleComplete={handleToggleComplete} isCompact origin="week" disabled={week.isPast} />)}
                                {weekNotebooks.length === 0 && !week.isPast && <div className="h-full flex flex-col items-center justify-center text-slate-700 text-xs italic opacity-50 border-2 border-dashed border-slate-800 rounded-xl m-2 bg-slate-950/50 min-h-[100px]">Arraste matérias aqui</div>}
                            </div>
                            </div>
                        );
                        })}
                    </div>
                 </div>
             </div>
         )}
         
         {viewMode === 'calculator' && <CycleCalculator paceTarget={paceTarget} />}
         {viewMode === 'calendar' && <MacroCalendar />}
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
              {/* Form Content same as before, no changes needed inside form */}
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
