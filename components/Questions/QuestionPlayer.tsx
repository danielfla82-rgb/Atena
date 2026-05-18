import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../../store';
import { QuestionAnswer } from '../../types';
import { 
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, 
  RotateCcw, MessageSquare, History, Trophy, Eye, 
  Keyboard, Play, Settings, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function QuestionPlayer() {
  const { questions, questionResults, addQuestionResult, questionSets, resetQuestionResults } = useStore();
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<QuestionAnswer | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const selectedSet = questionSets.find(s => s.id === selectedSetId);
  const setQuestions = useMemo(() => questions.filter(q => q.setId === selectedSetId), [questions, selectedSetId]);
  
  const currentQuestion = setQuestions[currentIndex];
  
  const setResults = useMemo(() => 
    questionResults.filter(r => r.setId === selectedSetId),
    [questionResults, selectedSetId]
  );

  const stats = useMemo(() => {
    if (setResults.length === 0) return { correct: 0, total: 0, pct: 0 };
    const correct = setResults.filter(r => r.isCorrect).length;
    return {
      correct,
      total: setResults.length,
      pct: Math.round((correct / setResults.length) * 100)
    };
  }, [setResults]);

  const handleSelectAnswer = useCallback((ans: QuestionAnswer) => {
    if (isAnswered) return;
    setUserAnswer(ans);
  }, [isAnswered]);

  const handleConfirm = useCallback(async () => {
    if (isAnswered || !userAnswer || !currentQuestion) return;
    
    const isCorrect = userAnswer === currentQuestion.correctAnswer;
    await addQuestionResult({
      questionId: currentQuestion.id,
      setId: currentQuestion.setId,
      userAnswer,
      isCorrect
    });
    
    setIsAnswered(true);
    setShowExplanation(true);
  }, [isAnswered, userAnswer, currentQuestion, addQuestionResult]);

  const handleExportIncorrect = useCallback(() => {
    if (!selectedSetId) return;
    
    // Pegar resultados incorretos deste caderno
    const incorrectResults = setResults.filter(r => !r.isCorrect);
    if (incorrectResults.length === 0) {
      alert("Nenhum erro encontrado para exportar.");
      return;
    }

    const incorrectQuestions = setQuestions.filter(q => 
      incorrectResults.some(r => r.questionId === q.id)
    );

    let content = `ERROS DO CADERNO: ${selectedSet?.name}\n`;
    content += `Data da Exportação: ${new Date().toLocaleDateString('pt-BR')}\n`;
    content += `Total de Erros: ${incorrectQuestions.length}\n`;
    content += `==========================================\n\n`;

    incorrectQuestions.forEach((q, idx) => {
      content += `QUESTÃO #${idx + 1} (${q.code || 'Sem ID'})\n`;
      content += `${q.text}\n`;
      content += `------------------------------------------\n`;
      content += `GABARITO: ${q.correctAnswer === 'C' ? 'CERTO' : 'ERRADO'}\n`;
      if (q.explanation) {
        content += `EXPLICAÇÃO: ${q.explanation}\n`;
      }
      content += `\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erros_${selectedSet?.name.replace(/\s+/g, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedSetId, setResults, setQuestions, selectedSet]);

  const handleReset = useCallback(async () => {
    if (!selectedSetId) return;
    if (confirm("Tem certeza que deseja resetar todo o progresso deste caderno? Esta ação não pode ser desfeita.")) {
      await resetQuestionResults(selectedSetId);
      setCurrentIndex(0);
      setUserAnswer(null);
      setIsAnswered(false);
      setShowExplanation(false);
    }
  }, [selectedSetId, resetQuestionResults]);

  const handleNext = useCallback(() => {
    if (currentIndex < setQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer(null);
      setIsAnswered(false);
      setShowExplanation(false);
    }
  }, [currentIndex, setQuestions.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setUserAnswer(null);
      setIsAnswered(false);
      setShowExplanation(false);
    }
  }, [currentIndex]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') handleSelectAnswer('C');
      if (e.key === '2') handleSelectAnswer('E');
      if (e.key === 'Enter') handleConfirm();
      if (e.key === 'l' || e.key === 'L') handleNext();
      if (e.key === 'p' || e.key === 'P') setShowExplanation(prev => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectAnswer, handleConfirm, handleNext]);

  if (!selectedSetId) {
    return (
      <div id="question-player-setup" className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-white">Treino de Questões</h2>
          <p className="text-slate-400">Selecione um caderno para iniciar sua bateria de questões.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questionSets.map(set => {
            const setQs = questions.filter(q => q.setId === set.id);
            const results = questionResults.filter(r => r.setId === set.id);
            const accuracy = results.length > 0 
              ? Math.round((results.filter(r => r.isCorrect).length / results.length) * 100)
              : 0;

            return (
              <button
                key={set.id}
                onClick={() => setSelectedSetId(set.id)}
                className="group relative bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800/80 transition-all text-left"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-600/20 p-3 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                    <History size={24} />
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${accuracy >= 80 ? 'text-green-400' : accuracy >= 60 ? 'text-yellow-400' : 'text-slate-500'}`}>
                      {accuracy}%
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Acurácia</div>
                  </div>
                </div>
                
                <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{set.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{set.discipline}</p>
                
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="bg-slate-800 px-2 py-1 rounded">{setQs.length} Questões</span>
                  <span className="bg-slate-800 px-2 py-1 rounded">{results.length} Respondidas</span>
                </div>
              </button>
            );
          })}
        </div>

        {questionSets.length === 0 && (
          <div className="text-center py-20 bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-800">
            <Settings className="mx-auto text-slate-700 animate-spin-pulse" size={48} />
            <p className="mt-4 text-slate-500">Nenhum caderno disponível. Crie um no Gerenciador.</p>
          </div>
        )}
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="p-12 text-center space-y-6">
        <Play size={64} className="mx-auto text-blue-500 opacity-20" />
        <h3 className="text-2xl font-bold text-white">Nenhuma questão neste caderno.</h3>
        <button 
          onClick={() => setSelectedSetId(null)}
          className="text-blue-400 hover:underline"
        >
          Voltar para seleção
        </button>
      </div>
    );
  }

  return (
    <div id="question-player" className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <button 
          onClick={() => setSelectedSetId(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedSet?.discipline}</div>
          <div className="text-sm font-bold text-white">{selectedSet?.name}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2 mr-2 border-r border-slate-700 pr-4">
            <button 
              onClick={handleExportIncorrect}
              title="Exportar questões que você errou em TXT"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-slate-700"
            >
              <Upload size={18} />
            </button>
            <button 
              onClick={handleReset}
              title="Resetar progresso do caderno"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-orange-400 rounded-xl transition-all border border-slate-700"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-lg font-bold text-white">{stats.pct}%</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Acurácia Total</div>
          </div>
          <div className="h-10 w-[1px] bg-slate-800 hidden sm:block" />
          <div className="text-right">
             <div className="text-lg font-bold text-white">{currentIndex + 1} de {setQuestions.length}</div>
             <div className="text-[10px] text-slate-500 font-bold uppercase">Progresso</div>
          </div>
        </div>
      </div>

      {/* Main Question Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
        {/* Question Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-400 uppercase tracking-tight">Questão {currentQuestion.code || `#${currentIndex + 1}`}</span>
             {currentQuestion.subject && <span className="text-xs text-slate-500 font-medium">{currentQuestion.subject}</span>}
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-slate-500 hover:text-blue-400 transition-colors" title="Ver estatísticas da questão">
              <History size={18} />
            </button>
            <button className="p-2 text-slate-500 hover:text-yellow-400 transition-colors" title="Favoritar">
              <Trophy size={18} />
            </button>
          </div>
        </div>

        {/* Question Content */}
        <div className="p-8 flex-1 space-y-8">
          <div className="text-xl md:text-2xl text-slate-100 leading-relaxed font-medium">
            {currentQuestion.text}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => handleSelectAnswer('C')}
              className={`relative p-4 rounded-2xl border-2 transition-all group overflow-hidden ${
                userAnswer === 'C' 
                  ? 'border-blue-500 bg-blue-600/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              } ${isAnswered && currentQuestion.correctAnswer === 'C' ? 'border-green-500 bg-green-600/10' : ''} 
                ${isAnswered && userAnswer === 'C' && currentQuestion.correctAnswer !== 'C' ? 'border-red-500 bg-red-600/10' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${userAnswer === 'C' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  C
                </div>
                <span className="font-bold text-slate-200">CERTO</span>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none text-xs font-mono">1</div>
            </button>

            <button
              onClick={() => handleSelectAnswer('E')}
              className={`relative p-4 rounded-2xl border-2 transition-all group overflow-hidden ${
                userAnswer === 'E' 
                  ? 'border-blue-500 bg-blue-600/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              } ${isAnswered && currentQuestion.correctAnswer === 'E' ? 'border-green-500 bg-green-600/10' : ''} 
                ${isAnswered && userAnswer === 'E' && currentQuestion.correctAnswer !== 'E' ? 'border-red-500 bg-red-600/10' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${userAnswer === 'E' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  E
                </div>
                <span className="font-bold text-slate-200">ERRADO</span>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none text-xs font-mono">2</div>
            </button>
          </div>
        </div>

        {/* Feedback / Footer */}
        <div className="p-6 bg-slate-900/80 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
             <div className="flex gap-2">
                <button 
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-xl transition-colors border border-slate-700"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button 
                    onClick={() => setShowExplanation(!showExplanation)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${showExplanation ? 'bg-slate-700 text-blue-400 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <MessageSquare size={16} />
                    Comentário (P)
                  </button>
                  <button 
                    onClick={() => { setUserAnswer(null); setIsAnswered(false); setShowExplanation(false); }}
                    className="px-4 py-2 text-slate-500 hover:text-slate-300 rounded-lg transition-all"
                    title="Reiniciar"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
             </div>

             <div className="flex flex-1 justify-center">
               <AnimatePresence mode="wait">
                 {isAnswered ? (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${userAnswer === currentQuestion.correctAnswer ? 'bg-green-600/20 border-green-500/50 text-green-400' : 'bg-red-600/20 border-red-500/50 text-red-400'}`}
                   >
                     {userAnswer === currentQuestion.correctAnswer ? (
                       <>
                        <CheckCircle2 size={24} />
                        <span className="font-bold">Você acertou! Mandou bem!</span>
                       </>
                     ) : (
                       <>
                        <XCircle size={24} />
                        <span className="font-bold">Você errou. Que pena!</span>
                       </>
                     )}
                   </motion.div>
                 ) : (
                   <div className="text-xs text-slate-600 flex items-center gap-2 animate-pulse">
                     <Keyboard size={14} />
                     Atalhos: 1 (Certo), 2 (Errado), Enter (Marcar)
                   </div>
                 )}
               </AnimatePresence>
             </div>

             <div className="flex gap-4">
                {!isAnswered ? (
                  <button
                    onClick={handleConfirm}
                    disabled={!userAnswer}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 group"
                  >
                    Confirmar Resposta
                    <motion.div animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                      <Play size={16} className="fill-current" />
                    </motion.div>
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === setQuestions.length - 1}
                    className="px-8 py-3 bg-slate-100 hover:bg-white text-slate-900 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-2 group"
                  >
                    Próxima Questão
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Explanation Area */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-widest">
                <Eye size={16} />
                Resolução comentada
              </div>
              <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {currentQuestion.explanation || "Nenhuma explicação disponível para esta questão."}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
