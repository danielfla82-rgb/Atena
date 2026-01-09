import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Type } from "@google/genai";
import { CheckSquare, Square, AlertCircle, ArrowUpCircle, CheckCircle2, ListChecks, Search, BrainCircuit, Loader2, Sparkles, ChevronDown, ChevronUp, FileWarning, ExternalLink, Plus, BookOpen, X, FileText, Calendar, Target, TrendingUp, Clock, Info, Medal, Layers } from 'lucide-react';
import { EditalDiscipline, EditalTopic, Weight, Relevance, Trend, ScheduleItem, Notebook } from '../types';

interface Props {
    onNavigate: (view: string) => void;
}

export const VerticalizedEdital: React.FC<Props> = ({ onNavigate }) => {
  const { notebooks, config, updateConfig, setFocusedNotebookId, setPendingCreateData, activeCycleId, cycles } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedDiscipline, setExpandedDiscipline] = useState<string | null>(null);
  
  // Reprocess Modal State
  const [showReprocessModal, setShowReprocessModal] = useState(false);
  const [localEditalText, setLocalEditalText] = useState('');

  const openReprocessModal = () => {
      setLocalEditalText(config.editalText || '');
      setShowReprocessModal(true);
  };

  // --- ROBUST MATCHING LOGIC (V2: STRICTER JACCARD) ---
  const getTokens = (str: string) => {
      const stopWords = new Set(['de', 'da', 'do', 'dos', 'das', 'em', 'na', 'no', 'para', 'com', 'por', 'que', 'os', 'as', 'um', 'uma']);
      return str.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
          .replace(/[^a-z0-9\s]/g, "") // Remove punctuation
          .split(/\s+/)
          .filter(w => w.length > 2 && isNaN(Number(w)) && !stopWords.has(w)); // Ignore small words, numbers & stopWords
  };

  // Checks similarity between two strings (0 to 1)
  const calculateSimilarity = useCallback((str1: string, str2: string) => {
      const t1 = getTokens(str1);
      const t2 = getTokens(str2);
      
      if (t1.length === 0 || t2.length === 0) return 0;

      const set1 = new Set(t1);
      const set2 = new Set(t2);
      
      // Intersection
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      
      // Union
      const union = new Set([...set1, ...set2]);
      
      // Jaccard Index
      return intersection.size / union.size;
  }, []);

  const findMatchingNotebook = useCallback((topicName: string, disciplineName: string, allNotebooks: Notebook[]) => {
      // 1. Strict Discipline Filter
      // The notebook discipline must match the edital discipline with High Similarity (0.5+)
      const candidates = allNotebooks.filter(nb => {
          const discScore = calculateSimilarity(nb.discipline, disciplineName);
          return discScore >= 0.4; // Slightly lenient for discipline names (e.g. "Dir. Const" vs "Direito Constitucional")
      });
      
      // 2. Filter by Topic Name (High Threshold)
      const match = candidates.find(nb => {
          // Check Name
          const nameScore = calculateSimilarity(nb.name, topicName);
          if (nameScore >= 0.65) return true; // High confidence match

          // Check Subtitle (often users put the specific topic here)
          if (nb.subtitle) {
              const subScore = calculateSimilarity(nb.subtitle, topicName);
              if (subScore >= 0.65) return true;
          }
          
          return false;
      });

      return match;
  }, [calculateSimilarity]);

  // --- AUTO CHECK LOGIC (SYNC WITH MASTERY) ---
  useEffect(() => {
      if (!config.structuredEdital) return;

      let hasChanges = false;
      const newEdital = config.structuredEdital.map(discipline => ({
          ...discipline,
          topics: discipline.topics.map(topic => {
              // 1. Find matching notebook
              const match = findMatchingNotebook(topic.name, discipline.name, notebooks);

              // 2. Check Mastery Condition (Auto-Complete)
              // Só marca automaticamente se o usuário JÁ atingiu a meta no caderno vinculado.
              const isMastered = match ? (match.accuracy >= match.targetAccuracy && match.accuracy > 0) : false;

              // Se já está marcado, mantém (respeita marcação manual).
              // Se não está marcado, mas atingiu a meta, marca.
              if (!topic.checked && isMastered) {
                  hasChanges = true;
                  return { ...topic, checked: true };
              }
              
              return topic;
          })
      }));

      if (hasChanges) {
          updateConfig({ ...config, structuredEdital: newEdital });
      }
  }, [notebooks, config.structuredEdital, findMatchingNotebook]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      if (!config.structuredEdital) return null;

      let totalTopics = 0;
      let completedTopics = 0;

      config.structuredEdital.forEach(d => {
          totalTopics += d.topics.length;
          completedTopics += d.topics.filter(t => t.checked).length;
      });

      const pendingTopics = totalTopics - completedTopics;
      let daysRemaining = 0;
      let pace = 0; // Topics per day

      if (config.examDate) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const exam = new Date(config.examDate);
          
          const diffTime = exam.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (daysRemaining > 0 && pendingTopics > 0) {
              pace = Number((pendingTopics / daysRemaining).toFixed(1));
          }
      }

      return { totalTopics, completedTopics, pendingTopics, daysRemaining, pace };
  }, [config.structuredEdital, config.examDate]);

  // --- AI PROCESSING ---
  const processEditalWithAI = async () => {
      const textToProcess = localEditalText || config.editalText;

      if (!textToProcess || textToProcess.length < 50) {
          alert("Por favor, insira o texto do Conteúdo Programático.");
          return;
      }

      setIsProcessing(true);
      const ai = createAIClient();

      try {
          if (localEditalText && localEditalText !== config.editalText) {
              updateConfig({ ...config, editalText: localEditalText });
          }

          const prompt = `
            Você é um especialista em concursos públicos.
            Analise o seguinte texto de edital e estruture-o.
            
            TEXTO:
            ${textToProcess.substring(0, 30000)} 
            
            Retorne APENAS JSON:
            { "disciplines": [ { "name": "Nome", "topics": [ { "name": "Tópico" } ] } ] }
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });

          if (response.text) {
              const result = JSON.parse(response.text);
              const structured: EditalDiscipline[] = result.disciplines.map((d: any) => ({
                  name: d.name,
                  topics: d.topics.map((t: any) => ({
                      name: t.name,
                      probability: 'Média', 
                      checked: false
                  }))
              }));
              
              updateConfig({ ...config, structuredEdital: structured, editalText: textToProcess });
              setShowReprocessModal(false);
          }

      } catch (error) {
          console.error("Erro ao processar edital:", error);
          alert("Erro ao processar. Tente novamente.");
      } finally {
          setIsProcessing(false);
      }
  };

  // --- TOPIC CHECKING LOGIC ---
  const toggleCheck = (disciplineName: string, topicName: string) => {
      if (!config.structuredEdital) return;

      const newEdital = config.structuredEdital.map(d => {
          if (d.name !== disciplineName) return d;
          return {
              ...d,
              topics: d.topics.map(t => {
                  if (t.name !== topicName) return t;
                  return { ...t, checked: !t.checked };
              })
          };
      });

      updateConfig({ ...config, structuredEdital: newEdital });
  };

  // --- NEW: TOGGLE ALL IN DISCIPLINE ---
  const toggleAllDisciplineTopics = (disciplineName: string, shouldCheck: boolean, event: React.MouseEvent) => {
      event.stopPropagation(); // Prevents expanding/collapsing the accordion
      if (!config.structuredEdital) return;

      const newEdital = config.structuredEdital.map(d => {
          if (d.name !== disciplineName) return d;
          return {
              ...d,
              topics: d.topics.map(t => ({ ...t, checked: shouldCheck }))
          };
      });

      updateConfig({ ...config, structuredEdital: newEdital });
  };

  const handleTopicClick = (topicName: string, disciplineName: string, existingId?: string) => {
      if (existingId) {
          setFocusedNotebookId(existingId);
          onNavigate('library');
      } else {
          setPendingCreateData({
              name: topicName,
              discipline: disciplineName
          });
          onNavigate('library');
      }
  };

  const calculateProbability = useCallback((topicName: string, disciplineName: string) => {
      const match = findMatchingNotebook(topicName, disciplineName, notebooks);

      if (!match) return { label: 'Desconhecida', score: 0, color: 'text-slate-500 border-slate-700' };

      const weightMap: Record<Weight, number> = { [Weight.BAIXO]: 1, [Weight.MEDIO]: 2, [Weight.ALTO]: 3, [Weight.MUITO_ALTO]: 4 };
      const relevanceMap: Record<Relevance, number> = { [Relevance.BAIXA]: 1, [Relevance.MEDIA]: 2, [Relevance.ALTA]: 3, [Relevance.ALTISSIMA]: 4 };
      const trendMap: Record<Trend, number> = { [Trend.BAIXA]: 1, [Trend.ESTAVEL]: 2, [Trend.ALTA]: 3 };

      const w = weightMap[match.weight];
      const r = relevanceMap[match.relevance];
      const t = trendMap[match.trend];

      const rawScore = (w * 0.5) + (r * 0.3) + (t * 0.2);
      const score = (rawScore / 3.8) * 10;
      const roundedScore = Math.round(score * 10) / 10;

      let label = 'Baixa';
      let color = 'text-blue-400 bg-blue-900/20 border-blue-500/30';

      if (score >= 7.5) {
          label = 'Alta';
          color = 'text-red-400 bg-red-900/20 border-red-500/30';
      } else if (score >= 4.5) {
          label = 'Média';
          color = 'text-amber-400 bg-amber-900/20 border-amber-500/30';
      }

      return { label, score: roundedScore, color };

  }, [notebooks, findMatchingNotebook]);

  const getTopicStatus = useCallback((topicName: string, disciplineName: string) => {
      const match = findMatchingNotebook(topicName, disciplineName, notebooks);

      if (!match) {
          return { 
              weeksLabel: null,
              isScheduled: false,
              matchesCount: 0,
              matchedId: undefined,
              isMastered: false,
              accuracy: 0,
              target: 0
          };
      }

      const activeCycle = cycles.find(c => c.id === activeCycleId);
      const scheduledWeeks = new Set<string>();
      
      if (activeCycle?.schedule) {
          Object.entries(activeCycle.schedule).forEach(([weekId, slots]) => {
              const typedSlots = slots as ScheduleItem[];
              if (typedSlots.some(slot => slot && slot.notebookId === match.id)) {
                  scheduledWeeks.add(weekId);
              }
          });
      } else if (match.weekId) {
          scheduledWeeks.add(match.weekId);
      }

      const weeksArray = Array.from(scheduledWeeks).sort((a,b) => {
          const numA = parseInt(a.replace('week-', '')) || 0;
          const numB = parseInt(b.replace('week-', '')) || 0;
          return numA - numB;
      }).map(w => w.replace('week-', 'Sem '));

      return { 
          weeksLabel: weeksArray.length > 0 ? weeksArray.join(', ') : null,
          isScheduled: weeksArray.length > 0,
          matchesCount: 1,
          matchedId: match.id,
          isMastered: match.accuracy >= match.targetAccuracy && match.accuracy > 0,
          accuracy: match.accuracy,
          target: match.targetAccuracy
      };
  }, [notebooks, activeCycleId, cycles, findMatchingNotebook]);

  // --- FILTERING ---
  const displayData = useMemo(() => {
      if (!config.structuredEdital) return [];
      if (!searchTerm) return config.structuredEdital;
      const lowerSearch = searchTerm.toLowerCase();
      return config.structuredEdital.map(d => ({
          ...d,
          topics: d.topics.filter(t => 
              t.name.toLowerCase().includes(lowerSearch) || 
              d.name.toLowerCase().includes(lowerSearch)
          )
      })).filter(d => d.topics.length > 0);
  }, [config.structuredEdital, searchTerm]);

  // --- RENDER ---
  if (!config.structuredEdital || config.structuredEdital.length === 0) {
      return (
          <div className="p-6 max-w-4xl mx-auto h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
                  <ListChecks size={64} className="text-emerald-500 mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-white mb-2">Edital Verticalizado Inteligente</h2>
                  <p className="text-slate-400 text-sm mb-6">
                      Ainda não processamos seu edital. A IA irá ler o conteúdo programático, estruturar os tópicos e calcular a probabilidade de cobrança.
                  </p>
                  
                  <div className="mb-4 text-left">
                        <textarea 
                            value={localEditalText}
                            onChange={(e) => setLocalEditalText(e.target.value)}
                            placeholder="Cole o Conteúdo Programático do Edital aqui..."
                            className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white text-xs font-mono focus:border-emerald-500 outline-none resize-none custom-scrollbar"
                        />
                  </div>

                  <button 
                      onClick={processEditalWithAI} 
                      disabled={isProcessing || !localEditalText}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
                  >
                      {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                      {isProcessing ? "IA Analisando Edital..." : "Gerar Edital Verticalizado"}
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-6 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ListChecks className="text-emerald-500" /> Edital Verticalizado
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Auditoria de cobertura, análise de probabilidade e cruzamento com o ciclo.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Filtrar tópicos..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-emerald-500 outline-none"
                />
             </div>
             <button onClick={openReprocessModal} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 font-medium text-xs transition-colors shadow-sm">
                 <Sparkles size={14} className="text-emerald-500" /> Reprocessar
             </button>
        </div>
      </div>

      {/* --- INTELLIGENCE PANEL (STATS) --- */}
      {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
                  <div className="p-3 bg-slate-800 rounded-lg text-slate-400"><BookOpen size={20} /></div>
                  <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total de Tópicos</p>
                      <p className="text-2xl font-bold text-white">{stats.totalTopics}</p>
                  </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
                  <div className="p-3 bg-emerald-900/20 rounded-lg text-emerald-500"><CheckCircle2 size={20} /></div>
                  <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Concluídos</p>
                      <p className="text-2xl font-bold text-emerald-400">{stats.completedTopics} <span className="text-xs text-slate-500 font-normal">({Math.round((stats.completedTopics/stats.totalTopics)*100)}%)</span></p>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-1000" style={{ width: `${(stats.completedTopics/stats.totalTopics)*100}%` }}></div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
                  <div className="p-3 bg-blue-900/20 rounded-lg text-blue-500"><Calendar size={20} /></div>
                  <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dias Restantes</p>
                      <p className="text-2xl font-bold text-blue-400">{stats.daysRemaining > 0 ? stats.daysRemaining : '--'}</p>
                  </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden shadow-lg shadow-emerald-900/10">
                  <div className="p-3 bg-emerald-500 rounded-lg text-white shadow-md"><TrendingUp size={20} /></div>
                  <div>
                      <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Meta Diária</p>
                      <p className="text-2xl font-bold text-white">
                          {stats.pace > 0 ? stats.pace : '?'} <span className="text-xs text-slate-400 font-normal">tópicos/dia</span>
                      </p>
                  </div>
              </div>
          </div>
      )}

      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {displayData.map((discipline) => {
              const isExpanded = expandedDiscipline === discipline.name;
              const totalTopics = discipline.topics.length;
              const checkedTopics = discipline.topics.filter(t => t.checked).length;
              const progress = Math.round((checkedTopics / totalTopics) * 100);
              const isAllChecked = checkedTopics === totalTopics;
              
              return (
                  <div key={discipline.name} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all">
                      {/* Header */}
                      <div 
                        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                        onClick={() => setExpandedDiscipline(isExpanded ? null : discipline.name)}
                      >
                          <div className="flex items-center gap-4">
                              <div className="bg-slate-800 p-2 rounded-lg text-emerald-500">
                                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </div>
                              <div>
                                  <h3 className="font-bold text-white text-lg">{discipline.name}</h3>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                      <span>{totalTopics} tópicos</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                              {/* Bulk Toggle Button - Only visible on hover/expand or if progress > 0 for UX */}
                              <button 
                                onClick={(e) => toggleAllDisciplineTopics(discipline.name, !isAllChecked, e)}
                                className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors flex items-center gap-1 ${isAllChecked ? 'text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800' : 'text-emerald-500 border-emerald-500/30 hover:bg-emerald-900/20'}`}
                                title={isAllChecked ? "Desmarcar Todos" : "Marcar Todos como Concluído"}
                              >
                                  {isAllChecked ? <Square size={12}/> : <CheckSquare size={12}/>}
                                  {isAllChecked ? "Desmarcar" : "Marcar Tudo"}
                              </button>

                              <div className="flex items-center gap-4">
                                  <div className="hidden md:block w-32 h-2 bg-slate-950 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                  </div>
                                  <span className="text-sm font-bold text-emerald-400 w-8 text-right">{progress}%</span>
                              </div>
                          </div>
                      </div>

                      {/* Topics Table */}
                      {isExpanded && (
                          <div className="border-t border-slate-800">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left text-sm text-slate-400">
                                      <thead className="bg-slate-950/50 text-xs uppercase font-bold text-slate-500">
                                          <tr>
                                              <th className="p-4 w-16 text-center">Status</th>
                                              <th className="p-4">Tópico</th>
                                              <th className="p-4 w-40 text-center">Probabilidade (Score)</th>
                                              <th className="p-4 w-32 text-center">Planejamento</th>
                                              <th className="p-4 w-32 text-center">Ação</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/50">
                                          {discipline.topics.map((topic, idx) => {
                                              const stats = getTopicStatus(topic.name, discipline.name);
                                              const prob = calculateProbability(topic.name, discipline.name);
                                              
                                              return (
                                                  <tr key={idx} className="hover:bg-slate-800/20 transition-colors group">
                                                      <td className="p-4 text-center">
                                                          <button onClick={(e) => { e.stopPropagation(); toggleCheck(discipline.name, topic.name); }} className="text-slate-500 hover:text-emerald-500 transition-colors">
                                                              {topic.checked ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                                                          </button>
                                                      </td>
                                                      <td 
                                                        className={`p-4 font-medium cursor-pointer hover:text-emerald-400 transition-colors ${topic.checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                                                        onClick={() => handleTopicClick(topic.name, discipline.name, stats.matchedId)}
                                                      >
                                                          {topic.name}
                                                          <div className="flex gap-2 items-center mt-1">
                                                              {stats.matchedId && <span className="text-[9px] text-slate-600 bg-slate-900 border border-slate-700 px-1 rounded inline-block">Integrado</span>}
                                                              {stats.isMastered && <span className="text-[9px] text-emerald-400 bg-emerald-900/20 border border-emerald-500/20 px-1 rounded inline-flex items-center gap-0.5"><Medal size={8}/> Dominado</span>}
                                                              {stats.matchedId && (
                                                                  <span className={`text-[9px] px-1.5 rounded font-bold border ${stats.accuracy >= stats.target ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10'}`}>
                                                                      {stats.accuracy}% <span className="opacity-50">/ {stats.target}%</span>
                                                                  </span>
                                                              )}
                                                          </div>
                                                      </td>
                                                      <td className="p-4 text-center">
                                                          <div className="flex flex-col items-center">
                                                              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${prob.color}`}>
                                                                  {prob.label}
                                                              </span>
                                                              {prob.score > 0 && <span className="text-[9px] text-slate-600 mt-0.5 font-mono">Score: {prob.score}/10</span>}
                                                          </div>
                                                      </td>
                                                      <td className="p-4 text-center">
                                                          {stats.isScheduled ? (
                                                              <span className="flex items-center justify-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-900/10 border border-emerald-500/20 px-2 py-1 rounded">
                                                                  <Calendar size={12} /> {stats.weeksLabel}
                                                              </span>
                                                          ) : (
                                                              <span className="text-slate-600 text-xs italic">Não alocado</span>
                                                          )}
                                                      </td>
                                                      <td className="p-4 text-center">
                                                          <button 
                                                            onClick={() => handleTopicClick(topic.name, discipline.name, stats.matchedId)}
                                                            className={`
                                                                flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg
                                                                ${stats.matchedId 
                                                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white' 
                                                                    : 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white'}
                                                            `}
                                                            title={stats.matchedId ? "Ir para o Caderno" : "Criar Caderno"}
                                                          >
                                                              {stats.matchedId ? (
                                                                  <>
                                                                    <ExternalLink size={12} /> Abrir
                                                                  </>
                                                              ) : (
                                                                  <>
                                                                    <Plus size={12} /> Criar
                                                                  </>
                                                              )}
                                                          </button>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}
                  </div>
              );
          })}
      </div>

      {/* REPROCESS MODAL */}
      {showReprocessModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Sparkles size={20} className="text-emerald-500"/> Reprocessar Edital
                      </h3>
                      <button onClick={() => setShowReprocessModal(false)} className="text-slate-400 hover:text-white transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                      <div className="bg-amber-900/20 border border-amber-500/20 p-4 rounded-lg mb-4 flex gap-3">
                          <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                          <p className="text-amber-200 text-sm">
                              Isso irá reestruturar todos os tópicos listados abaixo com base no novo texto. 
                              O status de "concluído" (checkbox) dos tópicos pode ser resetado se os nomes mudarem drasticamente.
                          </p>
                      </div>

                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase flex items-center gap-2">
                          <FileText size={14}/> Conteúdo Programático (Ctrl+V)
                      </label>
                      <textarea 
                          value={localEditalText}
                          onChange={(e) => setLocalEditalText(e.target.value)}
                          placeholder="Cole aqui o texto do edital..."
                          className="w-full h-64 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white text-xs font-mono focus:border-emerald-500 outline-none resize-none custom-scrollbar"
                      />
                  </div>

                  <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                      <button 
                          onClick={() => setShowReprocessModal(false)} 
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={processEditalWithAI} 
                          disabled={isProcessing || !localEditalText}
                          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                          {isProcessing ? "Processando..." : "Confirmar e Processar"}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};