
/**
 * DOCUMENTAÇÃO TÉCNICA - PROJETO ATENA V2.1.0
 * ============================================
 * Data Model e Tipagem do Sistema.
 * 
 * STATUS: STABLE / ELITE EDITION
 * DATA: 2024-05-22
 * 
 * CHANGELOG V2.1.0:
 * - [FIX] Implementação de sanitização de JSON para respostas da IA (Markdown stripping).
 * - [FIX] Validação robusta de datas no módulo Library.
 * - [DOCS] Atualização da tipagem do NotebookStatus.
 * - [CORE] Refinamento da Matriz Estratégica.
 * 
 * PRINCIPAIS ENTIDADES:
 * 1. Notebook (Caderno): A unidade atômica de estudo. Contém performance, metadados e conteúdo.
 * 2. Cycle (Ciclo): Um contêiner para um projeto de estudo específico (ex: "PF 2025"). Permite multitenancy local.
 * 3. FrameworkData: Estrutura piramidal de 5 camadas para alinhamento estratégico/mental.
 * 4. AthensConfig: Configurações do contexto de estudo atual (IA context).
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
  /** Base64 string da imagem do mapa mental ou resumo */
  image?: string;
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
  // Algoritmo Customizável
  algorithm?: AlgorithmConfig;
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