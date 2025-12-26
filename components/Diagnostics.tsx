
import React, { useState } from 'react';
import { useStore } from '../store';
import { GoogleGenAI, Type } from "@google/genai";
import { EditalAnalysisResult, SavedReport } from '../types';
import { 
  Activity, BrainCircuit, CheckCircle, AlertTriangle, 
  Loader2, Sparkles, RefreshCw, FileText, PieChart as PieChartIcon,
  ListX, CheckSquare, Target, Save, History, Trash2, TrendingUp, Calendar
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';

export const Diagnostics: React.FC = () => {
  const { notebooks, config, updateConfig, saveReport, reports, deleteReport } = useStore();
  const [activeTab, setActiveTab] = useState<'tactical' | 'edital'>('tactical');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // States for Tactical Analysis (Text based)
  const [tacticalAnalysis, setTacticalAnalysis] = useState<string | null>(null);

  // States for Edital Analysis (JSON based)
  const [editalAnalysis, setEditalAnalysis] = useState<EditalAnalysisResult | null>(null);
  const [tempEditalText, setTempEditalText] = useState(config.editalText || '');

  // Helper to load a saved report
  const loadReport = (report: SavedReport) => {
    if (report.type === 'tactical') {
        setTacticalAnalysis(report.data as string);
        setActiveTab('tactical');
        setEditalAnalysis(null);
    } else {
        setEditalAnalysis(report.data as EditalAnalysisResult);
        setActiveTab('edital');
        setTacticalAnalysis(null);
    }
    setShowHistory(false);
  };

  const handleSaveCurrentReport = () => {
    if (activeTab === 'tactical' && tacticalAnalysis) {
        saveReport({
            type: 'tactical',
            summary: `Diagnóstico Tático - ${new Date().toLocaleDateString('pt-BR')}`,
            data: tacticalAnalysis
        });
        alert("Relatório Tático salvo com sucesso!");
    } else if (activeTab === 'edital' && editalAnalysis) {
        saveReport({
            type: 'edital',
            summary: `Auditoria Edital - Prob: ${editalAnalysis.passingProbability}%`,
            data: editalAnalysis
        });
        alert("Auditoria de Edital salva com sucesso!");
    }
  };

  // --- HELPER: CLEAN JSON ---
  const cleanJsonString = (text: string) => {
    if (!text) return '{}';
    let cleaned = text.trim();
    // Remove markdown code blocks if present
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    }
    return cleaned.trim();
  };

  // --- TACTICAL DIAGNOSTIC ---
  const runTacticalDiagnostics = async () => {
    setLoading(true);
    try {
      const performanceData = notebooks.map(nb => ({
        discipline: nb.discipline,
        topic: nb.name,
        accuracy: nb.accuracy,
        target: nb.targetAccuracy,
        weight: nb.weight,
        relevance: nb.relevance,
        status: nb.accuracy >= nb.targetAccuracy ? 'Dominated' : 'Learning'
      }));

      const context = {
        studentProfile: config.targetRole,
        weeksLeft: config.weeksUntilExam,
        data: performanceData
      };

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Aja como o maior estrategista de concursos públicos do Brasil.
        Analise os dados deste aluno do "Projeto Atena".
        
        DADOS DO ALUNO (JSON):
        ${JSON.stringify(context, null, 2)}

        Gere um relatório tático em Markdown focado em:
        1. Princípio de Pareto (80/20) nos pesos altos.
        2. Consistência e lacunas.
        3. Ritmo vs Semanas Restantes.
        
        Use seções: 🎯 Veredito, ✅ Pontos Fortes, 🚨 Zona de Perigo, 🚀 Plano de Ação.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.7 }
      });

      setTacticalAnalysis(response.text || "Erro na análise.");
    } catch (error) {
      console.error(error);
      setTacticalAnalysis("Erro ao conectar com a IA.");
    } finally {
      setLoading(false);
    }
  };

  // --- EDITAL AUDIT (Enhanced with Probability) ---
  const runEditalAudit = async () => {
    if (!tempEditalText && !config.editalText) {
      alert("Por favor, cole o texto do edital verticalizado para realizar a auditoria.");
      return;
    }

    if (tempEditalText !== config.editalText) {
      updateConfig({ ...config, editalText: tempEditalText });
    }

    setLoading(true);
    try {
      const currentPlan = notebooks.map(nb => ({
        fullTitle: `${nb.discipline}: ${nb.name} (${nb.subtitle})`,
        accuracy: nb.accuracy,
        weight: nb.weight
      }));
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Você é uma IA Estatística de Concursos Públicos.
        
        TAREFA:
        1. Compare o PLANEJAMENTO ATUAL com o EDITAL.
        2. Calcule a % de cobertura do edital.
        3. CRUCIAL: Calcule a "Probabilidade de Aprovação" (0 a 100%).
           - A probabilidade aumenta se o aluno Cobre o edital E tem Alta Acurácia (% de acerto).
           - Tópicos com peso maior devem impactar mais a probabilidade.
           - Se a cobertura for baixa (<50%), a probabilidade deve ser drásticamente reduzida, mesmo com acertos altos.
        
        PLANEJAMENTO DO ALUNO (Com Acurácia e Pesos):
        ${JSON.stringify(currentPlan)}
        
        TEXTO DO EDITAL:
        ${tempEditalText || config.editalText}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallCoverage: { type: Type.NUMBER, description: "Percentage 0-100 of total edital covered" },
              passingProbability: { type: Type.NUMBER, description: "Calculated probability of passing based on coverage AND weighted accuracy." },
              readinessScore: { type: Type.STRING, description: "One word verdict: Baixo, Médio, Alto, Elite" },
              disciplines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    coverage: { type: Type.NUMBER },
                    accuracy: { type: Type.NUMBER, description: "Average accuracy for this discipline" },
                    missingTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              },
              missingDisciplines: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }
              },
              strategicInsight: { type: Type.STRING, description: "Advice focusing on increasing the passing probability." }
            }
          }
        }
      });

      const cleanedJson = cleanJsonString(response.text || '{}');
      const result = JSON.parse(cleanedJson) as EditalAnalysisResult;
      setEditalAnalysis(result);

    } catch (error) {
      console.error("Error parsing AI response:", error);
      alert("Erro ao processar auditoria de edital. A IA retornou um formato inválido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 relative">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="text-emerald-500" /> 
            Central de Inteligência
          </h1>
          <p className="text-slate-400 mt-1">
            Auditoria algorítmica, probabilidade de aprovação e diagnósticos.
          </p>
        </div>
        
        <div className="flex gap-4">
            <button 
                onClick={() => setShowHistory(true)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2 text-sm"
            >
                <History size={16} /> Histórico
            </button>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button 
                onClick={() => setActiveTab('tactical')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'tactical' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <BrainCircuit size={16} /> Tático
            </button>
            <button 
                onClick={() => setActiveTab('edital')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'edital' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <FileText size={16} /> Edital & Probabilidade
            </button>
            </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
          <h3 className="text-xl font-bold text-white">Processando Dados...</h3>
          <p className="text-slate-500">A Inteligência Atena está cruzando seus dados.</p>
        </div>
      )}

      {/* === TAB 1: TACTICAL DIAGNOSTICS === */}
      {!loading && activeTab === 'tactical' && (
        <>
          {!tacticalAnalysis ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl border-dashed">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <BrainCircuit size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Diagnóstico de Performance</h2>
              <p className="text-slate-400 max-w-md text-center mb-8">
                Analisa se você está estudando o que realmente cai na prova e se seus pesos estão corretos.
              </p>
              <button 
                onClick={runTacticalDiagnostics}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-3 transition-all hover:scale-105"
              >
                <Sparkles size={20} /> Gerar Diagnóstico Tático
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="lg:col-span-2 bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                 {/* Save Button */}
                 <button 
                    onClick={handleSaveCurrentReport}
                    className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-lg transition-colors z-20"
                    title="Salvar Relatório"
                 >
                    <Save size={20} />
                 </button>

                 <div className="prose prose-invert prose-emerald max-w-none">
                    {tacticalAnalysis.split('\n').map((line, i) => {
                      if (line.startsWith('##') || line.includes('**Veredito')) 
                          return <h3 key={i} className="text-xl font-bold text-emerald-400 mt-6 mb-3 border-b border-emerald-500/20 pb-2">{line.replace(/#/g, '').replace(/\*\*/g, '')}</h3>;
                      if (line.startsWith('-') || line.startsWith('*')) 
                          return <li key={i} className="text-slate-300 ml-4 mb-2">{line.replace(/^[-*]\s/, '')}</li>;
                      if (line.trim() === '') return <br key={i}/>;
                      return <p key={i} className="text-slate-300 mb-2 leading-relaxed">{line}</p>;
                    })}
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="font-bold text-white mb-4">Métricas Analisadas</h3>
                    <div className="space-y-3 text-sm text-slate-400">
                        <div className="flex justify-between"><span>Cadernos</span> <span className="text-white">{notebooks.length}</span></div>
                        <div className="flex justify-between"><span>Cargo</span> <span className="text-white">{config.targetRole}</span></div>
                        <div className="flex justify-between"><span>Semanas</span> <span className="text-white">{config.weeksUntilExam}</span></div>
                    </div>
                 </div>
                 <button onClick={() => setTacticalAnalysis(null)} className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-medium">Nova Análise</button>
               </div>
            </div>
          )}
        </>
      )}

      {/* === TAB 2: EDITAL AUDIT === */}
      {!loading && activeTab === 'edital' && (
        <>
          {!editalAnalysis ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
               <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1 space-y-4 w-full">
                     <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-emerald-500"/>
                        Probabilidade de Aprovação
                     </h2>
                     <p className="text-slate-400 text-sm">
                        Cole abaixo o edital. A IA calculará sua probabilidade de passar baseada na sua cobertura do edital E na sua taxa de acerto atual (acurácia).
                     </p>
                     
                     <textarea 
                        value={tempEditalText}
                        onChange={(e) => setTempEditalText(e.target.value)}
                        placeholder="Ex: LÍNGUA PORTUGUESA: 1. Compreensão de texto..."
                        className="w-full h-64 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-300 font-mono text-sm focus:border-emerald-500 outline-none resize-none custom-scrollbar"
                     />
                     
                     <button 
                        onClick={runEditalAudit}
                        disabled={!tempEditalText}
                        className="w-full py-4 bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 transition-all"
                     >
                        <Target size={20} />
                        Calcular Probabilidade
                     </button>
                  </div>
                  
                  <div className="w-full md:w-1/3 bg-slate-950/50 p-6 rounded-xl border border-slate-800">
                     <h3 className="text-white font-bold mb-4 flex items-center gap-2"><CheckSquare size={16}/> Indicadores Chave</h3>
                     <ul className="space-y-3 text-sm text-slate-400">
                        <li className="flex gap-2"><div className="min-w-[6px] h-[6px] rounded-full bg-emerald-500 mt-1.5"></div> Probabilidade Estatística de Aprovação</li>
                        <li className="flex gap-2"><div className="min-w-[6px] h-[6px] rounded-full bg-emerald-500 mt-1.5"></div> Score de Prontidão (Readiness)</li>
                        <li className="flex gap-2"><div className="min-w-[6px] h-[6px] rounded-full bg-emerald-500 mt-1.5"></div> Cobertura Real do Edital</li>
                        <li className="flex gap-2"><div className="min-w-[6px] h-[6px] rounded-full bg-emerald-500 mt-1.5"></div> Lacunas Críticas</li>
                     </ul>
                  </div>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                
                {/* Save Report Button */}
                <div className="absolute top-0 right-0 z-20">
                    <button 
                        onClick={handleSaveCurrentReport}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition-colors text-xs font-bold uppercase tracking-wider shadow-lg"
                    >
                        <Save size={14} /> Salvar Resultado
                    </button>
                </div>

                {/* 1. Probability Gauge (NEW) */}
                <div className="md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4 z-10">Probabilidade de Aprovação</h3>
                    
                    <div className="relative w-48 h-48 flex items-center justify-center z-10">
                        {/* Custom SVG Gauge representation */}
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                            <circle 
                                cx="50" cy="50" r="45" 
                                stroke={editalAnalysis.passingProbability > 70 ? "#10b981" : editalAnalysis.passingProbability > 40 ? "#f59e0b" : "#ef4444"} 
                                strokeWidth="8" 
                                fill="transparent" 
                                strokeDasharray={`${editalAnalysis.passingProbability * 2.83} 283`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className={`text-5xl font-extrabold ${editalAnalysis.passingProbability > 70 ? "text-emerald-400" : editalAnalysis.passingProbability > 40 ? "text-amber-400" : "text-red-400"}`}>
                                {editalAnalysis.passingProbability}%
                            </span>
                            <span className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-bold">{editalAnalysis.readinessScore}</span>
                        </div>
                    </div>
                    
                    <div className="w-full mt-4 flex justify-between text-[10px] text-slate-500 uppercase font-bold px-4">
                        <span>Risco Alto</span>
                        <span>Competitivo</span>
                        <span>Elite</span>
                    </div>
                </div>

                {/* 2. Coverage & Insight */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-4">
                             <div className="p-3 bg-emerald-500/10 rounded-full">
                                <FileText className="text-emerald-500" size={24}/>
                             </div>
                             <div>
                                <p className="text-slate-400 text-xs uppercase font-bold">Cobertura do Edital</p>
                                <p className="text-2xl font-bold text-white">{editalAnalysis.overallCoverage}% Concluído</p>
                             </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <h4 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2"><Sparkles size={14}/> Insight Estratégico da IA</h4>
                            <p className="text-slate-300 text-sm leading-relaxed italic">"{editalAnalysis.strategicInsight}"</p>
                        </div>
                    </div>
                </div>

                {/* 3. Disciplines Breakdown Chart (Updated with Accuracy) */}
                <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2"><PieChartIcon size={18} className="text-cyan-500"/> Detalhamento por Disciplina (Cobertura vs Acurácia)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={editalAnalysis.disciplines} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{fontSize: 10}} unit="%" />
                                <YAxis dataKey="name" type="category" stroke="#cbd5e1" tick={{fontSize: 10}} width={120} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                                    cursor={{fill: '#1e293b'}}
                                    formatter={(value: number, name: string) => [
                                        `${value}%`, 
                                        name === 'coverage' ? 'Cobertura' : 'Acurácia Média'
                                    ]}
                                />
                                <Bar dataKey="coverage" name="Cobertura" fill="#22d3ee" radius={[0, 4, 4, 0]} barSize={12} stackId="a" />
                                <Bar dataKey="accuracy" name="Acurácia" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4 text-xs">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-cyan-400 rounded"></div> <span className="text-slate-400">Cobertura</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> <span className="text-slate-400">Acurácia (Acertos)</span></div>
                    </div>
                </div>

                {/* 4. Missing Disciplines Alert */}
                {editalAnalysis.missingDisciplines.length > 0 && (
                    <div className="md:col-span-3 bg-red-900/10 border border-red-500/30 rounded-2xl p-6">
                        <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                            <AlertTriangle size={20}/> Disciplinas Críticas Ausentes
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {editalAnalysis.missingDisciplines.map(d => (
                                <span key={d} className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-sm font-medium">
                                    {d}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="md:col-span-3 flex justify-end gap-4">
                     <button 
                        onClick={() => setEditalAnalysis(null)}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                     >
                        Nova Simulação
                     </button>
                </div>
            </div>
          )}
        </>
      )}

      {/* === HISTORY SIDEBAR === */}
      {showHistory && (
        <div className="absolute top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-800 z-50 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="font-bold text-white flex items-center gap-2"><History size={16}/> Histórico</h3>
                <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white"><ListX size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {reports.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center mt-10">Nenhum relatório salvo.</p>
                ) : (
                    reports.map(report => (
                        <div key={report.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 hover:border-emerald-500/50 transition-colors group relative">
                            <div onClick={() => loadReport(report)} className="cursor-pointer">
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${report.type === 'tactical' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                        {report.type === 'tactical' ? 'Tático' : 'Edital'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Calendar size={10} />
                                        {new Date(report.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="text-slate-200 text-sm font-medium line-clamp-2">{report.summary}</h4>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }}
                                className="absolute bottom-2 right-2 text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}

    </div>
  );
};