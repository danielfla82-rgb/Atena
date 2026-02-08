import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { QuadrantChart } from './QuadrantChart';
import { WeeklyProgress } from './WeeklyProgress';
import { Weight, WEIGHT_SCORE } from '../types';
import { DEFAULT_ALGO_CONFIG } from '../utils/algorithm';
import { createAIClient } from '../utils/ai';
import { Type } from "@google/genai";
import { 
  Target, Settings, TrendingUp, TrendingDown, Minus,
  PieChart as PieChartIcon, Activity, Siren, ArrowRight, CheckCircle2,
  Check, XCircle, Quote, ChevronDown, BarChart2,
  RefreshCw, BrainCircuit, Crosshair, Scroll, Crown, Zap, Save, X, FileText, CalendarClock, AlertCircle, Edit2, Calendar, Key, ShieldCheck, Sparkles, Bot, AlertTriangle, Database, Terminal, Flame, Loader2, Settings2, HelpCircle, ChevronUp
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

// ... (ChartJS setup remains same)
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

ChartJS.defaults.color = '#64748b';
ChartJS.defaults.borderColor = '#1e293b';
ChartJS.defaults.font.family = "Inter, sans-serif";
ChartJS.defaults.font.size = 11;

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            beginAtZero: true,
            max: 100,
            grid: { color: '#1e293b', borderDash: [4, 4] },
            ticks: { color: '#64748b', font: { weight: 'bold' } },
            border: { display: false }
        },
        x: {
            grid: { display: false },
            ticks: { color: '#64748b' },
            border: { display: false }
        }
    },
    plugins: {
        legend: { display: false }, // Custom legend used instead
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

// Plugin Customizado para desenhar valores nas barras
const textOnBarsPlugin = {
  id: 'textOnBars',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((bar: any, index: number) => {
        const value = dataset.data[index];
        if (value > 5) { // Só desenha se a barra for visível o suficiente
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            // Desenha um pouco abaixo do topo da barra (dentro dela)
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

// ORDEM LÓGICA CORRETA PARA EXIBIÇÃO
const ORDERED_ALGO_KEYS = ['learning', 'reviewing', 'mastering', 'maintaining'];

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

const FIX_SQL = `-- SCRIPT DE CATÁLOGO MESTRE & PERMISSÕES (V4)
-- Habilita cadernos públicos e permissões de edição para o criador.

-- 1. ALTERAR TABELA NOTEBOOKS (Permitir user_id NULL)
ALTER TABLE notebooks ALTER COLUMN user_id DROP NOT NULL;

-- 2. LIMPEZA DE POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "Strict Access Policy" ON notebooks;
DROP POLICY IF EXISTS "Read Public and Private" ON notebooks;
DROP POLICY IF EXISTS "Modify Own" ON notebooks;
DROP POLICY IF EXISTS "Enable read access for all users" ON notebooks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON notebooks;
DROP POLICY IF EXISTS "Enable update for users based on email" ON notebooks;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON notebooks;
DROP POLICY IF EXISTS "Public Catalog Management" ON notebooks;

-- 3. HABILITAR RLS
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACESSO
-- Leitura: Ver meus cadernos OU cadernos públicos
CREATE POLICY "Read Public and Private" ON notebooks 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Escrita (Insert/Update/Delete):
-- Permite gerenciar seus próprios cadernos E criar/editar cadernos públicos (NULL)
-- OBS: Em produção, restrinja 'user_id IS NULL' apenas para admins.
CREATE POLICY "Manage All Notebooks" ON notebooks 
FOR ALL TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 5. REFRESH
NOTIFY pgrst, 'reload schema';
`;

interface Props {
    onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
// ... (rest of the component remains unchanged)
  const { notebooks, config, updateConfig, setFocusedNotebookId, cycles, activeCycleId, startSession, dbError } = useStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);
  const [apiKey, setApiKey] = useState('');
  
  // AI Suggestion State
  const [aiSuggestion, setAiSuggestion] = useState<{ id: string, title: string, reason: string, strategy: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Quote State
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Expanded Cards State
  const [expandedMetric, setExpandedMetric] = useState<'performance' | 'progress' | null>(null);

  // Carregar API Key do LocalStorage ao abrir
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
        
        // Salvar API Key
        if (apiKey.trim()) {
            localStorage.setItem('atena_api_key', apiKey.trim());
        } else {
            localStorage.removeItem('atena_api_key');
        }
        
        setIsConfigOpen(false);
        // Forçar reload suave para atualizar o cliente de IA
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

  // Helper para obter data local (YYYY-MM-DD) corrigindo Timezone
  const getLocalDateString = (dateInput?: string | Date) => {
      if (!dateInput) return null;
      const d = new Date(dateInput);
      // Ajusta o offset para garantir que a data exibida seja a local do usuário, e não UTC
      // Ex: 22:00 de dia 26/02 (Brasil) vira 01:00 de 27/02 (UTC). Queremos 26/02.
      const offset = d.getTimezoneOffset(); 
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      return localDate.toISOString().split('T')[0];
  };

  const today = getLocalDateString(new Date())!;
  
  // ORÁCULO DE ELITE: Lógica de rotação forçada
  useEffect(() => {
      const lastIndex = parseInt(localStorage.getItem('atena_last_quote_index') || '-1');
      let newIndex = Math.floor(Math.random() * NIETZSCHE_DATA.length);
      
      // Garante que não repete a mesma frase consecutivamente se houver mais de uma opção
      if (NIETZSCHE_DATA.length > 1) {
          while (newIndex === lastIndex) {
              newIndex = Math.floor(Math.random() * NIETZSCHE_DATA.length);
          }
      }
      
      localStorage.setItem('atena_last_quote_index', newIndex.toString());
      setQuoteIndex(newIndex);
  }, []); // Executa apenas no mount (login/refresh)

  const nietzscheItem = NIETZSCHE_DATA[quoteIndex] || NIETZSCHE_DATA[0];

  // --- REFACTORED METRICS & STREAK LOGIC ---
  const metrics = useMemo(() => {
      const activeNotebooks = notebooks.filter(n => n.accuracy > 0);
      const totalAcc = activeNotebooks.reduce((sum, n) => sum + n.accuracy, 0);
      const avgAccuracy = activeNotebooks.length > 0 ? Math.round(totalAcc / activeNotebooks.length) : 0;
      const totalTopics = notebooks.filter(n => n.discipline !== 'Revisão Geral').length;
      const completedTopics = notebooks.filter(n => (n.status === 'Dominado' || n.accuracy >= n.targetAccuracy) && n.discipline !== 'Revisão Geral').length;
      const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      // --- DETAILED BREAKDOWN BY DISCIPLINE ---
      const breakdown: Record<string, { total: number, completed: number, accSum: number, accCount: number }> = {};
      
      notebooks.filter(n => n.discipline !== 'Revisão Geral').forEach(n => {
          if (!breakdown[n.discipline]) breakdown[n.discipline] = { total: 0, completed: 0, accSum: 0, accCount: 0 };
          
          breakdown[n.discipline].total++;
          if (n.status === 'Dominado' || n.accuracy >= n.targetAccuracy) breakdown[n.discipline].completed++;
          
          if (n.accuracy > 0) {
              breakdown[n.discipline].accSum += n.accuracy;
              breakdown[n.discipline].accCount++;
          }
      });

      const disciplineStats = Object.entries(breakdown).map(([name, stats]) => ({
          name,
          accuracy: stats.accCount > 0 ? Math.round(stats.accSum / stats.accCount) : 0,
          progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      })).sort((a, b) => b.accuracy - a.accuracy).slice(0, 7); // Top 7 for charts

      // 1. Map all activity dates from history (LOCAL TIME FIX)
      const activitySet = new Set<string>();
      notebooks.forEach(n => {
          // Check history
          if (Array.isArray(n.accuracyHistory)) {
              n.accuracyHistory.forEach(h => {
                  if (h.date) {
                      const localDate = getLocalDateString(h.date);
                      if (localDate) activitySet.add(localDate);
                  }
              });
          }
          // Check last practice fallback
          if (n.lastPractice) {
              const localDate = getLocalDateString(n.lastPractice);
              if (localDate) activitySet.add(localDate);
          }
      });

      // 2. Generate Calendar Grid (CURRENT MONTH)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthName = now.toLocaleString('pt-BR', { month: 'long' });
      
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
      
      const calendarGrid = [];
      
      // Empty slots for start of month
      for (let i = 0; i < firstDayOfWeek; i++) {
          calendarGrid.push({ day: null, active: false, isToday: false, date: '', isFuture: false });
      }
      
      // Days of month
      for (let i = 1; i <= daysInMonth; i++) {
          const dateObj = new Date(currentYear, currentMonth, i);
          const dateStr = getLocalDateString(dateObj)!;
          const isActive = activitySet.has(dateStr);
          const isToday = dateStr === today;
          
          // Check if future day
          const todayObj = new Date();
          todayObj.setHours(0,0,0,0);
          const isFuture = dateObj > todayObj;

          calendarGrid.push({
              day: i,
              active: isActive,
              isToday: isToday,
              date: dateStr,
              isFuture: isFuture
          });
      }

      // 3. Calculate Streak (Global)
      let currentStreak = 0;
      const todayDate = new Date();
      for (let i = 0; i < 365; i++) {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - i);
          const dateStr = getLocalDateString(d)!;
          
          if (activitySet.has(dateStr)) {
              currentStreak++;
          } else {
              if (i === 0) continue; // Permite gap se hoje ainda não acabou
              break;
          }
      }

      return { avgAccuracy, completedTopics, pendingTopics: totalTopics - completedTopics, progressPercent, calendarGrid, currentStreak, monthName, disciplineStats };
  }, [notebooks, today]);

  // --- EVOLUTION CHART DATA WITH TREND LINE ---
  const evolutionData = useMemo(() => {
        // Collect all history points
        const points: { date: string; accuracy: number }[] = [];
        notebooks.forEach(n => {
            if (n.accuracyHistory) {
                n.accuracyHistory.forEach(h => points.push(h));
            }
        });
        
        points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const grouped = new Map<string, number[]>();
        
        points.forEach(p => {
            const d = new Date(p.date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            monday.setHours(0,0,0,0);
            const key = monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)?.push(p.accuracy);
        });

        // Last 10 weeks
        const keys = Array.from(grouped.keys()).slice(-10);
        
        const labels = keys;
        const actualValues = keys.map(k => {
            const arr = grouped.get(k) || [];
            return arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
        });

        // --- LINEAR REGRESSION (Trend Line) ---
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

        // Fallback for empty state
        if (labels.length === 0) {
             const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
             return {
                 chartData: {
                    labels: [today],
                    datasets: [{
                        label: 'Evolução',
                        data: [0],
                        fill: true,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }]
                 },
                 trend: trendInfo
             };
        }

        return {
            chartData: {
                labels,
                datasets: [
                    {
                        label: 'Média Semanal',
                        data: actualValues,
                        fill: true,
                        borderColor: '#10b981', // Emerald-500
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
                        label: 'Tendência (Regressão)',
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
  }, [notebooks]);

  // Static Recommendation (Instant)
  const staticRecommendation = useMemo(() => {
    const candidates = notebooks.filter(n => n.discipline !== 'Revisão Geral' && !n.isGlobal);
    if (candidates.length === 0) return null;

    const critical = candidates.find(n => (n.weight === Weight.MUITO_ALTO || n.weight === Weight.ALTO) && n.accuracy < 60);
    if (critical) return {
        type: 'critical', notebook: critical,
        title: `Atenção: ${critical.discipline}`,
        reason: `Peso ${critical.weight} com desempenho crítico (${critical.accuracy}%).`,
        icon: <Siren className="text-red-500 animate-pulse" size={24} />, 
        colorClass: 'border-red-500/50 bg-red-900/10',
        isAi: false,
        strategy: undefined as string | undefined
    };

    const lowest = [...candidates].sort((a, b) => ((WEIGHT_SCORE[a.weight] * 100) - a.accuracy) - ((WEIGHT_SCORE[b.weight] * 100) - b.accuracy))[0];
    if (lowest) return {
        type: 'standard', notebook: lowest,
        title: `Sugestão: ${lowest.discipline}`,
        reason: `Melhorar este tópico trará o maior retorno sobre investimento.`,
        icon: <Zap className="text-emerald-500" size={24} />, 
        colorClass: 'border-emerald-500/50 bg-emerald-900/10',
        isAi: false,
        strategy: undefined as string | undefined
    };
    return null;
  }, [notebooks]);

  // AI Recommendation Logic
  const handleGenerateAiInsight = async () => {
      setIsAnalyzing(true);
      try {
          const ai = createAIClient();
          // Filter top 30 most active/critical notebooks to save context
          const simplifiedData = notebooks
              .filter(n => n.discipline !== 'Revisão Geral' && !n.isGlobal)
              .sort((a, b) => (new Date(a.lastPractice || 0).getTime()) - (new Date(b.lastPractice || 0).getTime())) // Oldest practice first
              .slice(0, 30)
              .map(n => ({
                  id: n.id,
                  discipline: n.discipline,
                  topic: n.name,
                  accuracy: n.accuracy,
                  target: n.targetAccuracy,
                  weight: n.weight,
                  daysSinceReview: n.lastPractice ? Math.floor((new Date().getTime() - new Date(n.lastPractice).getTime()) / (1000 * 3600 * 24)) : 999
              }));

          const prompt = `
            Atue como um Estrategista de Concursos de Elite.
            Analise os dados: ${JSON.stringify(simplifiedData)}
            
            Escolha UM ÚNICO caderno que o aluno deve estudar AGORA para ter o maior impacto na aprovação.
            Considere: Peso alto, acurácia baixa e tempo sem revisão (Curva de Esquecimento).
            
            Retorne JSON:
            {
                "id": "uuid do caderno escolhido",
                "title": "Título de Impacto (ex: Operação Resgate em Constitucional)",
                "reason": "Explicação técnica e psicológica curta (2 frases).",
                "strategy": "Uma ação prática imediata (ex: Fazer 10 questões da banca X)."
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
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          reason: { type: Type.STRING },
                          strategy: { type: Type.STRING }
                      },
                      required: ["id", "title", "reason", "strategy"]
                  }
              }
          });

          if (response.text) {
              setAiSuggestion(JSON.parse(response.text));
          }
      } catch (error) {
          console.error("AI Insight Error:", error);
          alert("Atena não conseguiu conectar ao núcleo de IA. Verifique sua chave API.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const finalRecommendation = aiSuggestion ? {
      notebook: notebooks.find(n => n.id === aiSuggestion.id) || staticRecommendation?.notebook, // Fallback safe
      title: aiSuggestion.title,
      reason: aiSuggestion.reason,
      strategy: aiSuggestion.strategy,
      isAi: true,
      icon: undefined,
      colorClass: undefined
  } : staticRecommendation;

  const currentIntervals = localConfig.algorithm?.baseIntervals || DEFAULT_ALGO_CONFIG.baseIntervals;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 relative">
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Dashboard Estratégico</h2>
          <button onClick={() => { setLocalConfig(config); setIsConfigOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm border border-slate-700 shadow-sm hover:shadow-md">
            <Settings size={16} /> Configurar
          </button>
      </div>

      {dbError && (
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl animate-in slide-in-from-top-4">
              <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-600 rounded-lg text-white"><Database size={24} /></div>
                  <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">Configuração de Banco de Dados Pendente</h3>
                      <p className="text-slate-300 text-sm mb-4">
                          O sistema detectou que as tabelas ou permissões do Supabase não estão configuradas corretamente.
                          Seus dados estão seguros, mas inacessíveis até que o reparo seja feito.
                      </p>
                      
                      {!showSql ? (
                          <button 
                            onClick={() => setShowSql(true)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-lg shadow-red-900/20"
                          >
                              <Terminal size={14} /> Mostrar Script de Reparo (SQL)
                          </button>
                      ) : (
                          <div className="space-y-2">
                              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group">
                                  <textarea 
                                    readOnly 
                                    value={FIX_SQL}
                                    className="w-full h-40 bg-transparent text-emerald-400 font-mono text-xs outline-none resize-none"
                                  />
                                  <button onClick={() => navigator.clipboard.writeText(FIX_SQL)} className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded text-[10px] uppercase font-bold border border-slate-700">Copiar</button>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                  1. Copie o código acima.<br/>
                                  2. Vá ao <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-400 underline">Supabase Dashboard</a> {'>'} SQL Editor.<br/>
                                  3. Cole e clique em "RUN".<br/>
                                  4. Recarregue esta página.
                              </p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* EXPANDABLE METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Desempenho */}
          <div 
            className={`bg-slate-50 text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${expandedMetric === 'performance' ? 'h-80' : 'h-32'}`}
          >
              <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Desempenho</span>
                  <button onClick={() => setExpandedMetric(expandedMetric === 'performance' ? null : 'performance')} className="text-slate-400 hover:text-emerald-600 transition-colors">
                      {expandedMetric === 'performance' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
              </div>
              
              <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-emerald-600">{metrics.avgAccuracy}% Acertos</span>
                      <span className="text-xs font-bold text-red-500">{metrics.avgAccuracy > 0 ? 100 - metrics.avgAccuracy : 0}% Erros</span>
                  </div>
                  <span className="text-4xl font-black text-slate-900">{metrics.avgAccuracy}%</span>
              </div>

              {expandedMetric === 'performance' && (
                  <div className="mt-6 flex-1 w-full relative animate-in fade-in slide-in-from-top-4">
                      <Bar 
                          data={{
                              labels: metrics.disciplineStats.map(d => d.name),
                              datasets: [{
                                  label: 'Acurácia (%)',
                                  data: metrics.disciplineStats.map(d => d.accuracy),
                                  // Logica condicional de cor
                                  backgroundColor: metrics.disciplineStats.map(d => d.accuracy < 70 ? '#ef4444' : '#10b981'),
                                  borderRadius: 4
                              }]
                          }} 
                          options={{
                              ...barChartOptions,
                              plugins: {
                                  ...barChartOptions.plugins,
                                  // @ts-ignore
                                  textOnBars: true // Enable custom plugin logic if needed, but we registered globally
                              }
                          }}
                          // Register local plugin instance
                          plugins={[textOnBarsPlugin]}
                      />
                  </div>
              )}
          </div>

          {/* Card 2: Progresso Edital */}
          <div 
            className={`bg-slate-50 text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${expandedMetric === 'progress' ? 'h-80' : 'h-32'}`}
          >
              <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progresso Edital</span>
                  <button onClick={() => setExpandedMetric(expandedMetric === 'progress' ? null : 'progress')} className="text-slate-400 hover:text-emerald-600 transition-colors">
                      {expandedMetric === 'progress' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
              </div>

              <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                      <span className="text-xs font-semibold text-emerald-600">{metrics.completedTopics} Concluídos</span>
                      <span className="text-xs font-semibold text-orange-500">{metrics.pendingTopics} Pendentes</span>
                  </div>
                  <span className="text-4xl font-black text-slate-900">{metrics.progressPercent}%</span>
              </div>

              {expandedMetric === 'progress' && (
                  <div className="mt-6 flex-1 w-full relative animate-in fade-in slide-in-from-top-4">
                      <Bar 
                          data={{
                              labels: metrics.disciplineStats.map(d => d.name),
                              datasets: [{
                                  label: 'Conclusão (%)',
                                  data: metrics.disciplineStats.map(d => d.progress),
                                  backgroundColor: '#3b82f6',
                                  borderRadius: 4
                              }]
                          }} 
                          options={barChartOptions}
                          plugins={[textOnBarsPlugin]} 
                      />
                  </div>
              )}
          </div>
      </div>

      {/* ... (Rest of charts and widgets) ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 text-slate-300 rounded-xl p-5 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                      <div className="bg-slate-800 p-2 rounded-lg text-slate-500">
                          <Flame size={18} className={metrics.currentStreak > 0 ? "text-orange-500 fill-orange-500 animate-pulse" : "text-slate-600"} />
                      </div>
                      <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Histórico de Foco</h3>
                          <p className="text-[10px] text-slate-500">
                              {metrics.currentStreak} dias consecutivos
                          </p>
                      </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700 tracking-wider">
                      {metrics.monthName}
                  </span>
              </div>
              <div className="flex flex-col items-center w-full">
                  <div className="grid grid-cols-7 gap-1.5 mb-2 w-fit">
                      {['D','S','T','Q','Q','S','S'].map((d, i) => (
                          <div key={i} className="text-[9px] font-bold text-slate-600 w-9 text-center">{d}</div>
                      ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 w-fit">
                      {metrics.calendarGrid.map((day, idx) => (
                          <div 
                            key={idx} 
                            className={`
                                h-9 w-9 rounded-lg flex items-center justify-center transition-all relative group text-[10px] font-bold
                                ${!day.day 
                                    ? 'bg-transparent border-transparent' 
                                    : day.active 
                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/20' 
                                        : day.isFuture 
                                            ? 'bg-slate-900/30 text-slate-700 border border-slate-800/50' 
                                            : 'bg-slate-800/50 text-slate-600 border border-slate-800'}
                                ${day.isToday ? 'ring-1 ring-emerald-400 ring-offset-1 ring-offset-slate-900' : ''}
                            `}
                            title={day.date}
                          >
                              {day.day}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
          <div className="h-full">
             <WeeklyProgress />
          </div>
      </div>

      {/* ... (The rest of Dashboard component remains unchanged) ... */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {finalRecommendation && finalRecommendation.notebook && (
            <div className={`w-full p-1 rounded-2xl bg-gradient-to-r p-[1px] transition-all duration-500 ${finalRecommendation.isAi ? 'from-purple-500 via-indigo-500 to-emerald-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'from-transparent via-slate-700 to-transparent'}`}>
                <div className={`relative w-full rounded-2xl p-6 border flex flex-col gap-4 shadow-2xl overflow-hidden h-full justify-between transition-colors ${finalRecommendation.isAi ? 'bg-slate-900 border-transparent' : (staticRecommendation?.colorClass || 'bg-slate-900 border-slate-800')}`}>
                    <div className="flex justify-between items-start">
                        {finalRecommendation.isAi ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                <BrainCircuit size={12} /> Inteligência Atena
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase tracking-widest">
                                <Activity size={12} /> Sugestão Algorítmica
                            </span>
                        )}
                        {!finalRecommendation.isAi && (
                            <button 
                                onClick={handleGenerateAiInsight} 
                                disabled={isAnalyzing}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-white bg-emerald-900/20 hover:bg-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all"
                            >
                                {isAnalyzing ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                {isAnalyzing ? "Analisando..." : "Invocar IA"}
                            </button>
                        )}
                    </div>
                    <div className="flex items-start gap-5 relative z-10">
                        <div className={`p-4 rounded-xl border shadow-lg backdrop-blur-md ${finalRecommendation.isAi ? 'bg-indigo-900/20 border-indigo-500/30 text-indigo-400' : 'bg-slate-950/80 border-white/10 text-emerald-500'}`}>
                            {finalRecommendation.isAi ? <Bot size={28} /> : (staticRecommendation?.icon || <Zap size={24} />)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                                {finalRecommendation.title || `Atenção: ${finalRecommendation.notebook.discipline}`}
                            </h3>
                            <p className="text-sm text-slate-300 max-w-sm leading-relaxed mb-2">
                                {finalRecommendation.reason}
                            </p>
                            {finalRecommendation.isAi && finalRecommendation.strategy && (
                                <div className="mt-3 pl-3 border-l-2 border-indigo-500/50 text-xs text-indigo-200 italic">
                                    "{finalRecommendation.strategy}"
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={() => { setFocusedNotebookId(finalRecommendation.notebook!.id); onNavigate('library'); }} className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${finalRecommendation.isAi ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white' : 'bg-white text-slate-950 hover:bg-slate-200'}`}>
                        <ArrowRight size={20} /> Abrir no Banco
                    </button>
                </div>
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-full min-h-[340px] shadow-2xl relative overflow-hidden">
             <div className={`absolute top-0 right-0 m-6 px-3 py-2 rounded-lg border backdrop-blur-md z-10 flex items-center gap-3 transition-all duration-500
                 ${evolutionData.trend.status === 'up' ? 'bg-emerald-900/40 border-emerald-500/30 text-emerald-100' : 
                   evolutionData.trend.status === 'down' ? 'bg-red-900/40 border-red-500/30 text-red-100' : 
                   'bg-slate-800/60 border-slate-700 text-slate-300'}
             `}>
                 <div className={`p-1.5 rounded-full ${
                     evolutionData.trend.status === 'up' ? 'bg-emerald-500 text-white' : 
                     evolutionData.trend.status === 'down' ? 'bg-red-500 text-white' : 
                     'bg-slate-600 text-white'
                 }`}>
                     {evolutionData.trend.status === 'up' ? <TrendingUp size={14} /> : 
                      evolutionData.trend.status === 'down' ? <TrendingDown size={14} /> : 
                      <Minus size={14} />}
                 </div>
                 <div className="flex flex-col">
                     <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                         Análise de Tendência
                     </span>
                     <span className="text-xs font-medium leading-tight max-w-[180px]">
                         {evolutionData.trend.message}
                     </span>
                 </div>
             </div>
             <div className="flex justify-between items-end mb-6">
                 <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp size={24} className="text-emerald-500"/>
                        Evolução
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Média de acurácia semanal</p>
                 </div>
             </div>
             <div className="flex-1 w-full relative">
                 <Line data={evolutionData.chartData} options={chartOptions} />
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

      {/* ... (rest of the component) */}
      <DashboardSection title="Radiografia Tática" subtitle="Matriz Estratégica" icon={<Target size={20} />} defaultOpen={true}>
          <div className="w-full">
              <QuadrantChart data={notebooks.filter(n => n.discipline !== 'Revisão Geral')} onNavigate={onNavigate} />
          </div>
      </DashboardSection>

      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* ... (Config modal content remains identical) ... */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} className="text-emerald-500"/> Configurações do Ciclo</h2>
              <button onClick={() => !isSaving && setIsConfigOpen(false)} disabled={isSaving} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              {/* ... Sections ... */}
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
                          <CheckCircle2 size={12} /> Salvo apenas no seu navegador (LocalStorage). Necessário para Nietzsche, Diagnóstico e Notícias.
                      </p>
                  </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-bold text-purple-500 uppercase tracking-widest border-b border-purple-500/20 pb-2 flex items-center gap-2">
                      <BrainCircuit size={16} /> Ajuste Fino do Algoritmo
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {ORDERED_ALGO_KEYS.map((key) => {
                          const val = currentIntervals[key as keyof typeof currentIntervals];
                          return (
                          <div key={key} className="group relative">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-help flex items-center gap-1">
                                  {ALGO_TOOLTIPS[key]?.title || key} 
                                  <HelpCircle size={10} className="text-slate-600"/>
                              </label>
                              <input 
                                type="number" 
                                value={val} 
                                onChange={(e) => handleUpdateAlgoInterval(key, parseFloat(e.target.value))} 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-center font-bold outline-none focus:border-purple-500" 
                              />
                              {ALGO_TOOLTIPS[key] && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-xs z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                      <strong className="block text-emerald-400 mb-1">{ALGO_TOOLTIPS[key].title}</strong>
                                      <span className="text-slate-300 leading-tight block">{ALGO_TOOLTIPS[key].desc}</span>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                  </div>
                              )}
                          </div>
                      )})}
                  </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
              <button onClick={() => !isSaving && setIsConfigOpen(false)} disabled={isSaving} className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors">Cancelar</button>
              <button onClick={handleSaveConfig} disabled={isSaving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Settings2 size={18} />}
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
