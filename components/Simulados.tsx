import React, { useState } from 'react';
import { Plus, Trash2, Link as LinkIcon, Calendar, CheckCircle, ExternalLink } from 'lucide-react';
import { useStore, useMergedDisciplines } from '../store';
import { MockExam, MockExamResult } from '../types';

export const Simulados: React.FC = () => {
  const { mockExams, mockExamResults, addMockExam, deleteMockExam, addMockExamResult, editMockExamResult } = useStore();
  const disciplines = useMergedDisciplines();
  
  const [newExamName, setNewExamName] = useState('');
  const [newExamBoard, setNewExamBoard] = useState('');
  const [isAddingExam, setIsAddingExam] = useState(false);

  const handleAddExam = async () => {
    if (!newExamName.trim()) return;
    await addMockExam({ name: newExamName, board: newExamBoard });
    setNewExamName('');
    setNewExamBoard('');
    setIsAddingExam(false);
  };

  const getResult = (examId: string, disciplineName: string) => {
    return mockExamResults.find(r => r.examId === examId && r.discipline === disciplineName);
  };

  const handleResultChange = async (examId: string, disciplineName: string, field: 'accuracy' | 'tecLink', value: string | number) => {
    const existing = getResult(examId, disciplineName);
    if (existing) {
      await editMockExamResult(existing.id, { [field]: value, date: new Date().toISOString() });
    } else {
      await addMockExamResult({
        examId,
        discipline: disciplineName,
        [field]: value,
        date: new Date().toISOString()
      });
    }
  };

  return (
    <div
      className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Simulados</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhe seu desempenho em simulados por disciplina.</p>
        </div>
        
        {!isAddingExam ? (
          <button
            onClick={() => setIsAddingExam(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span>Novo Concurso</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <input
              type="text"
              placeholder="Nome do Concurso"
              value={newExamName}
              onChange={e => setNewExamName(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
              autoFocus
            />
            <input
              type="text"
              placeholder="Banca (Opcional)"
              value={newExamBoard}
              onChange={e => setNewExamBoard(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <button
              onClick={handleAddExam}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
            >
              Salvar
            </button>
            <button
              onClick={() => setIsAddingExam(false)}
              className="px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 z-10 min-w-[200px]">
                  Disciplinas
                </th>
                {mockExams.map(exam => (
                  <th key={exam.id} className="p-4 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 min-w-[250px] align-top">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{exam.name}</div>
                        {exam.board && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{exam.board}</div>}
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(exam.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja excluir este concurso e todos os seus resultados?')) {
                            deleteMockExam(exam.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Excluir Concurso"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </th>
                ))}
                {mockExams.length === 0 && (
                  <th className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 font-normal italic text-center">
                    Nenhum concurso adicionado.
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {disciplines.map(discipline => (
                <tr key={discipline.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 border-b border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10">
                    {discipline.name}
                  </td>
                  {mockExams.map(exam => {
                    const result = getResult(exam.id, discipline.name);
                    return (
                      <td key={exam.id} className="p-4 border-b border-r border-slate-200 dark:border-slate-800">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0"
                                value={result?.accuracy || ''}
                                onChange={e => handleResultChange(exam.id, discipline.name, 'accuracy', Number(e.target.value))}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-shadow"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium">%</span>
                            </div>
                            {result?.accuracy !== undefined && result.accuracy > 0 && (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0" title="Resultado salvo">
                                <CheckCircle size={16} />
                              </div>
                            )}
                          </div>
                          
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <LinkIcon size={14} className="text-slate-400 dark:text-slate-500" />
                            </div>
                            <input
                              type="url"
                              placeholder="Link do TEC Concursos"
                              value={result?.tecLink || ''}
                              onChange={e => handleResultChange(exam.id, discipline.name, 'tecLink', e.target.value)}
                              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-shadow"
                            />
                            {result?.tecLink && (
                              <a 
                                href={result.tecLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 p-1"
                                title="Abrir link"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                          
                          {result?.date && (
                            <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Calendar size={12} />
                              Atualizado em {new Date(result.date).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {mockExams.length === 0 && (
                    <td className="p-4 border-b border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 italic">
                      Adicione um concurso para começar.
                    </td>
                  )}
                </tr>
              ))}
              {disciplines.length === 0 && (
                <tr>
                  <td colSpan={mockExams.length + 1} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma disciplina encontrada. Adicione disciplinas no seu edital primeiro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
