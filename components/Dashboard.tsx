import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { QuadrantChart } from './QuadrantChart';
import { StudySession } from './StudySession';
import { LiquidityGauge } from './LiquidityGauge';
import { Notebook, WEIGHT_SCORE, RELEVANCE_SCORE, Weight } from '../types';
import { 
  Target, Settings, TrendingUp,
  PieChart as PieChartIcon, Activity, Layers, Siren, ArrowRight, CheckCircle2,
  Check, XCircle, Quote, ChevronDown, BarChart2,
  RefreshCw, BrainCircuit, Crosshair, Scroll, Crown, Zap, Save, X, Calendar, FileText
} from 'lucide-react';

// --- CHART.JS IMPORTS & CONFIGURATION (CRITICAL FIX) ---
// Replacing Recharts due to React 19 Concurrent Rendering Issues
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
  Filler,
  ChartData
} from 'chart.js';
import { Radar, Line, Bar, Chart } from 'react-chartjs-2';

// Register Chart.js components
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

// Global Defaults for Dark Mode Theme
ChartJS.defaults.color = '#94a3b8'; // text-slate-400
ChartJS.defaults.borderColor = '#1e293b'; // border-slate-800
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
  const { notebooks, config, updateConfig, getWildcardNotebook, setFocusedNotebookId } = useStore();
  const [selectedSession, setSelectedSession] = useState<Notebook | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  const handleSaveConfig = (e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      updateConfig(localConfig);
      setIsConfigOpen(false);
  };

  const today = new Date().toISOString().split('T')[0];
  
  // --- CORE METRICS ---
  const dueNotebooks = useMemo(() => {
    return notebooks.filter(nb => 
      nb.weekId && nb.nextReview && nb.nextReview.split('T')[0] <= today
    ).sort((a, b) => (a.nextReview! > b.nextReview! ? 1 : -1));
  }, [notebooks, today]);

  const nietzscheItem = useMemo(() => {
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      return NIETZSCHE_DATA[dayOfYear % NIETZSCHE_DATA.length];
  }, []);

  const weeklyFocus = useMemo(() => {
      const counts: Record<string, number> = {};
      notebooks.forEach(n => {
          if(n.discipline === 'Revisão Geral') return;
          if(n.weekId) counts[n.discipline] = (counts[n.discipline] || 0) + 2;
          if(n.weight === Weight.MUITO_ALTO) counts[n.discipline] = (counts[n.discipline] || 0) + 1;
      });
      return Object.entries(counts).sort(([,a], [,b]) => b - a).slice(0, 4).map(([k]) => k);
  }, [notebooks]);

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
      for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const hasPractice = notebooks.some(n => n.lastPractice && n.lastPractice.startsWith(dateStr));
          dates.push({ date: dateStr, active: hasPractice });
      }
      const sortedDatesDesc = [...dates].reverse();
      for (const d of sortedDatesDesc) {
          if (d.active) { if (!streakBroken) currentStreak++; } 
          else { if (d.date !== today) streakBroken = true; }
      }

      return { avgAccuracy, completedTopics, pendingTopics: totalTopics - completedTopics, progressPercent, dates, currentStreak };
  }, [notebooks]);

  // --- CHART DATA PREPARATION (Chart.js Format) ---
  
  // 1. Radar Chart (Competência)
  const radarChartData = useMemo(() => {
     const grouped: Record<string, { total: number, count: number }> = {};
     notebooks.forEach(nb => {
        if(nb.discipline === 'Revisão Geral') return;
        if(!grouped[nb.discipline]) grouped[nb.discipline] = { total: 0, count: 0 };
        grouped[nb.discipline].total += nb.accuracy;
        grouped[nb.discipline].count += 1;
     });
     
     // Ordenar por atividade para pegar as disciplinas mais relevantes
     const keys = Object.keys(grouped).sort((a,b) => grouped[b].count - grouped[a].count).slice(0, 6);
     
     // Pad se tiver menos de 3 para o radar não quebrar
     const labels = [...keys];
     const dataPoints = keys.map(k => Math.round(grouped[k].total / grouped[k].count));
     
     const placeholders = ['D. Const', 'D. Adm', 'Português'];
     let i = 0;
     while (labels.length < 3) {
         if(!labels.includes(placeholders[i])) {
             labels.push(placeholders[i]);
             dataPoints.push(0);
         }
         i++;
     }

     return {
         labels,
         datasets: [{
             label: 'Acurácia Média',
             data: dataPoints,
             backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald-500 com opacidade
             borderColor: '#10b981', // Emerald-500 sólido
             borderWidth: 2,
             pointBackgroundColor: '#fff',
             pointBorderColor: '#10b981',
             pointHoverBackgroundColor: '#10b981',
             pointHoverBorderColor: '#fff'
         }]
     };
  }, [notebooks]);

  // 2. Evolution Line Chart
  const evolutionChartData = useMemo(() => {
    const weeks = Array.from({ length: 8 }, (_, i) => `S${i + 1}`);
    const dataPoints = weeks.map((_, index) => {
        // Simulação inteligente baseada no histórico (se disponível) ou média
        const weekNotebooks = notebooks.filter(nb => nb.accuracyHistory && nb.accuracyHistory.length > index);
        const count = weekNotebooks.length;
        if (count === 0) return null; // Chart.js trata null como gap ou ignora
        const total = weekNotebooks.reduce((sum, nb) => sum + (nb.accuracyHistory?.[index]?.accuracy || nb.accuracy), 0);
        return Math.round(total / count);
    });

    // Simple smooth fill for nulls to avoid broken lines
    let lastVal = 0;
    const filledData = dataPoints.map(val => {
        if (val !== null && val > 0) lastVal = val;
        return val === null && lastVal > 0 ? lastVal : (val || 0);
    });

    return {
        labels: weeks,
        datasets: [{
            label: 'Evolução Global',
            data: filledData,
            borderColor: '#3b82f6', // Blue-500
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4, // Curva suave
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#1e293b',
            pointBorderColor: '#3b82f6',
            pointBorderWidth: 2
        }]
    };
  }, [notebooks]);

  // 3. Pareto Bar/Line Chart (Mixed)
  const paretoChartData: ChartData<'bar' | 'line', number[], string> = useMemo(() => {
      const items = notebooks.filter(n => n.discipline !== 'Revisão Geral').map(n => ({
            name: n.name.length > 15 ? n.name.substring(0,15) + '...' : n.name,
            score: WEIGHT_SCORE[n.weight] * RELEVANCE_SCORE[n.relevance]
      })).sort((a, b) => b.score - a.score).slice(0, 10);

      const totalScore = items.reduce((sum, i) => sum + i.score, 0);
      let acc = 0;
      const cumulative = items.map(i => {
          acc += i.score;
          return totalScore > 0 ? Math.round((acc / totalScore) * 100) : 0;
      });

      return {
          labels: items.map(i => i.name),
          datasets: [
              {
                  type: 'line' as const,
                  label: '% Acumulada',
                  data: cumulative,
                  borderColor: '#f59e0b', // Amber-500
                  borderWidth: 2,
                  yAxisID: 'y1',
                  tension: 0.1,
                  pointRadius: 2
              },
              {
                  type: 'bar' as const,
                  label: 'Impacto (Peso x Relevância)',
                  data: items.map(i => i.score),
                  backgroundColor: '#6366f1', // Indigo-500
                  borderRadius: 4,
                  yAxisID: 'y',
                  barPercentage: 0.6
              }
          ]
      };
  }, [notebooks]);

  // 4. Weight Hierarchy (Horizontal Bar - Replacement for unstable Treemap)
  const weightChartData = useMemo(() => {
      const grouped: Record<string, number> = {};
      notebooks.forEach(nb => {
         if(nb.discipline === 'Revisão Geral') return;
         if(!grouped[nb.discipline]) grouped[nb.discipline] = 0;
         grouped[nb.discipline] += WEIGHT_SCORE[nb.weight];
      });
      
      const sorted = Object.entries(grouped).sort(([,a], [,b]) => b - a).slice(0, 7);
      
      return {
          labels: sorted.map(([k]) => k),
          datasets: [{
              label: 'Pontos de Peso Estratégico',
              data: sorted.map(([,v]) => v),
              backgroundColor: sorted.map((_, i) => i < 2 ? '#10b981' : '#334155'), // Top 2 verdes, resto slate
              borderRadius: 4,
              indexAxis: 'y' as const,
              barPercentage: 0.7
          }]
      };
  }, [notebooks]);

  const quadrantData = useMemo(() => notebooks.filter(n => n.discipline !== 'Revisão Geral'), [notebooks]);

  // --- RECOMMENDATION ENGINE ---
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Dashboard Estratégico</h2>
          <button onClick={() => { setLocalConfig(config); setIsConfigOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm border border-slate-700">
            <Settings size={16} /> Configurar
          </button>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="bg-slate-50 text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 flex flex-col h-32 relative overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <Crosshair size={12} className="text-emerald-500"/> Foco da Semana
                  </span>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                  {weeklyFocus.length > 0 ? (
                      weeklyFocus.map((disc, i) => (
                          <div key={i} className="bg-slate-200/50 rounded flex items-center justify-center px-2 text-center h-full">
                              <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2">{disc}</span>
                          </div>
                      ))
                  ) : (
                      <div className="col-span-2 flex items-center justify-center text-xs text-slate-400 italic">Sem planejamento.</div>
                  )}
              </div>
          </div>
      </div>

      {/* STREAK */}
      <div className="bg-white text-slate-900 rounded-xl p-6 border border-slate-200 shadow-lg">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Constância</h3>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                  <span className="cursor-pointer">&lt;</span> 
                  {metrics.dates[0]?.date.split('-').reverse().join('/')} ~ {metrics.dates[metrics.dates.length-1]?.date.split('-').reverse().join('/')} 
                  <span className="cursor-pointer">&gt;</span>
              </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {metrics.dates.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1 min-w-[30px]">
                      <div className={`w-full h-8 rounded-md flex items-center justify-center border transition-all ${day.active ? 'bg-emerald-200 border-emerald-300 text-emerald-700' : 'bg-red-100 border-red-200 text-red-400 opacity-50'}`} title={day.date}>
                          {day.active ? <Check size={14} strokeWidth={3} /> : <XCircle size={14} />}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* MAIN ACTIONS */}
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
                Revisões do Dia
             </h3>
             <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
               {dueNotebooks.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                    <CheckCircle2 size={40} className="text-emerald-500/30 mb-3" />
                    <p className="text-slate-300 font-medium">Você está em dia!</p>
                 </div>
               ) : (
                 dueNotebooks.slice(0, 4).map(nb => (
                     <div key={nb.id} className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/50`}>
                       <div className="flex justify-between items-start">
                           <div>
                             <h4 className={`text-sm font-bold flex items-center gap-2 text-slate-200`}>
                                {nb.discipline === 'Revisão Geral' && <BrainCircuit size={14} />} {nb.name}
                             </h4>
                             <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mt-0.5">{nb.discipline}</p>
                           </div>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${nb.accuracy >= nb.targetAccuracy ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}>{nb.accuracy}%</span>
                       </div>
                       <div className="flex items-center justify-between mt-1">
                           <button onClick={() => { if (nb.discipline === 'Revisão Geral') { const wc = getWildcardNotebook(); if(wc) setSelectedSession(wc); } else setSelectedSession(nb); }} className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20`}>
                             Revisar
                           </button>
                       </div>
                     </div>
                 ))
               )}
             </div>
          </div>
      </div>

      {/* NIETZSCHE BLOCK (REDESIGNED: COMPACT & RECTANGULAR) */}
      <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden group flex flex-col md:flex-row min-h-[240px]">
          
          {/* Left Content */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-center relative z-10">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none md:hidden"><Quote size={80} /></div>
              
              <div className="inline-flex items-center gap-2 mb-4 px-2 py-1 bg-emerald-950/30 border border-emerald-500/20 rounded text-emerald-400 text-[10px] font-bold uppercase tracking-widest w-fit">
                  <Crown size={12} /> Oráculo de Elite
              </div>

              <h3 className="text-xl md:text-2xl font-serif text-slate-100 italic leading-relaxed mb-4 max-w-2xl">
                  "{nietzscheItem.quote}"
              </h3>

              <div className="flex items-center gap-3 text-slate-500 text-xs font-bold mb-6">
                  <Scroll size={14} className="text-slate-600"/> 
                  <span className="uppercase tracking-wider">{nietzscheItem.source}</span>
              </div>

              <div className="bg-slate-950/50 border-l-2 border-emerald-500/50 pl-4 py-2 rounded-r-lg max-w-xl">
                  <p className="text-slate-400 text-xs leading-relaxed">
                      <strong className="text-emerald-500 block mb-1 uppercase text-[9px] tracking-wider">Estratégia:</strong>
                      {nietzscheItem.context}
                  </p>
              </div>
          </div>

          {/* Right Image (Rectangular Cover) */}
          <div className="w-full md:w-1/3 lg:w-1/4 relative min-h-[200px] md:min-h-full">
              {/* Gradient Overlay for blending */}
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-900 via-slate-900/20 to-transparent z-10"></div>
              
              <img 
                src="https://i.postimg.cc/rFFwpKjm/Gemini-Generated-Image-tchb4stchb4stchb.png" 
                className="w-full h-full object-cover object-top grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
                alt="Friedrich Nietzsche" 
              />
          </div>
      </div>

      {/* RADIOGRAFIA TÁTICA */}
      <DashboardSection title="Radiografia Tática" subtitle="Matriz Estratégica & Liquidez" icon={<Target size={20} />} defaultOpen={true}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 order-1 lg:order-1">
                  <QuadrantChart data={quadrantData} />
              </div>
              <div className="lg:col-span-1 order-2 lg:order-2">
                  <LiquidityGauge notebooks={notebooks} />
              </div>
          </div>
      </DashboardSection>

      {/* === EVOLUTION & COMPETENCE (CHART.JS MIGRATION) === */}
      <DashboardSection title="Evolução & Competência" subtitle="Histórico de Desempenho e Equilíbrio de Matérias" icon={<Activity size={20} />} defaultOpen={true}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               
               {/* Radar Chart (Chart.js) */}
               <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm">
                     <Activity size={16} className="text-purple-500"/> Radar de Competência
                  </h3>
                  <div className="w-full h-[320px] flex items-center justify-center">
                      <Radar 
                        data={radarChartData} 
                        options={{
                            maintainAspectRatio: false,
                            responsive: true,
                            scales: {
                                r: {
                                    angleLines: { color: '#334155' },
                                    grid: { color: '#334155' },
                                    pointLabels: { color: '#94a3b8', font: { size: 10 } },
                                    ticks: { display: false, backdropColor: 'transparent' },
                                    suggestedMin: 0,
                                    suggestedMax: 100
                                }
                            },
                            plugins: { legend: { display: false } }
                        }} 
                      />
                  </div>
               </div>

               {/* Evolution Chart (Chart.js) */}
               <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
                 <h3 className="text-slate-100 font-bold text-sm mb-4 flex items-center gap-2">
                   <TrendingUp size={16} className="text-cyan-400"/> Evolução Semanal
                 </h3>
                 <div className="w-full h-[320px]">
                    <Line 
                        data={evolutionChartData}
                        options={{
                            maintainAspectRatio: false,
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    max: 100,
                                    grid: { color: '#334155' },
                                    ticks: { color: '#94a3b8', font: { size: 10 } }
                                },
                                x: {
                                    grid: { display: false },
                                    ticks: { color: '#94a3b8', font: { size: 10 } }
                                }
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: { 
                                    backgroundColor: '#0f172a',
                                    titleColor: '#fff',
                                    bodyColor: '#cbd5e1',
                                    borderColor: '#334155',
                                    borderWidth: 1
                                }
                            }
                        }}
                    />
                 </div>
              </div>
          </div>
      </DashboardSection>

      {/* === DEPTH ANALYSIS (CHART.JS MIGRATION) === */}
      <DashboardSection title="Análise de Profundidade (Elite)" subtitle="Pareto 80/20 e Hierarquia de Pesos" icon={<Layers size={20} />} defaultOpen={true}>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             
             {/* Pareto Chart (Mixed Bar/Line) */}
             <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2"><PieChartIcon size={18} className="text-amber-500"/> Diagrama de Pareto (80/20)</h3>
                </div>
                <div className="w-full h-[320px]">
                    <Chart 
                        type='bar'
                        data={paretoChartData}
                        options={{
                            maintainAspectRatio: false,
                            responsive: true,
                            interaction: { mode: 'index', intersect: false },
                            scales: {
                                y: {
                                    type: 'linear',
                                    display: true,
                                    position: 'left',
                                    grid: { color: '#334155' }
                                },
                                y1: {
                                    type: 'linear',
                                    display: true,
                                    position: 'right',
                                    grid: { display: false },
                                    max: 100,
                                    ticks: { callback: (val) => val + '%' }
                                },
                                x: {
                                    grid: { display: false },
                                    ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45 }
                                }
                            },
                            plugins: {
                                legend: { labels: { color: '#94a3b8', font: { size: 10 } } }
                            }
                        }}
                    />
                </div>
             </div>

             {/* Weights Distribution (Horizontal Bar - Replacement for Treemap) */}
             <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2"><BarChart2 size={18} className="text-emerald-500"/> Hierarquia de Pesos</h3>
                </div>
                <div className="w-full h-[320px]">
                    <Bar 
                        data={weightChartData}
                        options={{
                            indexAxis: 'y', // Horizontal
                            maintainAspectRatio: false,
                            responsive: true,
                            scales: {
                                x: { grid: { color: '#334155' } },
                                y: { 
                                    grid: { display: false },
                                    ticks: { color: '#e2e8f0', font: { weight: 'bold' } }
                                }
                            },
                            plugins: {
                                legend: { display: false }
                            }
                        }}
                    />
                </div>
             </div>
         </div>
      </DashboardSection>

      {selectedSession && <StudySession notebook={selectedSession} onClose={() => setSelectedSession(null)} />}

      {/* Config Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between mb-4 border-b border-slate-800 pb-4">
                    <div>
                        <h3 className="text-white font-bold text-lg">Configuração do Ciclo</h3>
                        <p className="text-slate-400 text-xs">Defina os parâmetros do seu concurso alvo.</p>
                    </div>
                    <button onClick={() => setIsConfigOpen(false)}><X className="text-slate-400 hover:text-white"/></button>
                </div>
                <form onSubmit={handleSaveConfig} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Cargo Alvo</label>
                            <input type="text" value={localConfig.targetRole} onChange={e => setLocalConfig({...localConfig, targetRole: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm" placeholder="Ex: Auditor Fiscal" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Banca</label>
                            <input type="text" value={localConfig.banca || ''} onChange={e => setLocalConfig({...localConfig, banca: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm" placeholder="Ex: FGV" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Data da Prova</label>
                            <input type="date" value={localConfig.examDate || ''} onChange={e => setLocalConfig({...localConfig, examDate: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm" />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Início dos Estudos</label>
                            <input type="date" value={localConfig.startDate || ''} onChange={e => setLocalConfig({...localConfig, startDate: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase flex justify-between">
                            <span className="flex items-center gap-1"><FileText size={12}/> Texto do Edital (Conteúdo Programático)</span>
                            <span className="text-[10px] text-emerald-500 cursor-pointer hover:underline" onClick={() => navigator.clipboard.readText().then(t => setLocalConfig({...localConfig, editalText: t}))}>Colar da Área de Transferência</span>
                        </label>
                        <textarea 
                            value={localConfig.editalText || ''} 
                            onChange={e => setLocalConfig({...localConfig, editalText: e.target.value})} 
                            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 text-xs font-mono custom-scrollbar resize-none" 
                            placeholder="Cole aqui o conteúdo programático do edital para a IA processar..."
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Este texto é usado pela IA para gerar o "Edital Verticalizado".</p>
                    </div>

                    <button onClick={handleSaveConfig} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-emerald-900/20">
                        <Save size={18}/> Salvar Configurações
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};