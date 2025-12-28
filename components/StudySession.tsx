
import React, { useState, useEffect } from 'react';
import { Notebook } from '../types';
import { useStore } from '../store';
import { X, Play, Square, CheckCircle, Timer, AlertCircle, ExternalLink, FileText, AlertTriangle, Link as LinkIcon, Calculator } from 'lucide-react';

interface Props {
  notebook: Notebook;
  onClose: () => void;
}

export const StudySession: React.FC<Props> = ({ notebook, onClose }) => {
  const { updateNotebookAccuracy } = useStore();
  
  // Timer State (Optional now)
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  
  // Data Entry State
  const [questions, setQuestions] = useState('');
  const [correct, setCorrect] = useState('');
  
  // Real-time calc
  const qNum = parseInt(questions) || 0;
  const cNum = parseInt(correct) || 0;
  const currentCalc = qNum > 0 ? Math.round((cNum / qNum) * 100) : 0;
  const isInvalid = cNum > qNum;

  // Determine available links
  const hasTecLink = !!notebook.tecLink;
  const hasObsidianLink = !!notebook.obsidianLink;
  const hasErrorLink = !!notebook.errorNotebookLink;
  const hasAnyLink = hasTecLink || hasObsidianLink || hasErrorLink;

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qNum > 0 && cNum >= 0 && !isInvalid) {
      updateNotebookAccuracy(notebook.id, currentCalc);
      onClose();
    }
  };

  const openLink = (url?: string) => {
      if(url) {
          window.open(url, '_blank');
          // Auto-start timer if not started? Optional.
          if (!isActive) setIsActive(true);
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-slate-800 border-b border-slate-700 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 block">Modo Foco</span>
            <h2 className="text-xl font-bold text-white leading-tight">{notebook.name}</h2>
            <p className="text-slate-400 text-xs mt-1">{notebook.discipline} • Meta: {notebook.targetAccuracy}%</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 bg-slate-700/50 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-6 space-y-6">
            
            {/* 1. ACESSO AOS MATERIAIS (Prioridade Total) */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <ExternalLink size={14} /> Materiais Vinculados
                </h3>
                
                {hasAnyLink ? (
                    <div className="grid grid-cols-1 gap-3">
                        {hasTecLink && (
                            <button 
                                onClick={() => openLink(notebook.tecLink)}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl flex items-center justify-between group transition-all shadow-lg shadow-blue-900/20 border border-blue-500/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 rounded-lg"><LinkIcon size={20} /></div>
                                    <div className="text-left">
                                        <div className="font-bold text-base">Abrir Questões (TEC)</div>
                                        <div className="text-blue-200 text-xs">Link direto do caderno</div>
                                    </div>
                                </div>
                                <ExternalLink size={18} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                            </button>
                        )}

                        <div className="flex gap-3">
                            {hasObsidianLink && (
                                <button 
                                    onClick={() => openLink(notebook.obsidianLink)}
                                    className="flex-1 bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 border border-purple-500/30 p-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:border-purple-500/60"
                                >
                                    <FileText size={16} /> Abrir Resumo
                                </button>
                            )}
                            {hasErrorLink && (
                                <button 
                                    onClick={() => openLink(notebook.errorNotebookLink)}
                                    className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-500/30 p-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:border-red-500/60"
                                >
                                    <AlertTriangle size={16} /> Caderno de Erros
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 border-2 border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-sm bg-slate-900/50">
                        Nenhum link cadastrado para este tópico.
                        <br/><span className="text-xs opacity-70">Edite o caderno para adicionar links do TEC ou Obsidian.</span>
                    </div>
                )}
            </div>

            {/* 2. REGISTRO DE DESEMPENHO (Sempre visível para fluxo rápido) */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Calculator size={14} /> Registrar Resultado
                        </h3>
                        {/* Mini Timer Toggle */}
                        <button 
                            type="button"
                            onClick={() => setIsActive(!isActive)}
                            className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-mono transition-colors ${isActive ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}
                        >
                            {isActive ? <Square size={10} fill="currentColor"/> : <Play size={10} fill="currentColor"/>}
                            {formatTime(seconds)}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Questões</label>
                            <input 
                                type="number" 
                                value={questions}
                                onChange={e => setQuestions(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-center text-lg font-bold focus:border-emerald-500 outline-none"
                                placeholder="0"
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Acertos</label>
                            <input 
                                type="number" 
                                value={correct}
                                onChange={e => setCorrect(e.target.value)}
                                className={`w-full bg-slate-950 border rounded-lg p-3 text-white text-center text-lg font-bold focus:border-emerald-500 outline-none ${isInvalid ? 'border-red-500 text-red-400' : 'border-slate-700'}`}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Feedback Visual */}
                    {questions && (
                        <div className="mb-4 flex items-center justify-center gap-2 text-sm">
                            <span className="text-slate-400">Aproveitamento:</span>
                            <span className={`font-bold text-lg ${currentCalc >= notebook.targetAccuracy ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {currentCalc}%
                            </span>
                            {currentCalc >= notebook.targetAccuracy && <CheckCircle size={16} className="text-emerald-500" />}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isInvalid || !questions}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} /> Salvar Sessão
                    </button>
                </form>
            </div>

            {/* Strategic Hint */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-900/10 border border-amber-500/20 text-xs text-amber-200/80">
                <Timer size={14} className="mt-0.5 flex-shrink-0" />
                <p>
                    <strong>Dica Tática:</strong> Este tópico tem peso <strong>{notebook.weight}</strong>. 
                    Seu objetivo é subir de {notebook.accuracy}% para {notebook.targetAccuracy}%.
                </p>
            </div>

        </div>
      </div>
    </div>
  );
};
