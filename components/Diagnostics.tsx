import React, { useState } from 'react';
import { useStore } from '../store';
import { Type } from "@google/genai";
import { createAIClient } from '../utils/ai';
import { EditalAnalysisResult, SavedReport } from '../types';
import { 
  Activity, BrainCircuit, Loader2, Sparkles, History, Save, TrendingUp, FileText, CheckSquare, Target, ListX, Trash2, PieChart as PieChartIcon, AlertTriangle, ExternalLink, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';

export const Diagnostics: React.FC = () => {
  const { notebooks, config, updateConfig, saveReport, reports, deleteReport } = useStore();
  const [activeTab, setActiveTab] = useState<'tactical' | 'edital'>('tactical');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tacticalAnalysis, setTacticalAnalysis] = useState<string | null>(null);
  const [editalAnalysis, setEditalAnalysis] = useState<EditalAnalysisResult | null>(null);
  const [tempEditalText, setTempEditalText] = useState(config.editalText || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isApiDisabled, setIsApiDisabled] = useState(false);

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
    setErrorMsg(null);
  };

  const handleSaveCurrentReport = () => {
    if (activeTab === 'tactical' && tacticalAnalysis) {
        saveReport({
            type: 'tactical',
            summary: `Diagnóstico Tático - ${new Date().toLocaleDateString('pt-BR')}`,
            data: tacticalAnalysis
        });
        alert("Relatório salvo!");
    } else if (activeTab === 'edital' && editalAnalysis) {
        saveReport({
            type: 'edital',
            summary: `Auditoria Edital - Prob: ${editalAnalysis.passingProbability}%`,
            data: editalAnalysis
        });
        alert("Relatório salvo!");
    }
  };

  const cleanJsonString = (text: string) => {
    if (!text) return '{}';
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    return cleaned.trim();
  };

  const runTacticalDiagnostics = async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsApiDisabled(false);

    try {
      const performanceData = notebooks.map(nb => ({
        discipline: nb.discipline, topic: nb.name, accuracy: nb.accuracy,
        target: nb.targetAccuracy, weight: nb.weight, relevance: nb.relevance
      }));

      const context = {
        studentProfile: config.targetRole,
        weeksLeft: config.weeksUntilExam,
        data: performanceData
      };

      const ai = createAIClient();
      const prompt = `
        Analise os dados deste aluno do "Projeto Atena" (Concurso: ${config.targetRole}).
        DADOS: ${JSON.stringify(context, null, 2)}
        Gere um relatório tático em Markdown (Pareto 80/20, Pontos Fortes, Zona de Perigo, Plano).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.7 }
      });

      setTacticalAnalysis(response.text || "Erro na análise.");
    } catch (error: any) {
      console.error(error);
      const errStr = JSON.stringify(error);
      
      if (errStr.includes("SERVICE_DISABLED") || errStr.includes("Generative Language API")) {
         setIsApiDisabled(true);
         setErrorMsg("A API 'Generative Language' não está ativada no seu projeto Google Cloud.");
      } else {
         setErrorMsg(`Erro na IA: ${error.message || error.toString()}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const runEditalAudit = async () => {
    if (!tempEditalText && !config.editalText) {
      alert("Cole o texto do edital.");
      return;
    }
    if (tempEditalText !== config.editalText) updateConfig({ ...config, editalText: tempEditalText });

    setLoading(true);
    setErrorMsg(null);
    setIsApiDisabled(false);

    try {
      const currentPlan = notebooks.map(nb => ({
        fullTitle: `${nb.discipline}: ${nb.name}`, accuracy: nb.accuracy, weight: nb.weight
      }));
      
      const ai = createAIClient();
      const prompt = `
        IA Estatística de Concursos.
        Compare PLANEJAMENTO vs EDITAL.
        Calcule "Probabilidade de Aprovação" (0-100%).
        PLANEJAMENTO: ${JSON.stringify(currentPlan)}
        EDITAL: ${tempEditalText || config.editalText}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallCoverage: { type: Type.NUMBER },
              passingProbability: { type: Type.NUMBER },
              readinessScore: { type: Type.STRING },
              disciplines: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, coverage: { type: Type.NUMBER }, accuracy: { type: Type.NUMBER }, missingTopics: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
              missingDisciplines: { type: Type.ARRAY, items: { type: Type.STRING } },
              strategicInsight: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(cleanJsonString(response.text || '{}')) as EditalAnalysisResult;
      setEditalAnalysis(result);
    } catch (error: any) {
      console.error(error);
      const errStr = JSON.stringify(error);

      if (errStr.includes("SERVICE_DISABLED") || errStr.includes("Generative Language API")) {
         setIsApiDisabled(true);
         setErrorMsg("A API 'Generative Language' não está ativada no seu projeto Google Cloud.");
      } else {
         setErrorMsg(`Erro na IA: ${error.message || error.toString()}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Activity className="text-emerald-500" /> Central de Inteligência</h1>
          <p className="text-slate-400 mt-1">Auditoria algorítmica e diagnósticos.</p>
        </div>
        <div className="flex gap-4">
            <button onClick={() => setShowHistory(true)} className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2 text-sm"><History size={16} /> Histórico</button>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setActiveTab('tactical')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'tactical' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><BrainCircuit size={16} /> Tático</button>
            <button onClick={() => setActiveTab('edital')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'edital' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><FileText size={16} /> Edital</button>
            </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
          <h3 className="text-xl font-bold text-white">Processando Dados...</h3>
        </div>
      )}

      {errorMsg && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl text-center">
              <AlertTriangle className="text-red-500 mx-auto mb-2" size={32} />
              <h3 className="text-white font-bold mb-1">Erro na Análise</h3>
              <p className="text-red-300 text-sm font-mono mb-4">{errorMsg}</p>
              
              {isApiDisabled && (
                  <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-2">
                    <a 
                        href="https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-sm transition-colors"
                    >
                        <ExternalLink size={16} /> 1. Conferir Console
                    </a>
                    <button 
                        onClick={activeTab === 'tactical' ? runTacticalDiagnostics : runEditalAudit}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-red-900/20"
                    >
                        <RefreshCw size={16} /> 2. Tentar Novamente
                    </button>
                  </div>
              )}
              
              <div className="mt-2">
                  <button onClick={() => setErrorMsg(null)} className="text-xs text-slate-400 underline hover:text-white">Voltar</button>
              </div>
          </div>
      )}

      {!loading && !errorMsg && activeTab === 'tactical' && (
        <>
          {!tacticalAnalysis ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl border-dashed">
              <BrainCircuit size={40} className="text-emerald-500 mb-6" />
              <h2 className="text-xl font-bold text-white mb-2">Diagnóstico de Performance</h2>
              <button onClick={runTacticalDiagnostics} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-3 transition-all hover:scale-105 mt-4"><Sparkles size={20} /> Gerar Diagnóstico</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="lg:col-span-2 bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                 <button onClick={handleSaveCurrentReport} className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-lg transition-colors z-20"><Save size={20} /></button>
                 <div className="prose prose-invert prose-emerald max-w-none">
                    {tacticalAnalysis.split('\n').map((line, i) => {
                      if (line.startsWith('##')) return <h3 key={i} className="text-xl font-bold text-emerald-400 mt-6 mb-3 border-b border-emerald-500/20 pb-2">{line.replace(/#/g, '')}</h3>;
                      if (line.startsWith('-')) return <li key={i} className="text-slate-300 ml-4 mb-2">{line.replace('-', '')}</li>;
                      return <p key={i} className="text-slate-300 mb-2 leading-relaxed">{line}</p>;
                    })}
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="font-bold text-white mb-4">Resumo</h3>
                    <p className="text-sm text-slate-400">Análise baseada em {notebooks.length} cadernos ativos.</p>
                 </div>
                 <button onClick={() => setTacticalAnalysis(null)} className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-medium">Nova Análise</button>
               </div>
            </div>
          )}
        </>
      )}

      {!loading && !errorMsg && activeTab === 'edital' && (
        <>
          {!editalAnalysis ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
               <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1 space-y-4 w-full">
                     <h2 className="text-xl font-bold text-white flex items-center gap-2"><TrendingUp className="text-emerald-500"/> Probabilidade de Aprovação</h2>
                     <textarea value={tempEditalText} onChange={(e) => setTempEditalText(e.target.value)} placeholder="Cole o edital aqui..." className="w-full h-64 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-300 font-mono text-sm focus:border-emerald-500 outline-none resize-none custom-scrollbar" />
                     <button onClick={runEditalAudit} disabled={!tempEditalText} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 transition-all"><Target size={20} /> Calcular Probabilidade</button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                <div className="absolute top-0 right-0 z-20"><button onClick={handleSaveCurrentReport} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition-colors text-xs font-bold uppercase tracking-wider shadow-lg"><Save size={14} /> Salvar</button></div>
                <div className="md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4 z-10">Probabilidade</h3>
                    <div className="text-5xl font-extrabold text-emerald-400">{editalAnalysis.passingProbability}%</div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-bold">{editalAnalysis.readinessScore}</span>
                </div>
                <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-4">
                         <div className="p-3 bg-emerald-500/10 rounded-full"><FileText className="text-emerald-500" size={24}/></div>
                         <div><p className="text-slate-400 text-xs uppercase font-bold">Cobertura</p><p className="text-2xl font-bold text-white">{editalAnalysis.overallCoverage}% Concluído</p></div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2"><Sparkles size={14}/> Insight</h4>
                        <p className="text-slate-300 text-sm leading-relaxed italic">"{editalAnalysis.strategicInsight}"</p>
                    </div>
                </div>
                {/* Simplified Chart for brevity */}
                <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2"><PieChartIcon size={18} className="text-cyan-500"/> Detalhamento</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={editalAnalysis.disciplines} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{fontSize: 10}} unit="%" />
                                <YAxis dataKey="name" type="category" stroke="#cbd5e1" tick={{fontSize: 10}} width={120} />
                                <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                                <Bar dataKey="coverage" name="Cobertura" fill="#22d3ee" radius={[0, 4, 4, 0]} barSize={12} stackId="a" />
                                <Bar dataKey="accuracy" name="Acurácia" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="md:col-span-3 flex justify-end gap-4"><button onClick={() => setEditalAnalysis(null)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">Nova Simulação</button></div>
            </div>
          )}
        </>
      )}
      
      {showHistory && (
        <div className="absolute top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-800 z-50 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="font-bold text-white flex items-center gap-2"><History size={16}/> Histórico</h3>
                <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white"><ListX size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {reports.map(report => (
                    <div key={report.id} onClick={() => loadReport(report)} className="bg-slate-800 border border-slate-700 rounded-lg p-3 hover:border-emerald-500/50 transition-colors cursor-pointer group relative">
                        <h4 className="text-slate-200 text-sm font-medium line-clamp-2">{report.summary}</h4>
                        <button onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }} className="absolute bottom-2 right-2 text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};