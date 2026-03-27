
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './components/supabase';
import { get, set } from 'idb-keyval';
import { 
  Notebook, Cycle, AthensConfig, SavedReport, ProtocolItem, 
  FrameworkData, Note, NotebookStatus, ScheduleItem,
  Weight, Relevance, Trend, Discipline, MockExam, MockExamResult,
  WEIGHT_SCORE, RELEVANCE_SCORE
} from './types';

// Defaults
const DEFAULT_CONFIG: AthensConfig = {
    targetRole: 'Concurso Público',
    weeksUntilExam: 12,
    studyPace: 'Intermediário',
    algorithm: {
        baseIntervals: { learning: 5, reviewing: 10, mastering: 20, maintaining: 30 },
        multipliers: { relevanceHigh: 0.9, relevanceExtreme: 0.7, trendHigh: 0.9 }
    }
};

const DEFAULT_FRAMEWORK: FrameworkData = {
    values: '', dream: '', motivation: '', action: '', habit: ''
};

// --- SECURITY & INTEGRITY: PURE DATA MAPPERS ---

const mapNotebookFromDB = (db: any): Notebook => {
    // CORREÇÃO: Não forçar limpeza de dados na leitura.
    const isGlobal = db.user_id === null;

    return {
        id: db.id,
        edital: db.edital || '',
        discipline: db.discipline,
        name: db.name,
        subtitle: db.subtitle || '',
        tecLink: db.tec_link || db.tecLink || '',
        errorNotebookLink: db.error_notebook_link || db.errorNotebookLink || '',
        favoriteQuestionsLink: db.favorite_questions_link || db.favoriteQuestionsLink || '',
        lawLink: db.law_link || db.lawLink || '',
        obsidianLink: db.obsidian_link || db.obsidianLink || '',
        geminiLink1: db.gemini_link_1 || db.geminiLink1 || '',
        geminiLink2: db.gemini_link_2 || db.geminiLink2 || '',
        targetAccuracy: Number(db.target_accuracy || db.targetAccuracy || 90),
        accuracy: Number(db.accuracy || 0),
        weight: db.weight || Weight.MEDIO,
        relevance: db.relevance || Relevance.MEDIA,
        trend: db.trend || Trend.ESTAVEL,
        customScore: db.custom_score || db.customScore || undefined,
        status: db.status || NotebookStatus.NOT_STARTED,
        weekId: db.week_id || db.weekId || null,
        isWeekCompleted: !!(db.is_week_completed || db.isWeekCompleted),
        lastPractice: db.last_practice || db.lastPractice || null,
        nextReview: db.next_review || db.nextReview || null,
        accuracyHistory: Array.isArray(db.accuracy_history) ? db.accuracy_history : [],
        notes: db.notes || '',
        images: Array.isArray(db.images) ? db.images : (db.image ? [db.image] : []),
        isGlobal: isGlobal
    };
};

const mapNotebookToDB = (nb: Partial<Notebook>) => {
    // AVISO: Se um campo vier 'undefined' aqui, ele será salvo como NULL no banco
    // devido aos operadores '|| null'. Por isso é crucial passar o objeto completo (merged)
    // antes de chamar esta função em updates.
    return {
        id: nb.id,
        edital: nb.edital || null,
        discipline: nb.discipline,
        name: nb.name,
        subtitle: nb.subtitle || null,
        tec_link: nb.tecLink || null,
        error_notebook_link: nb.errorNotebookLink || null,
        favorite_questions_link: nb.favoriteQuestionsLink || null,
        law_link: nb.lawLink || null,
        obsidian_link: nb.obsidianLink || null,
        gemini_link_1: nb.geminiLink1 || null,
        gemini_link_2: nb.geminiLink2 || null,
        target_accuracy: nb.targetAccuracy,
        accuracy: nb.accuracy,
        status: nb.status,
        last_practice: nb.lastPractice || null,
        next_review: nb.nextReview || null,
        accuracy_history: nb.accuracyHistory || [],
        week_id: nb.weekId || null,
        weight: nb.weight,
        relevance: nb.relevance,
        trend: nb.trend,
        custom_score: nb.customScore || null,
        is_week_completed: nb.isWeekCompleted,
        notes: nb.notes || '',
        images: nb.images || []
    };
};

const mapCycleFromDB = (db: any): Cycle => ({
    id: db.id,
    name: db.name,
    createdAt: db.created_at || db.createdAt,
    lastAccess: db.last_access || db.lastAccess,
    config: db.config || DEFAULT_CONFIG,
    planning: db.planning || {},
    weeklyCompletion: db.weekly_completion || {},
    schedule: db.schedule || {}
});

const mapCycleToDB = (cycle: Partial<Cycle>) => {
    return {
        id: cycle.id,
        name: cycle.name,
        created_at: cycle.createdAt,
        last_access: cycle.lastAccess,
        config: cycle.config,
        planning: cycle.planning,
        weekly_completion: cycle.weeklyCompletion,
        schedule: cycle.schedule
    };
};

const mapNoteFromDB = (db: any): Note => ({
    id: db.id,
    content: db.content,
    color: db.color,
    isBold: db.is_bold || false,
    createdAt: db.created_at || db.createdAt,
    updatedAt: db.updated_at || db.updatedAt,
});

const mapNoteToDB = (note: Partial<Note>) => {
    const payload: any = {
        id: note.id,
        content: note.content,
        color: note.color,
        created_at: note.createdAt,
        updated_at: note.updatedAt
    };
    // Only add is_bold if explicitly true to avoid breaking older schemas that don't have it,
    // though if the schema doesn't have it, even true will break. 
    // Let's just omit it for now to guarantee saving works, or we can handle it in the insert/update.
    // Actually, let's include it but we will handle the fallback in addNote/updateNote.
    payload.is_bold = note.isBold;
    return payload;
};

const mapFrameworkFromDB = (db: any): FrameworkData => ({
    values: db.values || '',
    dream: db.dream || '',
    motivation: db.motivation || '',
    action: db.action || '',
    habit: db.habit || ''
});

// --- SANITIZERS ---
const sanitizeCycleData = (cycle: Cycle, validNotebookIds: Set<string>): Cycle => {
    if (!cycle.schedule) return cycle;
    
    const cleanSchedule: Record<string, ScheduleItem[]> = {};
    let hasChanges = false;

    Object.entries(cycle.schedule).forEach(([weekId, slots]) => {
        if (!Array.isArray(slots)) return;
        
        const validSlots = slots.filter(slot => {
            return slot && slot.notebookId;
        });

        if (validSlots.length !== slots.length) {
            hasChanges = true;
        }
        cleanSchedule[weekId] = validSlots;
    });

    return hasChanges ? { ...cycle, schedule: cleanSchedule } : cycle;
};

// --- GUEST SEED DATA ---
const GUEST_CYCLE_ID = 'guest-cycle-01';
const GUEST_SEED_DATA = {
    notebooks: [
        {
            id: 'nb-01',
            discipline: 'Direito Constitucional',
            name: 'Direitos Fundamentais',
            subtitle: 'Art. 5º e Remédios',
            accuracy: 85,
            targetAccuracy: 90,
            weight: Weight.ALTO,
            relevance: Relevance.ALTA,
            trend: Trend.ALTA,
            customScore: 92,
            status: NotebookStatus.REVIEWING,
            accuracyHistory: [
                { date: new Date(Date.now() - 86400000 * 5).toISOString(), accuracy: 65 },
                { date: new Date(Date.now() - 86400000 * 2).toISOString(), accuracy: 85 }
            ],
            nextReview: new Date(Date.now() + 86400000).toISOString(),
            lastPractice: new Date().toISOString(),
            weekId: 'week-1'
        },
        {
            id: 'nb-02',
            discipline: 'Direito Administrativo',
            name: 'Atos Administrativos',
            subtitle: 'Elementos e Vícios',
            accuracy: 45,
            targetAccuracy: 90,
            weight: Weight.ALTO,
            relevance: Relevance.MEDIA,
            trend: Trend.ESTAVEL,
            customScore: 65,
            status: NotebookStatus.THEORY_DONE,
            accuracyHistory: [
                { date: new Date(Date.now() - 86400000 * 3).toISOString(), accuracy: 45 }
            ],
            nextReview: new Date().toISOString(), // Due today
            lastPractice: new Date(Date.now() - 86400000 * 3).toISOString(),
            weekId: 'week-1'
        },
        {
            id: 'nb-03',
            discipline: 'Língua Portuguesa',
            name: 'Crase e Regência',
            subtitle: 'Casos Proibidos',
            accuracy: 92,
            targetAccuracy: 90,
            weight: Weight.MEDIO,
            relevance: Relevance.ALTA,
            trend: Trend.ALTA,
            status: NotebookStatus.MASTERED,
            accuracyHistory: [
                { date: new Date(Date.now() - 86400000 * 10).toISOString(), accuracy: 70 },
                { date: new Date(Date.now() - 86400000 * 1).toISOString(), accuracy: 92 }
            ],
            nextReview: new Date(Date.now() + 86400000 * 10).toISOString(),
            lastPractice: new Date().toISOString(),
            weekId: 'week-2'
        },
        {
            id: 'nb-04',
            discipline: 'Raciocínio Lógico',
            name: 'Lógica de Argumentação',
            subtitle: 'Silogismos',
            accuracy: 0,
            targetAccuracy: 85,
            weight: Weight.BAIXO,
            relevance: Relevance.BAIXA,
            trend: Trend.ESTAVEL,
            status: NotebookStatus.NOT_STARTED,
            weekId: null
        }
    ],
    cycles: [
        {
            id: GUEST_CYCLE_ID,
            name: 'Demonstração: Auditor Fiscal',
            createdAt: new Date().toISOString(),
            lastAccess: new Date().toISOString(),
            config: {
                ...DEFAULT_CONFIG,
                targetRole: 'Auditor Fiscal',
                startDate: new Date().toISOString(),
                examDate: new Date(Date.now() + 86400000 * 60).toISOString(), // 60 days from now
                studyPace: 'Avançado'
            },
            planning: {},
            weeklyCompletion: {},
            schedule: {
                'week-1': [
                    { instanceId: 'slot-1', notebookId: 'nb-01', completed: true },
                    { instanceId: 'slot-2', notebookId: 'nb-02', completed: false }
                ],
                'week-2': [
                    { instanceId: 'slot-3', notebookId: 'nb-03', completed: false }
                ]
            }
        }
    ],
    activeCycleId: GUEST_CYCLE_ID,
    reports: [],
    protocol: [
        { id: 'p1', name: 'Cafeína', dosage: '100mg', time: '08:00', type: 'Suplemento', checked: true },
        { id: 'p2', name: 'Creatina', dosage: '5g', time: '12:00', type: 'Suplemento', checked: false }
    ],
    framework: {
        values: 'Liberdade, Excelência, Impacto',
        dream: 'Aprovação na Receita Federal',
        motivation: 'Estabilidade para minha família',
        action: '4h líquidas diárias',
        habit: 'Rotina Matinal Inegociável'
    },
    notes: [
        { id: 'note-1', content: 'Revisar Súmulas Vinculantes do STF no fim de semana.', color: 'yellow', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'note-2', content: 'Meta da semana: Fechar Atos Administrativos.', color: 'green', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]
};

interface StoreContextType {
  user: any;
  isGuest: boolean;
  loading: boolean;
  isSyncing: boolean;
  dbError: string | null;
  
  notebooks: Notebook[];
  disciplines: Discipline[];
  cycles: Cycle[];
  activeCycleId: string | null;
  config: AthensConfig;
  reports: SavedReport[];
  protocol: ProtocolItem[];
  framework: FrameworkData;
  notes: Note[];
  mockExams: MockExam[];
  mockExamResults: MockExamResult[];
  
  activeSession: Notebook | null;
  pendingCreateData: Partial<Notebook> | null;
  focusedNotebookId: string | null;

  createCycle: (name: string, role: string) => Promise<void>;
  selectCycle: (id: string) => void;
  deleteCycle: (id: string) => Promise<void>;
  updateConfig: (config: AthensConfig) => Promise<void>;

  addNotebook: (notebook: Partial<Notebook>) => Promise<string>;
  editNotebook: (id: string, data: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  updateNotebookAccuracy: (id: string, accuracy: number) => Promise<void>;
  fetchNotebookImages: (id: string) => Promise<string[]>; 
  
  addDiscipline: (discipline: Partial<Discipline>) => Promise<string>;
  editDiscipline: (id: string, data: Partial<Discipline>) => Promise<void>;
  deleteDiscipline: (id: string) => Promise<void>;
  
  moveNotebookToWeek: (notebookId: string, weekId: string) => Promise<void>;
  reorderSlotInWeek: (weekId: string, oldIndex: number, newIndex: number) => Promise<void>;
  toggleSlotCompletion: (instanceId: string, weekId: string) => Promise<void>;
  removeSlotFromWeek: (instanceId: string, weekId: string) => Promise<void>;

  saveReport: (report: Omit<SavedReport, 'id' | 'date'>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;

  addProtocolItem: (item: Omit<ProtocolItem, 'id' | 'checked'>) => Promise<void>;
  toggleProtocolItem: (id: string) => Promise<void>;
  deleteProtocolItem: (id: string) => Promise<void>;

  updateFramework: (data: FrameworkData) => Promise<void>;

  addNote: () => Promise<void>;
  updateNote: (id: string, content: string, color?: Note['color'], isBold?: boolean) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  addMockExam: (exam: Partial<MockExam>) => Promise<string>;
  editMockExam: (id: string, data: Partial<MockExam>) => Promise<void>;
  deleteMockExam: (id: string) => Promise<void>;

  addMockExamResult: (result: Partial<MockExamResult>) => Promise<string>;
  editMockExamResult: (id: string, data: Partial<MockExamResult>) => Promise<void>;
  deleteMockExamResult: (id: string) => Promise<void>;

  enterGuestMode: () => void;
  exportDatabase: () => void;
  startSession: (notebook: Notebook) => void;
  endSession: () => void;
  setPendingCreateData: (data: Partial<Notebook> | null) => void;
  setFocusedNotebookId: (id: string | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// V10 Optimized Columns + FIX: Images removed to prevent network bloat (Lazy fetching)
const OPTIMIZED_COLUMNS = `
  id, user_id, edital, discipline, name, subtitle, 
  tec_link, error_notebook_link, favorite_questions_link, law_link, obsidian_link, gemini_link_1, gemini_link_2,
  accuracy, target_accuracy, weight, relevance, trend, custom_score, status, 
  week_id, is_week_completed, last_practice, next_review, accuracy_history, notes
`;

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [protocol, setProtocol] = useState<ProtocolItem[]>([]);
  const [framework, setFramework] = useState<FrameworkData>(DEFAULT_FRAMEWORK);
  const [notes, setNotes] = useState<Note[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [mockExamResults, setMockExamResults] = useState<MockExamResult[]>([]);

  const [activeSession, setActiveSession] = useState<Notebook | null>(null);
  const [pendingCreateData, setPendingCreateData] = useState<Partial<Notebook> | null>(null);
  const [focusedNotebookId, setFocusedNotebookId] = useState<string | null>(null);

  const config = cycles.find(c => c.id === activeCycleId)?.config || DEFAULT_CONFIG;

  const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  // --- MERGE LOGIC: USER > GLOBAL ---
  const mergeGlobalAndUserNotebooks = (allRows: any[], userId: string) => {
      const mapped = allRows.map(mapNotebookFromDB);
      
      const userNotebooks = mapped.filter(n => !n.isGlobal);
      const globalNotebooks = mapped.filter(n => n.isGlobal);

      // Create a set of keys (Discipline + Name) that the user already owns
      const userKeys = new Set(userNotebooks.map(n => 
          `${n.discipline.trim().toLowerCase()}|${n.name.trim().toLowerCase()}`
      ));

      // Only show global notebooks that the user DOES NOT have yet
      const visibleGlobals = globalNotebooks.filter(g => 
          !userKeys.has(`${g.discipline.trim().toLowerCase()}|${g.name.trim().toLowerCase()}`)
      );

      // Combine: User's stuff + Remaining Global Stuff
      return [...userNotebooks, ...visibleGlobals];
  };

  const fetchCloudData = async (currentUser?: any) => {
      setLoading(true);
      setDbError(null);
      try {
          const userToUse = currentUser || (await supabase.auth.getUser()).data.user;
          
          if (!userToUse) {
              setLoading(false);
              return;
          }

          // PARALLEL FETCHING
          // V3 Update: Fetch where user_id = ME OR user_id IS NULL
          const [
              notebooksResponse,
              cyclesResponse,
              reportsResponse,
              protocolResponse,
              notesResponse,
              frameworkResponse,
              disciplinesResponse,
              mockExamsResponse,
              mockExamResultsResponse
          ] = await Promise.all([
              // 1. Notebooks (User + Global)
              (async () => {
                  try {
                      // Attempt optimized fetch
                      const { data, error } = await supabase
                          .from('notebooks')
                          .select(OPTIMIZED_COLUMNS)
                          .or(`user_id.eq.${userToUse.id},user_id.is.null`);
                          
                      if (error) throw error;
                      return { data, error: null };
                  } catch (optimizedError) {
                      console.warn("⚠️ Optimized Fetch Failed.", optimizedError);
                      const { data, error } = await supabase
                          .from('notebooks')
                          .select('*')
                          .or(`user_id.eq.${userToUse.id},user_id.is.null`);
                      
                      if (error) { 
                          setDbError(JSON.stringify(error));
                          return { data: [], error };
                      }
                      
                      const cleanedData = data?.map((nb: any) => {
                          return { ...nb, image: null, images: [] };
                      });
                      return { data: cleanedData, error: null };
                  }
              })(),
              // 2. Other tables strictly filtered by user_id
              supabase.from('cycles').select('*').eq('user_id', userToUse.id),
              supabase.from('reports').select('*').eq('user_id', userToUse.id),
              supabase.from('protocol').select('*').eq('user_id', userToUse.id),
              supabase.from('notes').select('*').eq('user_id', userToUse.id),
              supabase.from('frameworks').select('*').eq('user_id', userToUse.id).maybeSingle(),
              supabase.from('disciplines').select('*').eq('user_id', userToUse.id),
              supabase.from('mock_exams').select('*').eq('user_id', userToUse.id),
              supabase.from('mock_exam_results').select('*').eq('user_id', userToUse.id)
          ]);

          let validNotebookIds = new Set<string>();

          // Process Notebooks with Merge Logic
          if (notebooksResponse.data) {
              const merged = mergeGlobalAndUserNotebooks(notebooksResponse.data, userToUse.id);
              setNotebooks(merged);
              // Global IDs are valid for validNotebookIds so they appear in cycle schedule
              validNotebookIds = new Set(merged.map((n: Notebook) => n.id));
          }
          
          // Process Cycles
          if (cyclesResponse.data && cyclesResponse.data.length > 0) {
              const mappedCycles = cyclesResponse.data.map(mapCycleFromDB).map((cycle: Cycle) => sanitizeCycleData(cycle, validNotebookIds));
              setCycles(mappedCycles);
              if (!activeCycleId) {
                  const sorted = [...mappedCycles].sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime());
                  setActiveCycleId(sorted[0].id);
              }
          } else {
              setCycles([]);
              if (!activeCycleId) setActiveCycleId(null);
          }

          // Process Others
          if (reportsResponse.data) setReports(reportsResponse.data);
          if (protocolResponse.data) setProtocol(protocolResponse.data);
          if (notesResponse.data) setNotes(notesResponse.data.map(mapNoteFromDB));
          if (disciplinesResponse.data) setDisciplines(disciplinesResponse.data);
          if (mockExamsResponse.data) setMockExams(mockExamsResponse.data.map((d: any) => ({ ...d, createdAt: d.created_at })));
          if (mockExamResultsResponse.data) setMockExamResults(mockExamResultsResponse.data.map((d: any) => ({ ...d, examId: d.exam_id, tecLink: d.tec_link })));
          
          if (frameworkResponse.data) {
              setFramework(mapFrameworkFromDB(frameworkResponse.data));
          } else {
              setFramework(DEFAULT_FRAMEWORK);
          }

      } catch (error) {
          console.error("[System] Erro Crítico ao buscar dados da nuvem:", error);
      } finally {
          setLoading(false);
      }
  };

  const base64ToBlob = async (base64: string): Promise<Blob> => {
      const res = await fetch(base64);
      return await res.blob();
  };

  const fetchNotebookImages = async (id: string): Promise<string[]> => {
      if (isGuest) {
          const nb = notebooks.find(n => n.id === id);
          return nb?.images || [];
      }
      const currentNb = notebooks.find(n => n.id === id);
      if (currentNb && currentNb.images && currentNb.images.length > 0) {
          return currentNb.images;
      }
      
      const { data, error } = await supabase.from('notebooks').select('images, image').eq('id', id).single();
      if (error) return [];
      
      let images: string[] = [];
      if (data) {
          if (data.images && Array.isArray(data.images)) images = data.images;
          else if (data.image) images = [data.image];
          
          // Lazy Migration: Se houver imagens em base64, faz o upload para o Storage em background
          const hasBase64 = images.some(img => img.startsWith('data:image'));
          if (hasBase64 && !isGuest) {
              // Não bloqueia o retorno das imagens para a UI (retorna o base64 imediatamente)
              // Faz a migração em background
              (async () => {
                  try {
                      const newUrls: string[] = [];
                      let migrated = false;
                      
                      for (let i = 0; i < images.length; i++) {
                          const imgStr = images[i];
                          if (imgStr.startsWith('data:image')) {
                              const blob = await base64ToBlob(imgStr);
                              const fileExt = imgStr.substring("data:image/".length, imgStr.indexOf(";base64"));
                              const fileName = `uploads/${id}_${Date.now()}_${i}.${fileExt}`;
                              
                              const { error: uploadError } = await supabase.storage
                                  .from('notebook-images')
                                  .upload(fileName, blob, { contentType: blob.type, upsert: true });
                                  
                              if (!uploadError) {
                                  const { data: publicUrlData } = supabase.storage.from('notebook-images').getPublicUrl(fileName);
                                  newUrls.push(publicUrlData.publicUrl);
                                  migrated = true;
                              } else {
                                  newUrls.push(imgStr);
                              }
                          } else {
                              newUrls.push(imgStr);
                          }
                      }
                      
                      if (migrated) {
                          await supabase.from('notebooks').update({ images: newUrls, image: null }).eq('id', id);
                          setNotebooks(prev => prev.map(n => n.id === id ? { ...n, images: newUrls } : n));
                      }
                  } catch (e) {
                      console.error("Background migration failed for notebook", id, e);
                  }
              })();
          }

          if (images.length > 0) setNotebooks(prev => prev.map(n => n.id === id ? { ...n, images: images } : n));
      }
      return images;
  };

  useEffect(() => {
    const init = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            setIsGuest(false);
            await fetchCloudData(session.user);
        } else {
            const idbData = await get('athena_guest_db');
            if (idbData) {
                setIsGuest(true);
                restoreState(idbData);
            }
            setLoading(false);
        }
    };
    init();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
          window.location.reload();
          return;
      }
      if (session?.user) {
          setIsGuest(false);
          fetchCloudData(session.user);
      } else {
          setNotebooks([]);
          setCycles([]);
          setReports([]);
          setProtocol([]);
          setNotes([]);
          setFramework(DEFAULT_FRAMEWORK);
          setActiveCycleId(null);
          setIsGuest(false); 
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const restoreState = (data: any) => {
      if (!data) return;
      setNotebooks(data.notebooks || []);
      setDisciplines(data.disciplines || []);
      setCycles(data.cycles || []);
      setActiveCycleId(data.activeCycleId || null);
      setReports(data.reports || []);
      setProtocol(data.protocol || []);
      setFramework(data.framework || DEFAULT_FRAMEWORK);
      setNotes(data.notes || []);
  };

  useEffect(() => {
      if (isGuest && !loading) {
          const guestData = { notebooks, disciplines, reports, protocol, framework, cycles, activeCycleId, notes };
          set('athena_guest_db', guestData).catch(e => console.error(e));
      }
  }, [notebooks, disciplines, reports, protocol, framework, cycles, activeCycleId, notes, isGuest, loading]);

  const enterGuestMode = async () => {
      setIsGuest(true);
      setLoading(true);
      restoreState(GUEST_SEED_DATA);
      setLoading(false);
      await set('athena_guest_db', GUEST_SEED_DATA);
  };

  const createCycle = async (name: string, role: string) => {
      const newCycle: Cycle = { id: generateId(), name, createdAt: new Date().toISOString(), lastAccess: new Date().toISOString(), config: { ...DEFAULT_CONFIG, targetRole: role }, planning: {}, weeklyCompletion: {}, schedule: {} };
      const previousCycles = [...cycles];
      setCycles(prev => [...prev, newCycle]);
      setActiveCycleId(newCycle.id);
      if (!isGuest && user) {
          try {
              const payload = { ...mapCycleToDB(newCycle), user_id: user.id };
              const { error } = await supabase.from('cycles').insert(payload);
              if (error) throw error;
          } catch (e) { console.error(e); setCycles(previousCycles); alert("Erro ao criar ciclo."); }
      }
  };

  const selectCycle = async (id: string) => {
      const now = new Date().toISOString();
      setActiveCycleId(id);
      setCycles(prev => prev.map(c => c.id === id ? { ...c, lastAccess: now } : c));
      if (!isGuest && user) {
          supabase.from('cycles').update({ last_access: now }).eq('id', id).then(({error}) => { if (error) console.error(error); });
      }
  };

  const deleteCycle = async (id: string) => {
      const previousCycles = [...cycles];
      setCycles(prev => prev.filter(c => c.id !== id));
      if (activeCycleId === id) setActiveCycleId(null);
      if (!isGuest && user) {
          try { 
              const { error } = await supabase.from('cycles').delete().eq('id', id); 
              if (error) throw error;
          } catch (e) { 
              console.error("Failed to delete cycle:", e); 
              setCycles(previousCycles); 
          }
      }
  };

  const updateConfig = async (newConfig: AthensConfig) => {
      if (!activeCycleId) return;
      const previousCycles = [...cycles];
      setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, config: newConfig } : c));
      if (!isGuest && user) {
          try { 
              const { error } = await supabase.from('cycles').update({ config: newConfig }).eq('id', activeCycleId); 
              if (error) throw error;
          } catch (e) { 
              console.error("Error updating config:", e); 
              setCycles(previousCycles); 
              throw e; // RE-THROW TO UI
          }
      }
  };

  const addNotebook = async (notebook: Partial<Notebook>) => {
      const newId = generateId();
      const newNb: Notebook = {
          id: newId, 
          edital: notebook.edital || '',
          discipline: notebook.discipline || 'Geral', 
          name: notebook.name || 'Novo Tópico', 
          subtitle: notebook.subtitle || '',
          accuracy: notebook.accuracy || 0, targetAccuracy: notebook.targetAccuracy || 90, weight: notebook.weight || Weight.MEDIO,
          relevance: notebook.relevance || Relevance.MEDIA, trend: notebook.trend || Trend.ESTAVEL, status: NotebookStatus.NOT_STARTED,
          images: notebook.images || [], notes: notebook.notes || '', ...notebook,
          isGlobal: false // Default false for the USER'S copy
      };
      
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => [...prev, newNb]);
      
      if (!isGuest && user) {
          try {
              // 1. Save PRIVATE copy
              const payload = { 
                  ...mapNotebookToDB(newNb), 
                  user_id: user.id 
              };
              
              const { error } = await supabase.from('notebooks').insert(payload);
              if (error) { throw error; }

              // 2. If 'isGlobal' was requested, create a SEPARATE public copy
              if (notebook.isGlobal) {
                  const publicPayload = {
                      ...mapNotebookToDB(newNb),
                      id: generateId(), // NEW ID for the public version
                      user_id: null, // PUBLIC
                      
                      // SANITIZATION (Content & Progress)
                      notes: '', 
                      images: [], 
                      accuracy: 0,
                      status: NotebookStatus.NOT_STARTED,
                      accuracy_history: [],
                      week_id: null,
                      
                      // SANITIZATION (Links) - CRITICAL UPDATE
                      tec_link: null,
                      error_notebook_link: null,
                      favorite_questions_link: null,
                      law_link: null,
                      obsidian_link: null,
                      gemini_link_1: null,
                      gemini_link_2: null
                  };
                  const { error: publicError } = await supabase.from('notebooks').insert(publicPayload);
                  if (publicError) throw publicError;
              }

          } catch (e: any) { 
              setNotebooks(previousNotebooks); 
              const msg = e.message || JSON.stringify(e);
              throw new Error(msg);
          }
      }
      return newId;
  };

  // --- FORKING LOGIC ---
  const ensureNotebookIsPrivate = async (notebookId: string): Promise<string> => {
      // Check if this notebook is Global
      const nb = notebooks.find(n => n.id === notebookId);
      if (!nb) throw new Error("Notebook not found");
      
      if (!nb.isGlobal) return notebookId; // Already private, do nothing

      // It IS global. We must fork it.
      const { id, isGlobal, ...dataToCopy } = nb;
      
      // Create new private copy
      const newId = await addNotebook({
          ...dataToCopy,
          // Reset status if needed, or keep it. Let's keep it 'Not Started' usually, but here we clone exactly.
          isGlobal: false // Explicitly private
      });

      // UI Trick: Remove the global one from view immediately so it looks like it "transformed"
      setNotebooks(prev => prev.filter(n => n.id !== notebookId)); // Remove global phantom
      
      return newId;
  };

  const editNotebook = async (id: string, data: Partial<Notebook>) => {
      let targetId = id;
      const currentNb = notebooks.find(n => n.id === id);
      
      if (!currentNb) return; // Should not happen

      if (currentNb.isGlobal && data.isGlobal === undefined) {
          targetId = await ensureNotebookIsPrivate(id);
      }

      // Prepare Data for Local Update (optimistic)
      const dataToUpdate = { ...data };
      if (data.isGlobal === true) {
          // If trying to publish, we keep the LOCAL version as private
          dataToUpdate.isGlobal = false; 
      }

      // 3. Update Local State (Merge existing + new)
      setNotebooks(prev => prev.map(n => n.id === targetId ? { ...n, ...dataToUpdate } : n));
      
      if (!isGuest && user) {
          try {
              // 4. Create Merged Object for DB Payload - CORREÇÃO CRÍTICA PARA PERSISTÊNCIA
              // O mapNotebookToDB converte undefined para NULL. Devemos passar o objeto MERGED (Completo)
              // para garantir que dados não editados não sejam sobrescritos por NULL.
              const mergedForDB = { ...currentNb, ...dataToUpdate };

              // 1. Update the PRIVATE version
              const payload = mapNotebookToDB(mergedForDB);
              delete (payload as any).id;
              // @ts-expect-error - user_id is not in the type definition
              payload.user_id = user.id; // Ensure it stays/becomes private

              const { error } = await supabase.from('notebooks').update(payload).eq('id', targetId);
              if (error) throw error;

              // 2. If Publish Requested (isGlobal = true), create/update PUBLIC copy
              if (data.isGlobal === true) {
                  const combinedData = { ...currentNb, ...data };
                  
                  // Basic logic: Insert a new public record based on this one
                  const publicPayload = {
                      ...mapNotebookToDB(combinedData), // Use combined data
                      id: generateId(),
                      user_id: null,
                      
                      // SANITIZATION (Content & Progress)
                      notes: '', 
                      images: [], 
                      accuracy: 0,
                      status: NotebookStatus.NOT_STARTED,
                      accuracy_history: [],
                      week_id: null,

                      // SANITIZATION (Links) - CRITICAL UPDATE
                      tec_link: null,
                      error_notebook_link: null,
                      favorite_questions_link: null,
                      law_link: null,
                      obsidian_link: null,
                      gemini_link_1: null,
                      gemini_link_2: null
                  };
                  const { error: publicError } = await supabase.from('notebooks').insert(publicPayload);
                  if (publicError) throw publicError;
              }

          } catch (e: any) { 
              console.error(e);
              throw new Error(e.message);
          }
      }
  };

  const deleteNotebook = async (id: string) => {
      const nb = notebooks.find(n => n.id === id);
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => prev.filter(n => n.id !== id));
      const validNotebookIds = new Set<string>(notebooks.filter(n => n.id !== id).map(n => n.id));
      setCycles(prev => prev.map(c => sanitizeCycleData(c, validNotebookIds)));
      
      if (!isGuest && user) {
          try { 
              const { error } = await supabase.from('notebooks').delete().eq('id', id); 
              if (error) {
                  console.error("Delete failed", error);
                  setNotebooks(previousNotebooks);
                  alert("Erro: Você não tem permissão para excluir este caderno (Público).");
              }
          } catch (e) { 
              console.error(e); 
              setNotebooks(previousNotebooks); 
          }
      }
  };

  const updateNotebookAccuracy = async (id: string, accuracy: number) => {
      let targetId = id;
      const nb = notebooks.find(n => n.id === id);
      if (nb?.isGlobal) {
          targetId = await ensureNotebookIsPrivate(id);
      }

      let updatedNb: Notebook | undefined;
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => prev.map(n => {
         if (n.id !== targetId) return n;
         const prevHistory = n.accuracyHistory ? [...n.accuracyHistory] : [];
         const history = [...prevHistory, { date: new Date().toISOString(), accuracy }];
         const updated = { ...n, accuracy, accuracyHistory: history.slice(-365), lastPractice: new Date().toISOString() };
         updatedNb = updated;
         return updated;
      }));
      
      if (!isGuest && user && updatedNb) {
          try {
              const payload = { accuracy: updatedNb.accuracy, accuracy_history: updatedNb.accuracyHistory, last_practice: updatedNb.lastPractice };
              const { error } = await supabase.from('notebooks').update(payload).eq('id', targetId);
              if (error) throw error;
          } catch (e) { 
              console.error("Failed to update notebook accuracy:", e); 
              setNotebooks(previousNotebooks); 
          }
      }
  };

  const updateCycleSchedule = async (cycleId: string, modifier: (schedule: Record<string, ScheduleItem[]>) => Record<string, ScheduleItem[]>) => {
      let newScheduleState: Record<string, ScheduleItem[]> | null = null;
      const previousCycles = [...cycles];
      setCycles(prev => {
          return prev.map(c => {
              if (c.id !== cycleId) return c;
              const currentSchedule = c.schedule ? JSON.parse(JSON.stringify(c.schedule)) : {};
              const newSchedule = modifier(currentSchedule);
              newScheduleState = newSchedule;
              return { ...c, schedule: newSchedule };
          });
      });
      if (!isGuest && user && newScheduleState) {
          try { 
              const { error } = await supabase.from('cycles').update({ schedule: newScheduleState }).eq('id', cycleId); 
              if (error) throw error;
          } catch (e) { 
              console.error("Failed to update cycle schedule:", e); 
              setCycles(previousCycles); 
          }
      }
  };

  const addDiscipline = async (discipline: Partial<Discipline>) => {
      const newId = generateId();
      const newDisc: Discipline = {
          id: newId,
          name: discipline.name || 'Nova Disciplina',
          edital: discipline.edital || '',
          weight: discipline.weight || Weight.MEDIO,
          relevance: discipline.relevance || Relevance.MEDIA,
      };
      
      const prev = [...disciplines];
      setDisciplines(p => [...p, newDisc]);
      
      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('disciplines').insert({ ...newDisc, user_id: user.id });
              if (error) throw error;
          } catch (e) {
              setDisciplines(prev);
              throw e;
          }
      }
      return newId;
  };

  const editDiscipline = async (id: string, data: Partial<Discipline>) => {
      const prev = [...disciplines];
      setDisciplines(p => p.map(d => d.id === id ? { ...d, ...data } : d));
      
      if (!isGuest && user) {
          try {
              const payload = { ...data };
              delete (payload as any).id;
              const { error } = await supabase.from('disciplines').update(payload).eq('id', id);
              if (error) throw error;
          } catch (e) {
              setDisciplines(prev);
              throw e;
          }
      }
  };

  const deleteDiscipline = async (id: string) => {
      const prev = [...disciplines];
      setDisciplines(p => p.filter(d => d.id !== id));
      
      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('disciplines').delete().eq('id', id);
              if (error) throw error;
          } catch (e) {
              setDisciplines(prev);
              throw e;
          }
      }
  };

  const moveNotebookToWeek = async (notebookId: string, weekId: string) => {
      let targetId = notebookId;
      const nb = notebooks.find(n => n.id === notebookId);
      if (nb?.isGlobal) {
          targetId = await ensureNotebookIsPrivate(notebookId);
      }

      if (!activeCycleId) { editNotebook(targetId, { weekId }); return; }
      const newSlot: ScheduleItem = { instanceId: generateId(), notebookId: targetId, completed: false };
      await updateCycleSchedule(activeCycleId, (schedule) => {
          if (!schedule[weekId]) schedule[weekId] = [];
          schedule[weekId] = [...schedule[weekId], newSlot];
          return schedule;
      });
  };

  const reorderSlotInWeek = async (weekId: string, oldIndex: number, newIndex: number) => {
      if (!activeCycleId) return;
      await updateCycleSchedule(activeCycleId, (schedule) => {
          if (!schedule[weekId]) return schedule;
          const items = [...schedule[weekId]];
          const [moved] = items.splice(oldIndex, 1);
          items.splice(newIndex, 0, moved);
          schedule[weekId] = items;
          return schedule;
      });
  };

  const toggleSlotCompletion = async (instanceId: string, weekId: string) => {
      let notebookIdToUpdate: string | undefined;
      let isCompletedNow = false;

      if (!activeCycleId) { 
          const nb = notebooks.find(n => n.id === instanceId.replace('-legacy', '')); 
          if(nb) {
              const newStatus = !nb.isWeekCompleted;
              const updates: any = { isWeekCompleted: newStatus };
              if (newStatus) updates.lastPractice = new Date().toISOString();
              editNotebook(nb.id, updates);
          }
          return; 
      }
      
      await updateCycleSchedule(activeCycleId, (schedule) => {
          if (!schedule[weekId]) return schedule;
          schedule[weekId] = schedule[weekId].map(s => {
              if (s.instanceId === instanceId) {
                  notebookIdToUpdate = s.notebookId;
                  isCompletedNow = !s.completed;
                  return { 
                      ...s, 
                      completed: !s.completed,
                      completedAt: !s.completed ? new Date().toISOString() : undefined 
                  };
              }
              return s;
          });
          return schedule;
      });

      if (notebookIdToUpdate && isCompletedNow) {
          await editNotebook(notebookIdToUpdate, { lastPractice: new Date().toISOString() });
      }
  };

  const removeSlotFromWeek = async (instanceId: string, weekId: string) => {
      if (!activeCycleId) { const nb = notebooks.find(n => n.id === instanceId.replace('-legacy', '')); if(nb) editNotebook(nb.id, { weekId: null }); return; }
      await updateCycleSchedule(activeCycleId, (schedule) => {
          if (!schedule[weekId]) return schedule;
          schedule[weekId] = schedule[weekId].filter(s => s.instanceId !== instanceId);
          return schedule;
      });
  };

  const saveReport = async (reportData: Omit<SavedReport, 'id' | 'date'>) => {
      const newReport: SavedReport = { id: generateId(), date: new Date().toISOString(), ...reportData };
      const previousReports = [...reports];
      setReports(prev => [newReport, ...prev]);
      if (!isGuest && user) {
          try { 
              const { error } = await supabase.from('reports').insert({ ...newReport, user_id: user.id }); 
              if (error) throw error;
          } catch (e) { 
              console.error("Failed to save report:", e); 
              setReports(previousReports); 
          }
      }
  };

  const deleteReport = async (id: string) => {
      const previousReports = [...reports];
      setReports(prev => prev.filter(r => r.id !== id));
      if (!isGuest && user) { 
          try { 
              const { error } = await supabase.from('reports').delete().eq('id', id); 
              if (error) throw error;
          } catch(e) { 
              console.error("Failed to delete report:", e); 
              setReports(previousReports); 
          } 
      }
  };

  const addProtocolItem = async (item: Omit<ProtocolItem, 'id' | 'checked'>) => {
      const newItem = { ...item, id: generateId(), checked: false };
      const previousProtocol = [...protocol];
      setProtocol(prev => [...prev, newItem]);
      if (!isGuest && user) { 
          try { 
              const { error } = await supabase.from('protocol').insert({ ...newItem, user_id: user.id }); 
              if (error) throw error;
          } catch (e) { 
              console.error("Failed to add protocol item:", e); 
              setProtocol(previousProtocol); 
          } 
      }
  };

  const toggleProtocolItem = async (id: string) => {
      let updatedItem: ProtocolItem | undefined;
      const previousProtocol = [...protocol];
      setProtocol(prev => prev.map(p => { if (p.id === id) { updatedItem = { ...p, checked: !p.checked }; return updatedItem; } return p; }));
      if (!isGuest && user && updatedItem) { 
          try { 
              const { error } = await supabase.from('protocol').update({ checked: updatedItem.checked }).eq('id', id); 
              if (error) throw error;
          } catch (e) { 
              console.error("Failed to toggle protocol item:", e); 
              setProtocol(previousProtocol); 
          } 
      }
  };

  const deleteProtocolItem = async (id: string) => {
      const previousProtocol = [...protocol];
      setProtocol(prev => prev.filter(p => p.id !== id));
      if (!isGuest && user) { 
          try { 
              const { error } = await supabase.from('protocol').delete().eq('id', id); 
              if (error) throw error;
          } catch(e) { 
              console.error("Failed to delete protocol item:", e);
              setProtocol(previousProtocol); 
          } 
      }
  };

  const updateFramework = async (data: FrameworkData) => {
      const previousFramework = { ...framework };
      setFramework(data);
      
      if (!isGuest && user) {
          try {
              const payload = {
                  user_id: user.id,
                  values: data.values,
                  dream: data.dream,
                  motivation: data.motivation,
                  action: data.action,
                  habit: data.habit,
              };

              const { error } = await supabase
                  .from('frameworks')
                  .upsert(payload, { onConflict: 'user_id' }); 

              if (error) {
                  throw error;
              }
          } catch (e: any) {
              console.error("DB Error: Update Framework", e);
              setFramework(previousFramework); 
              let msg = e.message || JSON.stringify(e);
              if (e.code === '42P01') msg = "Erro: A tabela 'frameworks' não existe no Supabase. Execute o script SQL fornecido.";
              alert(`Erro ao salvar framework: ${msg}`);
          }
      }
  };

  const addNote = async () => {
      const newNote: Note = { id: generateId(), content: '', color: 'yellow', isBold: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const previousNotes = [...notes];
      setNotes(prev => [newNote, ...prev]);
      if (!isGuest && user) { 
          try { 
              const payload = { ...mapNoteToDB(newNote), user_id: user.id }; 
              let { error } = await supabase.from('notes').insert(payload); 
              if (error && error.message?.includes('is_bold')) {
                  delete payload.is_bold;
                  const retry = await supabase.from('notes').insert(payload);
                  error = retry.error;
              }
              if (error) throw error;
          } catch (e) { 
              console.error("Failed to add note:", e); 
              setNotes(previousNotes); 
          } 
      }
  };

  const updateNote = async (id: string, content: string, color?: Note['color'], isBold?: boolean) => {
      const now = new Date().toISOString();
      const previousNotes = [...notes];
      const prevNote = previousNotes.find(n => n.id === id);
      
      if (!prevNote) return;

      const updatedLocalNote = { 
          ...prevNote, 
          content, 
          color: color || prevNote.color, 
          isBold: isBold !== undefined ? isBold : prevNote.isBold,
          updatedAt: now 
      };

      setNotes(prev => prev.map(n => n.id === id ? updatedLocalNote : n));
      
      if (!isGuest && user) {
          try { 
              const dbPayload = mapNoteToDB(updatedLocalNote);
              delete (dbPayload as any).id; 
              
              let { error } = await supabase.from('notes').update(dbPayload).eq('id', id); 
              if (error && error.message?.includes('is_bold')) {
                  delete dbPayload.is_bold;
                  const retry = await supabase.from('notes').update(dbPayload).eq('id', id);
                  error = retry.error;
              }
              if (error) throw error;
          } catch(e) { 
              console.error("Failed to update note:", e); 
              // Revert on failure
              setNotes(previousNotes);
          }
      }
  };

  const deleteNote = async (id: string) => {
      const previousNotes = [...notes];
      setNotes(prev => prev.filter(n => n.id !== id));
      if (!isGuest && user) { 
          try { 
              const { error } = await supabase.from('notes').delete().eq('id', id); 
              if (error) throw error;
          } catch (e) { 
              console.error("Failed to delete note:", e); 
              setNotes(previousNotes); 
          } 
      }
  };

  const addMockExam = async (exam: Partial<MockExam>) => {
      const newExam: MockExam = {
          id: generateId(),
          name: exam.name || '',
          board: exam.board || '',
          createdAt: new Date().toISOString()
      };
      setMockExams(prev => [...prev, newExam]);
      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('mock_exams').insert({
                  id: newExam.id,
                  user_id: user.id,
                  name: newExam.name,
                  board: newExam.board,
                  created_at: newExam.createdAt
              });
              if (error) throw error;
          } catch (e) {
              console.error("Failed to add mock exam:", e);
              setMockExams(prev => prev.filter(x => x.id !== newExam.id));
          }
      }
      return newExam.id;
  };

  const editMockExam = async (id: string, data: Partial<MockExam>) => {
      const previousExams = [...mockExams];
      setMockExams(prev => prev.map(x => x.id === id ? { ...x, ...data } : x));
      if (!isGuest && user) {
          try {
              const payload: any = {};
              if (data.name !== undefined) payload.name = data.name;
              if (data.board !== undefined) payload.board = data.board;
              const { error } = await supabase.from('mock_exams').update(payload).eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error("Failed to edit mock exam:", e);
              setMockExams(previousExams);
          }
      }
  };

  const deleteMockExam = async (id: string) => {
      const previousExams = [...mockExams];
      setMockExams(prev => prev.filter(x => x.id !== id));
      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('mock_exams').delete().eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error("Failed to delete mock exam:", e);
              setMockExams(previousExams);
          }
      }
  };

  const addMockExamResult = async (result: Partial<MockExamResult>) => {
      const newResult: MockExamResult = {
          id: generateId(),
          examId: result.examId || '',
          discipline: result.discipline || '',
          accuracy: result.accuracy || 0,
          date: result.date || new Date().toISOString(),
          tecLink: result.tecLink || ''
      };
      setMockExamResults(prev => [...prev, newResult]);
      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('mock_exam_results').insert({
                  id: newResult.id,
                  user_id: user.id,
                  exam_id: newResult.examId,
                  discipline: newResult.discipline,
                  accuracy: newResult.accuracy,
                  date: newResult.date,
                  tec_link: newResult.tecLink
              });
              if (error) throw error;
          } catch (e) {
              console.error("Failed to add mock exam result:", e);
              setMockExamResults(prev => prev.filter(x => x.id !== newResult.id));
          }
      }
      return newResult.id;
  };

  const editMockExamResult = async (id: string, data: Partial<MockExamResult>) => {
      const previousResults = [...mockExamResults];
      setMockExamResults(prev => prev.map(x => x.id === id ? { ...x, ...data } : x));
      if (!isGuest && user) {
          try {
              const payload: any = {};
              if (data.accuracy !== undefined) payload.accuracy = data.accuracy;
              if (data.tecLink !== undefined) payload.tec_link = data.tecLink;
              if (data.date !== undefined) payload.date = data.date;
              const { error } = await supabase.from('mock_exam_results').update(payload).eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error("Failed to edit mock exam result:", e);
              setMockExamResults(previousResults);
          }
      }
  };

  const deleteMockExamResult = async (id: string) => {
      const previousResults = [...mockExamResults];
      setMockExamResults(prev => prev.filter(x => x.id !== id));
      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('mock_exam_results').delete().eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error("Failed to delete mock exam result:", e);
              setMockExamResults(previousResults);
          }
      }
  };

  const exportDatabase = () => {
      const data = { notebooks, cycles, reports, protocol, framework, notes, activeCycleId };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atena_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  const startSession = async (notebook: Notebook) => {
      let targetNb = notebook;
      if (notebook.isGlobal) {
          const newId = await ensureNotebookIsPrivate(notebook.id);
          const freshNb = notebooks.find(n => n.id === newId); 
          if (freshNb) targetNb = freshNb;
          else targetNb = { ...notebook, id: newId, isGlobal: false }; 
      }
      setActiveSession(targetNb);
  };
  
  const endSession = () => setActiveSession(null);

  const value = {
      user, isGuest, loading, isSyncing, dbError,
      notebooks, disciplines, cycles, activeCycleId, config, reports, protocol, framework, notes,
      mockExams, mockExamResults,
      activeSession, pendingCreateData, focusedNotebookId,
      createCycle, selectCycle, deleteCycle, updateConfig,
      addNotebook, editNotebook, deleteNotebook, updateNotebookAccuracy, fetchNotebookImages, 
      addDiscipline, editDiscipline, deleteDiscipline,
      moveNotebookToWeek, reorderSlotInWeek, toggleSlotCompletion, removeSlotFromWeek,
      saveReport, deleteReport,
      addProtocolItem, toggleProtocolItem, deleteProtocolItem,
      updateFramework,
      addNote, updateNote, deleteNote,
      addMockExam, editMockExam, deleteMockExam,
      addMockExamResult, editMockExamResult, deleteMockExamResult,
      enterGuestMode, exportDatabase, startSession, endSession, setPendingCreateData, setFocusedNotebookId
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const useMergedDisciplines = () => {
  const { disciplines, notebooks } = useStore();

  return useMemo(() => {
    const disciplineMap = new Map<string, Discipline>();
    
    // 1. Add explicitly saved disciplines
    disciplines.forEach(d => {
      disciplineMap.set(d.name.toLowerCase().trim(), d);
    });

    // 2. Add virtual disciplines from notebooks
    notebooks.forEach(nb => {
      if (!nb.discipline) return;
      const key = nb.discipline.toLowerCase().trim();
      if (!disciplineMap.has(key)) {
        disciplineMap.set(key, {
          id: `virtual-${key}`, // Virtual ID
          name: nb.discipline,
          weight: Weight.MEDIO,
          relevance: Relevance.MEDIA,
        });
      }
    });

    return Array.from(disciplineMap.values()).sort((a, b) => {
      const scoreA = (WEIGHT_SCORE[a.weight] || 0) * (RELEVANCE_SCORE[a.relevance] || 0);
      const scoreB = (WEIGHT_SCORE[b.weight] || 0) * (RELEVANCE_SCORE[b.relevance] || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.name.localeCompare(b.name);
    });
  }, [disciplines, notebooks]);
};
