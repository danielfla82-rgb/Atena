import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Type } from "@google/genai";
import { CheckSquare, Square, AlertCircle, ArrowUpCircle, CheckCircle2, ListChecks, Search, BrainCircuit, Loader2, Sparkles, ChevronDown, ChevronUp, FileWarning } from 'lucide-react';
import { EditalDiscipline, EditalTopic } from '../types';

export const VerticalizedEdital: React.FC = () => {
  const { notebooks, config, updateConfig } = useStore();
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
            Para cada tópico, estime a probabilidade de cair na prova (Alta, Média, Baixa) baseada no histórico geral de concursos para: ${config.targetRole}.
            
            TEXTO DO EDITAL:
            ${config.editalText.substring(0, 30000)} 
            
            Retorne APENAS um JSON seguindo este schema:
            {
              "disciplines": [
                {
                  "name": "Nome da Disciplina",
                  "topics": [
                    { "name": "Nome do Tópico", "probability": "Alta" | "Média" | "Baixa" }
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
                                                  name: { type: Type.STRING },
                                                  probability: { type: Type.STRING, enum: ['Alta', 'Média', 'Baixa'] }
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
              // Add 'checked' property initialized to false
              const structured: EditalDiscipline[] = result.disciplines.map((d: any) => ({
                  name: d.name,
                  topics: d.topics.map((t: any) => ({
                      name: t.name,
                      probability: t.probability,
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

  // --- MATCHING LOGIC ---
  const getTopicStatus = useCallback((topicName: string, disciplineName: string) => {
      const normTopic = normalize(topicName);
      const normDisc = normalize(disciplineName);

      // Find notebooks that match this topic
      // We look for notebooks where the topic name is included in the notebook name or subtitle
      const matches = notebooks.filter(nb => {
          const nbDisc = normalize(nb.discipline);
          // Discipline check: relaxed check if one includes the other
          const discMatch = nbDisc.includes(normDisc) || normDisc.includes(nbDisc);
          
          if (!discMatch) return false;

          const nbName = normalize(nb.name);
          const nbSub = normalize(nb.subtitle || '');
          
          // Match logic: Topic keywords inside Notebook Name
          return nbName.includes(normTopic) || normTopic.includes(nbName) || (nbSub && normTopic.includes(nbSub));
      });

      const inCycle = matches.some(nb => !!nb.weekId);
      const blocksCount = matches.filter(nb => !!nb.weekId).length; // Just counting active notebooks for this topic
      
      // Calculate discipline frequency (total blocks for this discipline in cycle)
      // This is a bit expensive to calc per topic, but needed for the specific prompt requirement
      const disciplineBlocks = notebooks.filter(nb => {
          const nbDisc = normalize(nb.discipline);
          return (nbDisc.includes(normDisc) || normDisc.includes(nbDisc)) && !!nb.weekId;
      }).length;

      return { inCycle, blocksCount, disciplineBlocks, matchesCount: matches.length };
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

              // Aggregate stats for collapsed view
              // Just sample the first topic to get discipline block count (since it's discipline level)
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
                                              <th className="p-4 w-32 text-center">Probabilidade (IA)</th>
                                              <th className="p-4 w-32 text-center">No Ciclo?</th>
                                              <th className="p-4 w-32 text-center">Freq. Disciplina</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/50">
                                          {discipline.topics.map((topic, idx) => {
                                              const stats = getTopicStatus(topic.name, discipline.name);
                                              const probColor = topic.probability === 'Alta' ? 'text-red-400 bg-red-900/20 border-red-500/30' : topic.probability === 'Média' ? 'text-amber-400 bg-amber-900/20 border-amber-500/30' : 'text-blue-400 bg-blue-900/20 border-blue-500/30';
                                              
                                              return (
                                                  <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                                                      <td className="p-4 text-center">
                                                          <button onClick={(e) => { e.stopPropagation(); toggleCheck(discipline.name, topic.name); }} className="text-slate-500 hover:text-emerald-500 transition-colors">
                                                              {topic.checked ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                                                          </button>
                                                      </td>
                                                      <td className={`p-4 font-medium ${topic.checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                                          {topic.name}
                                                      </td>
                                                      <td className="p-4 text-center">
                                                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${probColor}`}>
                                                              {topic.probability}
                                                          </span>
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
                                                          <span className="bg-slate-800 px-2 py-1 rounded text-xs font-mono text-white">
                                                              {stats.disciplineBlocks}
                                                          </span>
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