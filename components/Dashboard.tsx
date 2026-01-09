import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { QuadrantChart } from './QuadrantChart';
import { WeeklyProgress } from './WeeklyProgress';
import { Weight, WEIGHT_SCORE } from '../types';
import { DEFAULT_ALGO_CONFIG } from '../utils/algorithm';
import { 
  Target, Settings, TrendingUp,
  PieChart as PieChartIcon, Activity, Siren, ArrowRight, CheckCircle2,
  Check, XCircle, Quote, ChevronDown, BarChart2,
  RefreshCw, BrainCircuit, Crosshair, Scroll, Crown, Zap, Save, X, FileText, CalendarClock, AlertCircle, Edit2, Calendar, Key, ShieldCheck
} from 'lucide-react';

import {
  Chart as ChartJS,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = '#1e293b';
ChartJS.defaults.font.family = "Inter, sans-serif";
ChartJS.defaults.scale.grid.color = '#1e293b';

const DashboardSection = ({ 
    title, 
    icon, 
    children, 
    defaultOpen = true,
    subtitle 
}: { 
    title: string, 
    icon: React.ReactNode, 
    children?: React.ReactNode, 
    defaultOpen?: boolean,
    subtitle?: string 
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6 shadow-md transition-all">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-4 flex items-center justify-between transition-colors ${isOpen ? 'bg-slate-800/80' : 'hover:bg-slate-800/30'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {icon}
                    </div>
                    <div className="text-left">
                        <h3 className={`font-bold text-sm ${isOpen ? 'text-white' : 'text-slate-300'}`}>{title}</h3>
                        {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
                    </div>
                </div>
                <div className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </button>
            
            {isOpen && (
                <div className="p-6 border-t border-slate-800/50 bg-slate-900/50">
                    {children}
                </div>
            )}
        </div>
    );
};

const NIETZSCHE_DATA = [
  { quote: "Quem tem um porquê enfrenta qualquer como.", source: "Crepúsculo dos Ídolos", context: "Se o cargo público é seu verdadeiro 'porquê', a dor do estudo torna-se suportável." },
  { quote: "O que não nos mata nos fortalece.", source: "Crepúsculo dos Ídolos", context: "Cada questão errada é um calo mental que endurece sua resiliência." },
  { quote: "Torna-te quem tu és.", source: "A Gaia Ciência", context: "Você não estuda para ser Auditor; você já é um Auditor em formação." },
  { quote: "A disciplina é a mãe do sucesso.", source: "Aforismos", context: "A inspiração é para amadores. A elite opera baseada em disciplina inegociável." }
];

interface Props {
    onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const { notebooks, config, updateConfig, setFocusedNotebookId, cycles, activeCycleId, startSession } = useStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);
  const [apiKey, setApiKey] = useState('');

  // Carregar API Key do LocalStorage ao abrir
  useEffect(() => {
      if (isConfigOpen) {
          const storedKey = localStorage.getItem('atena_api_key');
          if (storedKey) setApiKey(storedKey);
      }
  }, [isConfigOpen]);

  const handleSaveConfig = (e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      updateConfig(localConfig);
      
      // Salvar API Key
      if (apiKey.trim()) {
          localStorage.setItem('atena_api_key', apiKey.trim());
      } else {
          localStorage.removeItem('atena_api_key');
      }
      
      setIsConfigOpen(false);
      // Forçar reload suave para atualizar o cliente de IA
      window.location.reload(); 
  };

  const handleUpdateAlgoInterval = (key: string, value: number) => {
      setLocalConfig(prev => ({
          ...prev,
          algorithm: {
              ...prev.algorithm,
              baseIntervals: {
                  ...(prev.algorithm?.baseIntervals || DEFAULT_ALGO_CONFIG.baseIntervals),
                  [key]: value
              },
              multipliers: prev.algorithm?.multipliers || DEFAULT_ALGO_CONFIG.multipliers
          }
      }));
  };

  const handleUpdateAlgoMultiplier = (key: string, value: number) => {
      setLocalConfig(prev => ({
          ...prev,
          algorithm: {
              ...prev.algorithm,
              baseIntervals: prev.algorithm?.baseIntervals || DEFAULT_ALGO_CONFIG.baseIntervals,
              multipliers: {
                  ...(prev.algorithm?.multipliers || DEFAULT_ALGO_CONFIG.multipliers),
                  [key]: value
              }
          }
      }));
  };

  const today = new Date().toISOString().split('T')[0];
  
  // LOGIC: Sort by closest date (ASC) and take top 3
  const dueNotebooks = useMemo(() => {
    return notebooks
        .filter(nb => nb.nextReview && nb.discipline !== 'Revisão Geral')
        .sort((a, b) => {
            const dateA = new Date(a.nextReview!).getTime();
            const dateB = new Date(b.nextReview!).getTime();
            return dateA - dateB;
        })
        .slice(0, 3);
  }, [notebooks]);

  // HELPER: Accurate Date Status Check (Local Time aware)
  const getReviewStatus = (isoDate: string) => {
      if (!isoDate) return null;
      const [year, month, day] = isoDate.split('T')[0].split('-').map(Number);
      const reviewDate = new Date(year, month - 1, day); 
      const now = new Date();
      now.setHours(0,0,0,0);
      const diffTime = reviewDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffTime < 0) {
          return { label: "Vencido", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: <AlertCircle size={10} />, dateObj: reviewDate };
      } else if (diffTime === 0) {
          return { label: "Hoje", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: <CheckCircle2 size={10} />, dateObj: reviewDate };
      } else {
          return { label: `Em ${diffDays} dias`, color: "text-slate-400", bg: "bg-slate-800", border: "border-slate-700", icon: <CalendarClock size={10} />, dateObj: reviewDate };
      }
  };

  const handleEditRedirect = (nbId: string) => {
      setFocusedNotebookId(nbId);
      onNavigate('library');
  };

  const nietzscheItem = useMemo(() => {
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      return NIETZSCHE_DATA[dayOfYear % NIETZSCHE_DATA.length];
  }, []);

  const metrics = useMemo(() => {
      const activeNotebooks = notebooks.filter(n => n.accuracy > 0);
      const totalAcc = activeNotebooks.reduce((sum, n) => sum + n.accuracy, 0);
      const avgAccuracy = activeNotebooks.length > 0 ? Math.round(totalAcc / activeNotebooks.length) : 0;
      const totalTopics = notebooks.filter(n => n.discipline !== 'Revisão Geral').length;
      const completedTopics = notebooks.filter(n => (n.status === 'Dominado' || n.accuracy >= n.targetAccuracy) && n.discipline !== 'Revisão Geral').length;
      const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      const dates = [];
      let currentStreak = 0;
      let streakBroken = false;
      const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; 

      for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const hasPractice = notebooks.some(n => n.lastPractice && n.lastPractice.startsWith(dateStr));
          dates.push({ date: dateStr, active: hasPractice, dayLabel: dayNames[d.getDay()] });
      }
      const sortedDatesDesc = [...dates].reverse();
      for (const d of sortedDatesDesc) {
          if (d.active) { if (!streakBroken) currentStreak++; } 
          else { if (d.date !== today) streakBroken = true; }
      }

      return { avgAccuracy, completedTopics, pendingTopics: totalTopics - completedTopics, progressPercent, dates, currentStreak };
  }, [notebooks]);

  const athenaRecommendation = useMemo(() => {
    const candidates = notebooks.filter(n => n.discipline !== 'Revisão Geral');
    if (candidates.length === 0) return null;

    const critical = candidates.find(n => (n.weight === Weight.MUITO_ALTO || n.weight === Weight.ALTO) && n.accuracy < 60);
    if (critical) return {
        type: 'critical', notebook: critical,
        title: `Atenção: ${critical.discipline}`,
        reason: `Peso ${critical.weight} com desempenho crítico (${critical.accuracy}%).`,
        icon: <Siren className="text-red-500 animate-pulse" size={24} />, colorClass: 'border-red-500/50 bg-red-900/10'
    };

    const lowest = [...candidates].sort((a, b) => ((WEIGHT_SCORE[a.weight] * 100) - a.accuracy) - ((WEIGHT_SCORE[b.weight] * 100) - b.accuracy))[0];
    if (lowest) return {
        type: 'standard', notebook: lowest,
        title: `Sugestão: ${lowest.discipline}`,
        reason: `Melhorar este tópico trará o maior retorno sobre investimento.`,
        icon: <Zap className="text-emerald-500" size={24} />, colorClass: 'border-emerald-500/50 bg-emerald-900/10'
    };
    return null;
  }, [notebooks]);

  const currentIntervals = localConfig.algorithm?.baseIntervals || DEFAULT_ALGO_CONFIG.baseIntervals;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 relative">
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Dashboard Estratégico</h2>
          <button onClick={() => { setLocalConfig(config); setIsConfigOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm border border-slate-700 shadow-sm hover:shadow-md">
            <Settings size={16} /> Configurar
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between h-32">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Desempenho</span>
              <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-emerald-600">{metrics.avgAccuracy}% Acertos</span>
                      <span className="text-xs font-bold text-red-500">{metrics.avgAccuracy > 0 ? 100 - metrics.avgAccuracy : 0}% Erros</span>
                  </div>
                  <span className="text-4xl font-black text-slate-900">{metrics.avgAccuracy}%</span>
              </div>
          </div>
          <div className="bg-slate-50 text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between h-32">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progresso Edital</span>
              <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                      <span className="text-xs font-semibold text-emerald-600">{metrics.completedTopics} Concluídos</span>
                      <span className="text-xs font-semibold text-orange-500">{metrics.pendingTopics} Pendentes</span>
                  </div>
                  <span className="text-4xl font-black text-slate-900">{metrics.progressPercent}%</span>
              </div>
          </div>
      </div>

      <div className="bg-white text-slate-900 rounded-xl p-6 border border-slate-200 shadow-lg">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Constância (Últimos 14 dias)</h3>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                  <span className="cursor-pointer">&lt;</span> 
                  {metrics.dates[0]?.date.split('-').reverse().join('/')} ~ {metrics.dates[metrics.dates.length-1]?.date.split('-').reverse().join('/')} 
                  <span className="cursor-pointer">&gt;</span>
              </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {metrics.dates.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1 flex-1 min-w-[30px]">
                      <div className={`w-full h-8 rounded-md flex items-center justify-center border transition-all ${day.active ? 'bg-emerald-200 border-emerald-300 text-emerald-700' : 'bg-red-100 border-red-200 text-red-400 opacity-50'}`} title={day.date}>
                          {day.active ? <Check size={14} strokeWidth={3} /> : <XCircle size={14} />}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{day.dayLabel}</span>
                  </div>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {athenaRecommendation && (
            <div className={`w-full p-1 rounded-2xl bg-gradient-to-r from-transparent via-slate-700 to-transparent p-[1px]`}>
                <div className={`relative w-full rounded-2xl p-6 border flex flex-col gap-4 shadow-2xl overflow-hidden ${athenaRecommendation.colorClass} h-full justify-between`}>
                    <div className="flex items-start gap-5 relative z-10">
                        <div className="bg-slate-950/80 backdrop-blur p-4 rounded-xl border border-white/10 shadow-lg">
                            {athenaRecommendation.icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-950/50 px-2 py-0.5 rounded border border-slate-700">Atena Sugere</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{athenaRecommendation.title}</h3>
                            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">{athenaRecommendation.reason}</p>
                        </div>
                    </div>
                    <button onClick={() => { setFocusedNotebookId(athenaRecommendation.notebook.id); onNavigate('library'); }} className="w-full py-4 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg">
                        <ArrowRight size={20} /> Abrir no Banco
                    </button>
                </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <RefreshCw size={20} className="text-emerald-500"/>
                Próximas Revisões (Fila)
             </h3>
             <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
               {dueNotebooks.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                    <CheckCircle2 size={40} className="text-emerald-500/30 mb-3" />
                    <p className="text-slate-300 font-medium">Nenhuma revisão agendada!</p>
                 </div>
               ) : (
                 dueNotebooks.map(nb => {
                     const status = getReviewStatus(nb.nextReview!);
                     
                     return (
                         <div 
                            key={nb.id} 
                            className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors cursor-pointer group bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/50`}
                            onClick={() => handleEditRedirect(nb.id)}
                         >
                           <div className="flex justify-between items-start">
                               <div>
                                 <h4 className={`text-sm font-bold flex items-center gap-2 text-slate-200 group-hover:text-emerald-400 transition-colors`}>
                                    {nb.discipline === 'Revisão Geral' && <BrainCircuit size={14} />} {nb.name}
                                 </h4>
                                 <p className="text-slate-200 text-[10px] mt-0.5">{nb.discipline}</p>
                               </div>
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${nb.accuracy >= nb.targetAccuracy ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}>{nb.accuracy}%</span>
                           </div>
                           <div className="flex items-center justify-between mt-1">
                               <button onClick={(e) => { e.stopPropagation(); startSession(nb); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all bg-emerald-600 text-white hover:bg-emerald-500 shadow-md`}>
                                 Revisar Agora
                               </button>
                               {status && (
                                   <span className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded border ${status.color} ${status.bg} ${status.border}`}>
                                       {status.icon}
                                       {status.label} ({status.dateObj.toLocaleDateString()})
                                   </span>
                               )}
                           </div>
                         </div>
                     );
                 })
               )}
             </div>
          </div>
      </div>

      <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden group flex flex-col md:flex-row min-h-[240px]">
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-center relative z-10">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none md:hidden"><Quote size={80} /></div>
              <div className="inline-flex items-center gap-2 mb-4 px-2 py-1 bg-emerald-950/30 border border-emerald-500/20 rounded text-emerald-400 text-[10px] font-bold uppercase tracking-widest w-fit">
                  <Crown size={12} /> Oráculo de Elite
              </div>
              <h3 className="text-xl md:text-2xl font-serif text-slate-100 italic leading-relaxed mb-4 max-w-2xl">"{nietzscheItem.quote}"</h3>
              <div className="flex items-center gap-3 text-slate-500 text-xs font-bold mb-6">
                  <Scroll size={14} className="text-slate-600"/> <span className="uppercase tracking-wider">{nietzscheItem.source}</span>
              </div>
              <div className="bg-slate-950/50 border-l-2 border-emerald-500/50 pl-4 py-2 rounded-r-lg max-w-xl">
                  <p className="text-slate-400 text-xs leading-relaxed"><strong className="text-emerald-500 block mb-1 uppercase text-[9px] tracking-wider">Estratégia:</strong>{nietzscheItem.context}</p>
              </div>
          </div>
          <div className="w-full md:w-1/3 lg:w-1/4 relative min-h-[200px] md:min-h-full">
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-900 via-slate-900/20 to-transparent z-10"></div>
              <img src="https://i.postimg.cc/rFFwpKjm/Gemini-Generated-Image-tchb4stchb4stchb.png" className="w-full h-full object-cover object-top grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" alt="Friedrich Nietzsche" />
          </div>
      </div>

      <DashboardSection title="Radiografia Tática" subtitle="Matriz Estratégica & Meta Semanal" icon={<Target size={20} />} defaultOpen={true}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 order-1 lg:order-1">
                  <QuadrantChart data={notebooks.filter(n => n.discipline !== 'Revisão Geral')} onNavigate={onNavigate} />
              </div>
              <div className="lg:col-span-1 order-2 lg:order-2">
                  <WeeklyProgress />
              </div>
          </div>
      </DashboardSection>

      {/* --- CONFIGURATION MODAL (EDITAL CONFIG) --- */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} className="text-emerald-500"/> Configurações do Ciclo</h2>
              <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              
              {/* SECTION: EDITAL CONFIG */}
              <div className="space-y-4">
                  <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2 flex items-center gap-2">
                      <FileText size={16} /> Configuração do Edital
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Cargo Alvo</label>
                          <input type="text" value={localConfig.targetRole} onChange={(e) => setLocalConfig({...localConfig, targetRole: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Banca Examinadora</label>
                          <input type="text" value={localConfig.banca || ''} onChange={(e) => setLocalConfig({...localConfig, banca: e.target.value})} placeholder="Ex: FGV, Cebraspe" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Data da Prova</label>
                          <div className="relative">
                              <Calendar className="absolute left-3 top-3 text-slate-500" size={16} />
                              <input type="date" value={localConfig.examDate || ''} onChange={(e) => setLocalConfig({...localConfig, examDate: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 text-white outline-none focus:border-emerald-500 cursor-pointer" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Link do Edital</label>
                          <input type="url" value={localConfig.editalLink || ''} onChange={(e) => setLocalConfig({...localConfig, editalLink: e.target.value})} placeholder="https://..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" />
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Conteúdo Programático (Texto Completo)</label>
                      <textarea 
                          value={localConfig.editalText || ''}
                          onChange={(e) => setLocalConfig({...localConfig, editalText: e.target.value})}
                          placeholder="Cole aqui o texto do edital para a IA processar..."
                          className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 font-mono outline-none focus:border-emerald-500 resize-none custom-scrollbar"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 italic">Este texto é usado pela IA para gerar o Edital Verticalizado e os Diagnósticos.</p>
                  </div>
              </div>

              {/* SECTION: INTEGRATION CONFIG */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-bold text-cyan-500 uppercase tracking-widest border-b border-cyan-500/20 pb-2 flex items-center gap-2">
                      <Key size={16} /> Integração IA (Google Gemini)
                  </h3>
                  
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Google Gemini API Key</label>
                      <div className="flex gap-2">
                          <input 
                            type="password" 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)} 
                            placeholder="AIzaSy..." 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-cyan-500 font-mono text-sm" 
                          />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                          <ShieldCheck size={12} /> Salvo apenas no seu navegador (LocalStorage). Necessário para Nietzsche, Diagnóstico e Notícias.
                      </p>
                  </div>
              </div>

              {/* SECTION: ALGORITHM TUNING */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-bold text-purple-500 uppercase tracking-widest border-b border-purple-500/20 pb-2 flex items-center gap-2">
                      <BrainCircuit size={16} /> Ajuste Fino do Algoritmo
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(currentIntervals).map(([key, val]) => (
                          <div key={key}>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{key} (Dias)</label>
                              <input type="number" value={val} onChange={(e) => handleUpdateAlgoInterval(key, parseFloat(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-center font-bold outline-none focus:border-purple-500" />
                          </div>
                      ))}
                  </div>
              </div>

            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
              <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors">Cancelar</button>
              <button onClick={handleSaveConfig} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
                  <Save size={18} /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};