import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Type } from "@google/genai";
import { CheckSquare, Square, AlertCircle, ArrowUpCircle, CheckCircle2, ListChecks, Search, BrainCircuit, Loader2, Sparkles, ChevronDown, ChevronUp, FileWarning, ExternalLink, Plus, BookOpen } from 'lucide-react';
import { EditalDiscipline, EditalTopic, Weight, Relevance, Trend } from '../types';

interface Props {
    onNavigate: (view: string) => void;
}

export const VerticalizedEdital: React.FC<Props> = ({ onNavigate }) => {
  const { notebooks, config, updateConfig, setFocusedNotebookId, setPendingCreateData } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedDiscipline, setExpandedDiscipline] = useState<string | null>(null);

  // Normalize string for fuzzy matching (matches topic name to notebook name)
  const normalize = (str: string) => {
      return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  };

  // --- AI PROCESSING ---
  const processEditalWithAI = async () => {
      if (!config.editalText || config.editalText.length < 50) {
          alert("Por favor, insira o texto do Conteúdo Programático na aba 'Planejamento' (Configurar Concurso) antes de processar.");
          return;
      }

      setIsProcessing(true);
      const ai = createAIClient();

      try {
          const prompt = `
            Você é um especialista em concursos públicos.
            Analise o seguinte texto de edital (conteúdo programático) e estruture-o.
            
            TEXTO DO EDITAL:
            ${config.editalText.substring(0, 30000)} 
            
            Retorne APENAS um JSON seguindo este schema:
            {
              "disciplines": [
                {
                  "name": "Nome da Disciplina",
                  "topics": [
                    { "name": "Nome do Tópico" }
                  ]
                }
              ]
            }
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          disciplines: {
                              type: Type.ARRAY,
                              items: {
                                  type: Type.OBJECT,
                                  properties: {
                                      name: { type: Type.STRING },
                                      topics: {
                                          type: Type.ARRAY,
                                          items: {
                                              type: Type.OBJECT,
                                              properties: {
                                                  name: { type: Type.STRING }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      }
                  }
              }
          });

          if (response.text) {
              const result = JSON.parse(response.text);
              // Add 'checked' property initialized to false, 'probability' will be calculated dynamically
              const structured: EditalDiscipline[] = result.disciplines.map((d: any) => ({
                  name: d.name,
                  topics: d.topics.map((t: any) => ({
                      name: t.name,
                      probability: 'Média', // Placeholder, calculated on render
                      checked: false
                  }))
              }));
              
              updateConfig({ ...config, structuredEdital: structured });
          }

      } catch (error) {
          console.error("Erro ao processar edital:", error);
          alert("Erro ao processar o edital com IA. Tente novamente.");
      } finally {
          setIsProcessing(false);
      }
  };

  // --- ACTIONS ---
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

  // --- PROBABILITY CALCULATION ---
  const calculateProbability = useCallback((topicName: string, disciplineName: string) => {
      const normTopic = normalize(topicName);
      const normDisc = normalize(disciplineName);

      // Find best matching notebook
      const match = notebooks.find(nb => {
          const nbDisc = normalize(nb.discipline);
          const discMatch = nbDisc.includes(normDisc) || normDisc.includes(nbDisc);
          if (!discMatch) return false;
          
          const nbName = normalize(nb.name);
          const nbSub = normalize(nb.subtitle || '');
          return nbName.includes(normTopic) || normTopic.includes(nbName) || (nbSub && normTopic.includes(nbSub));
      });

      if (!match) return { label: 'Desconhecida', score: 0, color: 'text-slate-500 border-slate-700' };

      // Map Enums to Numbers
      const weightMap: Record<Weight, number> = { [Weight.BAIXO]: 1, [Weight.MEDIO]: 2, [Weight.ALTO]: 3, [Weight.MUITO_ALTO]: 4 };
      const relevanceMap: Record<Relevance, number> = { [Relevance.BAIXA]: 1, [Relevance.MEDIA]: 2, [Relevance.ALTA]: 3, [Relevance.ALTISSIMA]: 4 };
      const trendMap: Record<Trend, number> = { [Trend.BAIXA]: 1, [Trend.ESTAVEL]: 2, [Trend.ALTA]: 3 };

      // Formula: Weight (50%) + Relevance (30%) + Trend (20%)
      const w = weightMap[match.weight];
      const r = relevanceMap[match.relevance];
      const t = trendMap[match.trend];

      // Max possible raw score: 4*0.5 + 4*0.3 + 3*0.2 = 2.0 + 1.2 + 0.6 = 3.8
      const rawScore = (w * 0.5) + (r * 0.3) + (t * 0.2);
      
      // Normalize to 0-10
      const score = (rawScore / 3.8) * 10;
      const roundedScore = Math.round(score * 10) / 10; // 1 decimal place

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

  }, [notebooks]);

  // --- MATCHING LOGIC ---
  const getTopicStatus = useCallback((topicName: string, disciplineName: string) => {
      const normTopic = normalize(topicName);
      const normDisc = normalize(disciplineName);

      // Find notebooks that match this topic
      const matches = notebooks.filter(nb => {
          const nbDisc = normalize(nb.discipline);
          const discMatch = nbDisc.includes(normDisc) || normDisc.includes(nbDisc);
          if (!discMatch) return false;
          const nbName = normalize(nb.name);
          const nbSub = normalize(nb.subtitle || '');
          return nbName.includes(normTopic) || normTopic.includes(nbName) || (nbSub && normTopic.includes(nbSub));
      });

      const inCycle = matches.some(nb => !!nb.weekId);
      const blocksCount = matches.filter(nb => !!nb.weekId).length; 
      
      const disciplineBlocks = notebooks.filter(nb => {
          const nbDisc = normalize(nb.discipline);
          return (nbDisc.includes(normDisc) || normDisc.includes(nbDisc)) && !!nb.weekId;
      }).length;

      // Return the ID of the first match if any, to allow linking
      return { 
          inCycle, 
          blocksCount, 
          disciplineBlocks, 
          matchesCount: matches.length,
          matchedId: matches.length > 0 ? matches[0].id : undefined 
      };
  }, [notebooks]);

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
                  
                  {!config.editalText ? (
                      <div className="bg-amber-900/20 border border-amber-500/20 p-4 rounded-lg text-amber-200 text-xs mb-4 flex items-center gap-2 text-left">
                          <FileWarning size={24} className="flex-shrink-0" />
                          <span>Você precisa colar o texto do edital em "Planejamento &gt; Configurar Concurso" primeiro.</span>
                      </div>
                  ) : (
                      <button 
                          onClick={processEditalWithAI} 
                          disabled={isProcessing}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
                      >
                          {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                          {isProcessing ? "IA Analisando Edital..." : "Gerar Edital Verticalizado"}
                      </button>
                  )}
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
             <button onClick={processEditalWithAI} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700" title="Reprocessar com IA">
                 <Sparkles size={18} />
             </button>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {displayData.map((discipline) => {
              const isExpanded = expandedDiscipline === discipline.name;
              const totalTopics = discipline.topics.length;
              const checkedTopics = discipline.topics.filter(t => t.checked).length;
              const progress = Math.round((checkedTopics / totalTopics) * 100);

              const sampleStat = getTopicStatus(discipline.topics[0]?.name || '', discipline.name);
              
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
                                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                      <span>{sampleStat.disciplineBlocks} blocos no ciclo</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                              <div className="hidden md:block w-32 h-2 bg-slate-950 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                              </div>
                              <span className="text-sm font-bold text-emerald-400">{progress}%</span>
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
                                              <th className="p-4 w-32 text-center">No Ciclo?</th>
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
                                                          {stats.inCycle ? (
                                                              <span className="flex items-center justify-center gap-1 text-emerald-400 font-bold text-xs">
                                                                  <CheckCircle2 size={14} /> Sim
                                                              </span>
                                                          ) : (
                                                              <span className="text-slate-600 text-xs">Não</span>
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
    </div>
  );
};