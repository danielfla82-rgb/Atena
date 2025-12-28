
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Notebook, Weight, Relevance, Trend, NotebookStatus, PaceType, WeeklyStatus } from '../types';
import { Plus, Search, Copy, Pencil, X, Link as LinkIcon, BarChart3, Calendar, Lock, ChevronDown, Layout, FileCode, CheckSquare, Check, Timer, Calculator, AlertCircle, ArrowRight, Settings2, GanttChartSquare, ZoomIn, Trash2, CalendarClock, Flag, ChevronLeft, ChevronRight, Inbox, Layers, Star, ScanSearch, Scale, Loader2, CalendarDays, Sun, Save, Hand, MoveLeft, Sparkles, TrendingUp, ToggleLeft, ToggleRight, Bookmark, AlertTriangle, ChevronsLeft, ChevronsRight, RefreshCw, MoreHorizontal, Circle, CheckCircle2, XCircle } from 'lucide-react';
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

// --- STATUS CYCLE BUTTON COMPONENT ---
const StatusCycleButton = ({ status, onClick }: { status: WeeklyStatus | undefined, onClick: (s: WeeklyStatus) => void }) => {
    const nextStatus: Record<string, WeeklyStatus> = {
        'pending': 'started',
        'started': 'completed',
        'completed': 'skipped',
        'skipped': 'pending'
    };

    const current = status || 'pending';

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(nextStatus[current]);
    };

    const visuals = {
        pending: { icon: <Circle size={14} className="text-slate-600" />, label: 'Pendente', class: 'text-slate-500 hover:text-slate-300' },
        started: { icon: <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin duration-[3000ms]"></div>, label: 'Em Andamento', class: 'text-amber-400' },
        completed: { icon: <CheckCircle2 size={14} className="text-emerald-500 fill-emerald-500/20" />, label: 'Concluído', class: 'text-emerald-400 font-bold' },
        skipped: { icon: <XCircle size={14} className="text-red-500" />, label: 'Pulei', class: 'text-red-400 opacity-70' }
    };

    const v = visuals[current];

    return (
        <button 
            onClick={handleClick}
            className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800 transition-all ${v.class}`}
            title="Clique para alternar status"
        >
            {v.icon}
            <span className="text-[10px] uppercase tracking-wider">{v.label}</span>
        </button>
    );
};

// MEMOIZED COMPONENT TO PREVENT RE-RENDERS ON DRAG/SEARCH
const DraggableCard = React.memo(({ 
    notebook, 
    onDragStart, 
    onEdit, 
    origin, 
    isCompact, 
    disabled, 
    onStatusChange,
    onInitMove,
    onRemoveFromWeek,
    isMoving
}: {
    notebook: Notebook;
    onDragStart: (e: React.DragEvent, id: string, origin: 'library' | 'week') => void;
    onEdit: (notebook: Notebook) => void;
    origin: 'library' | 'week';
    isCompact?: boolean;
    disabled?: boolean;
    onStatusChange?: (id: string, status: WeeklyStatus) => void;
    onInitMove: (id: string, origin: 'library' | 'week') => void;
    onRemoveFromWeek?: (id: string) => void;
    isMoving: boolean;
}) => {
    const statusColor = getStatusColor(notebook.accuracy, notebook.targetAccuracy);
    const isScheduled = !!notebook.weekId;
    const isCompleted = notebook.weeklyStatus === 'completed';
    const isSkipped = notebook.weeklyStatus === 'skipped';

    return (
        <div 
            draggable={!disabled}
            onDragStart={(e) => onDragStart(e, notebook.id, origin)}
            className={`
                group relative bg-slate-800 border rounded-lg p-3 transition-all shadow-sm
                ${disabled ? 'opacity-50 pointer-events-none border-slate-700' : 'cursor-grab active:cursor-grabbing'}
                ${isCompact ? 'text-xs' : 'text-sm'}
                ${isCompleted && origin === 'week' ? 'opacity-60 bg-slate-900 border-slate-800' : ''}
                ${isSkipped && origin === 'week' ? 'opacity-40 grayscale border-red-900/30' : ''}
                ${isMoving 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-900/10' 
                    : 'border-slate-700 hover:border-emerald-500/50'}
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
                        <h4 className={`font-bold truncate leading-tight ${isCompleted && origin === 'week' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {notebook.discipline}
                        </h4>
                        {origin === 'library' && isScheduled && <span className="text-[8px] bg-blue-900/30 text-blue-400 border border-blue-500/30 px-1 rounded">Alocado</span>}
                    </div>
                    <p className={`truncate mb-1 leading-tight ${isCompleted && origin === 'week' ? 'text-slate-600' : 'text-slate-400'}`} title={notebook.name}>{notebook.name}</p>
                    {notebook.subtitle && <p className="text-slate-500 text-[10px] truncate">{notebook.subtitle}</p>}
                </div>
                
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                     <span className={`font-mono font-bold text-xs ${notebook.accuracy < 60 ? 'text-red-400' : 'text-emerald-400'}`}>
                         {notebook.accuracy}%
                     </span>
                     <div className="flex gap-1">
                        {/* Remove Option for Week View */}
                        {origin === 'week' && onRemoveFromWeek && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemoveFromWeek(notebook.id); }}
                                className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors"
                                title="Remover do Planejamento"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                        {/* TOUCH MOVE TRIGGER */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onInitMove(notebook.id, origin); }}
                            className={`p-1 rounded transition-colors ${isMoving ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-700'}`}
                            title="Mover (Toque)"
                        >
                            <Hand size={12} />
                        </button>
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

            {origin === 'week' && onStatusChange && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center">
                    <StatusCycleButton 
                        status={notebook.weeklyStatus} 
                        onClick={(s) => onStatusChange(notebook.id, s)} 
                    />
                </div>
            )}
        </div>
    );
});

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

    const checkHoliday = (monthIndex: number, dayStart: number, dayEnd: number) => {
        return BRAZIL_HOLIDAYS.find(h => h.m === monthIndex && h.d >= dayStart && h.d <= dayEnd);
    };

    const checkExamDate = (examDateStr: string | undefined, currentYear: number, monthIndex: number, dayStart: number, dayEnd: number) => {
        if (!examDateStr) return false;
        const parts = examDateStr.split('-');
        if (parts.length !== 3) return false;
        
        const eYear = parseInt(parts[0]);
        const eMonth = parseInt(parts[1]) - 1;
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
                    <p className="text-slate-400 text-sm">Defina o ritmo estratégico anual.</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button onClick={() => setYear(year - 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"><ChevronLeft size={16} /></button>
                    <span className="text-lg font-bold text-white min-w-[60px] text-center">{year}</span>
                    <button onClick={() => setYear(year + 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"><ChevronRight size={16} /></button>
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
                                        {week.hasExam && (
                                            <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 z-20 shadow-md border border-slate-900 animate-pulse">
                                                <Flag size={12} fill="currentColor" />
                                            </div>
                                        )}
                                        {week.holiday && !week.hasExam && (
                                            <div className="absolute top-1 right-1 text-yellow-400 z-10" title={`Feriado: ${week.holiday.name}`}>
                                                <Sun size={10} fill="currentColor" />
                                            </div>
                                        )}
                                        <span className="text-xs font-bold mb-0.5">{week.label}</span>
                                        <span className="text-[8px] uppercase font-bold opacity-80 truncate w-full text-center px-0.5 leading-tight">
                                            {pace === 'Intermediario' ? 'INTER' : pace === 'Iniciante' ? 'INIC' : pace}
                                        </span>
                                        <span className={`text-[8px] font-mono mt-1 tracking-tighter ${pace === 'Off' ? 'text-slate-600' : 'text-white/60'}`}>{week.dateRange}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CycleCalculator = ({ paceTarget }: { paceTarget: { hours: number, blocks: number } }) => {
    const { notebooks } = useStore();
    
    const disciplines = useMemo(() => {
        const unique = Array.from(new Set(notebooks.filter(n => n.discipline !== 'Revisão Geral').map(n => n.discipline))).sort();
        return unique;
    }, [notebooks]);

    const [weights, setWeights] = useState<Record<string, number>>({});
    const [selectedDiscs, setSelectedDiscs] = useState<Set<string>>(new Set());

    useEffect(() => {
        const initialWeights: Record<string, number> = {};
        const initialSelected = new Set<string>();
        disciplines.forEach(d => {
            initialWeights[d] = 1;
            initialSelected.add(d);
        });
        setWeights(prev => ({...initialWeights, ...prev}));
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

    const totalWeight = useMemo(() => {
        let sum = 0;
        selectedDiscs.forEach(d => { sum += (weights[d] || 1); });
        return sum;
    }, [selectedDiscs, weights]);

    const distribution = useMemo(() => {
        if (totalWeight === 0) return [];
        return disciplines.map(d => {
            if (!selectedDiscs.has(d)) return null;
            const weight = weights[d] || 1;
            const percentage = weight / totalWeight;
            const blocks = Math.round(percentage * paceTarget.blocks);
            const topicCount = notebooks.filter(n => n.discipline === d).length;
            return { name: d, weight, percentage, blocks, topicCount };
        }).filter(Boolean) as {name: string, weight: number, percentage: number, blocks: number, topicCount: number}[];
    }, [disciplines, selectedDiscs, weights, totalWeight, paceTarget.blocks, notebooks]);

    const totalAllocated = distribution.reduce((sum, item) => sum + item.blocks, 0);
    const diff = paceTarget.blocks - totalAllocated;
    const totalItems = notebooks.filter(n => n.discipline !== 'Revisão Geral').length;
    const weeksNeeded = paceTarget.blocks > 0 ? Math.ceil(totalItems / paceTarget.blocks) : 0;

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-500 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-emerald-900/10 mx-auto border border-slate-700">
                    <Scale size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Planejamento de Ciclo</h2>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Defina o peso estratégico de cada disciplina.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Estimativa</p><p className="text-2xl font-black text-white">{weeksNeeded} <span className="text-sm font-medium text-slate-500">Semanas</span></p></div><CalendarClock className="text-slate-700" size={24} />
                </div>
                 <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Carga Líquida</p><p className="text-2xl font-black text-emerald-400">~{paceTarget.hours}h <span className="text-sm font-medium text-slate-500">/ sem</span></p></div><Timer className="text-emerald-900" size={24} />
                </div>
                 <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Base de Dados</p><p className="text-2xl font-black text-blue-400">{totalItems} <span className="text-sm font-medium text-slate-500">Tópicos</span></p></div><Layers className="text-blue-900" size={24} />
                </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2"><Scale size={18} className="text-emerald-500"/> Distribuição Ponderada</h3>
                    <div className="text-xs font-mono text-slate-500">Alocado: <span className={diff !== 0 ? 'text-amber-400' : 'text-emerald-400'}>{totalAllocated}</span> / {paceTarget.blocks} blocos</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                <th className="p-4 w-12 text-center"><CheckSquare size={14} /></th>
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
                                        <td className="p-4 text-center"><input type="checkbox" checked={isSelected} onChange={() => toggleDisc(d)} className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4 accent-emerald-500" /></td>
                                        <td className="p-4 font-medium text-slate-200">{d}</td>
                                        <td className="p-4 text-center text-slate-500">{notebooks.filter(n => n.discipline === d).length}</td>
                                        <td className="p-4"><div className="flex items-center justify-center"><input type="number" step="0.5" min="0.5" value={weights[d] || 1} disabled={!isSelected} onChange={(e) => updateWeight(d, parseFloat(e.target.value))} className="w-16 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-center text-white font-bold focus:border-emerald-500 outline-none disabled:opacity-50 transition-all focus:bg-slate-700" /></div></td>
                                        <td className="p-4"><div className="flex items-center gap-3"><div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: isSelected ? `${percent}%` : '0%' }}></div></div><div className="flex flex-col items-end w-12 flex-shrink-0"><span className={`font-bold ${blocks > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{blocks}</span><span className="text-[9px] text-slate-500 uppercase">bl</span></div></div></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const Setup: React.FC = () => {
  const { notebooks, config, updateConfig, moveNotebookToWeek, addNotebook, editNotebook, redistributeOverdue } = useStore();
  
  const [viewMode, setViewMode] = useState<'timeline' | 'calculator' | 'calendar'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  
  // UX States
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'unallocated' | 'fit' | 'smart'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Drag & Move State
  const [movingNotebookId, setMovingNotebookId] = useState<string | null>(null);
  const [movingOrigin, setMovingOrigin] = useState<'library' | 'week' | null>(null);

  // Save loading state
  const [isSaving, setIsSaving] = useState(false);
  
  // Gallery State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const initialFormState = {
    discipline: '', name: '', subtitle: '', tecLink: '', errorNotebookLink: '', obsidianLink: '', accuracy: 0, targetAccuracy: 90, 
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, 
    status: NotebookStatus.NOT_STARTED, notes: '', images: [] as string[],
    lastPractice: new Date().toISOString().split('T')[0],
    nextReview: '', // Date Override
    notStudiedToggle: true // New Toggle State
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const [isSuggested, setIsSuggested] = useState(false); // AI Suggested Indicator
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

  // --- HELPER: Text Normalizer ---
  const normalizeText = useCallback((text: string) => {
      return text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[\n\r]/g, " ")
          .replace(/\s+/g, " ")
          .replace(/[^a-z0-9\s]/g, "");
  }, []);

  // --- UPDATED: Library Logic with Filters ---
  const libraryNotebooks = useMemo(() => {
    const editalRaw = config.editalText || "";
    const editalNormalized = normalizeText(editalRaw);
    const hasEdital = editalRaw.length > 10;

    return notebooks.filter(nb => {
        const matchesSearch = 
            nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            nb.discipline.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

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

  // Suggest subtopics based on selected discipline
  const suggestedSubtopics = useMemo(() => {
      if (!formData.discipline) return [];
      return Array.from(new Set(notebooks
          .filter(n => n.discipline === formData.discipline && n.subtitle)
          .map(n => n.subtitle)
      )).sort();
  }, [formData.discipline, notebooks]);

  const daysRemaining = useMemo(() => {
      if (!config.examDate) return null;
      const today = new Date();
      const parts = config.examDate.split('-');
      const exam = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      const diffTime = exam.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [config.examDate]);

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

  // --- HANDLERS ---
  const onDragStart = useCallback((e: React.DragEvent, id: string, origin: 'library' | 'week') => {
    e.dataTransfer.setData("notebookId", id);
    e.dataTransfer.setData("origin", origin);
    if (origin === 'library') {
        e.dataTransfer.effectAllowed = 'copy';
    } else {
        e.dataTransfer.effectAllowed = 'move';
    }
  }, []); 

  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  
  const handleMoveOrDrop = (id: string, origin: string, targetWeekId: string) => {
    const sourceNotebook = notebooks.find(n => n.id === id);
    if (!sourceNotebook) return;

    if (origin === 'library') {
        if (sourceNotebook.weekId) {
            // Se já existe, clona para a nova semana (útil para revisão espaçada manual)
            const { id: _, weekId: __, accuracy: ___, status: ____, lastPractice: _____, nextReview: ______, ...props } = sourceNotebook;
            addNotebook({
                ...props,
                weekId: targetWeekId,
                accuracy: 0,
                status: NotebookStatus.NOT_STARTED,
                weeklyStatus: 'pending' // Reset status on clone
            });
        } else {
            // Move se não estava alocado
            editNotebook(id, { weekId: targetWeekId, weeklyStatus: 'pending' });
        }
    } else {
        // Move entre semanas
        editNotebook(id, { weekId: targetWeekId });
    }
  };

  // --- FEATURE: DELETE PLANNING (Unallocate) ---
  const handleRemoveFromWeek = (id: string) => {
      // Remove da semana e retorna para biblioteca como pendente
      editNotebook(id, { weekId: null, weeklyStatus: 'pending' });
  };

  const onDrop = (e: React.DragEvent, targetWeekId: string | null, isPast: boolean) => {
    if (isPast) { alert("Você não pode alterar o planejamento de semanas que já passaram."); return; }
    const id = e.dataTransfer.getData("notebookId");
    const origin = e.dataTransfer.getData("origin");
    if (!id || !targetWeekId) return;
    handleMoveOrDrop(id, origin, targetWeekId);
  };

  const handleSelectForMove = useCallback((id: string, origin: 'library' | 'week') => {
      setMovingNotebookId(id);
      setMovingOrigin(origin);
  }, []);

  const handleClickDrop = (targetWeekId: string, isPast: boolean) => {
      if (isPast) { alert("Semanas passadas estão bloqueadas."); return; }
      if (!movingNotebookId || !movingOrigin) return;
      handleMoveOrDrop(movingNotebookId, movingOrigin, targetWeekId);
      setMovingNotebookId(null);
      setMovingOrigin(null);
  };

  const handleCancelMove = () => {
      setMovingNotebookId(null);
      setMovingOrigin(null);
  };

  const handleEditClick = useCallback((notebook: Notebook) => {
    setEditingId(notebook.id);
    let currentImages = notebook.images || [];
    if (currentImages.length === 0 && notebook.image) currentImages = [notebook.image];
    
    // Determine toggle state
    const hasStudied = notebook.status !== NotebookStatus.NOT_STARTED && notebook.accuracy > 0;

    setFormData({
      discipline: notebook.discipline,
      name: notebook.name,
      subtitle: notebook.subtitle,
      tecLink: notebook.tecLink || '',
      errorNotebookLink: notebook.errorNotebookLink || '',
      obsidianLink: notebook.obsidianLink || '',
      accuracy: notebook.accuracy,
      targetAccuracy: notebook.targetAccuracy,
      weight: notebook.weight,
      relevance: notebook.relevance,
      trend: notebook.trend,
      notes: notebook.notes || '',
      images: currentImages,
      lastPractice: notebook.lastPractice ? notebook.lastPractice.split('T')[0] : new Date().toISOString().split('T')[0],
      nextReview: notebook.nextReview ? notebook.nextReview.split('T')[0] : '',
      status: notebook.status,
      notStudiedToggle: !hasStudied
    });
    setIsSuggested(false);
    setIsModalOpen(true);
  }, []);

  const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  
  // Predictive Fill Logic
  useEffect(() => {
      if (!config.structuredEdital || formData.notStudiedToggle) return; // Skip if no AI data or not pertinent
      
      const topicName = normalizeText(formData.name);
      if (topicName.length < 3) return;

      let found = false;
      for (const d of config.structuredEdital) {
          if (formData.discipline && normalizeText(d.name) !== normalizeText(formData.discipline)) continue;
          
          for (const t of d.topics) {
              if (normalizeText(t.name).includes(topicName)) {
                  // Found match!
                  const newWeight = t.probability === 'Alta' ? Weight.ALTO : t.probability === 'Média' ? Weight.MEDIO : Weight.BAIXO;
                  const newTrend = t.probability === 'Alta' ? Trend.ALTA : t.probability === 'Média' ? Trend.ESTAVEL : Trend.BAIXA;
                  
                  if (formData.weight !== newWeight || formData.trend !== newTrend) {
                      setFormData(prev => ({ ...prev, weight: newWeight, trend: newTrend }));
                      setIsSuggested(true);
                  }
                  found = true;
                  break;
              }
          }
          if(found) break;
      }
      if (!found) setIsSuggested(false);
  }, [formData.name, formData.discipline, config.structuredEdital]);

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

  const handleToggleStudied = (e: React.ChangeEvent<HTMLInputElement>) => {
     const isNotStudied = e.target.checked;
     setFormData(prev => ({ 
         ...prev, 
         notStudiedToggle: isNotStudied,
         accuracy: isNotStudied ? 0 : prev.accuracy,
         status: isNotStudied ? NotebookStatus.NOT_STARTED : prev.status === NotebookStatus.NOT_STARTED ? NotebookStatus.THEORY_DONE : prev.status
     }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        let nextReviewIso = undefined;
        // If Override Date is set, use it. Else calculate.
        if (formData.nextReview) {
            nextReviewIso = new Date(formData.nextReview).toISOString();
        } else {
            const calculated = calculateNextReview(Number(formData.accuracy), formData.relevance, formData.trend, config.algorithm);
            nextReviewIso = calculated.toISOString();
        }

        const payload: any = { 
            ...formData, 
            accuracy: Number(formData.accuracy), 
            targetAccuracy: Number(formData.targetAccuracy),
            status: formData.notStudiedToggle ? NotebookStatus.NOT_STARTED : (formData.status === NotebookStatus.NOT_STARTED ? NotebookStatus.THEORY_DONE : formData.status),
            nextReview: nextReviewIso
        };

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

  const handleStatusChange = useCallback((id: string, status: WeeklyStatus) => {
      editNotebook(id, { weeklyStatus: status });
  }, [editNotebook]);

  // Gap Calculation
  const gap = formData.accuracy - formData.targetAccuracy;

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
      <aside 
        className={`flex-shrink-0 border-r border-slate-800 bg-slate-900/30 flex flex-col z-20 transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden opacity-0'}`}
      >
          <div className="p-4 border-b border-slate-800 space-y-3 min-w-[288px]">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider"><Layout size={14} className="text-emerald-500" /> Banco de Disciplinas</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white p-1"><ChevronsLeft size={16} /></button>
            </div>
            
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
                <button onClick={() => setLibraryFilter('all')} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${libraryFilter === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`} title="Tudo"><Layers size={12} /></button>
                <button onClick={() => setLibraryFilter('unallocated')} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${libraryFilter === 'unallocated' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-emerald-400'}`} title="Pendentes"><Inbox size={12} /></button>
                <button onClick={() => setLibraryFilter('fit')} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${libraryFilter === 'fit' ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-amber-400'}`} title="Prioridade"><Star size={12} /></button>
                <button onClick={() => setLibraryFilter('smart')} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${libraryFilter === 'smart' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:text-cyan-400'}`} title="Smart"><ScanSearch size={12} /></button>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-emerald-500 outline-none" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-600 hover:text-white"><X size={14} /></button>}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                <span>Total: {libraryNotebooks.length}</span>
                <span className="text-emerald-500 flex items-center gap-1">Arraste <ArrowRight size={10} /></span>
            </div>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar min-w-[288px]">
            {libraryNotebooks.map(nb => (
                <DraggableCard key={nb.id} notebook={nb} onDragStart={onDragStart} onEdit={handleEditClick} origin="library" onInitMove={handleSelectForMove} isMoving={movingNotebookId === nb.id}/>
            ))}
            {libraryNotebooks.length === 0 && <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2 opacity-50 px-4 text-center"><Settings2 size={24} /><span className="text-xs">Nenhum caderno encontrado.</span></div>}
          </div>
      </aside>
      )}

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
         <header className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30 shadow-lg">
            {!isSidebarOpen && viewMode === 'timeline' && (
                <button onClick={() => setIsSidebarOpen(true)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white border border-slate-700 hover:border-emerald-500 transition-colors shadow-lg z-50">
                    <ChevronsRight size={20} />
                </button>
            )}
            
            {movingNotebookId && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-emerald-600 text-white px-6 py-2 rounded-full shadow-xl flex items-center gap-4 animate-bounce">
                    <span className="text-sm font-bold flex items-center gap-2"><MoveLeft size={16} /> Toque na semana de destino</span>
                    <button onClick={handleCancelMove} className="bg-emerald-700 hover:bg-emerald-800 p-1 rounded-full"><X size={14}/></button>
                </div>
            )}
            <div className={`flex items-center gap-6 w-full lg:w-auto lg:flex-1 ${!isSidebarOpen ? 'pl-10' : ''}`}>
                 <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Início</span><div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5"><Calendar size={14} className="text-emerald-500" /><input type="date" value={config.startDate || ''} onChange={(e) => updateConfig({...config, startDate: e.target.value})} className="bg-transparent outline-none text-xs text-white cursor-pointer font-medium" /></div></div>
                 <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Data da Prova</span><div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5"><CalendarClock size={14} className="text-red-500" /><span className="text-xs text-white font-medium">{config.examDate ? new Date(config.examDate + 'T00:00:00').toLocaleDateString() : '--/--/----'}</span></div></div>
                 {daysRemaining !== null && (<div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Restam</span><div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${daysRemaining < 30 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800 text-white border-slate-700'}`}>{daysRemaining} dias</div></div>)}
            </div>
            <div className="w-full lg:w-auto flex justify-center order-3 lg:order-2">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-xl">
                    <button onClick={() => setViewMode('timeline')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'timeline' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><GanttChartSquare size={16} /> Visão Tática</button>
                    <button onClick={() => setViewMode('calculator')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'calculator' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Calculator size={16} /> Planejamento</button>
                    <button onClick={() => setViewMode('calendar')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><CalendarDays size={16} /> Calendário</button>
                </div>
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto lg:flex-1 justify-between lg:justify-end order-2 lg:order-3">
                 <button 
                    onClick={redistributeOverdue} 
                    className="flex items-center gap-2 bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                    title="Mover tarefas atrasadas para frente"
                 >
                     <RefreshCw size={14} /> Redistribuir Atrasos
                 </button>
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
                        const isDropTarget = movingNotebookId !== null && !week.isPast;

                        // Ghost Slots for "Tetris" Physics
                        const ghostSlots = Array.from({ length: Math.max(0, paceTarget.blocks - blocksCount) });

                        return (
                            <div 
                                key={week.id} 
                                onClick={() => isDropTarget && handleClickDrop(week.id, week.isPast)}
                                className={`
                                    w-80 flex-shrink-0 flex flex-col rounded-2xl border transition-all duration-300 relative h-full max-h-full
                                    ${week.isPast ? 'bg-slate-900/30 border-slate-800/50 opacity-70' : 'bg-slate-900 border-slate-800 shadow-2xl hover:border-slate-700'}
                                    ${isDropTarget ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950 cursor-pointer animate-pulse bg-emerald-900/10 border-emerald-500/50' : ''}
                                    ${isOverloaded ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-[shake_0.5s_ease-in-out]' : ''}
                                `} 
                                onDragOver={week.isPast ? undefined : onDragOver} 
                                onDrop={(e) => onDrop(e, week.id, week.isPast)}
                            >
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
                                {weekNotebooks.map(nb => (
                                    <DraggableCard 
                                        key={nb.id} 
                                        notebook={nb} 
                                        onDragStart={onDragStart} 
                                        onEdit={handleEditClick} 
                                        onStatusChange={handleStatusChange} 
                                        onRemoveFromWeek={handleRemoveFromWeek}
                                        isCompact 
                                        origin="week" 
                                        disabled={week.isPast}
                                        onInitMove={handleSelectForMove}
                                        isMoving={movingNotebookId === nb.id}
                                    />
                                ))}
                                {/* GHOST SLOTS - "TETRIS PHYSICS" */}
                                {!week.isPast && ghostSlots.map((_, i) => (
                                    <div key={`ghost-${i}`} className="border-2 border-dashed border-slate-800 rounded-lg p-3 min-h-[60px] flex items-center justify-center opacity-30 pointer-events-none">
                                        <span className="text-[10px] text-slate-600 font-bold uppercase">Slot Livre</span>
                                    </div>
                                ))}
                                {weekNotebooks.length === 0 && !week.isPast && ghostSlots.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-700 text-xs italic opacity-50 border-2 border-dashed border-slate-800 rounded-xl m-2 bg-slate-950/50 min-h-[100px]">{isDropTarget ? "Toque aqui para mover" : "Arraste matérias aqui"}</div>}
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

       {/* === EDIT MODAL (REMASTERED) === */}
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
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Disciplina</label>
                        <input required list="disciplines" value={formData.discipline} onChange={e => handleChange('discipline', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors" />
                        <datalist id="disciplines">{existingDisciplines.map(d => <option key={d} value={d} />)}</datalist>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nome do Tópico</label>
                        <input required value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Subtópico / Foco</label>
                        <input list="subtopics" value={formData.subtitle} onChange={e => handleChange('subtitle', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors" />
                        <datalist id="subtopics">{suggestedSubtopics.map(s => <option key={s} value={s} />)}</datalist>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Caderno de Erros (TEC)</label>
                        <div className="relative">
                            <AlertTriangle className="absolute left-3 top-3.5 text-red-500/50" size={16} />
                            <input type="url" value={formData.errorNotebookLink} onChange={e => handleChange('errorNotebookLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-red-500/50 transition-colors placeholder-slate-600" placeholder="https://..." />
                        </div>
                    </div>
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2">
                      <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">2. Estratégia & Performance</h4>
                      {isSuggested && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 flex items-center gap-1 animate-pulse">
                              <Sparkles size={10} /> Sugerido por IA
                          </span>
                      )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className={isSuggested ? 'relative' : ''}>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Peso</label>
                          <select value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} className={`w-full bg-slate-800 border rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm appearance-none ${isSuggested ? 'border-indigo-500/50' : 'border-slate-700'}`}>{Object.values(Weight).map(w => <option key={w} value={w}>{w}</option>)}</select>
                      </div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Relevância</label><select value={formData.relevance} onChange={(e) => handleChange('relevance', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Relevance).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                      <div className={isSuggested ? 'relative' : ''}>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Tendência</label>
                          <select value={formData.trend} onChange={(e) => handleChange('trend', e.target.value)} className={`w-full bg-slate-800 border rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm appearance-none ${isSuggested ? 'border-indigo-500/50' : 'border-slate-700'}`}>{Object.values(Trend).map(t => <option key={t} value={t}>{t}</option>)}</select>
                      </div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Meta (%)</label><input type="number" min="0" max="100" value={formData.targetAccuracy} onChange={e => handleChange('targetAccuracy', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm text-center font-bold" /></div>
                  </div>
                  
                  {/* GAP ANALYSIS SECTION */}
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 w-full">
                         <div className="flex justify-between items-end mb-1">
                             <label className="block text-[10px] font-bold text-emerald-400 uppercase">Taxa de Acerto Atual (%)</label>
                             {!formData.notStudiedToggle && (
                                 <span className={`text-xs font-bold ${gap < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                     Gap: {gap > 0 ? '+' : ''}{gap}%
                                 </span>
                             )}
                         </div>
                         <div className="relative">
                             <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                value={formData.accuracy} 
                                onChange={e => handleChange('accuracy', e.target.value)} 
                                disabled={formData.notStudiedToggle}
                                className={`w-full bg-slate-900 border rounded-lg p-2 text-white font-mono text-center font-bold text-lg outline-none transition-all
                                    ${formData.notStudiedToggle ? 'opacity-30 border-slate-800' : 'focus:border-emerald-500 border-slate-600'}
                                `} 
                             />
                             {/* Delta Visualizer */}
                             {!formData.notStudiedToggle && (
                                 <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                     {gap < 0 ? <TrendingUp className="text-red-500 rotate-180" size={16}/> : <TrendingUp className="text-emerald-500" size={16}/>}
                                 </div>
                             )}
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-700">
                         <span className="text-xs font-bold text-slate-400 uppercase">Não Estudei</span>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={formData.notStudiedToggle} onChange={handleToggleStudied} />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                         </label>
                      </div>
                  </div>

                  {/* Override Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Link do Caderno (Questões)</label>
                          <div className="relative"><LinkIcon className="absolute left-3 top-2.5 text-slate-500" size={14} /><input type="url" value={formData.tecLink} onChange={e => handleChange('tecLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 pl-9 text-sm text-white outline-none focus:border-emerald-500" /></div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-amber-500 mb-1 uppercase flex items-center gap-1"><CalendarClock size={12}/> Forçar Próxima Revisão (Override)</label>
                          <input type="date" value={formData.nextReview} onChange={e => handleChange('nextReview', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:border-amber-500" />
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
