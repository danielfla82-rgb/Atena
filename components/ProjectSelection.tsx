import React, { useState } from 'react';
import { LayoutDashboard, PlusCircle, ArrowRight, FolderOpen, Calendar, Trash2, X, AlertTriangle, Loader2, Flag, Clock } from 'lucide-react';
import { useStore } from '../store';
import { LOGO_URL } from '../constants';

interface Props {
  onNavigate: (view: 'dashboard' | 'setup' | 'library') => void;
}

export const ProjectSelection: React.FC<Props> = ({ onNavigate }) => {
  const { cycles, activeCycleId, createCycle, selectCycle, deleteCycle, loading, isGuest } = useStore();
  
  // State for creation modal
  const [isCreating, setIsCreating] = useState(false);
  const [newCycleName, setNewCycleName] = useState('');
  const [newCycleRole, setNewCycleRole] = useState('');

  // Delete Safety State: Stores the ID of the cycle currently in "Confirm" state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const staticBanner = LOGO_URL;

  const handleSelectCycle = (id: string) => {
      // Prevent selection if we are in delete mode for this card to avoid conflicts
      if (deleteConfirmId === id) return;
      selectCycle(id);
      onNavigate('dashboard');
  };

  const handleCreateCycle = (e: React.FormEvent) => {
      e.preventDefault();
      if(newCycleName && newCycleRole) {
          createCycle(newCycleName, newCycleRole);
          setIsCreating(false);
          setNewCycleName('');
          setNewCycleRole('');
          onNavigate('dashboard');
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (deleteConfirmId === id) {
          // Second click: Execute delete
          deleteCycle(id);
          setDeleteConfirmId(null);
      } else {
          // First click: Arm the confirmation
          setDeleteConfirmId(id);
          // Optional: Auto-reset after 3 seconds if not confirmed
          setTimeout(() => setDeleteConfirmId(null), 3000);
      }
  };

  // Helper para calcular progresso temporal
  const calculateTimeMetrics = (startDateStr?: string, examDateStr?: string, createdAtStr?: string) => {
      if (!examDateStr) return null;

      const start = new Date(startDateStr || createdAtStr || new Date());
      const end = new Date(examDateStr);
      const now = new Date();

      // Zera horas para cálculo de dias limpo
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      now.setHours(0,0,0,0);

      const totalDuration = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      const remaining = end.getTime() - now.getTime();

      const daysLeft = Math.ceil(remaining / (1000 * 60 * 60 * 24));
      
      let percent = 0;
      if (totalDuration > 0) {
          percent = Math.round((elapsed / totalDuration) * 100);
      }
      
      // Clamp percentage between 0 and 100
      percent = Math.max(0, Math.min(100, percent));

      // Color Logic based on urgency
      let colorClass = 'bg-green-500';
      let statusText = 'Fase Inicial';
      
      if (percent > 90 || daysLeft <= 7) {
          colorClass = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]';
          statusText = 'Reta Final';
      } else if (percent > 60) {
          colorClass = 'bg-amber-500';
          statusText = 'Avançado';
      } else if (percent > 30) {
          colorClass = 'bg-blue-500';
          statusText = 'Intermediário';
      }

      return { percent, daysLeft, colorClass, statusText, hasExamDate: true };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-200 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 -z-10 transition-colors duration-300"></div>

      <div className="max-w-6xl w-full z-10 flex flex-col h-full justify-center">
        
        {/* === MAIN STATIC BANNER === */}
        <div className="relative w-full h-[280px] md:h-[350px] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 mb-8 group bg-white dark:bg-slate-950 transition-colors">
            <div className="absolute inset-0 w-full h-full">
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 z-10 transition-colors"></div>
                <img 
                    src={staticBanner} 
                    alt="Athena Banner" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-50"
                    loading="eager"
                />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20">
                <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter uppercase drop-shadow-2xl transition-colors">
                        PROJETO <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-cyan-600 dark:from-green-400 dark:to-cyan-400">ATENA</span>
                    </h1>
                    <div className="flex items-center gap-4 md:gap-8 w-full justify-center">
                        <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent to-green-500/50"></div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-700 dark:text-slate-200 uppercase tracking-[0.3em] drop-shadow-lg text-shadow-sm transition-colors">
                            Selecione sua Missão
                        </h2>
                        <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent to-green-500/50"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* === CYCLES GRID === */}
        <div className="space-y-6">
            
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                    <FolderOpen size={24} className="text-green-600 dark:text-green-500"/> Meus Projetos Ativos
                </h3>
            </div>

            {loading && cycles.length === 0 ? (
                // SKELETON LOADING STATE
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-[200px] bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse transition-colors">
                            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg mb-4"></div>
                            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-auto"></div>
                            <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full w-full mt-8"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* 1. Create New Card (HIDDEN IN GUEST MODE) */}
                    {!isGuest && (
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="group bg-white/30 dark:bg-slate-900/30 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-green-500/50 p-8 rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:bg-white/60 dark:hover:bg-white dark:bg-slate-900/60 min-h-[200px]"
                        >
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-green-600 dark:text-green-500 mb-4 group-hover:scale-110 transition-transform">
                                <PlusCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Iniciar Novo Ciclo</h3>
                            <p className="text-sm text-slate-500 mt-2">Começar um planejamento do zero.</p>
                        </button>
                    )}

                    {/* 2. Existing Cycles */}
                    {cycles.map((cycle) => {
                        const timeMetrics = calculateTimeMetrics(cycle.config.startDate, cycle.config.examDate, cycle.createdAt);
                        
                        return (
                        <div 
                            key={cycle.id}
                            onClick={() => handleSelectCycle(cycle.id)}
                            className={`group bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border p-6 rounded-2xl text-left transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[220px]
                                ${activeCycleId === cycle.id 
                                    ? 'border-green-500/50 ring-1 ring-green-500/20' 
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'}
                            `}
                        >
                            {/* Double Safety Delete Button (HIDDEN IN GUEST MODE) */}
                            {!isGuest && (
                                <button 
                                    onClick={(e) => handleDeleteClick(e, cycle.id)}
                                    className={`absolute top-4 right-4 p-2 rounded-lg transition-all z-20 flex items-center gap-2
                                        ${deleteConfirmId === cycle.id 
                                            ? 'bg-red-600 text-slate-900 dark:text-white opacity-100' 
                                            : 'text-slate-500 dark:text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100'}
                                    `}
                                >
                                    {deleteConfirmId === cycle.id ? (
                                        <span className="text-xs font-bold flex items-center gap-1">
                                            <AlertTriangle size={12} /> Confirmar?
                                        </span>
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                </button>
                            )}

                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeCycleId === cycle.id ? 'bg-green-500 text-slate-900 dark:text-white shadow-lg shadow-green-900/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                        <LayoutDashboard size={20} />
                                    </div>
                                    {activeCycleId === cycle.id && (
                                        <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 border border-green-500/30 px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                                            Ativo
                                        </span>
                                    )}
                                </div>
                                
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
                                    {cycle.name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">
                                    {cycle.config.targetRole}
                                </p>
                            </div>

                            <div className="space-y-4 mt-auto">
                                {/* DYNAMIC PROGRESS BAR */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                                        <span className="text-slate-500">
                                            {timeMetrics?.hasExamDate ? timeMetrics.statusText : 'Sem data definida'}
                                        </span>
                                        <span className={timeMetrics?.hasExamDate ? 'text-slate-900 dark:text-white' : 'text-slate-600'}>
                                            {timeMetrics?.hasExamDate ? `${timeMetrics.percent}% do Prazo` : '--%'}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden transition-colors">
                                         {timeMetrics?.hasExamDate ? (
                                             <div 
                                                className={`h-full transition-all duration-1000 ${timeMetrics.colorClass}`} 
                                                style={{ width: `${timeMetrics.percent}%` }}
                                             ></div>
                                         ) : (
                                             <div className="h-full bg-slate-300 dark:bg-slate-700 w-full opacity-20"></div>
                                         )}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800/50 transition-colors">
                                    {timeMetrics?.hasExamDate ? (
                                        <span className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                                            <Flag size={12} className={timeMetrics.daysLeft < 30 ? "text-red-500" : "text-green-500"} /> 
                                            {timeMetrics.daysLeft > 0 ? (
                                                <>Faltam <strong className="text-slate-900 dark:text-white">{timeMetrics.daysLeft}</strong> dias</>
                                            ) : (
                                                <span className="text-red-500 dark:text-red-400 font-bold">Prova Realizada</span>
                                            )}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500/80 italic">
                                            <Clock size={12} /> Defina a data da prova
                                        </span>
                                    )}
                                    
                                    <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1 text-green-600 dark:text-green-500 font-bold ml-auto">
                                        Acessar <ArrowRight size={12} />
                                    </span>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* === CREATE MODAL === */}
        {isCreating && !isGuest && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative transition-colors">
                    <button onClick={() => setIsCreating(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <X size={20} />
                    </button>
                    
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Novo Ciclo Tático</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Configure os parâmetros iniciais da sua nova missão.</p>
                    
                    <form onSubmit={handleCreateCycle} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Projeto</label>
                            <input 
                                type="text"
                                autoFocus
                                value={newCycleName}
                                onChange={e => setNewCycleName(e.target.value)}
                                placeholder="Ex: Receita Federal 2025"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-green-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo Alvo</label>
                            <input 
                                type="text"
                                value={newCycleRole}
                                onChange={e => setNewCycleRole(e.target.value)}
                                placeholder="Ex: Auditor Fiscal"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-green-500 transition-colors"
                                required
                            />
                        </div>
                        <p className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 transition-colors">
                            <strong>Nota:</strong> O banco de dados de disciplinas é universal e compartilhado entre todos os seus projetos.
                        </p>
                        <button 
                            type="submit"
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 mt-2"
                        >
                            Criar e Iniciar
                        </button>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};