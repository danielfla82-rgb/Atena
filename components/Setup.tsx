
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Notebook, Weight, Relevance, Trend, NotebookStatus, Allocation } from '../types';
import { Plus, Search, Pencil, X, Save, Link as LinkIcon, BarChart3, Calendar, Lock, ChevronDown, Layout, Check, Timer, Calculator, AlertCircle, ArrowRight, Settings2, GanttChartSquare, ZoomIn, Trash2, CalendarClock, Flag, ChevronLeft, ChevronRight, Scale, Loader2, TrendingUp, History, Minus, CheckCircle2, Archive } from 'lucide-react';
import { getStatusColor } from '../utils/algorithm';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';

const PACE_SETTINGS: Record<string, { hours: number, blocks: number }> = {
    'Iniciante': { hours: 10, blocks: 15 },
    'Básico': { hours: 20, blocks: 30 },
    'Intermediário': { hours: 30, blocks: 45 },
    'Avançado': { hours: 44, blocks: 66 }
};

// --- DRAGGABLE CARD COMPONENT ---
const DraggableCard = React.memo(({ 
    notebook, 
    instanceId,
    onDragStart, 
    onEdit, 
    onDelete,
    origin, 
    isCompact, 
    disabled, 
    completed,
    onToggleComplete,
    onRemoveFromWeek
}: {
    notebook: Notebook;
    instanceId?: string; // Only for week items
    onDragStart: (e: React.DragEvent, id: string, origin: 'library' | 'week') => void;
    onEdit: (notebook: Notebook) => void;
    onDelete?: (id: string) => void; // Delete from DB (Library only)
    origin: 'library' | 'week';
    isCompact?: boolean;
    disabled?: boolean;
    completed?: boolean;
    onToggleComplete?: (instanceId: string, isCompleted: boolean) => void;
    onRemoveFromWeek?: (instanceId: string) => void;
}) => {
    const statusColor = getStatusColor(notebook.accuracy, notebook.targetAccuracy);
    const isLibrary = origin === 'library';
    const isWeek = origin === 'week';

    return (
        <div 
            draggable={!disabled}
            onDragStart={(e) => onDragStart(e, isWeek ? instanceId! : notebook.id, origin)}
            className={`
                group relative bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-emerald-500/50 transition-all shadow-sm
                ${disabled ? 'opacity-50 pointer-events-none' : ''}
                ${isCompact ? 'text-xs' : 'text-sm'}
                ${completed && isWeek ? 'bg-slate-900 border-slate-800 opacity-60' : ''}
            `}
        >
            {isLibrary && (
                <div className={`absolute right-0 top-0 p-1 rounded-bl text-[9px] uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-l border-b z-10 flex items-center gap-1 bg-slate-900/80 border-slate-700 text-emerald-500`}>
                    <Calendar size={10}/> + Agendar
                </div>
            )}

            {/* REMOVE FROM WEEK BUTTON */}
            {isWeek && onRemoveFromWeek && !disabled && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveFromWeek(instanceId!); }} 
                    className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-slate-900 text-slate-500 hover:text-white hover:bg-amber-600 border border-slate-700 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-50 cursor-pointer"
                    title="Remover desta semana"
                >
                    <Minus size={12} />
                </button>
            )}

            {/* DELETE FROM DB BUTTON (Library Only) */}
            {isLibrary && onDelete && (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if(confirm('Tem certeza? Isso apagará o caderno e todo o histórico permanentemente.')) onDelete(notebook.id); 
                    }} 
                    className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-slate-900 text-slate-600 hover:text-white hover:bg-red-600 border border-slate-700 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-50 cursor-pointer"
                    title="Excluir Definitivamente"
                >
                    <Trash2 size={12} />
                </button>
            )}

            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                         <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                        <h4 className={`font-bold truncate leading-tight ${completed && isWeek ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                            {notebook.discipline}
                        </h4>
                    </div>
                    <p className={`truncate mb-1 leading-tight ${completed && isWeek ? 'text-slate-600' : 'text-slate-400'}`} title={notebook.name}>{notebook.name}</p>
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

            {isWeek && onToggleComplete && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer group/check w-full">
                        <div className={`
                            w-full py-1.5 px-3 rounded-lg border flex items-center justify-center gap-2 transition-all font-bold text-[10px] uppercase tracking-wider
                            ${completed 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                                : 'border-slate-600 bg-slate-700 text-slate-300 group-hover/check:border-slate-500 hover:bg-slate-600'}
                        `}>
                             {completed ? <><Check size={12} strokeWidth={4} /> Concluído</> : "Em Andamento"}
                        </div>
                        <input 
                            type="checkbox" 
                            checked={!!completed} 
                            onChange={(e) => onToggleComplete(instanceId!, e.target.checked)}
                            className="hidden"
                        />
                    </label>
                </div>
            )}
        </div>
    );
});

export const Setup: React.FC = () => {
  const { notebooks, config, cycles, activeCycleId, updateConfig, addNotebook, editNotebook, deleteNotebook, addAllocation, removeAllocation, moveAllocation, toggleAllocationComplete } = useStore();
  
  const [viewMode, setViewMode] = useState<'timeline' | 'calculator'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'unallocated' | 'overdue'>('all');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const activeCycle = useMemo(() => cycles.find(c => c.id === activeCycleId), [cycles, activeCycleId]);
  const allocations = useMemo(() => (activeCycle?.planning as Allocation[]) || [], [activeCycle]);

  // Form State
  const initialFormState = {
    discipline: '', name: '', subtitle: '', tecLink: '', lawLink: '', obsidianLink: '', accuracy: 0, targetAccuracy: 90,
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, notes: '', images: [] as string[], accuracyHistory: [] as any[]
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- DATA PREP ---
  const libraryNotebooks = useMemo(() => {
    // Basic search filtering
    let result = notebooks.filter(nb => {
        if (nb.discipline === 'Revisão Geral') return false;
        return nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || nb.discipline.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (libraryFilter === 'unallocated') {
        const allocatedIds = new Set(allocations.map(a => a.notebookId));
        result = result.filter(nb => !allocatedIds.has(nb.id));
    }

    return result.sort((a, b) => a.discipline.localeCompare(b.discipline));
  }, [notebooks, searchTerm, libraryFilter, allocations]);

  const weeksCount = config.weeksUntilExam || 12;
  const weeks = Array.from({ length: weeksCount }, (_, i) => {
      const id = `week-${i + 1}`;
      return { id, label: `SEMANA ${i + 1}`, index: i + 1 };
  });

  // --- ACTIONS ---
  const onDragStart = useCallback((e: React.DragEvent, id: string, origin: 'library' | 'week') => {
    e.dataTransfer.setData("id", id); // Library: notebookId, Week: instanceId
    e.dataTransfer.setData("origin", origin);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent, targetWeekId: string) => {
      const id = e.dataTransfer.getData("id");
      const origin = e.dataTransfer.getData("origin");
      
      if (origin === 'library') {
          // New Allocation
          addAllocation(id, targetWeekId);
      } else {
          // Move existing Allocation
          moveAllocation(id, targetWeekId);
      }
  }, [addAllocation, moveAllocation]);

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleEditClick = (notebook: Notebook) => {
      setEditingId(notebook.id);
      setFormData({ ...notebook } as any);
      setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      if (editingId) await editNotebook(editingId, formData);
      else await addNotebook(formData);
      setIsSaving(false);
      setIsModalOpen(false);
  };

  const handleChange = (k: string, v: any) => setFormData(p => ({...p, [k]: v}));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950">
      
      {/* Sidebar Library */}
      {viewMode === 'timeline' && (
      <aside className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900/30 flex flex-col z-20 hidden md:flex">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider"><Layout size={14} className="text-emerald-500" /> Banco de Disciplinas</h2>
            
            <div className="flex gap-2">
                <button onClick={() => setLibraryFilter('all')} className={`flex-1 py-1.5 text-[10px] rounded border font-bold ${libraryFilter === 'all' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-transparent border-slate-800 text-slate-500'}`}>Todos</button>
                <button onClick={() => setLibraryFilter('unallocated')} className={`flex-1 py-1.5 text-[10px] rounded border font-bold ${libraryFilter === 'unallocated' ? 'bg-blue-900/20 border-blue-500/30 text-blue-400' : 'bg-transparent border-slate-800 text-slate-500'}`}>Pendentes</button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-emerald-500 outline-none" />
            </div>
          </div>
          
          <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
            {libraryNotebooks.map((nb) => (
                <DraggableCard 
                    key={nb.id} 
                    notebook={nb} 
                    onDragStart={onDragStart} 
                    onEdit={handleEditClick}
                    onDelete={deleteNotebook}
                    origin="library" 
                />
            ))}
          </div>
      </aside>
      )}

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
         <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30 shadow-lg">
            {/* Header Controls (Date, etc) - keeping simple for brevity */}
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white">Cronograma Tático</h2>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button onClick={() => setViewMode('timeline')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'timeline' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Timeline</button>
                    {/* Calculator View Removed for simplicity in this snippet */}
                </div>
            </div>
         </header>

         {viewMode === 'timeline' && (
             <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="flex h-full p-6 gap-6 min-w-max items-start">
                    {weeks.map(week => {
                        const weekAllocations = allocations.filter(a => a.weekId === week.id);
                        
                        return (
                            <div 
                                key={week.id} 
                                className="w-80 flex-shrink-0 flex flex-col rounded-2xl border bg-slate-900 border-slate-800 shadow-2xl h-full max-h-full"
                                onDragOver={onDragOver} 
                                onDrop={(e) => onDrop(e, week.id)}
                            >
                                <div className="p-4 rounded-t-2xl border-b border-slate-700 bg-slate-900 z-10">
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-white">{week.label}</span>
                                        <span className="text-xs font-bold text-emerald-400">{weekAllocations.length} Blocos</span>
                                    </div>
                                </div>
                                
                                <div className="p-3 space-y-2 overflow-y-auto flex-1 custom-scrollbar relative bg-slate-900/50">
                                    {weekAllocations.map(alloc => {
                                        const nb = notebooks.find(n => n.id === alloc.notebookId);
                                        if (!nb) return null;
                                        return (
                                            <DraggableCard 
                                                key={alloc.id} 
                                                instanceId={alloc.id}
                                                notebook={nb} 
                                                onDragStart={onDragStart} 
                                                onEdit={handleEditClick} 
                                                origin="week" 
                                                completed={alloc.completed}
                                                onToggleComplete={toggleAllocationComplete}
                                                onRemoveFromWeek={removeAllocation}
                                                isCompact
                                            />
                                        );
                                    })}
                                    {weekAllocations.length === 0 && (
                                        <div className="h-20 flex items-center justify-center text-slate-700 text-xs border-2 border-dashed border-slate-800 rounded-lg">
                                            Arraste aqui
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
             </div>
         )}
      </main>

      {/* Edit Modal (Simplified) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-lg border border-slate-700">
                <h3 className="text-white font-bold mb-4">Editar Caderno</h3>
                <input className="w-full bg-slate-800 p-2 rounded mb-4 text-white" value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="Nome" />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-emerald-600 text-white rounded">{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
