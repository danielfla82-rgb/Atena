import React, { useState } from 'react';
import { useStore } from '../../store';
import { QuestionItem } from '../../types';
import { Plus, Trash2, FileText, Upload, ChevronRight, Book, Pencil, Globe, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';

export function QuestionManager() {
  const { questionSets, addQuestionSet, editQuestionSet, deleteQuestionSet, questions, addQuestions, deleteQuestion, user } = useStore();
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [isAddingSet, setIsAddingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDiscipline, setNewSetDiscipline] = useState('');
  const [newSetObs1, setNewSetObs1] = useState('');
  const [newSetObs2, setNewSetObs2] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditingSet, setIsEditingSet] = useState(false);
  const [editSetData, setEditSetData] = useState({ name: '', discipline: '', obs1: '', obs2: '' });
  
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isBatchImport, setIsBatchImport] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [isSyncingBulk, setIsSyncingBulk] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  
  const [isSpecificSyncModalOpen, setIsSpecificSyncModalOpen] = useState(false);
  const [targetStudentEmail, setTargetStudentEmail] = useState('');
  const [targetSyncMessage, setTargetSyncMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);
  const [isSyncingSpecific, setIsSyncingSpecific] = useState(false);

  const isAdmin = user?.email === 'danielfla82@gmail.com' || user?.email === 'dcsrj@hotmail.com';
  
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
      discipline: newSetDiscipline,
      obs1: newSetObs1,
      obs2: newSetObs2
    });
    setNewSetName('');
    setNewSetDiscipline('');
    setNewSetObs1('');
    setNewSetObs2('');
    setIsAddingSet(false);
    setSelectedSetId(id);
  };

  const handleSaveEditSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSetId || !editSetData.name) return;
    await editQuestionSet(selectedSetId, editSetData);
    setIsEditingSet(false);
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
      const qMatch = block.match(/Q:\s*([\s\S]*?)(?=\n[AEC]:|$)/i);
      const aMatch = block.match(/A:\s*(C|E)/i);
      const eMatch = block.match(/E:\s*([\s\S]*?)(?=\n[AQC]:|$)/i);
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

  const filteredSets = questionSets.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.discipline?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.obs1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.obs2?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="flex items-center gap-3 relative">
          {isAdmin && (
             <div className="relative">
                 <button 
                    onClick={async () => {
                        if(isSyncingBulk) return;
                        setIsSyncingBulk(true);
                        setSyncResult(null);
                        try {
                            const { data: globals } = await supabase.from('question_sets').select('name, discipline').is('user_id', null);
                            const userSets = questionSets.filter(s => true); // Admin has both, we can sync all his local sets
                            let count = 0;
                            
                            for (const qs of userSets) {
                                const exists = globals?.find(g => g.name === qs.name && g.discipline === qs.discipline);
                                if (!exists) {
                                    const { error: setErr } = await supabase.from('question_sets').insert({
                                        id: qs.id,
                                        user_id: null,
                                        name: qs.name,
                                        discipline: qs.discipline,
                                        subject: qs.subject,
                                        obs1: qs.obs1,
                                        obs2: qs.obs2,
                                        created_at: qs.createdAt
                                    });
                                    if (setErr) console.error(setErr);
                                    
                                    const qsQs = questions.filter(q => q.setId === qs.id);
                                    if(qsQs.length > 0) {
                                        const { error: qErr } = await supabase.from('questions').insert(
                                            qsQs.map(q => ({
                                                id: q.id,
                                                set_id: qs.id,
                                                user_id: null,
                                                text: q.text,
                                                correct_answer: q.correctAnswer,
                                                explanation: q.explanation,
                                                code: q.code,
                                                discipline: q.discipline,
                                                subject: q.subject,
                                                created_at: q.createdAt
                                            }))
                                        );
                                        if(qErr) console.error(qErr);
                                    }
                                    count++;
                                }
                            }
                            setSyncResult(`+${count} cadernos publicados`);
                        } catch (e) {
                            console.error(e);
                            setSyncResult("Erro sync");
                        } finally {
                            setIsSyncingBulk(false);
                            setTimeout(() => setSyncResult(null), 3000);
                        }
                    }}
                    disabled={isSyncingBulk}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                    title="Publicar todos os meus cadernos para os usuários"
                 >
                    {isSyncingBulk ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />} 
                    <span className="hidden md:inline">{isSyncingBulk ? "Sincronizando..." : "Sync Templates"}</span>
                 </button>
                 {syncResult && <span className="absolute -bottom-6 text-xs font-bold text-indigo-400 whitespace-nowrap">{syncResult}</span>}
             </div>
          )}
          <button 
            onClick={() => setIsAddingSet(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={20} />
            Novo Caderno
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Sets List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Meus Cadernos</h3>
              <input
                type="text"
                placeholder="Filtrar por nome, disciplina, etc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border-none rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
              {filteredSets.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="mx-auto mb-2 opacity-20" size={40} />
                  <p>{questionSets.length === 0 ? 'Nenhum caderno criado.' : 'Nenhum resultado encontrado.'}</p>
                </div>
              ) : (
                filteredSets.map(set => (
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
                    <p className="text-slate-400 text-sm">{setQuestions.length} questões cadastradas</p>
                    
                    {(selectedSet.obs1 || selectedSet.obs2) && (
                      <div className="mt-4 flex flex-col gap-2">
                        {selectedSet.obs1 && (
                          <p className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                            <span className="font-semibold block mb-1 text-xs uppercase text-slate-500">Informação 1</span>
                            {selectedSet.obs1}
                          </p>
                        )}
                        {selectedSet.obs2 && (
                          <p className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                            <span className="font-semibold block mb-1 text-xs uppercase text-slate-500">Informação 2</span>
                            {selectedSet.obs2}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-start shrink-0">
                    <button 
                      onClick={() => {
                        setEditSetData({ name: selectedSet.name, discipline: selectedSet.discipline || '', obs1: selectedSet.obs1 || '', obs2: selectedSet.obs2 || '' });
                        setIsEditingSet(true);
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                      title="Editar Caderno"
                    >
                      <Pencil size={18} />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => setIsSpecificSyncModalOpen(true)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                        title="Mentoria (Sincronização Específica)"
                      >
                        <Upload size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => setIsBatchImport(true)}
                      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors border border-blue-500"
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
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Informação 1</label>
                  <input
                    value={newSetObs1}
                    onChange={(e) => setNewSetObs1(e.target.value)}
                    placeholder="Informação opcional"
                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Informação 2</label>
                  <input
                    value={newSetObs2}
                    onChange={(e) => setNewSetObs2(e.target.value)}
                    placeholder="Informação opcional"
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

        {isEditingSet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.form 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onSubmit={handleSaveEditSet}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-bold text-white">Editar Caderno</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Nome do Caderno</label>
                  <input
                    autoFocus
                    required
                    value={editSetData.name}
                    onChange={(e) => setEditSetData({...editSetData, name: e.target.value})}
                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Disciplina</label>
                  <input
                    value={editSetData.discipline}
                    onChange={(e) => setEditSetData({...editSetData, discipline: e.target.value})}
                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Informação 1</label>
                  <input
                    value={editSetData.obs1}
                    onChange={(e) => setEditSetData({...editSetData, obs1: e.target.value})}
                    placeholder="Informação opcional"
                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wider uppercase">Informação 2</label>
                  <input
                    value={editSetData.obs2}
                    onChange={(e) => setEditSetData({...editSetData, obs2: e.target.value})}
                    placeholder="Informação opcional"
                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsEditingSet(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-bold shadow-lg shadow-blue-900/20"
                >
                  Salvar
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

        {isSpecificSyncModalOpen && selectedSet && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-xl shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Mentoria (Sincronização Específica)</h3>
                <button onClick={() => setIsSpecificSyncModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-400">E-mail do aluno alvo (vazio para ATUALIZAR TODOS que têm este caderno)</p>
                <input 
                  type="email" 
                  placeholder="ex: aluno@email.com" 
                  value={targetStudentEmail} 
                  onChange={e => setTargetStudentEmail(e.target.value)} 
                  className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                />
                {targetSyncMessage && (
                  <div className={`text-sm font-bold p-3 rounded-lg ${targetSyncMessage.type === 'error' ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
                    {targetSyncMessage.text}
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  onClick={() => setIsSpecificSyncModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (isSyncingSpecific) return;
                    setIsSyncingSpecific(true);
                    setTargetSyncMessage(null);
                    try {
                      const qs = setQuestions.map(q => ({
                          text: q.text,
                          correct_answer: q.correctAnswer,
                          explanation: q.explanation || '',
                          code: q.code || '',
                          discipline: q.discipline || '',
                          subject: q.subject || ''
                      }));

                      const { data, error } = await supabase.rpc('admin_sync_question_set', {
                          p_admin_email: user?.email,
                          p_set_name: selectedSet.name,
                          p_discipline: selectedSet.discipline,
                          p_subject: selectedSet.subject,
                          p_obs1: selectedSet.obs1 || '',
                          p_obs2: selectedSet.obs2 || '',
                          p_questions: qs,
                          p_target_email: targetStudentEmail.trim() || null
                      });

                      if (error) throw error;
                      if (data?.success) {
                          setTargetSyncMessage({ text: `Sincronizado! Atualizado(s) ${data.updated} aluno(s).`, type: 'success' });
                          setTimeout(() => { setIsSpecificSyncModalOpen(false); setTargetSyncMessage(null); }, 3000);
                      } else {
                          setTargetSyncMessage({ text: `Erro: ${data?.error}`, type: 'error' });
                      }
                    } catch (e: any) {
                      setTargetSyncMessage({ text: `Erro: ${e.message}`, type: 'error' });
                    } finally {
                      setIsSyncingSpecific(false);
                    }
                  }}
                  disabled={isSyncingSpecific}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-bold disabled:opacity-50"
                >
                  {isSyncingSpecific ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
                  {isSyncingSpecific ? 'Sincronizando...' : 'Sincronizar Caderno'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
