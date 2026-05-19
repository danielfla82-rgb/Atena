import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Link as LinkIcon, Calendar, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { useStore, useMergedDisciplines } from '../store';
import { MockExam, MockExamResult } from '../types';

const NotesTextarea: React.FC<{ initialNotes: string, onSave: (val: string) => void }> = ({ initialNotes, onSave }) => {
  const [value, setValue] = useState(initialNotes);
  
  useEffect(() => {
    setValue(initialNotes);
  }, [initialNotes]);

  return (
    <textarea
      placeholder="Anotações sobre este certame..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initialNotes) {
          onSave(value);
        }
      }}
      className="w-full h-full min-h-[60px] p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded resize-none focus:outline-none focus:border-orange-500 text-slate-700 dark:text-slate-300 custom-scrollbar"
    />
  );
};

export const Simulados: React.FC = () => {
  const { mockExams, mockExamResults, addMockExam, deleteMockExam, addMockExamResult, editMockExamResult, addDiscipline } = useStore();
  const disciplines = useMergedDisciplines();
  
  const [newExamName, setNewExamName] = useState('');
  const [newExamBoard, setNewExamBoard] = useState('');
  const [isAddingExam, setIsAddingExam] = useState(false);

  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [isAddingDiscipline, setIsAddingDiscipline] = useState(false);

  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  React.useEffect(() => {
    const updateWidth = () => {
      if (bottomScrollRef.current) {
         setScrollWidth(bottomScrollRef.current.scrollWidth);
      }
    };
    
    updateWidth();
    const t = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => {
       clearTimeout(t);
       window.removeEventListener('resize', updateWidth);
    };
  }, [mockExams, disciplines]);

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bottomScrollRef.current && topScrollRef.current) {
      if (Math.abs(bottomScrollRef.current.scrollLeft - topScrollRef.current.scrollLeft) > 1) {
         bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      }
    }
  };

  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current && bottomScrollRef.current) {
      if (Math.abs(topScrollRef.current.scrollLeft - bottomScrollRef.current.scrollLeft) > 1) {
         topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
      }
    }
  };

  const handleAddExam = async () => {
    if (!newExamName.trim()) return;
    await addMockExam({ name: newExamName, board: newExamBoard });
    setNewExamName('');
    setNewExamBoard('');
    setIsAddingExam(false);
  };

  const handleAddDiscipline = async () => {
    if (!newDisciplineName.trim()) return;
    await addDiscipline({ name: newDisciplineName });
    setNewDisciplineName('');
    setIsAddingDiscipline(false);
  };

  const getResult = (examId: string, disciplineName: string) => {
    return mockExamResults.find(r => r.examId === examId && r.discipline === disciplineName);
  };

  const handleResultChange = async (examId: string, disciplineName: string, field: 'accuracy' | 'tecLink' | 'tecAverage', value: string | number) => {
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div 
          className="overflow-x-auto overflow-y-hidden custom-scrollbar"
          ref={topScrollRef}
          onScroll={handleTopScroll}
        >
          <div style={{ width: scrollWidth > 0 ? scrollWidth : '100%', height: '1px' }}></div>
        </div>
        <div 
          className="overflow-x-auto custom-scrollbar"
          ref={bottomScrollRef}
          onScroll={handleBottomScroll}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 z-10 w-[220px] min-w-[220px] max-w-[220px]">
                  Disciplinas
                </th>
                {mockExams.map(exam => {
                  const examResults = mockExamResults.filter(r => r.examId === exam.id && r.accuracy !== undefined && r.accuracy > 0);
                  const averageAccuracy = examResults.length > 0 
                    ? Math.round(examResults.reduce((acc, curr) => acc + curr.accuracy, 0) / examResults.length)
                    : 0;
                  return (
                  <th key={exam.id} className="p-4 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 min-w-[320px] w-[350px] align-top">
                    <div className="flex flex-col h-full gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            {exam.name}
                            {averageAccuracy > 0 && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                                Média: {averageAccuracy}%
                              </span>
                            )}
                          </div>
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
                      
                      <div className="mt-2 flex-grow">
                        <NotesTextarea
                          initialNotes={exam.notes || ''}
                          onSave={(val) => editMockExam(exam.id, { notes: val })}
                        />
                      </div>
                    </div>
                  </th>
                )})}
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
                  <td className="p-4 border-b border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 w-[220px] min-w-[220px] max-w-[220px] whitespace-normal break-words">
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
                              <>
                                {(result.tecAverage && result.accuracy < result.tecAverage) ? (
                                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0" title="Atenção !! Abaixo da média">
                                    <AlertTriangle size={16} />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0" title="Resultado salvo">
                                    <CheckCircle size={16} />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
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
                            
                            <div className="relative w-28 flex-shrink-0" title="Taxa de acerto médio TEC">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="TEC"
                                value={result?.tecAverage || ''}
                                onChange={e => handleResultChange(exam.id, discipline.name, 'tecAverage', Number(e.target.value))}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-shadow"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium">%</span>
                            </div>
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
              <tr>
                <td className="p-4 border-b border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-10 w-[220px] min-w-[220px] max-w-[220px]">
                  {!isAddingDiscipline ? (
                    <button onClick={() => setIsAddingDiscipline(true)} className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 font-medium hover:text-orange-700 dark:hover:text-orange-300 transition-colors">
                      <Plus size={16} /> Adicionar Disciplina
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                       <input 
                         type="text" 
                         value={newDisciplineName} 
                         onChange={e => setNewDisciplineName(e.target.value)} 
                         placeholder="Nome da disciplina"
                         autoFocus
                         className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded flex-1 text-sm text-slate-900 dark:text-white outline-none focus:border-orange-500"
                       />
                       <div className="flex items-center gap-2">
                         <button onClick={handleAddDiscipline} className="px-3 py-1 text-xs font-bold bg-orange-600 text-white rounded hover:bg-orange-700">Salvar</button>
                         <button onClick={() => setIsAddingDiscipline(false)} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Cancelar</button>
                       </div>
                    </div>
                  )}
                </td>
                {mockExams.map(exam => (
                   <td key={`empty-${exam.id}`} className="p-4 border-b border-r border-slate-200 dark:border-slate-800"></td>
                ))}
                {mockExams.length === 0 && (
                   <td className="p-4 border-b border-slate-200 dark:border-slate-800"></td>
                )}
              </tr>
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
