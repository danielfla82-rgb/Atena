

/**
 * DOCUMENTAÇÃO TÉCNICA - PROJETO ATENA V7.5.0
 * ============================================
 * Data Model e Tipagem do Sistema.
 * 
 * STATUS: STABLE / INTELLIGENCE EDITION
 * 
 * CHANGELOG V7.5.0:
 * - [FEATURE] Matriz Estratégica Interativa (Drill-down nos quadrantes).
 * - [FEATURE] Projeção de Data de Revisão em tempo real no formulário.
 * - [UX] Indicador visual de "Em Dia" na dashboard quando não há revisões.
 * - [CORE] Estabilização do React 19 e Chart.js.
 * 
 * PRINCIPAIS ENTIDADES:
 * 1. Notebook (Caderno): A unidade atômica de estudo.
 * 2. Cycle (Ciclo): Contêiner de planejamento.
 * 3. ScheduleItem: Instância de agendamento de um caderno em uma semana.
 */

/** Níveis de Peso no Edital (Eixo Y da Matriz Estratégica) */
export enum Weight {
  BAIXO = 'Baixo',
  MEDIO = 'Médio',
  ALTO = 'Alto',
  MUITO_ALTO = 'Muito Alto',
}

/** Níveis de Relevância/Dificuldade Pessoal (Eixo X da Matriz Estratégica) */
export enum Relevance {
  BAIXA = 'Baixa',
  MEDIA = 'Média',
  ALTA = 'Alta',
  ALTISSIMA = 'Altíssima',
}

/** Tendência de cobrança pela banca examinadora (Ajuste fino do algoritmo) */
export enum Trend {
  BAIXA = 'Baixa',
  ESTAVEL = 'Estável',
  ALTA = 'Alta',
}

/** Status do ciclo de vida de um caderno de estudos */
export enum NotebookStatus {
  NOT_STARTED = 'Não Iniciado',
  THEORY_DONE = 'Teoria Lida',
  REVIEWING = 'Em Revisão',
  MASTERED = 'Dominado'
}

/**
 * Entidade Principal: Caderno (Notebook)
 * Representa um tópico atômico de estudo.
 */
export interface Notebook {
  /** UUID v4 */
  id: string;
  /** Disciplina pai (ex: Direito Constitucional) */
  discipline: string;
  /** Nome do Tópico (ex: Controle de Constitucionalidade) */
  name: string;
  /** Subtópico ou foco específico (ex: ADI e ADC) */
  subtitle: string;
  /** Link externo para caderno de questões (Tec/QConcursos) */
  tecLink?: string;
  /** Link para Caderno de Erros (Novo V6.1) */
  errorNotebookLink?: string;
  /** Link para Questões Favoritas (Novo V6.1) */
  favoriteQuestionsLink?: string;
  /** Link externo para texto de lei ou legislação */
  lawLink?: string;
  /** Link externo para anotações (Obsidian/Notion) - NOVO */
  obsidianLink?: string;
  /** Link Gemini Contexto 1 (Novo V6.1) */
  geminiLink1?: string;
  /** Link Gemini Contexto 2 (Novo V6.1) */
  geminiLink2?: string;
  /** Acurácia atual em % (0-100) */
  accuracy: number;
  /** Histórico de acurácia (Últimos 3 registros para tendência) */
  accuracyHistory?: { date: string; accuracy: number }[];
  /** Meta de acurácia desejada em % (ex: 90) */
  targetAccuracy: number;
  /** Peso estratégico no edital */
  weight: Weight;
  /** Relevância pessoal/estratégica */
  relevance: Relevance;
  /** Tendência da banca */
  trend: Trend;
  /** Status atual do progresso */
  status: NotebookStatus;
  /** Data ISO da última bateria de questões */
  lastPractice?: string;
  /** Data ISO calculada para próxima revisão (Algoritmo) */
  nextReview?: string;
  /** Anotações textuais rápidas (Markdown supportado futuramente) */
  notes?: string;
  /** @deprecated Use 'images' array instead. Mantido para compatibilidade. */
  image?: string;
  /** Lista de imagens em Base64 para rascunhos e resumos */
  images?: string[];
  /** 
   * ID da semana no planejamento.
   * Em V4.2+, usado principalmente para indicar se está ALOCADO em algum lugar.
   * O posicionamento real fica no Cycle.schedule.
   */
  weekId?: string | null;
  /** Marcador legado */
  isWeekCompleted?: boolean;
}

/** Item do Protocolo Fisiológico */
export interface ProtocolItem {
  id: string;
  name: string;
  dosage: string;
  time: string; // "HH:MM"
  type: 'Suplemento' | 'Medicamento' | 'Refeição' | 'Hábito';
  checked: boolean; // Reset diário
}

/** Configuração Avançada do Algoritmo de Revisão */
export interface AlgorithmConfig {
  baseIntervals: {
    learning: number; // Acurácia < 60%
    reviewing: number; // Acurácia 60-79%
    mastering: number; // Acurácia 80-89%
    maintaining: number; // Acurácia >= 90%
  };
  multipliers: {
    relevanceHigh: number; // Multiplicador para Relevância Alta
    relevanceExtreme: number; // Multiplicador para Relevância Altíssima
    trendHigh: number; // Multiplicador para Tendência Alta
  };
}

/** Estrutura do Edital Verticalizado (Parsed by IA) */
export interface EditalTopic {
  name: string;
  probability: 'Alta' | 'Média' | 'Baixa';
  checked: boolean;
}

export interface EditalDiscipline {
  name: string;
  topics: EditalTopic[];
}

/** Configuração Global do Concurso (Contexto para IA) */
export interface AthensConfig {
  targetRole: string;
  weeksUntilExam: number;
  studyPace: 'Iniciante' | 'Básico' | 'Intermediário' | 'Avançado';
  /** Map of weekId -> pace override. E.g. { 'week-1': 'Avançado' } */
  weeklyPace?: Record<string, string>;
  startDate?: string; // YYYY-MM-DD
  // Contexto rico para IA
  examName?: string;
  examDate?: string;
  banca?: string;
  editalText?: string; // Texto raw
  editalLink?: string;
  // Edital Estruturado (Salvo após processamento da IA)
  structuredEdital?: EditalDiscipline[];
  // Algoritmo Customizável
  algorithm?: AlgorithmConfig;
  // Estado persistente da Calculadora de Ciclo
  calculatorState?: {
      weights: Record<string, number>;
      selectedDisciplines: string[]; // Lista de nomes das disciplinas selecionadas
      customDisciplines: string[]; // Lista de disciplinas adicionadas manualmente
  };
}

/** 
 * V4.2: Slot de Agendamento
 * Permite que um mesmo caderno seja agendado múltiplas vezes na semana.
 */
export interface ScheduleItem {
    instanceId: string; // ID único deste "bloco" de estudo na semana
    notebookId: string; // Referência ao caderno original
    completed: boolean; // Status deste bloco específico
}

/** 
 * Entidade Ciclo (Projeto) - V4.2 CORE
 */
export interface Cycle {
  id: string;
  name: string; // Ex: "Receita Federal 2025"
  createdAt: string;
  lastAccess: string;
  config: AthensConfig;
  /** Legacy Map: Mantido para compatibilidade, mas o Schedule tem precedência */
  planning: Record<string, string | null>; 
  weeklyCompletion: Record<string, boolean>;
  /** 
   * V4.2+: Mapa de Semana -> Lista de Slots.
   * Ex: { 'week-1': [{instanceId: '...', notebookId: 'n1'}, {instanceId: '...', notebookId: 'n1'}] }
   */
  schedule?: Record<string, ScheduleItem[]>;
}

/** Dados do Framework Piramidal (V2.0 FEATURE) */
export interface FrameworkData {
  values: string; // Base da pirâmide
  dream: string;
  motivation: string;
  action: string;
  habit: string; // Topo da pirâmide
}

/** Tipos de Relatórios Salvos */
export type ReportType = 'tactical' | 'edital';

/** Resultado da Análise de Edital via IA */
export interface EditalAnalysisResult {
  overallCoverage: number;
  passingProbability: number;
  readinessScore: string;
  disciplines: {
    name: string;
    coverage: number;
    accuracy: number;
    missingTopics: string[];
  }[];
  missingDisciplines: string[];
  strategicInsight: string;
}

/** Entidade de Persistência de Relatórios */
export interface SavedReport {
  id: string;
  date: string;
  type: ReportType;
  summary: string;
  data: string | EditalAnalysisResult;
}

/** Entidade de Anotação Rápida (Post-it) */
export interface Note {
  id: string;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'slate';
  createdAt: string;
  updatedAt: string;
}

// --- CONSTANTES DE SCORE ---

export const WEIGHT_SCORE: Record<Weight, number> = {
  [Weight.BAIXO]: 1,
  [Weight.MEDIO]: 2,
  [Weight.ALTO]: 3,
  [Weight.MUITO_ALTO]: 4,
};

export const RELEVANCE_SCORE: Record<Relevance, number> = {
  [Relevance.BAIXA]: 1,
  [Relevance.MEDIA]: 2,
  [Relevance.ALTA]: 3,
  [Relevance.ALTISSIMA]: 4,
};

export const TREND_SCORE: Record<Trend, number> = {
  [Trend.BAIXA]: 1,
  [Trend.ESTAVEL]: 2,
  [Trend.ALTA]: 3,
};
