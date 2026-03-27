import React, { useState, useEffect } from 'react';
import { Notebook } from '../types';
import { useStore } from '../store';
import { X, Play, Square, CheckCircle, Timer, AlertCircle } from 'lucide-react';

interface Props {
  notebook: Notebook;
  onClose: () => void;
}

export const StudySession: React.FC<Props> = ({ notebook, onClose }) => {
  const { updateNotebookAccuracy } = useStore();
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showResults, setShowResults] = useState(false);
  
  const [questions, setQuestions] = useState('');
  const [correct, setCorrect] = useState('');
  
  // Real-time calc
  const qNum = parseInt(questions) || 0;
  const cNum = parseInt(correct) || 0;
  const currentCalc = qNum > 0 ? Math.round((cNum / qNum) * 100) : 0;
  const isInvalid = cNum > qNum;

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

  const handleFinish = () => {
    setIsActive(false);
    setShowResults(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qNum > 0 && cNum >= 0 && !isInvalid) {
      updateNotebookAccuracy(notebook.id, currentCalc);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{notebook.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{notebook.discipline} • {notebook.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col items-center">
          {!showResults ? (
            <>
              <div className="w-48 h-48 rounded-full border-4 border-green-500/20 flex items-center justify-center mb-8 relative">
                 <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-[spin_3s_linear_infinite]" style={{display: isActive ? 'block' : 'none'}}></div>
                 <div className="text-5xl font-mono text-green-400 font-bold tracking-wider">
                   {formatTime(seconds)}
                 </div>
              </div>

              <div className="flex gap-4 w-full">
                {!isActive ? (
                  <button 
                    onClick={() => setIsActive(true)}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Play size={24} fill="currentColor" /> Iniciar Sessão
                  </button>
                ) : (
                  <button 
                    onClick={handleFinish}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Square size={24} fill="currentColor" /> Parar
                  </button>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-sm text-slate-500 dark:text-slate-400 w-full">
                <p className="flex items-center gap-2 mb-2"><Timer size={16} /> Dica Estratégica:</p>
                <p>Este tópico tem peso <strong>{notebook.weight}</strong>. Foque na lei seca para aumentar sua precisão de {notebook.accuracy}% para {Number(notebook.targetAccuracy) || 90}%.</p>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sessão Finalizada</h3>
                <p className="text-slate-500 dark:text-slate-400">Registre seu desempenho para o algoritmo.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Questões</label>
                  <input 
                    type="number" 
                    value={questions}
                    onChange={e => setQuestions(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white text-center text-xl font-bold focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="0"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Acertos</label>
                  <input 
                    type="number" 
                    value={correct}
                    onChange={e => setCorrect(e.target.value)}
                    className={`w-full bg-slate-100 dark:bg-slate-800 border rounded-lg p-3 text-slate-900 dark:text-white text-center text-xl font-bold focus:ring-2 outline-none
                      ${isInvalid ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-green-500'}
                    `}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Real-time Feedback */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex flex-col items-center justify-center border border-slate-300 dark:border-slate-700">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Precisão Calculada</span>
                  {isInvalid ? (
                    <span className="text-red-500 font-bold flex items-center gap-2">
                       <AlertCircle size={18} /> Erro
                    </span>
                  ) : (
                    <span className={`text-3xl font-bold font-mono ${currentCalc >= (Number(notebook.targetAccuracy) || 90) ? 'text-green-400' : currentCalc <= 60 ? 'text-red-400' : 'text-amber-400'}`}>
                       {questions ? `${currentCalc}%` : '--'}
                    </span>
                  )}
              </div>

              <button 
                type="submit"
                disabled={isInvalid || !questions}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-xl font-bold transition-all"
              >
                Atualizar Algoritmo
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};