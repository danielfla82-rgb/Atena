
/**
 * DOCUMENTAÇÃO TÉCNICA - PROJETO ATENA V3.3.0
 * ============================================
 * Data Model e Tipagem do Sistema.
 * 
 * STATUS: STABLE / ELITE OS
 * DATA: 2024-05-23
 * 
 * --- SQL SCHEMA FOR SUPABASE (NOTES) ---
 * Execute este SQL no Supabase SQL Editor para ativar a persistência de notas:
 * 
 * create table if not exists notes (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid not null,
 *   content text default '',
 *   color text default 'yellow',
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 * 
 * alter table notes enable row level security;
 * 
 * create policy "Users can only see their own notes"
 *   on notes for select using (auth.uid() = user_id);
 * 
 * create policy "Users can insert their own notes"
 *   on notes for insert with check (auth.uid() = user_id);
 * 
 * create policy "Users can update their own notes"
 *   on notes for update using (auth.uid() = user_id);
 * 
 * create policy "Users can delete their own notes"
 *   on notes for delete using (auth.uid() = user_id);
 * -----------------------------------------
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
  /** Link externo para anotações (Obsidian/Notion) - NOVO */
  obsidianLink?: string;
  /** Acurácia atual em % (0-100) */
  accuracy: number;
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
  /** ID da semana no planejamento (ex: 'week-1') ou null se estiver no backlog. (Nota: Em v2, gerenciado pelo Cycle) */
  weekId?: string | null;
  /** Marcador se o estudo foi concluído naquela semana específica - NOVO */
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

// Tipos para o Calendário Macro
export type PaceType = 'Iniciante' | 'Basico' | 'Intermediario' | 'Avancado' | 'Revisao' | 'Off';

/** Configuração Global do Concurso (Contexto para IA) */
export interface AthensConfig {
  targetRole: string;
  weeksUntilExam: number;
  studyPace: 'Iniciante' | 'Básico' | 'Intermediário' | 'Avançado';
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
  // Planejamento Macro (Calendário) - Key: "YYYY-Www" -> Value: PaceType
  longTermPlanning?: Record<string, PaceType>;
}

/** 
 * Entidade Ciclo (Projeto) - V2.0 CORE
 * Permite múltiplos planejamentos usando o mesmo banco de dados (Universal Notebooks).
 * Separa a "Biblioteca de Conhecimento" do "Planejamento Tático".
 */
export interface Cycle {
  id: string;
  name: string; // Ex: "Receita Federal 2025"
  createdAt: string;
  lastAccess: string;
  config: AthensConfig;
  /** Mapeia o ID do notebook (Global) para o weekId neste ciclo específico */
  planning: Record<string, string | null>; 
  /** Mapeia o ID do notebook para status de concluído na semana neste ciclo */
  weeklyCompletion: Record<string, boolean>;
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
