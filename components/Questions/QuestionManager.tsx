import React, { useState } from 'react';
import { useStore } from '../../store';
import { QuestionItem } from '../../types';
import { Plus, Trash2, FileText, Upload, ChevronRight, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function QuestionManager() {
  const { questionSets, addQuestionSet, deleteQuestionSet, questions, addQuestions, deleteQuestion } = useStore();
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [isAddingSet, setIsAddingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDiscipline, setNewSetDiscipline] = useState('');
  
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isBatchImport, setIsBatchImport] = useState(false);
  const [batchText, setBatchText] = useState('');
  
  const [manualQuestion, setManualQuestion] = useState({
    text: '',
    correctAnswer: 'C' as 'C' | 'E',
    explanation: '',
    code: ''
  });

  const selectedSet = questionSets.find(s => s.id === selectedSetId);
  const setQuestions = questions.filter(q => q.setId === selectedSetId);

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName) return;
    const id = await addQuestionSet({
      name: newSetName,
      discipline: newSetDiscipline
    });
    setNewSetName('');
    setNewSetDiscipline('');
    setIsAddingSet(false);
    setSelectedSetId(id);
  };

  const handleAddManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSetId || !manualQuestion.text) return;
    
    await addQuestions([{
      setId: selectedSetId,
      ...manualQuestion
    }]);

    setManualQuestion({ text: '', correctAnswer: 'C', explanation: '', code: '' });
    setIsAddingQuestion(false);
  };

  const handleBatchImport = async () => {
    if (!selectedSetId || !batchText) return;

    // Simple Parser:
    // Q: Question text
    // A: C or E
    // E: Explanation text
    // C: Code
    // --- (separator)

    const blocks = batchText.split(/---|\n\n\n/).filter(b => b.trim());
    const parsedQuestions: Partial<QuestionItem>[] = blocks.map(block => {
      const qMatch = block.match(/Q:\s*(.*)/i);
      const aMatch = block.match(/A:\s*(C|E)/i);
      const eMatch = block.match(/E:\s*(.*)/i);
      const cMatch = block.match(/C:\s*(#?\w+)/i);

      if (!qMatch) return null;

      return {
        setId: selectedSetId,
        text: qMatch[1].trim(),
        correctAnswer: (aMatch ? aMatch[1].toUpperCase() : 'C') as 'C' | 'E',
        explanation: eMatch ? eMatch[1].trim() : '',
        code: cMatch ? cMatch[1].trim() : ''
      };
    }).filter(q => q !== null) as Partial<QuestionItem>[];

    if (parsedQuestions.length > 0) {
      await addQuestions(parsedQuestions);
      setBatchText('');
      setIsBatchImport(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBatchText(text);
      setIsBatchImport(true);
    };
    reader.readAsText(file);
  };

  return (
    <div id="question-manager" className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Book className="text-blue-500" />
            Cadernos de Questões
          </h2>
          <p className="text-slate-400 text-sm mt-1">Gerencie seus cadernos e questões para treino.</p>
        </div>
        <button 
          onClick={() => setIsAddingSet(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-900/20"
        >
          <Plus size={20} />
          Novo Caderno
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Sets List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Meus Cadernos</h3>
            </div>
            
            <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
              {questionSets.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="mx-auto mb-2 opacity-20" size={40} />
                  <p>Nenhum caderno criado.</p>
                </div>
              ) : (
                questionSets.map(set => (
                  <button
                    key={set.id}
                    onClick={() => setSelectedSetId(set.id)}
                    className={`w-full text-left p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between group ${selectedSetId === set.id ? 'bg-blue-600/10 border-r-2 border-blue-500' : ''}`}
                  >
                    <div>
                      <div className="font-medium text-slate-100">{set.name}</div>
                      <div className="text-xs text-slate-500">{set.discipline || 'Sem disciplina'}</div>
                    </div>
                    <ChevronRight size={16} className={`transition-transform ${selectedSetId === set.id ? 'text-blue-400 translate-x-1' : 'text-slate-600'}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content: Questions of Selected Set */}
        <div className="lg:col-span-8">
          {selectedSet ? (
            <div className="space-y-6">
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">{selectedSet.discipline}</div>
                    <h3 className="text-2xl font-bold text-white">{selectedSet.name}</h3>
                    <p className="text-slate-500 text-sm">{setQuestions.length} questões cadastradas</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsBatchImport(true)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                      title="Importar TXT/Lote"
                    >
                      <Upload size={18} />
                    </button>
                    <button 
                      onClick={() => setIsAddingQuestion(true)}
                      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                      title="Nova Questão Manual"
                    >
                      <Plus size={18} />
                    </button>
                    <button 
                      onClick={() => { if(confirm('Excluir este caderno e todas as suas questões?')) deleteQuestionSet(selectedSet.id); setSelectedSetId(null); }}
                      className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors border border-red-900/30"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {setQuestions.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
                      <p className="text-slate-500">Este caderno está vazio.</p>
                      <button 
                        onClick={() => setIsAddingQuestion(true)}
                        className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        Começar a cadastrar manualmente
                      </button>
                    </div>
                  ) : (
                    setQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all">
                        <div className="flex justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                              {q.code && <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{q.code}</span>}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${q.correctAnswer === 'C' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                                {q.correctAnswer === 'C' ? 'CERTO' : 'ERRADO'}
                              </span>
                            </div>
                            <p className="text-slate-200 text-sm line-clamp-3 italic">"{q.text}"</p>
                          </div>
                          <button 
                            onClick={() => deleteQuestion(q.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors self-start"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-800 text-slate-600">
              <FileText size={48} className="mb-4 opacity-10" />
              <p>Selecione um caderno para gerenciar as questões.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddingSet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.form 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onSubmit={handleCreateSet}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-bold text-white">Novo Caderno</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Nome do Caderno</label>
                  <input
                    autoFocus
                    required
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    placeholder="Ex: Auditor 2025 - Administrativo"
                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Disciplina</label>
                  <input
                    value={newSetDiscipline}
                    onChange={(e) => setNewSetDiscipline(e.target.value)}
                    placeholder="Ex: Direito Administrativo"
                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAddingSet(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-bold shadow-lg shadow-blue-900/20"
                >
                  Criar
                </button>
              </div>
            </motion.form>
          </div>
        )}

        {isBatchImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-2xl shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Importação em Lote</h3>
                <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-colors border border-slate-700">
                  <Upload size={14} className="inline mr-2" />
                  Carregar TXT
                  <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Use o formato:<br/>
                  <code className="bg-slate-800 p-2 block mt-1 rounded text-blue-400">
                    Q: Texto da questão<br/>
                    A: C<br/>
                    E: Explicação<br/>
                    C: #12345<br/>
                    ---
                  </code>
                </p>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder="Cole as questões aqui..."
                  rows={10}
                  className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsBatchImport(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBatchImport}
                  className="flex-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-bold shadow-lg shadow-green-900/20"
                >
                  Importar {batchText.split('---').filter(b => b.trim()).length} Blocos
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.form 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onSubmit={handleAddManualQuestion}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-xl shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-bold text-white">Nova Questão</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Texto da Questão</label>
                  <textarea
                    autoFocus
                    required
                    value={manualQuestion.text}
                    onChange={(e) => setManualQuestion({...manualQuestion, text: e.target.value})}
                    placeholder="Enunciado completo..."
                    rows={4}
                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Gabarito</label>
                    <div className="flex bg-slate-800 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setManualQuestion({...manualQuestion, correctAnswer: 'C'})}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${manualQuestion.correctAnswer === 'C' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        CERTO
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualQuestion({...manualQuestion, correctAnswer: 'E'})}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${manualQuestion.correctAnswer === 'E' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        ERRADO
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Código (#ID)</label>
                    <input
                      value={manualQuestion.code}
                      onChange={(e) => setManualQuestion({...manualQuestion, code: e.target.value})}
                      placeholder="Opcional"
                      className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Explicação / Resolução</label>
                  <textarea
                    value={manualQuestion.explanation}
                    onChange={(e) => setManualQuestion({...manualQuestion, explanation: e.target.value})}
                    placeholder="Comentário do professor..."
                    rows={3}
                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAddingQuestion(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-bold shadow-lg shadow-blue-900/20"
                >
                  Cadastrar
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
