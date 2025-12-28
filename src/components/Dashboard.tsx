import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { QuadrantChart } from './QuadrantChart';
import { StudySession } from './StudySession';
import { LiquidityGauge } from './LiquidityGauge';
import { Notebook, WEIGHT_SCORE, RELEVANCE_SCORE, Weight, ScheduleItem } from '../types';
import { 
  BookOpen, Target, Calendar, Award, Zap, BrainCircuit, Settings, 
  FileText, Save, X, ExternalLink, TrendingUp, Link as LinkIcon,
  PieChart as PieChartIcon, Activity, Layers, Siren, Sparkles, ArrowRight, CheckCircle2,
  MoreHorizontal, Calculator, Clock, Check, XCircle, HelpCircle, Quote, ChevronDown, ChevronUp, BarChart2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Bar, Legend, ReferenceLine,
  Treemap
} from 'recharts';
import { runAlgorithmUnitTests } from '../utils/algorithm';

// Custom Content for Treemap to make it look "Elite"
const CustomTreemapContent = (props: any) => {
  const { root, depth, x, y, width, height, index, payload, colors, name } = props;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: depth < 2 ? '#334155' : '#1e293b', // Different shades for depth
          stroke: '#0f172a',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1,
        }}
      />
      {depth === 1 ? (
        <text
          x={x + width / 2}
          y={y + height / 2 + 7}
          textAnchor="middle"
          fill="#fff"
          fontSize={14}
          fontWeight="bold"
        >
          {name}
        </text>
      ) : null}
      {depth === 2 ? (
         <foreignObject x={x} y={y} width={width} height={height}>
            <div className="w-full h-full flex items-center justify-center p-1 overflow-hidden">
               <p className="text-[10px] text-emerald-400 text-center leading-tight font-medium break-words">
                  {name}
               </p>
            </div>
         </foreignObject>
      ) : null}
    </g>
  );
};

const NIETZSCHE_QUOTES = [
  "Quem tem um porquê enfrenta qualquer como.",
  "O que não nos mata nos fortalece.",
  "Torna-te quem tu és.",
  "Quanto mais alto voamos, menores parecemos aos olhos de quem não sabe voar.",
  "Ninguém pode construir a ponte pela qual você deve cruzar o fluxo da vida, ninguém a não ser você.",
  "Aquele que luta com monstros deve acautelar-se para não tornar-se também um monstro.",
  "Amor Fati: não querer nada de diferente do que é, nem no futuro, nem no passado, nem por toda a eternidade.",
  "A disciplina é a mãe do sucesso.",
  "O homem é uma corda esticada entre o animal e o super-homem: uma corda sobre um abismo."
];

// --- COLLAPSIBLE SECTION COMPONENT ---
const DashboardSection = ({ 
    title, 
    icon, 
    children, 
    defaultOpen = false,
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-4 flex items-center justify-between transition-colors ${isOpen ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'}`}
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
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 border-t border-slate-800/50">
                    {children}
                </div>
            </div>
        </div>
    );
};

interface Props {
    onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const { notebooks, config, updateConfig, getWildcardNotebook, setFocusedNotebookId, cycles, activeCycleId } = useStore();
  const [selectedSession, setSelectedSession] = useState<Notebook | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Local state for the form
  const [localConfig, setLocalConfig] = useState(config);

  const today = new Date().toISOString().split('T')[0];
  
  const dueNotebooks = useMemo(() => {
    return notebooks.filter(nb => 
      nb.weekId && nb.nextReview && nb.nextReview.split('T')[0] <= today
    ).sort((a, b) => (a.nextReview! > b.nextReview! ? 1 : -1));
  }, [notebooks, today]);

  const randomQuote = useMemo(() => {
      const index = Math.floor(Math.random() * NIETZSCHE_QUOTES.length);
      return NIETZSCHE_QUOTES[index];
  }, []);

  // --- NEW METRICS CALCULATIONS ---
  const metrics = useMemo(() => {
      // 1. Performance
      const activeNotebooks = notebooks.filter(n => n.accuracy > 0);
      const totalAcc = activeNotebooks.reduce((sum, n) => sum + n.accuracy, 0);
      const avgAccuracy = activeNotebooks.length > 0 ? Math.round(totalAcc / activeNotebooks.length) : 0;
      
      // 2. Progress
      const totalTopics = notebooks.filter(n => n.discipline !== 'Revisão Geral').length;
      const completedTopics = notebooks.filter(n => (n.status === 'Dominado' || n.accuracy >= n.targetAccuracy) && n.discipline !== 'Revisão Geral').length;
      const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      // 3. Consistency (Last 14 days)
      const dates = [];
      const streakMap: Record<string, boolean> = {};
      let currentStreak = 0;
      let streakBroken = false;

      // Generate last 14 days
      for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          
          // Check if any notebook was practiced on this date
          const hasPractice = notebooks.some(n => n.lastPractice && n.lastPractice.startsWith(dateStr));
          streakMap[dateStr] = hasPractice;
          dates.push({ date: dateStr, active: hasPractice, day: d.getDate(), month: d.getMonth() + 1 });
      }

      // Calculate Streak (from yesterday/today backwards)
      const sortedDatesDesc = [...dates].reverse();
      for (const d of sortedDatesDesc) {
          if (d.active) {
              if (!streakBroken) currentStreak++;
          } else {
              // Allow missing today if it's still early, but generally breaks streak
              if (d.date !== today) streakBroken = true; 
          }
      }

      return {
          avgAccuracy,
          completedTopics,
          pendingTopics: totalTopics - completedTopics,
          progressPercent,
          dates,
          currentStreak
      };
  }, [notebooks, cycles, activeCycleId]);


  // --- LOGIC: ATHENA RECOMMENDATION ENGINE ---
  const athenaRecommendation = useMemo(() => {
    const candidates = notebooks.filter(n => n.discipline !== 'Revisão Geral');
    if (candidates.length === 0) return null;

    // 1. Critical: High Weight + Low Accuracy (< 60%)
    const critical = candidates.find(n => 
        (n.weight === Weight.MUITO_ALTO || n.weight === Weight.ALTO) && n.accuracy < 60
    );

    if (critical) {
        return {
            type: 'critical',
            notebook: critical,
            title: `Atenção Imediata: ${critical.discipline}`,
            reason: `Matéria de peso ${critical.weight} com desempenho crítico (${critical.accuracy}%). Foco total aqui hoje.`,
            icon: <Siren className="text-red-500 animate-pulse" size={24} />,
            colorClass: 'border-red-500/50 bg-red-900/10'
        };
    }

    // 2. Optimization: High Weight + Almost there (80-89%)
    const optimization = candidates.find(n => 
        (n.weight === Weight.MUITO_ALTO || n.weight === Weight.ALTO) && n.accuracy >= 80 && n.accuracy < n.targetAccuracy
    );

    if (optimization) {
        return {
            type: 'optimization',
            notebook: optimization,
            title: `Refinamento: ${optimization.discipline}`,
            reason: `Você está com ${optimization.accuracy}%. Um esforço concentrado agora garante a pontuação de elite.`,
            icon: <Sparkles className="text-amber-500" size={24} />,
            colorClass: 'border-amber-500/50 bg-amber-900/10'
        };
    }

    // 3. Fallback: The item with the lowest accuracy relative to its weight
    const lowest = [...candidates].sort((a, b) => {
        const scoreA = (WEIGHT_SCORE[a.weight] * 100) - a.accuracy;
        const scoreB = (WEIGHT_SCORE[b.weight] * 100) - b.accuracy;
        return scoreB - scoreA;
    })[0];

    if (lowest) {
        return {
            type: 'standard',
            notebook: lowest,
            title: `Sugestão do Dia: ${lowest.discipline}`,
            reason: `Identificamos uma lacuna em ${lowest.name}. Melhorar este tópico trará o maior retorno sobre investimento.`,
            icon: <Zap className="text-emerald-500" size={24} />,
            colorClass: 'border-emerald-500/50 bg-emerald-900/10'
        };
    }

    return null;
  }, [notebooks]);


  // --- DATA: EVOLUTION LINE CHART ---
  const progressData = useMemo(() => {
    const weeks = Array.from({ length: Math.min(config.weeksUntilExam, 8) }, (_, i) => `week-${i + 1}`);
    return weeks.map((weekId, index) => {
      const weekNotebooks = notebooks.filter(nb => nb.weekId === weekId && nb.discipline !== 'Revisão Geral');
      const count = weekNotebooks.length;
      const totalAcc = weekNotebooks.reduce((sum, nb) => sum + nb.accuracy, 0);
      const average = count > 0 ? Math.round(totalAcc / count) : 0;
      
      return {
        name: `Sem ${index + 1}`,
        acerto: average,
        qtd: count
      };
    });
  }, [notebooks, config.weeksUntilExam]);

  // --- DATA: RADAR CHART (COMPETENCE) ---
  const radarData = useMemo(() => {
     const grouped: Record<string, { total: number, count: number }> = {};
     
     notebooks.forEach(nb => {
        if(nb.discipline === 'Revisão Geral') return;
        if(!grouped[nb.discipline]) grouped[nb.discipline] = { total: 0, count: 0 };
        grouped[nb.discipline].total += nb.accuracy;
        grouped[nb.discipline].count += 1;
     });

     return Object.keys(grouped).map(key => ({
        subject: key,
        A: Math.round(grouped[key].total / grouped[key].count),
        fullMark: 100
     }));
  }, [notebooks]);

  // --- DATA: PARETO CHART (ABC CURVE) ---
  const paretoData = useMemo(() => {
      const items = notebooks
        .filter(n => n.discipline !== 'Revisão Geral')
        .map(n => ({
            name: n.name.length > 15 ? n.name.substring(0,15) + '...' : n.name,
            fullName: n.name,
            // Score de Impacto: Peso * Relevância
            score: WEIGHT_SCORE[n.weight] * RELEVANCE_SCORE[n.relevance]
        }));
      
      // Sort Descending
      items.sort((a, b) => b.score - a.score);

      const totalScore = items.reduce((sum, item) => sum + item.score, 0);
      let accumulated = 0;

      return items.map(item => {
          accumulated += item.score;
          return {
              ...item,
              cumulativePercentage: Math.round((accumulated / totalScore) * 100)
          };
      }).slice(0, 15); // Show top 15 for readability
  }, [notebooks]);

  // --- DATA: TREEMAP (HIERARCHY) ---
  const treemapData = useMemo(() => {
      const grouped: Record<string, any[]> = {};
      
      notebooks.forEach(nb => {
         if(nb.discipline === 'Revisão Geral') return;
         if(!grouped[nb.discipline]) grouped[nb.discipline] = [];
         
         // Size based on Weight Score (1 to 4)
         grouped[nb.discipline].push({
             name: nb.name,
             size: WEIGHT_SCORE[nb.weight] * 10 // Scale up slightly
         });
      });

      return Object.keys(grouped).map(key => ({
          name: key,
          children: grouped[key]
      }));
  }, [notebooks]);

  // Quadrant Data
  const quadrantData = useMemo(() => {
    return notebooks.filter(n => n.discipline !== 'Revisão Geral');
  }, [notebooks]);

  const startWildcard = () => {
    const wildcard = getWildcardNotebook();
    if (wildcard) {
      setSelectedSession(wildcard);
    } else {
      alert("Nenhum caderno pendente para revisão inteligente hoje! Você está em dia.");
    }
  };

  const handleReviewClick = (nb: Notebook) => {
    if (nb.discipline === 'Revisão Geral') {
      startWildcard();
    } else {
      // FIX: Open Study Session directly instead of navigating to Library Edit
      setSelectedSession(nb);
    }
  };

  const handleRecommendationClick = (nb: Notebook) => {
      // Set the focused notebook ID in the store
      setFocusedNotebookId(nb.id);
      // Navigate to library view
      onNavigate('library');
  };

  const handleOpenConfig = () => {
      setLocalConfig(config);
      setIsConfigOpen(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
      e.preventDefault();
      updateConfig(localConfig);
      setIsConfigOpen(false);
  };

  const handleAlgoChange = (section: 'baseIntervals' | 'multipliers', key: string, value: string) => {
      if(!localConfig.algorithm) return;
      
      setLocalConfig({
          ...localConfig,
          algorithm: {
              ...localConfig.algorithm,
              [section]: {
                  ...localConfig.algorithm[section],
                  [key]: Number(value)
              }
          }
      });
  };

  const runTests = () => {
      runAlgorithmUnitTests();
      alert("Testes unitários executados no console (F12). Verifique os resultados.");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 relative">
      
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Dashboard Estratégico</h2>
          <button 
            onClick={handleOpenConfig}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm border border-slate-700"
            aria-label="Configurações do Concurso"
          >
            <Settings size={16} />
            Configurar Concurso
          </button>
      </div>

      {/* === TOP METRICS CARDS (ELITE PRINT STYLE) === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card 1: Desempenho */}
          <div className="bg-slate-50 text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Desempenho</span>
              </div>
              <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        {metrics.avgAccuracy}% Acertos (Média)
                      </span>
                      <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                        {metrics.avgAccuracy > 0 ? 100 - metrics.avgAccuracy : 0}% Erros (Média)
                      </span>
                  </div>
                  <span className="text-4xl font-black text-slate-900">{metrics.avgAccuracy}%</span>
              </div>
          </div>

          {/* Card 2: Progresso Edital */}
          <div className="bg-slate-50 text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between h-32">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progresso no Edital</span>
              <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                      <span className="text-xs font-semibold text-emerald-600">{metrics.completedTopics} Tópicos Concluídos</span>
                      <span className="text-xs font-semibold text-orange-500">{metrics.pendingTopics} Tópicos Pendentes</span>
                  </div>
                  <span className="text-4xl font-black text-slate-900">{metrics.progressPercent}%</span>
              </div>
          </div>

          {/* Card 3: Quote */}
          <div className="bg-slate-50 text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 flex items-center justify-center h-32 relative overflow-hidden group">
              <Quote className="absolute top-2 left-2 text-slate-200 w-8 h-8 opacity-50" />
              <p className="text-sm font-medium text-slate-700 italic text-center leading-relaxed z-10 px-2 font-serif group-hover:scale-105 transition-transform duration-500">
                  "{randomQuote}"
              </p>
              <span className="absolute bottom-2 right-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">F. Nietzsche</span>
          </div>
      </div>

      {/* === CONSTÂNCIA NOS ESTUDOS (STREAK) === */}
      <div className="bg-white text-slate-900 rounded-xl p-6 border border-slate-200 shadow-lg">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Constância nos Estudos</h3>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                  <span className="cursor-pointer hover:text-emerald-600">&lt;</span> 
                  {metrics.dates[0]?.date.split('-').reverse().join('/')} ~ {metrics.dates[metrics.dates.length-1]?.date.split('-').reverse().join('/')} 
                  <span className="cursor-pointer hover:text-emerald-600">&gt;</span>
              </div>
          </div>
          
          <div className="mb-6">
              <p className="text-lg text-slate-800">
                  Você está há <strong className="text-slate-900">{metrics.currentStreak} dias</strong> sem falhar! Seu recorde é de <strong className="text-slate-900">{metrics.currentStreak} dias</strong>. <HelpCircle size={14} className="inline text-slate-400 cursor-help" />
              </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {metrics.dates.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1 min-w-[30px]">
                      <div 
                        className={`w-full h-8 rounded-md flex items-center justify-center border transition-all
                            ${day.active 
                                ? 'bg-emerald-200 border-emerald-300 text-emerald-700' 
                                : 'bg-red-100 border-red-200 text-red-400 opacity-50'}
                        `}
                        title={day.date}
                      >
                          {day.active ? <Check size={14} strokeWidth={3} /> : <XCircle size={14} />}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* === MAIN ACTION AREA === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ATHENA DYNAMIC RECOMMENDATION FEED (V2.0 REDESIGN) */}
          {athenaRecommendation && (
            <div className={`w-full p-1 rounded-2xl bg-gradient-to-r from-transparent via-slate-700 to-transparent p-[1px]`}>
                <div className={`relative w-full rounded-2xl p-6 border flex flex-col gap-4 shadow-2xl overflow-hidden ${athenaRecommendation.colorClass} h-full justify-between`}>
                    {/* Background Decor */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex items-start gap-5 relative z-10">
                        <div className="bg-slate-950/80 backdrop-blur p-4 rounded-xl border border-white/10 shadow-lg">
                            {athenaRecommendation.icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-950/50 px-2 py-0.5 rounded border border-slate-700">Atena Sugere Hoje</span>
                                {athenaRecommendation.type === 'critical' && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold border border-red-500/30">CRÍTICO</span>}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{athenaRecommendation.title}</h3>
                            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
                                {athenaRecommendation.reason}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleRecommendationClick(athenaRecommendation.notebook)}
                        className="w-full py-4 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 z-20 relative cursor-pointer"
                        aria-label="Abrir caderno no banco de dados"
                    >
                        <ArrowRight size={20} />
                        Abrir no Banco
                    </button>
                </div>
            </div>
          )}

          {/* Daily Tasks */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-500"/>
                Metas do Dia
             </h3>
             <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
               {dueNotebooks.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                    <CheckCircle2 size={40} className="text-emerald-500/30 mb-3" />
                    <p className="text-slate-300 font-medium">Você está em dia!</p>
                    <p className="text-slate-500 text-sm">Utilize o Modo Coringa para adiantar revisões.</p>
                 </div>
               ) : (
                 dueNotebooks.slice(0, 4).map(nb => {
                   const isGeneric = nb.discipline === 'Revisão Geral';
                   return (
                     <div key={nb.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors group ${isGeneric ? 'bg-purple-900/20 border-purple-500/30' : 'bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/50'}`}>
                       <div>
                         <h4 className={`text-sm font-medium flex items-center gap-2 ${isGeneric ? 'text-purple-300' : 'text-slate-200'}`}>
                            {isGeneric && <BrainCircuit size={16} />}
                            {nb.name}
                         </h4>
                         <p className="text-[10px] text-slate-500 mt-0.5">
                            {nb.discipline} 
                         </p>
                       </div>
                       <button 
                        onClick={() => handleReviewClick(nb)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isGeneric 
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                        }`}
                       >
                         {isGeneric ? 'Iniciar' : 'Revisar'}
                       </button>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
      </div>

      {/* === DETAILED ANALYSIS (COLLAPSIBLE SECTIONS) === */}
      {/* ... (Chart sections remain unchanged) ... */}
      <DashboardSection title="Radiografia Tática" subtitle="Liquidez do Conhecimento & Matriz Estratégica" icon={<Target size={20} />}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                  <LiquidityGauge notebooks={notebooks} />
              </div>
              <div className="lg:col-span-1">
                  <QuadrantChart data={quadrantData} />
              </div>
          </div>
      </DashboardSection>

      <DashboardSection title="Evolução & Competência" subtitle="Histórico de Desempenho e Equilíbrio de Matérias" icon={<Activity size={20} />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Radar Chart: Competência */}
               <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-[340px] flex flex-col">
                  <h3 className="text-white font-bold mb-1 flex items-center gap-2 text-sm">
                     <Activity size={16} className="text-purple-500"/> Radar de Competência
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-2">Busque um polígono uniforme (Generalista).</p>
                  
                  <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                              <PolarGrid stroke="#334155" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar
                                  name="Acurácia"
                                  dataKey="A"
                                  stroke="#8b5cf6"
                                  strokeWidth={2}
                                  fill="#8b5cf6"
                                  fillOpacity={0.3}
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: '12px' }}
                                itemStyle={{ color: '#a78bfa' }}
                              />
                          </RadarChart>
                      </ResponsiveContainer>
                  </div>
               </div>

               {/* Evolution Chart */}
               <div className="w-full h-[340px] bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col">
                 <h3 className="text-slate-100 font-bold text-sm mb-2 flex items-center gap-2">
                   <TrendingUp size={16} className="text-cyan-400"/>
                   Evolução Semanal
                 </h3>
                 <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 9}} />
                        <YAxis stroke="#94a3b8" tick={{fontSize: 9}} domain={[0, 100]} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', fontSize: '11px' }}
                            itemStyle={{ color: '#22d3ee' }}
                            formatter={(value: number) => [`${value}%`, 'Média']}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="acerto" 
                            stroke="#22d3ee" 
                            strokeWidth={2} 
                            dot={{ r: 2, fill: '#06b6d4' }} 
                        />
                    </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>
          </div>
      </DashboardSection>

      <DashboardSection title="Análise de Profundidade (Elite)" subtitle="Pareto 80/20 e Hierarquia de Pesos" icon={<Layers size={20} />}>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* 1. Pareto (ABC) */}
             <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 h-[400px] flex flex-col">
                <div className="mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <PieChartIcon size={18} className="text-amber-500"/> Diagrama de Pareto (80/20)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Ataque os tópicos à esquerda da linha vermelha (80% da nota) para garantir aprovação.
                    </p>
                </div>
                
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={paretoData} margin={{top: 20, right: 20, bottom: 20, left: 20}}>
                            <CartesianGrid stroke="#334155" vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="name" scale="band" stroke="#94a3b8" tick={{fontSize: 10}} />
                            <YAxis yAxisId="left" stroke="#94a3b8" tick={{fontSize: 10}} label={{ value: 'Score Impacto', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{fontSize: 10}} unit="%" domain={[0, 100]} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: '12px' }}
                            />
                            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                            <Bar yAxisId="left" dataKey="score" name="Score Impacto" fill="#3b82f6" barSize={20} radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" name="% Acumulada" stroke="#f59e0b" strokeWidth={2} dot={false} />
                            <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight',  value: 'Corte Elite (80%)', fill: '#ef4444', fontSize: 10 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
             </div>

             {/* 2. Treemap (Hierarquia) */}
             <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 h-[400px] flex flex-col">
                <div className="mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <BarChart2 size={18} className="text-emerald-500"/> Hierarquia de Pesos (Treemap)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        O tamanho representa a importância real no edital. Não gaste tempo excessivo em retângulos pequenos.
                    </p>
                </div>
                
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={treemapData}
                            dataKey="size"
                            stroke="#0f172a"
                            fill="#10b981"
                            content={<CustomTreemapContent />}
                        >
                            <Tooltip 
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl text-xs">
                                          <p className="font-bold text-white">{payload[0].payload.name}</p>
                                          <p className="text-emerald-400">Peso Relativo: {Math.round(payload[0].value as number)}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                }}
                            />
                        </Treemap>
                    </ResponsiveContainer>
                </div>
             </div>
         </div>
      </DashboardSection>

      {selectedSession && (
        <StudySession notebook={selectedSession} onClose={() => setSelectedSession(null)} />
      )}

      {/* Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings size={20} className="text-emerald-500"/> Configuração do Concurso
                    </h3>
                    <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSaveConfig} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* ... Existing Form Content ... */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">1. Dados do Concurso</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Nome do Concurso</label>
                                <input 
                                    type="text"
                                    value={localConfig.examName || ''}
                                    onChange={e => setLocalConfig({...localConfig, examName: e.target.value})}
                                    placeholder="Ex: Receita Federal 2025"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 placeholder-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Banca Examinadora</label>
                                <input 
                                    type="text"
                                    value={localConfig.banca || ''}
                                    onChange={e => setLocalConfig({...localConfig, banca: e.target.value})}
                                    placeholder="Ex: FGV, Cebraspe..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 placeholder-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Cargo Alvo</label>
                                <input 
                                    type="text"
                                    value={localConfig.targetRole}
                                    onChange={e => setLocalConfig({...localConfig, targetRole: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 placeholder-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Data da Prova</label>
                                <input 
                                    type="date"
                                    value={localConfig.examDate || ''}
                                    onChange={e => setLocalConfig({...localConfig, examDate: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-end border-b border-emerald-500/20 pb-2">
                            <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">2. Edital Verticalizado</h4>
                            <span className="text-[10px] text-slate-500">Contexto para a IA</span>
                        </div>
                        
                        <div>
                             <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Link do Edital / Site da Banca</label>
                             <div className="relative">
                                <LinkIcon className="absolute left-3 top-3 text-slate-500" size={14}/>
                                <input 
                                    type="url"
                                    value={localConfig.editalLink || ''}
                                    onChange={e => setLocalConfig({...localConfig, editalLink: e.target.value})}
                                    placeholder="https://..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 pl-9 text-white outline-none focus:border-emerald-500 placeholder-slate-600 mb-2"
                                />
                             </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Texto do Conteúdo Programático</label>
                            <textarea 
                                value={localConfig.editalText || ''}
                                onChange={e => setLocalConfig({...localConfig, editalText: e.target.value})}
                                placeholder="Cole aqui a lista de disciplinas e tópicos do edital..."
                                className="w-full h-40 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm font-mono outline-none focus:border-emerald-500 resize-none placeholder-slate-600"
                            />
                        </div>
                         <p className="text-xs text-slate-500">
                            * Estes dados serão enviados para a inteligência artificial (Gemini) para ajudar a personalizar suas sugestões de revisão e prioridades.
                        </p>
                    </div>

                     {/* SECTION 3: ADVANCED ALGORITHM CONFIG */}
                     <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-end border-b border-emerald-500/20 pb-2">
                             <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                <Calculator size={16} /> 3. Ajuste Fino do Algoritmo
                             </h4>
                             <button type="button" onClick={runTests} className="text-[10px] text-emerald-400 hover:text-white underline">
                                 Executar Testes Unitários
                             </button>
                        </div>
                        
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                            <p className="text-xs text-slate-400 mb-4">
                                Personalize os intervalos (em dias) e multiplicadores de retenção. Cuidado: alterações aqui afetam todo o cronograma.
                            </p>
                            
                            {localConfig.algorithm && (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Intervalos Base (Dias)</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            <div>
                                                <span className="block text-[9px] text-red-400 mb-1">Learning (&lt;60%)</span>
                                                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-center text-xs"
                                                    value={localConfig.algorithm.baseIntervals.learning}
                                                    onChange={(e) => handleAlgoChange('baseIntervals', 'learning', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-amber-400 mb-1">Reviewing (60-79%)</span>
                                                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-center text-xs"
                                                    value={localConfig.algorithm.baseIntervals.reviewing}
                                                    onChange={(e) => handleAlgoChange('baseIntervals', 'reviewing', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-blue-400 mb-1">Mastering (80-89%)</span>
                                                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-center text-xs"
                                                    value={localConfig.algorithm.baseIntervals.mastering}
                                                    onChange={(e) => handleAlgoChange('baseIntervals', 'mastering', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-emerald-400 mb-1">Maintaining (90%+)</span>
                                                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-center text-xs"
                                                    value={localConfig.algorithm.baseIntervals.maintaining}
                                                    onChange={(e) => handleAlgoChange('baseIntervals', 'maintaining', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Aceleradores (Multiplicadores)</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <span className="block text-[9px] text-slate-400 mb-1">Relev. Extrema</span>
                                                <input type="number" step="0.1" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-center text-xs"
                                                    value={localConfig.algorithm.multipliers.relevanceExtreme}
                                                    onChange={(e) => handleAlgoChange('multipliers', 'relevanceExtreme', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-slate-400 mb-1">Relev. Alta</span>
                                                <input type="number" step="0.1" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-center text-xs"
                                                    value={localConfig.algorithm.multipliers.relevanceHigh}
                                                    onChange={(e) => handleAlgoChange('multipliers', 'relevanceHigh', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-slate-400 mb-1">Tendência Alta</span>
                                                <input type="number" step="0.1" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-center text-xs"
                                                    value={localConfig.algorithm.multipliers.trendHigh}
                                                    onChange={(e) => handleAlgoChange('multipliers', 'trendHigh', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                     </div>

                </form>

                <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-4">
                    <button onClick={() => setIsConfigOpen(false)} className="px-6 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancelar</button>
                    <button onClick={handleSaveConfig} className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2">
                        <Save size={18} /> Salvar Contexto
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};