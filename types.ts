
export enum Weight {
  BAIXO = 'Baixo',
  MEDIO = 'Médio',
  ALTO = 'Alto',
  MUITO_ALTO = 'Muito Alto'
}

export enum Relevance {
  BAIXA = 'Baixa',
  MEDIA = 'Média',
  ALTA = 'Alta',
  ALTISSIMA = 'Altíssima'
}

export enum Trend {
  BAIXA = 'Baixa',
  ESTAVEL = 'Estável',
  ALTA = 'Alta'
}

export enum NotebookStatus {
  NOT_STARTED = 'Não Iniciado',
  IN_PROGRESS = 'Em Andamento',
  COMPLETED = 'Concluído'
}

export enum WeeklyStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED'
}

export interface Notebook {
  id: string;
  discipline: string;
  name: string;
  subtitle?: string;
  tecLink?: string;
  errorNotebookLink?: string;
  legislationLink?: string;
  obsidianLink?: string;
  accuracy: number;
  targetAccuracy: number;
  weight: Weight;
  relevance: Relevance;
  trend: Trend;
  status: NotebookStatus;
  notes?: string;
  image?: string;
  images: string[];
  lastPractice?: string;
  nextReview?: string;
  weekId?: string | null;
  weeklyStatus?: WeeklyStatus;
  createdAt?: string;
}

export interface Note {
  id: string;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'slate';
  updatedAt: string;
}

export interface ProtocolItem {
  id: string;
  name: string;
  dosage: string;
  time: string;
  type: 'Suplemento' | 'Medicamento' | 'Refeição';
  checked: boolean;
}

export interface FrameworkData {
  values: string;
  dream: string;
  motivation: string;
  action: string;
  habit: string;
}

export interface AlgorithmConfig {
    baseIntervals: {
        learning: number;
        reviewing: number;
        mastering: number;
        maintaining: number;
    };
    multipliers: {
        relevanceExtreme: number;
        relevanceHigh: number;
        trendHigh: number;
    };
}

export interface SavedReport {
  id: string;
  type: 'tactical' | 'edital';
  summary: string;
  data: string | EditalAnalysisResult;
  date: string;
}

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

export interface AthensConfig {
  targetRole: string;
  weeksUntilExam: number;
  startDate?: string;
  editalText?: string;
  legislationText?: string;
}

export interface Cycle {
  id: string;
  name: string;
  config: AthensConfig;
  lastAccess: string;
}

export const WEIGHT_SCORE: Record<Weight, number> = {
  [Weight.BAIXO]: 1,
  [Weight.MEDIO]: 2,
  [Weight.ALTO]: 3,
  [Weight.MUITO_ALTO]: 4
};

export const RELEVANCE_SCORE: Record<Relevance, number> = {
  [Relevance.BAIXA]: 1,
  [Relevance.MEDIA]: 2,
  [Relevance.ALTA]: 3,
  [Relevance.ALTISSIMA]: 4
};