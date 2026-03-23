import React, { useState, useMemo, useEffect } from 'react';
import { useStore, useMergedDisciplines } from '../store';
import { useTheme } from '../ThemeContext';
import { QuadrantChart } from './QuadrantChart';
import { DisciplineQuadrantChart } from './DisciplineQuadrantChart';
import { WeeklyProgress } from './WeeklyProgress';
import { Weight, WEIGHT_SCORE } from '../types';
import { DEFAULT_ALGO_CONFIG } from '../utils/algorithm';
import { 
  Target, Settings, TrendingUp, TrendingDown, Minus,
  ChevronDown, Database, Terminal, Flame, Loader2, Settings2, HelpCircle, ChevronUp, Book, ChevronLeft, ChevronRight, X, FileText, Key, BrainCircuit
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
import { Radar, Line, Bar } from 'react-chartjs-2';

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

ChartJS.defaults.font.family = "Inter, sans-serif";
ChartJS.defaults.font.size = 11;

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.1)', borderDash: [4, 4] },
            ticks: { font: { weight: 'bold' } },
            border: { display: false }
        },
        x: {
            grid: { display: false },
            ticks: { 
                font: { weight: 'bold', size: 10 }
            },
            border: { display: false }
        }
    },
    plugins: {
        legend: { display: false }, 
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#f8fafc',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
                label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}%`
            }
        }
    },
    interaction: {
        mode: 'index' as const,
        intersect: false,
    },
};

const textOnBarsPlugin = {
  id: 'textOnBars',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((bar: any, index: number) => {
        const value = dataset.data[index];
        if (value > 5) { 
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(value + '%', bar.x, bar.y + 20); 
        }
      });
    });
  }
};

const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            beginAtZero: true,
            max: 100,
            grid: { display: false },
            ticks: { display: false },
            border: { display: false }
        },
        x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 9 } },
            border: { display: false }
        }
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#f8fafc',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            displayColors: false,
        }
    }
};

const ALGO_TOOLTIPS: Record<string, { title: string, desc: string }> = {
    learning: { title: "Aprendizado (< 60%)", desc: "Fase de aquisição ou reconstrução. O sistema entende que você ainda não aprendeu. Intervalo curto para evitar perda." },
    reviewing: { title: "Revisão (60% - 79%)", desc: "Fase de fixação. Você entende o assunto, mas comete erros ou tem lacunas. Intervalo médio-curto." },
    mastering: { title: "Domínio (80% - 89%)", desc: "Fase de polimento. O conteúdo está sólido, quase excelente. Intervalo médio." },
    maintaining: { title: "Manutenção (> 90%)", desc: "Você dominou o tópico. O objetivo é apenas combater a Curva do Esquecimento. Intervalo longo." }
};

const ORDERED_ALGO_KEYS = ['learning', 'reviewing', 'mastering', 'maintaining'];

const StreakIcon = ({ streak }: { streak: number }) => {
    if (streak >= 30) {
        return (
            <div className="relative flex items-center justify-center w-8 h-8">
                <div className="absolute inset-0 bg-rose-500 rounded-full blur-md opacity-50 animate-pulse"></div>
                <Flame size={24} className="text-rose-500 fill-rose-500 animate-bounce drop-shadow-[0_0_15px_rgba(244,63,94,1)] relative z-10" />
                <Sparkles size={12} className="text-yellow-400 absolute -top-1 -right-1 animate-spin" />
                <Sparkles size={10} className="text-amber-400 absolute -bottom-1 -left-1 animate-pulse" />
            </div>
        );
    } else if (streak >= 15) {
        return (
            <div className="relative flex items-center justify-center w-8 h-8">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-sm opacity-40 animate-pulse"></div>
                <Flame size={22} className="text-red-500 fill-red-500 animate-bounce drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] relative z-10" />
                <Sparkles size={10} className="text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
        );
    } else if (streak >= 7) {
        return (
            <div className="relative flex items-center justify-center w-8 h-8">
                <Flame size={20} className="text-orange-500 fill-orange-500 animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            </div>
        );
    } else if (streak >= 3) {
        return (
            <div className="relative flex items-center justify-center w-8 h-8">
                <Flame size={18} className="text-amber-500 fill-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]" />
            </div>
        );
    } else if (streak >= 1) {
        return (
            <div className="relative flex items-center justify-center w-8 h-8">
                <Flame size={18} className="text-amber-400 fill-amber-400" />
            </div>
        );
    }

    return (
        <div className="relative flex items-center justify-center w-8 h-8">
            <Flame size={18} className="text-slate-300 dark:text-slate-700" />
        </div>
    );
};

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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-6 shadow-md transition-all">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-4 flex items-center justify-between transition-colors ${isOpen ? 'bg-slate-50 dark:bg-slate-800/80' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOpen ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {icon}
                    </div>
                    <div className="text-left">
                        <h3 className={`font-bold text-sm ${isOpen ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{title}</h3>
                        {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
                    </div>
                </div>
                <div className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </button>
            
            {isOpen && (
                <div className="p-6 border-t border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50">
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

const FIX_SQL = `-- SCRIPT DE CATÁLOGO MESTRE & PERMISSÕES (V4)
ALTER TABLE notebooks ALTER COLUMN user_id DROP NOT NULL;
DROP POLICY IF EXISTS "Strict Access Policy" ON notebooks;
DROP POLICY IF EXISTS "Read Public and Private" ON notebooks;
DROP POLICY IF EXISTS "Modify Own" ON notebooks;
DROP POLICY IF EXISTS "Enable read access for all users" ON notebooks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON notebooks;
DROP POLICY IF EXISTS "Enable update for users based on email" ON notebooks;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON notebooks;
DROP POLICY IF EXISTS "Public Catalog Management" ON notebooks;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read Public and Private" ON notebooks 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Manage All Notebooks" ON notebooks 
FOR ALL TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
NOTIFY pgrst, 'reload schema';
`;

interface Props {
    onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const { notebooks, config, updateConfig, setFocusedNotebookId, cycles, activeCycleId, startSession, dbError } = useStore();
  const mergedDisciplines = useMergedDisciplines();
  const { theme } = useTheme();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);
  const [apiKey, setApiKey] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [expandedMetric, setExpandedMetric] = useState<'performance' | 'progress' | null>(null);
  const [viewedMonthOffset, setViewedMonthOffset] = useState(0);

  useEffect(() => {
    if (theme === 'dark') {
        ChartJS.defaults.color = '#94a3b8';
        ChartJS.defaults.borderColor = '#1e293b';
    } else {
        ChartJS.defaults.color = '#475569';
        ChartJS.defaults.borderColor = '#e2e8f0';
    }
  }, [theme]);

  useEffect(() => {
      if (isConfigOpen) {
          const storedKey = localStorage.getItem('atena_api_key');
          if (storedKey) setApiKey(storedKey);
      }
  }, [isConfigOpen]);

  const handleSaveConfig = async (e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        await updateConfig(localConfig);
        if (apiKey.trim()) {
            localStorage.setItem('atena_api_key', apiKey.trim());
        } else {
            localStorage.removeItem('atena_api_key');
        }
        setIsConfigOpen(false);
        window.location.reload(); 
      } catch (error) {
        console.error(error);
        setIsSaving(false);
      }
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

  const getLocalDateString = (dateInput?: string | Date) => {
      if (!dateInput) return null;
      const d = new Date(dateInput);
      const offset = d.getTimezoneOffset(); 
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      return localDate.toISOString().split('T')[0];
  };

  const today = getLocalDateString(new Date())!;
  
  useEffect(() => {
      const lastIndex = parseInt(localStorage.getItem('atena_last_quote_index') || '-1');
      let newIndex = Math.floor(Math.random() * NIETZSCHE_DATA.length);
      if (NIETZSCHE_DATA.length > 1) {
          while (newIndex === lastIndex) {
              newIndex = Math.floor(Math.random() * NIETZSCHE_DATA.length);
          }
      }
      localStorage.setItem('atena_last_quote_index', newIndex.toString());
      setQuoteIndex(newIndex);
  }, []);

  const nietzscheItem = NIETZSCHE_DATA[quoteIndex] || NIETZSCHE_DATA[0];

  const metrics = useMemo(() => {
      const activeCycle = cycles.find(c => c.id === activeCycleId);
      const completedIdsInPlanning = new Set<string>();
      
      if (activeCycle?.schedule) {
          Object.values(activeCycle.schedule).forEach(slots => {
              if (Array.isArray(slots)) {
                  slots.forEach(slot => {
                      if (slot.completed && slot.notebookId) {
                          completedIdsInPlanning.add(slot.notebookId);
                      }
                  });
              }
          });
      }

      const planningNotebooks = notebooks.filter(n => 
          completedIdsInPlanning.has(n.id) && 
          n.accuracy > 0 && 
          n.discipline !== 'Revisão Geral'
      );
      
      const totalAcc = planningNotebooks.reduce((sum, n) => sum + n.accuracy, 0);
      const avgAccuracy = planningNotebooks.length > 0 ? Math.round(totalAcc / planningNotebooks.length) : 0;
      
      const totalTopics = notebooks.filter(n => n.discipline !== 'Revisão Geral').length;
      const completedTopics = notebooks.filter(n => (n.status === 'Dominado' || n.accuracy >= n.targetAccuracy) && n.discipline !== 'Revisão Geral').length;
      const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      const breakdown: Record<string, { total: number, completed: number, accSum: number, accCount: number }> = {};
      notebooks.filter(n => n.discipline !== 'Revisão Geral').forEach(n => {
          if (!breakdown[n.discipline]) breakdown[n.discipline] = { total: 0, completed: 0, accSum: 0, accCount: 0 };
          breakdown[n.discipline].total++;
          if (n.status === 'Dominado' || n.accuracy >= n.targetAccuracy) breakdown[n.discipline].completed++;
          
          if (completedIdsInPlanning.has(n.id) && n.accuracy > 0) {
              breakdown[n.discipline].accSum += n.accuracy;
              breakdown[n.discipline].accCount++;
          }
      });

      const disciplineStats = Object.entries(breakdown).map(([name, stats]) => ({
          name,
          accuracy: stats.accCount > 0 ? Math.round(stats.accSum / stats.accCount) : 0,
          progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      })).sort((a, b) => b.accuracy - a.accuracy).slice(0, 7);

      const activitySet = new Set<string>();
      notebooks.forEach(n => {
          if (Array.isArray(n.accuracyHistory)) {
              n.accuracyHistory.forEach(h => {
                  if (h.date) {
                      const localDate = getLocalDateString(h.date);
                      if (localDate) activitySet.add(localDate);
                  }
              });
          }
          if (n.lastPractice) {
              const localDate = getLocalDateString(n.lastPractice);
              if (localDate) activitySet.add(localDate);
          }
      });

      const now = new Date();
      now.setMonth(now.getMonth() + viewedMonthOffset);
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); 
      const calendarGrid = [];
      for (let i = 0; i < firstDayOfWeek; i++) {
          calendarGrid.push({ day: null, active: false, isToday: false, date: '', isFuture: false });
      }
      for (let i = 1; i <= daysInMonth; i++) {
          const dateObj = new Date(currentYear, currentMonth, i);
          const dateStr = getLocalDateString(dateObj)!;
          const isActive = activitySet.has(dateStr);
          const isToday = dateStr === today;
          const todayObj = new Date();
          todayObj.setHours(0,0,0,0);
          const isFuture = dateObj > todayObj;
          calendarGrid.push({ day: i, active: isActive, isToday: isToday, date: dateStr, isFuture: isFuture });
      }

      let currentStreak = 0;
      const todayDate = new Date();
      for (let i = 0; i < 365; i++) {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - i);
          const dateStr = getLocalDateString(d)!;
          if (activitySet.has(dateStr)) {
              currentStreak++;
          } else {
              if (i === 0) continue; 
              break;
          }
      }

      return { avgAccuracy, completedTopics, pendingTopics: totalTopics - completedTopics, progressPercent, calendarGrid, currentStreak, monthName, disciplineStats };
  }, [notebooks, today, cycles, activeCycleId, viewedMonthOffset]);

  const evolutionData = useMemo(() => {
        // --- EVOLUTION LOGIC V3: SNAPSHOT POR SEMANA ---
        // Objetivo: Mostrar a média da ÚLTIMA acurácia de cada caderno em cada semana.
        // Isso evita que tentativas ruins no início da semana puxem a média para baixo.
        // E garante que a média final da semana reflita a competência real.

        // 1. Definir Marco Zero (Start Date)
        const earliestHistoryDate = notebooks.reduce((acc, n) => {
            if (!n.accuracyHistory || n.accuracyHistory.length === 0) return acc;
            const first = n.accuracyHistory[0].date;
            return (!acc || new Date(first) < new Date(acc)) ? first : acc;
        }, null as string | null);

        const start = config.startDate ? new Date(config.startDate) : (earliestHistoryDate ? new Date(earliestHistoryDate) : new Date());
        start.setHours(0,0,0,0); 

        // 2. Buckets: Map<WeekIndex, Map<NotebookId, LatestEntry>>
        const weeklySnapshots = new Map<number, Map<string, { accuracy: number, date: Date }>>();

        notebooks.forEach(n => {
            if (n.accuracyHistory) {
                n.accuracyHistory.forEach(h => {
                    if (h.accuracy <= 0) return; // Ignora 0%

                    const entryDate = new Date(h.date);
                    entryDate.setHours(0,0,0,0);

                    const diffTime = entryDate.getTime() - start.getTime();
                    // Week 1 = Days 0-6, Week 2 = Days 7-13, etc.
                    // Se diffTime < 0, considera semana 1 ou anterior (vamos tratar tudo <= 6 dias como semana 1 relativo ao start)
                    let weekIdx = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
                    if (weekIdx < 1) weekIdx = 1; // Clamp

                    if (!weeklySnapshots.has(weekIdx)) {
                        weeklySnapshots.set(weekIdx, new Map());
                    }

                    const weekMap = weeklySnapshots.get(weekIdx)!;
                    
                    // Lógica de Snapshot: Mantém apenas o registro mais recente DESTA semana para ESTE caderno
                    if (!weekMap.has(n.id)) {
                        weekMap.set(n.id, { accuracy: h.accuracy, date: new Date(h.date) });
                    } else {
                        const existing = weekMap.get(n.id)!;
                        if (new Date(h.date) > existing.date) {
                            weekMap.set(n.id, { accuracy: h.accuracy, date: new Date(h.date) });
                        }
                    }
                });
            }
        });

        // 3. Montar Gráfico
        const sortedWeeks = Array.from(weeklySnapshots.keys()).sort((a, b) => a - b);
        
        const labels: string[] = [];
        const actualValues: number[] = [];

        sortedWeeks.forEach(idx => {
            // Calcular Data da Semana para Label (Início da semana)
            const weekStartDate = new Date(start);
            weekStartDate.setDate(start.getDate() + ((idx - 1) * 7));
            const dateStr = weekStartDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            
            labels.push(`${dateStr} (Semana ${idx})`);

            // Média dos Snapshots
            const weekMap = weeklySnapshots.get(idx)!;
            const values = Array.from(weekMap.values()).map(v => v.accuracy);
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = Math.round(sum / values.length);
            
            actualValues.push(avg);
        });

        // Tendência
        let trendValues: number[] = [];
        let trendInfo = { slope: 0, status: 'neutral' as 'neutral' | 'up' | 'down', message: 'Dados insuficientes' };

        if (actualValues.length >= 2) {
            const n = actualValues.length;
            const x = Array.from({ length: n }, (_, i) => i);
            const y = actualValues;
            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = y.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
            const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            trendValues = x.map(xi => Math.round(slope * xi + intercept));
            if (slope > 0.5) trendInfo = { slope, status: 'up', message: 'Tendência de Alta! Sua consistência está gerando resultados.' };
            else if (slope < -0.5) trendInfo = { slope, status: 'down', message: 'Alerta de Queda. Revise seus pontos fracos imediatamente.' };
            else trendInfo = { slope, status: 'neutral', message: 'Desempenho Estável. É hora de aumentar a dificuldade.' };
        }

        if (labels.length === 0) {
             const todayStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
             return { chartData: { labels: [todayStr], datasets: [{ label: 'Evolução', data: [0], fill: true, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4 }] }, trend: trendInfo };
        }

        return {
            chartData: {
                labels,
                datasets: [
                    {
                        label: 'Média Semanal',
                        data: actualValues,
                        fill: true,
                        borderColor: '#10b981',
                        borderWidth: 3,
                        backgroundColor: (context: any) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
                            gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                            return gradient;
                        },
                        pointBackgroundColor: '#020617',
                        pointBorderColor: '#10b981',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.4,
                        order: 1
                    },
                    {
                        label: 'Tendência',
                        data: trendValues,
                        borderColor: trendInfo.status === 'down' ? '#ef4444' : trendInfo.status === 'up' ? '#34d399' : '#94a3b8',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        tension: 0,
                        fill: false,
                        order: 2
                    }
                ]
            },
            trend: trendInfo
        };
  }, [notebooks, config.startDate]);

  const currentIntervals = localConfig.algorithm?.baseIntervals || DEFAULT_ALGO_CONFIG.baseIntervals;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 relative">
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard Estratégico</h2>
          <button onClick={() => { setLocalConfig(config); setIsConfigOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors text-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md">
            <Settings size={16} /> Configurar
          </button>
      </div>

      {dbError && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-6 rounded-xl animate-in slide-in-from-top-4">
              <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-600 rounded-lg text-red-600 dark:text-white"><Database size={24} /></div>
                  <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-900 dark:text-white mb-2 flex items-center gap-2">Configuração de Banco de Dados Pendente</h3>
                      {!showSql ? (
                          <button onClick={() => setShowSql(true)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-lg shadow-red-900/20"><Terminal size={14} /> Mostrar Script</button>
                      ) : (
                          <div className="space-y-2">
                              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 relative group">
                                  <textarea readOnly value={FIX_SQL} className="w-full h-40 bg-transparent text-emerald-400 font-mono text-xs outline-none resize-none" />
                                  <button onClick={() => navigator.clipboard.writeText(FIX_SQL)} className="absolute top-2 right-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white px-2 py-1 rounded text-[10px] uppercase font-bold border border-slate-300 dark:border-slate-700">Copiar</button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl p-5 shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${expandedMetric === 'performance' ? 'h-80' : 'h-32'}`}>
              <div className="flex justify-between items-start"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Desempenho Global</span><button onClick={() => setExpandedMetric(expandedMetric === 'performance' ? null : 'performance')} className="text-slate-500 dark:text-slate-400 hover:text-emerald-600">{expandedMetric === 'performance' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></div>
              <div className="flex justify-between items-end"><div className="flex flex-col gap-0.5"><span className="text-xs font-bold text-emerald-600">{metrics.avgAccuracy}% Acertos</span><span className="text-xs font-bold text-red-500">{metrics.avgAccuracy > 0 ? 100 - metrics.avgAccuracy : 0}% Erros</span></div><span className="text-4xl font-black text-slate-900 dark:text-white">{metrics.avgAccuracy}%</span></div>
              {expandedMetric === 'performance' && (
                  <div className="mt-6 flex-1 w-full relative animate-in fade-in slide-in-from-top-4">
                      <Bar data={{ labels: metrics.disciplineStats.map(d => d.name), datasets: [{ label: 'Acurácia (%)', data: metrics.disciplineStats.map(d => d.accuracy), backgroundColor: metrics.disciplineStats.map(d => d.accuracy < 70 ? '#ef4444' : '#10b981'), borderRadius: 4 }] }} options={{ ...barChartOptions, plugins: { ...barChartOptions.plugins, textOnBars: true } }} plugins={[textOnBarsPlugin]} />
                  </div>
              )}
          </div>
          <div className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl p-5 shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${expandedMetric === 'progress' ? 'h-80' : 'h-32'}`}>
              <div className="flex justify-between items-start"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progresso Edital</span><button onClick={() => setExpandedMetric(expandedMetric === 'progress' ? null : 'progress')} className="text-slate-500 dark:text-slate-400 hover:text-emerald-600">{expandedMetric === 'progress' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></div>
              <div className="flex justify-between items-end"><div className="flex flex-col"><span className="text-xs font-semibold text-emerald-600">{metrics.completedTopics} Concluídos</span><span className="text-xs font-semibold text-orange-500">{metrics.pendingTopics} Pendentes</span></div><span className="text-4xl font-black text-slate-900 dark:text-white">{metrics.progressPercent}%</span></div>
              {expandedMetric === 'progress' && (
                  <div className="mt-6 flex-1 w-full relative animate-in fade-in slide-in-from-top-4">
                      <Bar data={{ labels: metrics.disciplineStats.map(d => d.name), datasets: [{ label: 'Conclusão (%)', data: metrics.disciplineStats.map(d => d.progress), backgroundColor: '#3b82f6', borderRadius: 4 }] }} options={barChartOptions} plugins={[textOnBarsPlugin]} />
                  </div>
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500">
                          <StreakIcon streak={metrics.currentStreak} />
                      </div>
                      <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Histórico de Foco</h3>
                          <p className="text-[10px] text-slate-500">{metrics.currentStreak} dias consecutivos</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setViewedMonthOffset(prev => prev - 1)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400"
                      >
                          <ChevronLeft size={14} />
                      </button>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 tracking-wider">
                          {metrics.monthName}
                      </span>
                      <button 
                        onClick={() => setViewedMonthOffset(prev => prev + 1)}
                        disabled={viewedMonthOffset >= 0}
                        className={`p-1 rounded transition-colors ${viewedMonthOffset >= 0 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                      >
                          <ChevronRight size={14} />
                      </button>
                  </div>
              </div>
              <div className="flex flex-col items-center w-full"><div className="grid grid-cols-7 gap-1.5 mb-2 w-fit">{['D','S','T','Q','Q','S','S'].map((d, i) => (<div key={i} className="text-[9px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-600 w-9 text-center">{d}</div>))}</div><div className="grid grid-cols-7 gap-1.5 w-fit">{metrics.calendarGrid.map((day, idx) => (<div key={idx} className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all relative group text-[10px] font-bold ${!day.day ? 'bg-transparent' : day.active ? 'bg-emerald-500 text-slate-900 dark:text-white shadow-md shadow-emerald-900/20' : day.isFuture ? 'bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-slate-800/50' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800'} ${day.isToday ? 'ring-1 ring-emerald-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`} title={day.date}>{day.day}</div>))}</div></div>
          </div>
          <div className="h-full"><WeeklyProgress /></div>
      </div>

      <div className="grid grid-cols-1 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col h-full min-h-[340px] shadow-2xl relative overflow-hidden">
             <div className={`absolute top-0 right-0 m-6 px-3 py-2 rounded-lg border backdrop-blur-md z-10 flex items-center gap-3 transition-all duration-500 ${evolutionData.trend.status === 'up' ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500/30 text-emerald-700 dark:text-emerald-100' : evolutionData.trend.status === 'down' ? 'bg-red-100 dark:bg-red-900/40 border-red-500/30 text-red-700 dark:text-red-100' : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                 <div className={`p-1.5 rounded-full ${evolutionData.trend.status === 'up' ? 'bg-emerald-500 text-slate-900 dark:text-white' : evolutionData.trend.status === 'down' ? 'bg-red-500 text-slate-900 dark:text-white' : 'bg-slate-400 dark:bg-slate-600 text-slate-900 dark:text-white'}`}>{evolutionData.trend.status === 'up' ? <TrendingUp size={14} /> : evolutionData.trend.status === 'down' ? <TrendingDown size={14} /> : <Minus size={14} />}</div>
                 <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Análise de Tendência</span><span className="text-xs font-medium leading-tight max-w-[180px]">{evolutionData.trend.message}</span></div>
             </div>
             <div className="flex justify-between items-end mb-6"><div><h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><TrendingUp size={24} className="text-emerald-500"/>Evolução</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Média de acurácia semanal</p></div></div>
             <div className="flex-1 w-full relative"><Line data={evolutionData.chartData} options={chartOptions} /></div>
          </div>
      </div>

      <DashboardSection title="Radiografia Tática" subtitle="Matriz Estratégica" icon={<Target size={20} />} defaultOpen={false}>
          <div className="w-full"><QuadrantChart data={notebooks.filter(n => n.discipline !== 'Revisão Geral')} onNavigate={onNavigate} /></div>
      </DashboardSection>

      <DashboardSection title="Radiografia de Disciplinas" subtitle="Matriz de Disciplinas Mães" icon={<Book size={20} />} defaultOpen={false}>
          <div className="w-full"><DisciplineQuadrantChart data={mergedDisciplines} onNavigate={onNavigate} /></div>
      </DashboardSection>

      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900"><h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings size={20} className="text-emerald-500"/> Configurações do Ciclo</h2><button onClick={() => !isSaving && setIsConfigOpen(false)} disabled={isSaving} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={24} /></button></div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              <div className="space-y-4"><h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2 flex items-center gap-2"><FileText size={16} /> Configuração do Edital</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Cargo Alvo</label><input type="text" value={localConfig.targetRole} onChange={(e) => setLocalConfig({...localConfig, targetRole: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-emerald-500" /></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Banca Examinadora</label><input type="text" value={localConfig.banca || ''} onChange={(e) => setLocalConfig({...localConfig, banca: e.target.value})} placeholder="Ex: FGV, Cebraspe" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-emerald-500" /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Data da Prova</label><div className="relative"><Calendar className="absolute left-3 top-3 text-slate-500" size={16} /><input type="date" value={localConfig.examDate || ''} onChange={(e) => setLocalConfig({...localConfig, examDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-3 pl-10 text-slate-900 dark:text-white outline-none focus:border-emerald-500 cursor-pointer" /></div></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Link do Edital</label><input type="url" value={localConfig.editalLink || ''} onChange={(e) => setLocalConfig({...localConfig, editalLink: e.target.value})} placeholder="https://..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-emerald-500" /></div></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Conteúdo Programático</label><textarea value={localConfig.editalText || ''} onChange={(e) => setLocalConfig({...localConfig, editalText: e.target.value})} className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-300 font-mono outline-none focus:border-emerald-500 resize-none custom-scrollbar" /></div></div>
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800"><h3 className="text-sm font-bold text-cyan-600 dark:text-cyan-500 uppercase tracking-widest border-b border-cyan-500/20 pb-2 flex items-center gap-2"><Key size={16} /> Integração IA</h3><div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Google Gemini API Key</label><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIzaSy..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-cyan-500 font-mono text-sm" /></div></div>
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800"><h3 className="text-sm font-bold text-purple-600 dark:text-purple-500 uppercase tracking-widest border-b border-purple-500/20 pb-2 flex items-center gap-2"><BrainCircuit size={16} /> Ajuste do Algoritmo</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{ORDERED_ALGO_KEYS.map((key) => (<div key={key} className="group relative"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-help flex items-center gap-1">{ALGO_TOOLTIPS[key]?.title || key} <HelpCircle size={10}/></label><input type="number" value={currentIntervals[key as keyof typeof currentIntervals]} onChange={(e) => handleUpdateAlgoInterval(key, parseFloat(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white text-center font-bold outline-none focus:border-purple-500" /></div>))}</div></div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3"><button onClick={() => !isSaving && setIsConfigOpen(false)} disabled={isSaving} className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Cancelar</button><button onClick={handleSaveConfig} disabled={isSaving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Settings2 size={18} />}Salvar Alterações</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
