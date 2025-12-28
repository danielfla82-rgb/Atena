import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Type } from "@google/genai";
import { 
    CheckSquare, Square, AlertCircle, ArrowUpCircle, CheckCircle2, ListChecks, 
    Search, BrainCircuit, Loader2, Sparkles, ChevronDown, ChevronUp, FileWarning,
    ToggleLeft, ToggleRight, Plus, Link as LinkIcon, ExternalLink, Zap,
    Clock, AlertTriangle, Save, X, Pencil, FileCode, ZoomIn, Trash2, Flag
} from 'lucide-react';
import { EditalDiscipline, EditalTopic, Notebook, NotebookStatus, Weight, Relevance, Trend } from '../types';
import { calculateNextReview } from '../utils/algorithm';

export const VerticalizedEdital: React.FC = () => {
  const { notebooks, config, updateConfig, addNotebook, editNotebook } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedDiscipline, setExpandedDiscipline] = useState<string | null>(null);
  const [sortByPriority, setSortByPriority] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // If null, creates new
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = {
    discipline: '', name: '', subtitle: '', tecLink: '', obsidianLink: '', accuracy: 0, targetAccuracy: 90, 
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, 
    status: NotebookStatus.NOT_STARTED, notes: '', images: [] as string[],
    lastPractice: new Date().toISOString().split('T')[0] 
  };
  const [formData, setFormData] = useState(initialFormState);

  // Normalize string for fuzzy matching
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

  // --- ENHANCED MATCHING LOGIC ---
  const matchesMap = useMemo(() => {
      const map = new Map<string, { 
          inCycle: boolean; 
          notebooks: Notebook[]; 
          avgAccuracy: number;
          lastReviewDate: Date | null;
          daysSinceReview: number;
      }>();
      
      if (!config.structuredEdital) return map;

      const allTopics = config.structuredEdital.flatMap(d => d.topics.map(t => ({ topicName: t.name, discName: d.name })));
      const processedNotebooks = notebooks.map(nb => ({
          ...nb,
          normDisc: normalize(nb.discipline),
          normName: normalize(nb.name),
          normSub: normalize(nb.subtitle || '')
      }));

      const today = new Date();

      allTopics.forEach(({ topicName, discName }) => {
          const normTopic = normalize(topicName);
          const normDisc = normalize(discName);
          const key = `${discName}-${topicName}`;

          const matchedNotebooks: Notebook[] = [];

          processedNotebooks.forEach(nb => {
              const discMatch = nb.normDisc.includes(normDisc) || normDisc.includes(nb.normDisc);
              if (!discMatch) return;
              const nameMatch = nb.normName.includes(normTopic) || normTopic.includes(nb.normName) || (nb.normSub && normTopic.includes(nb.normSub));
              
              if (nameMatch) {
                  matchedNotebooks.push(nb);
              }
          });

          // Aggregate Stats
          let totalAcc = 0;
          let latestDate: Date | null = null;
          let inCycle = false;

          matchedNotebooks.forEach(nb => {
              totalAcc += nb.accuracy;
              if (nb.weekId) inCycle = true;
              if (nb.lastPractice) {
                  const d = new Date(nb.lastPractice);
                  if (!latestDate || d > latestDate) latestDate = d;
              }
          });

          const daysSinceReview = latestDate 
            ? Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)) 
            : 999;

          map.set(key, {
              notebooks: matchedNotebooks,
              avgAccuracy: matchedNotebooks.length > 0 ? Math.round(totalAcc / matchedNotebooks.length) : 0,
              inCycle,
              lastReviewDate: latestDate,
              daysSinceReview
          });
      });

      return map;
  }, [notebooks, config.structuredEdital]);

  // --- ACTIONS ---

  const handleTopicClick = (topicName: string, disciplineName: string) => {
      const stats = matchesMap.get(`${disciplineName}-${topicName}`);
      
      if (stats && stats.notebooks.length > 0) {
          // Open Edit Modal for the best match (or first)
          // Ideally sort by accuracy or recent usage
          const bestMatch = stats.notebooks[0]; 
          openModal(bestMatch);
      } else {
          // Open Create Modal pre-filled
          openModal(null, { discipline: disciplineName, name: topicName });
      }
  };

  const handleCycleToggle = async (topicName: string, disciplineName: string) => {
      const stats = matchesMap.get(`${disciplineName}-${topicName}`);
      
      if (stats && stats.notebooks.length > 0) {
          // Toggle Cycle Status for linked notebooks
          const ids = stats.notebooks.map(n => n.id);
          const newStatus = !stats.inCycle;
          
          // Bulk update notebooks weekId
          // If adding to cycle, assign to 'week-1' (default landing) or null
          const targetWeek = newStatus ? 'week-1' : null;
          
          // We need to update individually as logic might be complex in store
          for (const id of ids) {
              await editNotebook(id, { weekId: targetWeek });
          }
      } else {
          // No notebook exists, prompt creation
          if (confirm(`O tópico "${topicName}" não tem caderno vinculado. Deseja criar um agora para adicionar ao ciclo?`)) {
              openModal(null, { discipline: disciplineName, name: topicName, weekId: 'week-1' });
          }
      }
  };

  // --- MODAL & FORM LOGIC ---
  const openModal = (nb: Notebook | null, defaults?: any) => {
      setEditingId(nb?.id || null);
      
      if (nb) {
          let currentImages = nb.images || [];
          if (currentImages.length === 0 && nb.image) currentImages = [nb.image];
          setFormData({
              discipline: nb.discipline,
              name: nb.name,
              subtitle: nb.subtitle,
              tecLink: nb.tecLink || '',
              obsidianLink: nb.obsidianLink || '',
              accuracy: nb.accuracy,
              targetAccuracy: nb.targetAccuracy,
              weight: nb.weight,
              relevance: nb.relevance,
              trend: nb.trend,
              status: nb.status,
              notes: nb.notes || '',
              images: currentImages,
              lastPractice: nb.lastPractice ? nb.lastPractice.split('T')[0] : new Date().toISOString().split('T')[0]
          });
      } else {
          // Create Mode
          setFormData({
              ...initialFormState,
              discipline: defaults?.discipline || '',
              name: defaults?.name || '',
              // If triggered by toggle, we might want to auto-assign weekId in save handler, 
              // but for now we let the user confirm in the modal if we added that field, 
              // or handle it post-save. Simplified: Standard create.
          });
      }
      setIsModalOpen(true);
  };

  const handleSaveNotebook = async (e: React.FormEvent) => {
      e.preventDefault();
      const nextDate = calculateNextReview(Number(formData.accuracy), formData.relevance, formData.trend, config.algorithm);
      const payload: any = { 
          ...formData, 
          accuracy: Number(formData.accuracy), 
          targetAccuracy: Number(formData.targetAccuracy),
          lastPractice: new Date(formData.lastPractice).toISOString(),
          nextReview: nextDate.toISOString()
      };

      if (editingId) await editNotebook(editingId, payload);
      else await addNotebook({ ...payload, weekId: null }); // Default to backlog, user can move later or we could pass weekId
      
      setIsModalOpen(false);
  };

  // Form helpers
  const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      (Array.from(files) as File[]).forEach(file => {
          if (file.size > 2 * 1024 * 1024) { alert("Imagem muito grande (>2MB)."); return; }
          const reader = new FileReader();
          reader.onloadend = () => { if(reader.result) setFormData(prev => ({ ...prev, images: [...prev.images, reader.result as string] })); };
          reader.readAsDataURL(file);
      });
    }
  };
  const removeImage = (index: number) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  const handleNotStudied = () => setFormData(prev => ({ ...prev, accuracy: 0, status: NotebookStatus.NOT_STARTED }));


  // --- FILTERING & SORTING ---
  const displayData = useMemo(() => {
      if (!config.structuredEdital) return [];
      
      let processed = config.structuredEdital.map(d => {
          // Filter topics first by search
          let topics = d.topics;
          if (searchTerm) {
              const lower = searchTerm.toLowerCase();
              topics = topics.filter(t => t.name.toLowerCase().includes(lower) || d.name.toLowerCase().includes(lower));
          }
          
          return { ...d, topics };
      }).filter(d => d.topics.length > 0);

      if (sortByPriority) {
          // Flatten, sort, then reconstruct strictly for view? 
          // Better: Sort topics within discipline for now to keep structure, 
          // or create a "Flat View" mode. Let's keep structure but sort topics.
          processed = processed.map(d => {
              const sortedTopics = [...d.topics].sort((a, b) => {
                  const statsA = matchesMap.get(`${d.name}-${a.name}`);
                  const statsB = matchesMap.get(`${d.name}-${b.name}`);
                  
                  // Score Calculation (Higher is better/more urgent)
                  const getScore = (t: EditalTopic, stats: any) => {
                      let score = 0;
                      // 1. Probability
                      if (t.probability === 'Alta') score += 30;
                      else if (t.probability === 'Média') score += 15;
                      
                      // 2. Performance Gap (Low accuracy is urgent)
                      if (stats) {
                          if (stats.notebooks.length === 0) score += 50; // Never studied!
                          else {
                              score += (100 - stats.avgAccuracy) / 2; // e.g. 0 acc = +50 pts
                          }
                      } else {
                          score += 50; // Assuming no stats means not studied
                      }
                      return score;
                  };

                  return getScore(b, statsB) - getScore(a, statsA);
              });
              return { ...d, topics: sortedTopics };
          });
          
          // Sort disciplines by aggregate urgency? Optional.
      }

      return processed;
  }, [config.structuredEdital, searchTerm, sortByPriority, matchesMap]);

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
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20 h-full flex flex-col relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-6 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ListChecks className="text-emerald-500" /> Edital Verticalizado
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Auditoria de cobertura, análise de probabilidade e cruzamento com o ciclo.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:min-w-[240px]">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Filtrar tópicos..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-emerald-500 outline-none"
                />
             </div>
             
             <button 
                onClick={() => setSortByPriority(!sortByPriority)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${sortByPriority ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
             >
                 <Zap size={14} /> Prioridade ROI
             </button>

             <button onClick={processEditalWithAI} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700" title="Reprocessar com IA">
                 <Sparkles size={18} />
             </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {displayData.map((discipline) => {
              const isExpanded = expandedDiscipline === discipline.name || sortByPriority;
              const totalTopics = discipline.topics.length;
              const checkedTopics = discipline.topics.filter(t => t.checked).length;
              const progress = Math.round((checkedTopics / totalTopics) * 100);
              
              // Count linked notebooks
              let linkedCount = 0;
              discipline.topics.forEach(t => {
                  const s = matchesMap.get(`${discipline.name}-${t.name}`);
                  if (s && s.notebooks.length > 0) linkedCount += s.notebooks.length;
              });

              return (
                  <div key={discipline.name} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all shadow-sm hover:border-slate-700">
                      {/* Discipline Header */}
                      <div 
                        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                        onClick={() => setExpandedDiscipline(isExpanded ? null : discipline.name)}
                      >
                          <div className="flex items-center gap-4">
                              <div className="bg-slate-800 p-2 rounded-lg text-emerald-500 border border-slate-700">
                                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </div>
                              <div>
                                  <h3 className="font-bold text-white text-lg uppercase tracking-wide">{discipline.name}</h3>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                      <span>{totalTopics} tópicos</span>
                                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                      <span>{linkedCount} cadernos linkados</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                              <div className="hidden md:block w-32 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
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
                                              <th className="p-4 w-12 text-center">Status</th>
                                              <th className="p-4">Tópico</th>
                                              <th className="p-4 w-24 text-center">Proficiência</th>
                                              <th className="p-4 w-28 text-center">Probabilidade</th>
                                              <th className="p-4 w-24 text-center">No Ciclo?</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/50">
                                          {discipline.topics.map((topic, idx) => {
                                              const stats = matchesMap.get(`${discipline.name}-${topic.name}`);
                                              
                                              // Probability Styling (Visual Heatmap Border)
                                              const probColor = topic.probability === 'Alta' ? 'border-l-4 border-red-500 bg-red-900/5' : topic.probability === 'Média' ? 'border-l-4 border-amber-500 bg-amber-900/5' : 'border-l-4 border-blue-500';
                                              const probBadge = topic.probability === 'Alta' ? 'text-red-400 bg-red-500/10 border-red-500/20' : topic.probability === 'Média' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                                              
                                              // Retention Color Logic
                                              let checkColor = "text-slate-600";
                                              if (topic.checked) {
                                                  if (stats && stats.daysSinceReview > 30) checkColor = "text-slate-500 opacity-50"; // Expired
                                                  else if (stats && stats.daysSinceReview > 7) checkColor = "text-amber-500"; // Warning
                                                  else checkColor = "text-emerald-500"; // Fresh
                                              }

                                              return (
                                                  <tr key={idx} className={`hover:bg-slate-800/40 transition-colors ${probColor}`}>
                                                      <td className="p-4 text-center">
                                                          <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleCheck(discipline.name, topic.name); }} 
                                                            className={`transition-all hover:scale-110 ${checkColor}`}
                                                            title={stats?.daysSinceReview ? `Última revisão: ${stats.daysSinceReview} dias atrás` : "Nunca revisado"}
                                                          >
                                                              {topic.checked ? <CheckSquare size={18} /> : <Square size={18} />}
                                                          </button>
                                                      </td>
                                                      <td className="p-4">
                                                          <button 
                                                            onClick={() => handleTopicClick(topic.name, discipline.name)}
                                                            className="text-left font-medium text-slate-200 hover:text-emerald-400 hover:underline decoration-emerald-500/30 underline-offset-4 transition-all flex items-center gap-2 group"
                                                          >
                                                              {topic.name}
                                                              {stats && stats.notebooks.length === 0 && <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={8} className="inline"/> Criar</span>}
                                                              {stats && stats.notebooks.length > 0 && <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"><ExternalLink size={8} className="inline"/> Abrir</span>}
                                                          </button>
                                                      </td>
                                                      <td className="p-4 text-center">
                                                          {stats && stats.notebooks.length > 0 ? (
                                                              <span className={`text-xs font-bold ${stats.avgAccuracy < 60 ? 'text-red-400' : stats.avgAccuracy < 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                                  {stats.avgAccuracy}%
                                                              </span>
                                                          ) : (
                                                              <span className="text-slate-700 text-xs">-</span>
                                                          )}
                                                      </td>
                                                      <td className="p-4 text-center">
                                                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${probBadge}`}>
                                                              {topic.probability}
                                                          </span>
                                                      </td>
                                                      <td className="p-4 text-center">
                                                          <button 
                                                            onClick={() => handleCycleToggle(topic.name, discipline.name)}
                                                            className={`transition-colors ${stats?.inCycle ? 'text-emerald-500 hover:text-emerald-400' : 'text-slate-600 hover:text-slate-400'}`}
                                                            title={stats?.inCycle ? "Remover do Ciclo" : "Adicionar ao Ciclo"}
                                                          >
                                                              {stats?.inCycle ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
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

      {/* REUSED EDIT MODAL (Simplified version of Setup/Library modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pencil size={20} className="text-emerald-500"/> {editingId ? 'Editar Caderno Vinculado' : 'Criar Caderno do Tópico'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveNotebook} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                  <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">1. Identificação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Disciplina</label><input required value={formData.discipline} onChange={e => handleChange('discipline', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nome do Tópico</label><input required value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Subtópico / Foco</label><input value={formData.subtitle} onChange={e => handleChange('subtitle', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link do Caderno</label><div className="relative"><LinkIcon className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.tecLink} onChange={e => handleChange('tecLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" /></div></div>
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">2. Estratégia & Performance</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Peso</label><select value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Weight).map(w => <option key={w} value={w}>{w}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Relevância</label><select value={formData.relevance} onChange={(e) => handleChange('relevance', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Relevance).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Tendência</label><select value={formData.trend} onChange={(e) => handleChange('trend', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Trend).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Meta (%)</label><input type="number" min="0" max="100" value={formData.targetAccuracy} onChange={e => handleChange('targetAccuracy', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm text-center font-bold" /></div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center gap-4">
                      <div className="flex-1 w-full">
                         <label className="block text-[10px] font-bold text-emerald-400 mb-1 uppercase">Taxa de Acerto Atual (%)</label>
                         <input type="number" min="0" max="100" value={formData.accuracy} onChange={e => handleChange('accuracy', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white font-mono text-center font-bold text-lg focus:border-emerald-500 outline-none" />
                      </div>
                      <div className="flex-1 w-full flex gap-2">
                         <button type="button" onClick={handleNotStudied} className="flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600">
                            <Flag size={16} /> Não estudei
                         </button>
                      </div>
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Rascunhos & Anotações</h4>
                <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Obsidian / Notion</label><div className="relative"><FileCode className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.obsidianLink} onChange={e => handleChange('obsidianLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="obsidian://open?vault=..." /></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Anotações / Resumo</label><textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-all min-h-[200px] resize-none text-sm" placeholder="Mnemônicos..." /></div>
                    <div className="flex flex-col h-full">
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Galeria de Mapas Mentais</label>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 min-h-[200px] flex flex-col">
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative group aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer">
                                        <img src={img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onClick={() => setLightboxIndex(idx)} />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none"><ZoomIn size={16} className="text-white" /></div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                                <div onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-slate-700/50 transition-colors text-slate-500 hover:text-emerald-500"><Plus size={24} /><span className="text-[10px] uppercase font-bold mt-1">Add Imagem</span></div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                            <p className="text-[10px] text-slate-500 mt-auto text-center italic">Suporta múltiplas imagens. Clique em uma imagem para ampliar.</p>
                        </div>
                    </div>
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 font-medium transition-colors">Cancelar</button>
                <button type="button" onClick={handleSaveNotebook} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2">
                    <Save size={18} /> {editingId ? 'Salvar' : 'Criar & Vincular'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
          <div className="fixed inset-0 z-[60] bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-sm">
             <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white hover:text-emerald-500 z-50"><X size={32} /></button>
             <img src={formData.images[lightboxIndex]} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          </div>
      )}

    </div>
  );
};