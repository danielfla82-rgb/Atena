import React, { useState } from 'react';
import { LayoutDashboard, PlusCircle, ArrowRight, FolderOpen, Calendar, Trash2, X, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { LOGO_URL } from '../constants';

interface Props {
  onNavigate: (view: 'dashboard' | 'setup' | 'library') => void;
}

export const ProjectSelection: React.FC<Props> = ({ onNavigate }) => {
  const { cycles, activeCycleId, createCycle, selectCycle, deleteCycle } = useStore();
  
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

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10"></div>

      <div className="max-w-6xl w-full z-10 flex flex-col h-full justify-center">
        
        {/* === MAIN STATIC BANNER === */}
        <div className="relative w-full h-[280px] md:h-[350px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 mb-10 group bg-slate-950">
            <div className="absolute inset-0 w-full h-full">
                <div className="absolute inset-0 bg-slate-950/70 z-10"></div>
                <img 
                    src={staticBanner} 
                    alt="Athena Banner" 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-50"
                />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20">
                <div className="animate-in fade-in zoom-in duration-700 flex flex-col items-center">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase drop-shadow-2xl">
                        PROJETO <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">ATENA</span>
                    </h1>
                    <div className="flex items-center gap-4 md:gap-8 w-full justify-center">
                        <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent to-emerald-500/50"></div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-200 uppercase tracking-[0.3em] drop-shadow-lg text-shadow-sm">
                            Selecione sua Missão
                        </h2>
                        <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent to-emerald-500/50"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* === CYCLES GRID === */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FolderOpen size={24} className="text-emerald-500"/> Meus Projetos Ativos
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Create New Card */}
                <button 
                    onClick={() => setIsCreating(true)}
                    className="group bg-slate-900/30 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 p-8 rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:bg-slate-900/60 min-h-[200px]"
                >
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
                        <PlusCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-200 group-hover:text-emerald-400">Iniciar Novo Ciclo</h3>
                    <p className="text-sm text-slate-500 mt-2">Começar um planejamento do zero.</p>
                </button>

                {/* 2. Existing Cycles */}
                {cycles.map((cycle) => (
                    <div 
                        key={cycle.id}
                        onClick={() => handleSelectCycle(cycle.id)}
                        className={`group bg-slate-900/80 backdrop-blur-md border p-6 rounded-2xl text-left transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[200px]
                            ${activeCycleId === cycle.id 
                                ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' 
                                : 'border-slate-800 hover:border-slate-600'}
                        `}
                    >
                        {/* Double Safety Delete Button */}
                        <button 
                            onClick={(e) => handleDeleteClick(e, cycle.id)}
                            className={`absolute top-4 right-4 p-2 rounded-lg transition-all z-20 flex items-center gap-2
                                ${deleteConfirmId === cycle.id 
                                    ? 'bg-red-600 text-white opacity-100' 
                                    : 'text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100'}
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

                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeCycleId === cycle.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/50' : 'bg-slate-800 text-slate-400'}`}>
                                    <LayoutDashboard size={20} />
                                </div>
                                {activeCycleId === cycle.id && (
                                    <span className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                                        Em Andamento
                                    </span>
                                )}
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors truncate">
                                {cycle.name}
                            </h3>
                            <p className="text-sm text-slate-400 font-medium mb-4">
                                {cycle.config.targetRole}
                            </p>
                        </div>

                        <div className="space-y-3 mt-auto">
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                 {/* Mock progress based on allocated weeks vs total weeks or random for visual if new */}
                                 <div className="h-full bg-emerald-500 w-1/4 group-hover:w-1/3 transition-all duration-1000"></div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Calendar size={12}/> {new Date(cycle.lastAccess).toLocaleDateString()}
                                </span>
                                <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1 text-emerald-500 font-bold">
                                    Acessar <ArrowRight size={12} />
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* === CREATE MODAL === */}
        {isCreating && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                    <button onClick={() => setIsCreating(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                        <X size={20} />
                    </button>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">Novo Ciclo Tático</h2>
                    <p className="text-slate-400 text-sm mb-6">Configure os parâmetros iniciais da sua nova missão.</p>
                    
                    <form onSubmit={handleCreateCycle} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Projeto</label>
                            <input 
                                type="text"
                                autoFocus
                                value={newCycleName}
                                onChange={e => setNewCycleName(e.target.value)}
                                placeholder="Ex: Receita Federal 2025"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors"
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
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                required
                            />
                        </div>
                        <p className="text-xs text-slate-500 bg-slate-800 p-3 rounded border border-slate-700">
                            <strong>Nota:</strong> O banco de dados de disciplinas é universal e compartilhado entre todos os seus projetos.
                        </p>
                        <button 
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 mt-2"
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