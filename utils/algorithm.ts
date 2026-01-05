import { Relevance, Trend, AlgorithmConfig } from '../types';

/**
 * DOCUMENTAÇÃO MATEMÁTICA - ALGORITMO ATENA V2
 * ============================================
 * 
 * O cálculo da próxima data de revisão segue a função f(A, R, T):
 * 
 *    NextInterval = BaseInterval(A) * M_Relevance(R) * M_Trend(T)
 * 
 * Onde:
 * 1. BaseInterval(A) é determinado pela Acurácia (A):
 *    - Se A < 60% (Learning): Intervalo Curto (Padrão: 1 dia)
 *    - Se 60% <= A < 80% (Reviewing): Intervalo Médio (Padrão: 3 dias)
 *    - Se 80% <= A < 90% (Mastering): Intervalo Longo (Padrão: 7 dias)
 *    - Se A >= 90% (Maintaining): Intervalo Estendido (Padrão: 15 dias)
 * 
 * 2. M_Relevance(R) é o multiplicador de Relevância Estratégica:
 *    - Altíssima: Reduz intervalo (Padrão: 0.7x) - "Compressão de Tempo"
 *    - Alta: Reduz intervalo levemente (Padrão: 0.9x)
 *    - Média/Baixa: Neutro (1.0x)
 * 
 * 3. M_Trend(T) é o multiplicador de Tendência da Banca:
 *    - Alta: Reduz intervalo levemente (Padrão: 0.9x)
 *    - Estável/Baixa: Neutro (1.0x)
 * 
 * O resultado final é arredondado para o inteiro mais próximo (Math.round), 
 * com um limite mínimo de 1 dia.
 */

export const DEFAULT_ALGO_CONFIG: AlgorithmConfig = {
    baseIntervals: {
        learning: 1,
        reviewing: 3,
        mastering: 7,
        maintaining: 15
    },
    multipliers: {
        relevanceExtreme: 0.7,
        relevanceHigh: 0.9,
        trendHigh: 0.9
    }
};

/**
 * Calcula a próxima data de revisão baseada na performance e configurações.
 * @param accuracy Porcentagem de acerto (0-100)
 * @param relevance Enum de relevância
 * @param trend Enum de tendência
 * @param config Objeto de configuração do algoritmo (Opcional, usa default se omitido)
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

  // Arredondamento e Garantia Mínima de 1 dia
  finalDays = Math.max(1, Math.round(finalDays));

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
            expectedDays: 1, // Base Learning (1) * 1 * 1 = 1
        },
        {
            name: "Cenário 2: Manutenção (Alta Acurácia, Relevância Média)",
            input: { acc: 95, rel: Relevance.MEDIA, trend: Trend.ESTAVEL },
            expectedDays: 15, // Base Maintaining (15) * 1 * 1 = 15
        },
        {
            name: "Cenário 3: Pressão Extrema (Mastering, Rel. Altíssima, Tend. Alta)",
            input: { acc: 85, rel: Relevance.ALTISSIMA, trend: Trend.ALTA },
            // Base Mastering (7) * 0.7 (Rel) * 0.9 (Trend) = 4.41 -> Round -> 4
            expectedDays: 4, 
        },
        {
            name: "Cenário 4: Custom Config (Intervalos Estendidos)",
            input: { 
                acc: 95, 
                rel: Relevance.MEDIA, 
                trend: Trend.ESTAVEL,
                config: {
                    baseIntervals: { learning: 2, reviewing: 5, mastering: 10, maintaining: 30 }, // Custom
                    multipliers: DEFAULT_ALGO_CONFIG.multipliers
                }
            },
            expectedDays: 30, // Custom Maintaining (30)
        }
    ];

    let passedCount = 0;

    tests.forEach((test, idx) => {
        const resultDate = calculateNextReview(
            test.input.acc, 
            test.input.rel, 
            test.input.trend, 
            test.input.config
        );
        
        // Calcular diferença em dias entre hoje e o resultado
        const today = new Date();
        const diffTime = Math.abs(resultDate.getTime() - today.getTime());
        const resultDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        // Nota: Devido a milissegundos, usamos Math.ceil ou lógica de diff simples.
        // Como a função soma dias ao 'agora', a diferença deve ser exata se rodar rápido.
        // Para robustez, assumimos que getDate() + days funciona.
        
        // Verificação simplificada:
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() + test.expectedDays);
        
        const isPass = resultDate.getDate() === checkDate.getDate(); // Verifica dia do mês (básico)

        if (isPass) {
            console.log(`✅ Test #${idx + 1}: ${test.name} - PASS`);
            passedCount++;
        } else {
            console.error(`❌ Test #${idx + 1}: ${test.name} - FAIL. Expected +${test.expectedDays} days, got date ${resultDate.toLocaleDateString()}`);
        }
    });

    console.log(`\nRESULTADO: ${passedCount}/${tests.length} testes passaram.`);
    console.groupEnd();
};