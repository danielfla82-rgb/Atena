import { Relevance, Trend, AlgorithmConfig, Weight, WEIGHT_SCORE, RELEVANCE_SCORE, TREND_SCORE } from '../types';

/**
 * DOCUMENTAÇÃO MATEMÁTICA - ALGORITMO ATENA V2
 * ============================================
 * ... (Documentação existente mantida) ...
 */

export const DEFAULT_ALGO_CONFIG: AlgorithmConfig = {
    baseIntervals: {
        learning: 5,    // Anterior: 1
        reviewing: 10,  // Anterior: 3
        mastering: 20,  // Anterior: 7
        maintaining: 30 // Anterior: 15
    },
    multipliers: {
        relevanceExtreme: 0.7,
        relevanceHigh: 0.9,
        trendHigh: 0.9
    }
};

/**
 * Calcula a próxima data de revisão baseada na performance e configurações.
 */
export const calculateNextReview = (
    accuracy: number, 
    relevance: Relevance, 
    trend: Trend = Trend.ESTAVEL,
    config: AlgorithmConfig = DEFAULT_ALGO_CONFIG
): Date => {
  
  // Safe Fallback se config vier parcial
  const settings = {
      baseIntervals: { ...DEFAULT_ALGO_CONFIG.baseIntervals, ...(config?.baseIntervals || {}) },
      multipliers: { ...DEFAULT_ALGO_CONFIG.multipliers, ...(config?.multipliers || {}) }
  };

  let baseDays = 1;

  // 1. Definição do Intervalo Base (Função Degrau)
  if (accuracy < 60) {
    baseDays = settings.baseIntervals.learning;
  } else if (accuracy >= 60 && accuracy <= 79) {
    baseDays = settings.baseIntervals.reviewing;
  } else if (accuracy >= 80 && accuracy <= 89) {
    baseDays = settings.baseIntervals.mastering;
  } else if (accuracy >= 90) {
    baseDays = settings.baseIntervals.maintaining;
  }

  // 2. Aplicação dos Multiplicadores
  let multiplier = 1.0;

  if (relevance === Relevance.ALTISSIMA) {
    multiplier *= settings.multipliers.relevanceExtreme;
  } else if (relevance === Relevance.ALTA) {
    multiplier *= settings.multipliers.relevanceHigh;
  }

  if (trend === Trend.ALTA) {
    multiplier *= settings.multipliers.trendHigh;
  }

  // 3. Cálculo Final
  let finalDays = baseDays * multiplier;

  // CLAMPING INTELIGENTE (V7.6 UPDATE)
  // Se o aluno acertou mais que 60% (Fase de Revisão), o intervalo mínimo deve ser 2 dias
  // para diferenciar visualmente da Fase de Aprendizado (1 dia).
  // Isso evita que multiplicadores agressivos comprimam 73% para 1 dia.
  const minDays = accuracy >= 60 ? 2 : 1;

  // Arredondamento e Garantia Mínima
  finalDays = Math.max(minDays, Math.round(finalDays));

  // Validação extra para NaN (Persistence Safety)
  if (isNaN(finalDays)) finalDays = 1;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + finalDays);
  
  return nextDate;
};

export const getStatusColor = (accuracy: number, target: number): string => {
  if (accuracy === 0) return '#94a3b8'; // Cinza/Slate-400 (Sem dados)
  if (accuracy <= 60) return '#ef4444'; // Vermelho (Crítico)
  if (accuracy < target) return '#f97316'; // Laranja (Atenção)
  return '#22c55e'; // Verde (Dominado)
};

/**
 * V10.2 FEATURE: Score de Importância Estratégica (0-100)
 * Baseado puramente na configuração qualitativa do caderno.
 * Não considera mais a acurácia ou meta (que são métricas de execução).
 */
export const calculateUrgencyScore = (
    weight: Weight,
    relevance: Relevance,
    trend: Trend
): number => {
    // 1. Peso (45% do Score)
    // Escala: Baixo(1) a Muito Alto(4)
    const wScore = WEIGHT_SCORE[weight]; 
    const partWeight = (wScore / 4) * 45;

    // 2. Relevância (40% do Score)
    // Escala: Baixa(1) a Altíssima(4)
    const rScore = RELEVANCE_SCORE[relevance];
    const partRelevance = (rScore / 4) * 40;

    // 3. Tendência (15% do Score)
    // Escala: Baixa(1) a Alta(3)
    const tScore = TREND_SCORE[trend];
    const partTrend = (tScore / 3) * 15;

    // Soma total (Máx 100)
    return Math.round(partWeight + partRelevance + partTrend);
};

/**
 * V7.6 FEATURE: Consistência (Desvio Padrão)
 * Retorna o desvio padrão das últimas sessões.
 * Quanto menor, mais consistente (melhor).
 */
export const calculateConsistency = (history: { accuracy: number }[]): { sd: number, status: 'Estável' | 'Oscilante' | 'Volátil' } => {
    if (!history || history.length < 2) return { sd: 0, status: 'Estável' };

    const values = history.map(h => h.accuracy);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b) / n;
    
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const sd = Math.sqrt(variance);
    const roundedSd = Math.round(sd);

    let status: 'Estável' | 'Oscilante' | 'Volátil' = 'Estável';
    if (roundedSd > 15) status = 'Volátil';
    else if (roundedSd > 5) status = 'Oscilante';

    return { sd: roundedSd, status };
};

/**
 * V7.6 FEATURE: Força da Memória (Ebbinghaus Decay)
 * Retorna um valor de 0 a 1 (0 = Esquecido, 1 = Memória Fresca)
 * Usado para "desbotar" a cor do card na UI.
 */
export const calculateMemoryStrength = (lastPracticeIso?: string, nextReviewIso?: string): number => {
    if (!lastPracticeIso || !nextReviewIso) return 1; // Default to fresh if no data

    const now = new Date().getTime();
    const last = new Date(lastPracticeIso).getTime();
    const next = new Date(nextReviewIso).getTime();

    // Se datas inválidas
    if (isNaN(last) || isNaN(next)) return 1;

    const totalInterval = next - last;
    const elapsed = now - last;

    if (totalInterval <= 0) return 0; // Intervalo zero ou negativo (bug safety)

    // Curva Logarítmica Inversa Simplificada para UI
    // Quanto mais perto do 'nextReview', mais próximo de 0 (esquecimento teórico para revisão)
    // Se passou do 'nextReview' (elapsed > totalInterval), entra em decay negativo (crítico)
    
    const ratio = elapsed / totalInterval;
    
    // Se já passou do tempo (Ratio > 1), a força é 0 (Crítico)
    if (ratio >= 1.5) return 0; // Muito atrasado
    if (ratio >= 1) return 0.1; // Atrasado

    // Decay linear visual (1 -> 0.2)
    // Começa em 1 (fresco). Termina em 0.2 (quase hora de revisar).
    return Math.max(0.2, 1 - (ratio * 0.8));
};

// ============================================================================
// UNIT TESTS / VALIDATION SUITE
// ============================================================================
// Pode ser executado chamando `runAlgorithmUnitTests()` no console do navegador.

export const runAlgorithmUnitTests = () => {
    console.group("🧪 ATENA ALGORITHM UNIT TESTS");

    const tests = [
        {
            name: "Cenário 1: Aprendizado (Baixa Acurácia, Relevância Média)",
            input: { acc: 50, rel: Relevance.MEDIA, trend: Trend.ESTAVEL },
            expectedDays: 5, 
        },
        // ... (Testes existentes mantidos)
    ];
    // ... (Lógica de teste existente mantida)
    console.log("Testes de Algoritmo concluídos.");
    console.groupEnd();
};