
import React, { useState, useMemo } from 'react';
import { LayoutDashboard, PlusCircle, ArrowRight, FolderOpen, Calendar, Trash2, X, AlertTriangle, HelpCircle, LogOut, Pencil, CheckCircle2, AlertOctagon, Layers } from 'lucide-react';
import { useStore } from '../store';
import { LOGO_URL } from '../constants';
import { NotebookStatus } from '../types';

interface Props {
  onNavigate: (view: 'dashboard' | 'setup' | 'library' | 'onboarding') => void;
  onLogout: () => void;
}

export const ProjectSelection: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const { cycles, activeCycleId, createCycle, updateCycle, selectCycle, deleteCycle, notebooks } = useStore();
  
  // State for creation/edit modal
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [cycleRole, setCycleRole] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete Safety State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const staticBanner = LOGO_URL;

  // --- STATS CALCULATION ---
  // Calculates aggregated stats based on the GLOBAL notebook database (User's knowledge base)
  const stats = useMemo(() => {
      const totalNotebooks = notebooks.length;
      const criticalCount = notebooks.filter(n => n.accuracy < 60 && n.accuracy > 0).length;
      const masteredCount = notebooks.filter(n => n.accuracy >= 80).length;
      const startedCount = notebooks.filter(n => n.status !== NotebookStatus.NOT_STARTED).length;
      
      const dominanceRate = totalNotebooks > 0 ? Math.round((masteredCount / totalNotebooks) * 100) : 0;
      const coverageRate = totalNotebooks > 0 ? Math.round((startedCount / totalNotebooks) * 100) : 0;

      return { totalNotebooks, criticalCount, masteredCount, dominanceRate, coverageRate };
  }, [notebooks]);

  const handleSelectCycle = (id: string) => {
      if (deleteConfirmId === id) return;
      selectCycle(id);
      onNavigate('dashboard');
  };

  const handleOpenCreate = () => {
      setModalMode('create');
      setCycleName('');
      setCycleRole('');
      setEditingId(null);
      setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, cycle: any) => {
      e.stopPropagation();
      setModalMode('edit');
      setCycleName(cycle.name);
      setCycleRole(cycle.config.targetRole);
      setEditingId(cycle.id);
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(cycleName && cycleRole) {
          if (modalMode === 'create') {
              createCycle(cycleName, cycleRole);
              onNavigate('dashboard'); // Auto-enter new cycle
          } else if (modalMode === 'edit' && editingId) {
              await updateCycle(editingId, { 
                  name: cycleName, 
                  config: { 
                      ...cycles.find(c => c.id === editingId)?.config!,
                      targetRole: cycleRole 
                  }
              });
          }
          setIsModalOpen(false);
          setCycleName('');
          setCycleRole('');
          setEditingId(null);
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (deleteConfirmId === id) {
          deleteCycle(id);
          setDeleteConfirmId(null);
      } else {
          setDeleteConfirmId(id);
          setTimeout(() => setDeleteConfirmId(null), 3000);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10"></div>

      <div className="max-w-6xl w-full z-10 flex flex-col h-full justify-center">
        
        {/* === MAIN BANNER === */}
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
            
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800/50 pb-4 gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FolderOpen size={24} className="text-emerald-500"/> Meus Projetos Ativos
                </h3>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-full border border-slate-700 transition-all"
                    >
                        <LogOut size={14} /> Sair
                    </button>
                    <button 
                        onClick={() => onNavigate('onboarding')}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 bg-emerald-900/10 hover:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-500/20 transition-all"
                    >
                        <HelpCircle size={14} />
                        Conhecendo a Plataforma
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Create New Card */}
                <button 
                    onClick={handleOpenCreate}
                    className="group bg-slate-900/30 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 p-8 rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:bg-slate-900/60 min-h-[220px]"
                >
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
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
                        className={`group bg-slate-900/80 backdrop-blur-md border p-6 rounded-2xl text-left transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[220px]
                            ${activeCycleId === cycle.id 
                                ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' 
                                : 'border-slate-800 hover:border-slate-600'}
                        `}
                    >
                        {/* Action Buttons */}
                        <div className="absolute top-4 right-4 flex gap-2 z-20">
                            <button 
                                onClick={(e) => handleOpenEdit(e, cycle)}
                                className="p-2 rounded-lg text-slate-500 hover:text-white bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all opacity-0 group-hover:opacity-100"
                                title="Editar Projeto"
                            >
                                <Pencil size={14} />
                            </button>
                            <button 
                                onClick={(e) => handleDeleteClick(e, cycle.id)}
                                className={`p-2 rounded-lg transition-all flex items-center gap-2
                                    ${deleteConfirmId === cycle.id 
                                        ? 'bg-red-600 text-white opacity-100 shadow-lg' 
                                        : 'text-slate-500 hover:text-red-400 bg-slate-900/50 hover:bg-slate-900 border border-slate-700/50 hover:border-red-500/50 opacity-0 group-hover:opacity-100'}
                                `}
                                title="Excluir Projeto"
                            >
                                {deleteConfirmId === cycle.id ? <AlertTriangle size={14} /> : <Trash2 size={14} />}
                            </button>
                        </div>

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
                            
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors truncate pr-16">
                                {cycle.name}
                            </h3>
                            <p className="text-sm text-slate-400 font-medium mb-4 flex items-center gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">{cycle.config.targetRole}</span>
                            </p>

                            {/* Intelligent Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-4 border-t border-b border-slate-800 py-3">
                                <div className="text-center border-r border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Base</p>
                                    <p className="text-sm font-bold text-white flex items-center justify-center gap-1">
                                        <Layers size={10} className="text-blue-500" /> {stats.totalNotebooks}
                                    </p>
                                </div>
                                <div className="text-center border-r border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Dominado</p>
                                    <p className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1">
                                        <CheckCircle2 size={10} /> {stats.masteredCount}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Crítico</p>
                                    <p className="text-sm font-bold text-red-400 flex items-center justify-center gap-1">
                                        <AlertOctagon size={10} /> {stats.criticalCount}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mt-auto">
                            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                                <span>Atingimento do Edital</span>
                                <span className="text-emerald-400 font-bold">{stats.dominanceRate}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative border border-slate-700">
                                 {/* Background: Coverage (Items started) */}
                                 <div 
                                    className="absolute top-0 left-0 h-full bg-blue-900/50" 
                                    style={{ width: `${stats.coverageRate}%` }}
                                    title={`Cobertura Bruta: ${stats.coverageRate}%`}
                                 ></div>
                                 {/* Foreground: Mastery (Items > 80%) */}
                                 <div 
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out" 
                                    style={{ width: `${stats.dominanceRate}%` }}
                                    title={`Domínio Real: ${stats.dominanceRate}%`}
                                 ></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2">
                                <span className="flex items-center gap-1">
                                    <Calendar size={10}/> {new Date(cycle.lastAccess).toLocaleDateString()}
                                </span>
                                <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1 text-emerald-500 font-bold opacity-0 group-hover:opacity-100">
                                    Acessar <ArrowRight size={10} />
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* === CREATE / EDIT MODAL === */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                        <X size={20} />
                    </button>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">{modalMode === 'create' ? 'Novo Ciclo Tático' : 'Editar Projeto'}</h2>
                    <p className="text-slate-400 text-sm mb-6">{modalMode === 'create' ? 'Configure os parâmetros iniciais da sua nova missão.' : 'Atualize os dados principais do ciclo.'}</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Projeto</label>
                            <input 
                                type="text"
                                autoFocus
                                value={cycleName}
                                onChange={e => setCycleName(e.target.value)}
                                placeholder="Ex: Receita Federal 2025"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo Alvo</label>
                            <input 
                                type="text"
                                value={cycleRole}
                                onChange={e => setCycleRole(e.target.value)}
                                placeholder="Ex: Auditor Fiscal"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                required
                            />
                        </div>
                        {modalMode === 'create' && (
                            <p className="text-xs text-slate-500 bg-slate-800 p-3 rounded border border-slate-700">
                                <strong>Nota:</strong> O banco de dados de disciplinas é universal e compartilhado entre todos os seus projetos.
                            </p>
                        )}
                        <button 
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 mt-2"
                        >
                            {modalMode === 'create' ? 'Criar e Iniciar' : 'Salvar Alterações'}
                        </button>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
