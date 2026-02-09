import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './components/supabase';
import { get, set } from 'idb-keyval';
import { 
  Notebook, Cycle, AthensConfig, SavedReport, ProtocolItem, 
  FrameworkData, Note, NotebookStatus, ScheduleItem,
  Weight, Relevance, Trend
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
    // Se o dado existe no banco, deve ser mostrado. A sanitização deve ocorrer apenas na criação do template público.
    const isGlobal = db.user_id === null;

    return {
        id: db.id,
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
    // CORREÇÃO: Salvar EXATAMENTE o que está no objeto.
    // A lógica de limpar dados para o público será feita criando um NOVO registro, não alterando este.
    return {
        id: nb.id,
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
    createdAt: db.created_at || db.createdAt,
    updatedAt: db.updated_at || db.updatedAt,
});

const mapNoteToDB = (note: Partial<Note>) => {
    return {
        id: note.id,
        content: note.content,
        color: note.color,
        created_at: note.createdAt,
        updated_at: note.updatedAt
    };
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
    
    // FIX BUG: Não filtrar agressivamente com base em validNotebookIds.
    // O carregamento assíncrono pode fazer com que notebooks válidos ainda não estejam no Set,
    // causando a deleção indevida do agendamento.
    // Mantemos apenas a verificação de estrutura básica.
    
    const cleanSchedule: Record<string, ScheduleItem[]> = {};
    let hasChanges = false;

    Object.entries(cycle.schedule).forEach(([weekId, slots]) => {
        if (!Array.isArray(slots)) return;
        
        const validSlots = slots.filter(slot => {
            // Apenas verifica se o objeto slot é válido e tem um ID.
            // Removemos '&& validNotebookIds.has(slot.notebookId)' para evitar o bug de sumiço.
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
            weight: Weight.MUITO_ALTO,
            relevance: Relevance.ALTISSIMA,
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
  cycles: Cycle[];
  activeCycleId: string | null;
  config: AthensConfig;
  reports: SavedReport[];
  protocol: ProtocolItem[];
  framework: FrameworkData;
  notes: Note[];
  
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
  updateNote: (id: string, content: string, color?: Note['color']) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  enterGuestMode: () => void;
  exportDatabase: () => void;
  startSession: (notebook: Notebook) => void;
  endSession: () => void;
  setPendingCreateData: (data: Partial<Notebook> | null) => void;
  setFocusedNotebookId: (id: string | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// V10 Optimized Columns
const OPTIMIZED_COLUMNS = `
  id, user_id, discipline, name, subtitle, 
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
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [protocol, setProtocol] = useState<ProtocolItem[]>([]);
  const [framework, setFramework] = useState<FrameworkData>(DEFAULT_FRAMEWORK);
  const [notes, setNotes] = useState<Note[]>([]);

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
              frameworkResponse
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
              supabase.from('frameworks').select('*').eq('user_id', userToUse.id).maybeSingle()
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

  // ... (Other functions like fetchNotebookImages, useEffect init, restoreState remain identical) ...
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
      setCycles(data.cycles || []);
      setActiveCycleId(data.activeCycleId || null);
      setReports(data.reports || []);
      setProtocol(data.protocol || []);
      setFramework(data.framework || DEFAULT_FRAMEWORK);
      setNotes(data.notes || []);
  };

  useEffect(() => {
      if (isGuest && !loading) {
          const guestData = { notebooks, reports, protocol, framework, cycles, activeCycleId, notes };
          set('athena_guest_db', guestData).catch(e => console.error(e));
      }
  }, [notebooks, reports, protocol, framework, cycles, activeCycleId, notes, isGuest, loading]);

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
          try { await supabase.from('cycles').delete().eq('id', id); } catch (e) { console.error(e); setCycles(previousCycles); }
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
      // NOTE: We return the new ID so UI can use it immediately (critical for Global Forking)
      const newId = generateId();
      const newNb: Notebook = {
          id: newId, discipline: notebook.discipline || 'Geral', name: notebook.name || 'Novo Tópico', subtitle: notebook.subtitle || '',
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
                  await supabase.from('notebooks').insert(publicPayload);
              }

          } catch (e: any) { 
              setNotebooks(previousNotebooks); 
              let msg = e.message || JSON.stringify(e);
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
      // Logic: 
      // 1. If we are editing a GLOBAL notebook and turning it PRIVATE (isGlobal: false), we fork it.
      // 2. If we are editing a GLOBAL notebook and keeping it GLOBAL, we update it (only allowed if RLS permits).
      // 3. If we are editing a PRIVATE notebook and turning it PUBLIC (isGlobal: true), we update user_id to NULL.

      let targetId = id;
      const nb = notebooks.find(n => n.id === id);
      
      // If editing a global notebook but NOT explicitly setting isGlobal (e.g. just accuracy update),
      // we assume it should become private (Fork) UNLESS the user is an admin managing the catalog.
      // Current behavior: Standard edits on Global items -> Fork.
      // Exception: If we are in the "Edit Modal" and specifically toggling isGlobal, handled below.
      
      if (nb?.isGlobal && data.isGlobal === undefined) {
          // Implicit edit (like drag and drop or quick accuracy update) on a global item -> Fork it to private
          targetId = await ensureNotebookIsPrivate(id);
      }

      const previousNotebooks = [...notebooks];
      // Force local update to reflect data immediately (keeping it private in local state)
      const dataToUpdate = { ...data };
      if (data.isGlobal === true) {
          // If trying to publish, we keep the LOCAL version as private
          dataToUpdate.isGlobal = false; 
      }

      setNotebooks(prev => prev.map(n => n.id === targetId ? { ...n, ...dataToUpdate } : n));
      
      if (!isGuest && user) {
          try {
              // 1. Update the PRIVATE version
              const payload = mapNotebookToDB({ ...dataToUpdate, id: targetId });
              delete (payload as any).id;
              // @ts-ignore
              payload.user_id = user.id; // Ensure it stays/becomes private

              const { error } = await supabase.from('notebooks').update(payload).eq('id', targetId);
              if (error) throw error;

              // 2. If Publish Requested (isGlobal = true), create/update PUBLIC copy
              if (data.isGlobal === true) {
                  const combinedData = { ...nb, ...data };
                  
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
                  await supabase.from('notebooks').insert(publicPayload);
              }

          } catch (e: any) { 
              console.error(e);
              throw new Error(e.message);
          }
      }
  };

  const deleteNotebook = async (id: string) => {
      const nb = notebooks.find(n => n.id === id);
      
      // If global, we usually block delete unless admin.
      // But RLS "Manage All Notebooks" policy handles this check at DB level.
      // If user tries to delete a global item without permission, DB throws error.
      
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => prev.filter(n => n.id !== id));
      // Cleanup cycles
      const validNotebookIds = new Set<string>(notebooks.filter(n => n.id !== id).map(n => n.id));
      setCycles(prev => prev.map(c => sanitizeCycleData(c, validNotebookIds)));
      
      if (!isGuest && user) {
          try { 
              const { error } = await supabase.from('notebooks').delete().eq('id', id); 
              if (error) {
                  // Revert UI if DB failed (e.g. RLS blocked deleting global item)
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
      // Intercept Global -> Fork to Private
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
         const updated = { ...n, accuracy, accuracyHistory: history.slice(-10), lastPractice: new Date().toISOString() };
         updatedNb = updated;
         return updated;
      }));
      
      if (!isGuest && user && updatedNb) {
          try {
              const payload = { accuracy: updatedNb.accuracy, accuracy_history: updatedNb.accuracyHistory, last_practice: updatedNb.lastPractice };
              await supabase.from('notebooks').update(payload).eq('id', targetId);
          } catch (e) { console.error(e); setNotebooks(previousNotebooks); }
      }
  };

  // ... (Rest of functions: updateCycleSchedule, moveNotebookToWeek etc. remain mostly same) ...
  // Note: moveNotebookToWeek might also need to fork if dragging a global item to schedule
  
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
          try { await supabase.from('cycles').update({ schedule: newScheduleState }).eq('id', cycleId); } catch (e) { console.error(e); setCycles(previousCycles); }
      }
  };

  const moveNotebookToWeek = async (notebookId: string, weekId: string) => {
      // Intercept Global -> Fork
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
      if (!activeCycleId) { const nb = notebooks.find(n => n.id === instanceId.replace('-legacy', '')); if(nb) editNotebook(nb.id, { isWeekCompleted: !nb.isWeekCompleted }); return; }
      await updateCycleSchedule(activeCycleId, (schedule) => {
          if (!schedule[weekId]) return schedule;
          schedule[weekId] = schedule[weekId].map(s => s.instanceId === instanceId ? { ...s, completed: !s.completed } : s);
          return schedule;
      });
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
          try { await supabase.from('reports').insert({ ...newReport, user_id: user.id }); } catch (e) { console.error(e); setReports(previousReports); }
      }
  };

  const deleteReport = async (id: string) => {
      const previousReports = [...reports];
      setReports(prev => prev.filter(r => r.id !== id));
      if (!isGuest && user) { try { await supabase.from('reports').delete().eq('id', id); } catch(e) { console.error(e); setReports(previousReports); } }
  };

  const addProtocolItem = async (item: Omit<ProtocolItem, 'id' | 'checked'>) => {
      const newItem = { ...item, id: generateId(), checked: false };
      const previousProtocol = [...protocol];
      setProtocol(prev => [...prev, newItem]);
      if (!isGuest && user) { try { await supabase.from('protocol').insert({ ...newItem, user_id: user.id }); } catch(e) { console.error(e); setProtocol(previousProtocol); } }
  };

  const toggleProtocolItem = async (id: string) => {
      let updatedItem: ProtocolItem | undefined;
      const previousProtocol = [...protocol];
      setProtocol(prev => prev.map(p => { if (p.id === id) { updatedItem = { ...p, checked: !p.checked }; return updatedItem; } return p; }));
      if (!isGuest && user && updatedItem) { try { await supabase.from('protocol').update({ checked: updatedItem.checked }).eq('id', id); } catch (e) { console.error(e); setProtocol(previousProtocol); } }
  };

  const deleteProtocolItem = async (id: string) => {
      const previousProtocol = [...protocol];
      setProtocol(prev => prev.filter(p => p.id !== id));
      if (!isGuest && user) { try { await supabase.from('protocol').delete().eq('id', id); } catch(e) { setProtocol(previousProtocol); } }
  };

  // --- CORREÇÃO PRINCIPAL: FRAMEWORK UPSERT ---
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
      const newNote: Note = { id: generateId(), content: '', color: 'yellow', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const previousNotes = [...notes];
      setNotes(prev => [newNote, ...prev]);
      if (!isGuest && user) { try { const payload = { ...mapNoteToDB(newNote), user_id: user.id }; await supabase.from('notes').insert(payload); } catch (e) { console.error(e); setNotes(previousNotes); } }
  };

  const updateNote = async (id: string, content: string, color?: Note['color']) => {
      const now = new Date().toISOString();
      const previousNotes = [...notes];
      setNotes(prev => prev.map(n => n.id === id ? { ...n, content, color: color || n.color, updatedAt: now } : n));
      if (!isGuest && user) {
          const payload: any = { content, updatedAt: now };
          if (color) payload.color = color;
          try { const dbPayload = mapNoteToDB(payload); await supabase.from('notes').update(dbPayload).eq('id', id); } catch(e) { console.error(e); }
      }
  };

  const deleteNote = async (id: string) => {
      const previousNotes = [...notes];
      setNotes(prev => prev.filter(n => n.id !== id));
      if (!isGuest && user) { try { await supabase.from('notes').delete().eq('id', id); } catch (e) { console.error(e); setNotes(previousNotes); } }
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

  // Start session might require forking if it's a global notebook
  const startSession = async (notebook: Notebook) => {
      let targetNb = notebook;
      if (notebook.isGlobal) {
          // Fork first immediately so session runs on the private copy
          const newId = await ensureNotebookIsPrivate(notebook.id);
          const freshNb = notebooks.find(n => n.id === newId); // notebooks state updated in ensureNotebookIsPrivate
          // Wait a tick for state update or find it in the new state via a direct fetch if needed
          // Actually state update is async. For simplicity, we construct the new object manually:
          if (freshNb) targetNb = freshNb;
          else targetNb = { ...notebook, id: newId, isGlobal: false }; 
      }
      setActiveSession(targetNb);
  };
  
  const endSession = () => setActiveSession(null);

  const value = {
      user, isGuest, loading, isSyncing, dbError,
      notebooks, cycles, activeCycleId, config, reports, protocol, framework, notes,
      activeSession, pendingCreateData, focusedNotebookId,
      createCycle, selectCycle, deleteCycle, updateConfig,
      addNotebook, editNotebook, deleteNotebook, updateNotebookAccuracy, fetchNotebookImages, 
      moveNotebookToWeek, reorderSlotInWeek, toggleSlotCompletion, removeSlotFromWeek,
      saveReport, deleteReport,
      addProtocolItem, toggleProtocolItem, deleteProtocolItem,
      updateFramework,
      addNote, updateNote, deleteNote,
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