
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
  THEORY_DONE = 'Teoria Finalizada',
  REVIEWING = 'Em Revisão',
  MASTERED = 'Dominado'
}

export type PaceType = 'Off' | 'Iniciante' | 'Basico' | 'Intermediario' | 'Avancado' | 'Revisao';
export type WeeklyStatus = 'pending' | 'started' | 'completed' | 'skipped';

export interface EditalTopic {
  name: string;
  probability: 'Alta' | 'Média' | 'Baixa';
  checked: boolean;
}

export interface EditalDiscipline {
  name: string;
  topics: EditalTopic[];
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

export interface AthensConfig {
  targetRole: string;
  weeksUntilExam: number;
  studyPace: 'Iniciante' | 'Básico' | 'Intermediário' | 'Avançado';
  startDate?: string;
  examName?: string;
  examDate?: string;
  banca?: string;
  dailyHours?: number;
  editalText?: string;
  legislationText?: string;
  editalLink?: string;
  structuredEdital?: EditalDiscipline[];
  algorithm: AlgorithmConfig;
  longTermPlanning?: Record<string, PaceType>;
}

export interface Notebook {
  id: string;
  discipline: string;
  name: string;
  subtitle?: string;
  tecLink?: string;
  errorNotebookLink?: string;
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

export interface Cycle {
  id: string;
  name: string;
  config: AthensConfig;
  notebooks: Notebook[];
  lastAccess: string;
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
  habit: string;
  action: string;
  motivation: string;
  dream: string;
  values: string;
}

export interface Note {
  id: string;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'slate';
  updatedAt: string;
}

export interface EditalAnalysisResult {
    overallCoverage: number;
    passingProbability: number;
    readinessScore: string;
    disciplines: { name: string; coverage: number; accuracy: number; missingTopics: string[] }[];
    missingDisciplines: string[];
    strategicInsight: string;
}

export interface SavedReport {
  id: string;
  type: 'tactical' | 'edital';
  summary: string;
  data: string | EditalAnalysisResult;
  date: string;
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
