
/**
 * DOCUMENTAÇÃO TÉCNICA - PROJETO ATENA V3.3.0
 * ============================================
 * Data Model e Tipagem do Sistema.
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
  /** Link externo para texto de lei ou legislação */
  lawLink?: string;
  /** Link externo para anotações (Obsidian/Notion) - NOVO */
  obsidianLink?: string;
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
  
  // Propriedades Legadas/Injetadas (Mantidas para compatibilidade com Dashboard antigo, mas populadas dinamicamente via Store)
  weekId?: string | null;
  isWeekCompleted?: boolean;
}

/** 
 * Entidade de Alocação (Instância de Estudo) 
 * Permite que o mesmo caderno seja estudado múltiplas vezes na mesma semana ou em semanas diferentes.
 */
export interface Allocation {
  id: string; // ID único da instância (ex: 'alloc-123')
  notebookId: string; // Referência ao caderno
  weekId: string; // Semana alocada
  completed: boolean; // Se esta instância específica foi feita
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
    learning: number;
    reviewing: number;
    mastering: number;
    maintaining: number;
  };
  multipliers: {
    relevanceHigh: number;
    relevanceExtreme: number;
    trendHigh: number;
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
  weeklyPace?: Record<string, string>;
  startDate?: string;
  examName?: string;
  examDate?: string;
  banca?: string;
  editalText?: string;
  editalLink?: string;
  structuredEdital?: EditalDiscipline[];
  algorithm?: AlgorithmConfig;
  calculatorState?: {
      weights: Record<string, number>;
      selectedDisciplines: string[];
      customDisciplines: string[];
  };
}

/** 
 * Entidade Ciclo (Projeto) - V2.0 CORE
 */
export interface Cycle {
  id: string;
  name: string; 
  createdAt: string;
  lastAccess: string;
  config: AthensConfig;
  /** 
   * V3.0: Lista de Alocações (Permite Múltiplas Instâncias)
   * Armazena Allocation[] diretamente.
   * Backward Compat: Pode vir como Record<string, string> do banco antigo, Store converte.
   */
  planning: Allocation[] | any; 
  /** @deprecated Usado apenas na migração V2 -> V3 */
  weeklyCompletion?: Record<string, boolean>;
}

/** Dados do Framework Piramidal */
export interface FrameworkData {
  values: string;
  dream: string;
  motivation: string;
  action: string;
  habit: string;
}

export type ReportType = 'tactical' | 'edital';

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

export interface SavedReport {
  id: string;
  date: string;
  type: ReportType;
  summary: string;
  data: string | EditalAnalysisResult;
}

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
