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

const mapNotebookFromDB = (db: any): Notebook => ({
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
    geminiLink2: db.gemini_link_2 || db.gemini_link_2 || '',
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
    // Logic: If images is an array, use it. If 'image' (legacy base64) exists, wrap it.
    // NOTE: In the main list, we might receive stripped data, handled in fetchCloudData.
    images: Array.isArray(db.images) ? db.images : (db.image ? [db.image] : [])
});

const mapNotebookToDB = (nb: Partial<Notebook>) => {
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
        weight: nb.weight,
        relevance: nb.relevance,
        trend: nb.trend,
        custom_score: nb.customScore || null,
        status: nb.status,
        week_id: nb.weekId || null,
        is_week_completed: nb.isWeekCompleted,
        last_practice: nb.lastPractice || null,
        next_review: nb.nextReview || null,
        accuracy_history: nb.accuracyHistory || [],
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
    
    const cleanSchedule: Record<string, ScheduleItem[]> = {};
    let hasChanges = false;

    Object.entries(cycle.schedule).forEach(([weekId, slots]) => {
        if (!Array.isArray(slots)) return;
        
        const validSlots = slots.filter(slot => {
            return slot && slot.notebookId && validNotebookIds.has(slot.notebookId);
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

  addNotebook: (notebook: Partial<Notebook>) => Promise<void>;
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
  id, discipline, name, subtitle, 
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

  const fetchCloudData = async (currentUser?: any) => {
      setLoading(true);
      setDbError(null);
      try {
          // Optimization: Use passed user or get from session if missing
          const userToUse = currentUser || (await supabase.auth.getUser()).data.user;
          
          if (!userToUse) {
              setLoading(false);
              return;
          }

          // PARALLEL FETCHING: Fetch all tables simultaneously
          // DEFESA EM PROFUNDIDADE: Filtro explícito .eq('user_id', userToUse.id)
          const [
              notebooksResponse,
              cyclesResponse,
              reportsResponse,
              protocolResponse,
              notesResponse,
              frameworkResponse
          ] = await Promise.all([
              // 1. Notebooks (Enhanced Recovery)
              (async () => {
                  try {
                      // Attempt optimized fetch with explicit user_id filter
                      const { data, error } = await supabase.from('notebooks').select(OPTIMIZED_COLUMNS).eq('user_id', userToUse.id);
                      if (error) throw error;
                      return { data, error: null };
                  } catch (optimizedError) {
                      console.warn("⚠️ Optimized Fetch Failed. Trying Recovery Mode.", optimizedError);
                      const { data, error } = await supabase.from('notebooks').select('*').eq('user_id', userToUse.id);
                      if (error) { 
                          const errString = JSON.stringify(error);
                          console.error("❌ Recovery Fetch Failed.", errString);
                          if (error.code === '42P01' || error.code === '42501' || error.code === 'PGRST204') {
                              setDbError(errString);
                          }
                          return { data: [], error };
                      }
                      
                      const cleanedData = data?.map((nb: any) => {
                          return { ...nb, image: null, images: [] };
                      });
                      return { data: cleanedData, error: null };
                  }
              })(),
              // 2. Cycles - Filtered
              supabase.from('cycles').select('*').eq('user_id', userToUse.id),
              // 3. Reports - Filtered
              supabase.from('reports').select('*').eq('user_id', userToUse.id),
              // 4. Protocol - Filtered
              supabase.from('protocol').select('*').eq('user_id', userToUse.id),
              // 5. Notes - Filtered
              supabase.from('notes').select('*').eq('user_id', userToUse.id),
              // 6. Framework - Filtered
              supabase.from('frameworks').select('*').eq('user_id', userToUse.id).maybeSingle()
          ]);

          let validNotebookIds = new Set<string>();

          // Process Notebooks
          if (notebooksResponse.data) {
              const mappedNotebooks = notebooksResponse.data.map(mapNotebookFromDB);
              setNotebooks(mappedNotebooks);
              validNotebookIds = new Set(mappedNotebooks.map((n: Notebook) => n.id));
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
            // Optimization: Pass user directly to avoid re-fetching
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
    
    // AUTH STATE LISTENER
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
          // *** NUCLEAR OPTION ***
          // Se o usuário deslogou, forçamos um reload da página.
          // Isso garante que a memória RAM seja limpa e nenhum dado do usuário anterior persista.
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
      // Hydrate with Seed Data immediately
      restoreState(GUEST_SEED_DATA);
      setLoading(false); // OPTIMIZATION: Unlock UI immediately
      await set('athena_guest_db', GUEST_SEED_DATA); // Save in background
  };

  const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
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
      const newNb: Notebook = {
          id: generateId(), discipline: notebook.discipline || 'Geral', name: notebook.name || 'Novo Tópico', subtitle: notebook.subtitle || '',
          accuracy: notebook.accuracy || 0, targetAccuracy: notebook.targetAccuracy || 90, weight: notebook.weight || Weight.MEDIO,
          relevance: notebook.relevance || Relevance.MEDIA, trend: notebook.trend || Trend.ESTAVEL, status: NotebookStatus.NOT_STARTED,
          images: notebook.images || [], notes: notebook.notes || '', ...notebook
      };
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => [...prev, newNb]);
      if (!isGuest && user) {
          try {
              const payload = { ...mapNotebookToDB(newNb), user_id: user.id };
              const { error } = await supabase.from('notebooks').insert(payload);
              if (error) {
                  console.error("Supabase Insert Error:", JSON.stringify(error));
                  throw error; // Throw specific Supabase error
              }
          } catch (e: any) { 
              setNotebooks(previousNotebooks); 
              let msg = e.message || JSON.stringify(e);
              if (e.code === '42703') msg = `Erro de Schema (42703): Coluna inexistente no banco. Vá em Dashboard > Configurações > Mostrar Script SQL para atualizar.`;
              if (e.code === '42501') msg = `Erro de Permissão (42501): RLS bloqueou a escrita. Execute o script SQL no Dashboard.`;
              if (e.code === 'PGRST204') msg = `Erro de Cache (PGRST204): Coluna 'week_id' não encontrada. O banco pode estar desatualizado. Execute o script SQL no Dashboard e recarregue.`;
              
              // We must throw here so the UI knows the operation failed and doesn't close the modal
              throw new Error(msg);
          }
      }
  };

  const editNotebook = async (id: string, data: Partial<Notebook>) => {
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
      if (!isGuest && user) {
          try {
              const payload = mapNotebookToDB({ ...data, id });
              delete (payload as any).id;
              const { error } = await supabase.from('notebooks').update(payload).eq('id', id);
              if (error) throw error;
          } catch (e: any) { 
              setNotebooks(previousNotebooks); 
              let msg = e.message || JSON.stringify(e);
              if (e.code === '42703') msg = `Erro de Schema: Coluna ausente no banco.`;
              if (e.code === 'PGRST204') msg = `Erro de Cache (PGRST204): Coluna 'week_id' não encontrada. Execute o script SQL no Dashboard.`;
              throw new Error(msg);
          }
      }
  };

  const deleteNotebook = async (id: string) => {
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => prev.filter(n => n.id !== id));
      const validNotebookIds = new Set<string>(notebooks.filter(n => n.id !== id).map(n => n.id));
      setCycles(prev => prev.map(c => sanitizeCycleData(c, validNotebookIds)));
      if (!isGuest && user) {
          try { await supabase.from('notebooks').delete().eq('id', id); } catch (e) { console.error(e); setNotebooks(previousNotebooks); }
      }
  };

  const updateNotebookAccuracy = async (id: string, accuracy: number) => {
      let updatedNb: Notebook | undefined;
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => prev.map(n => {
         if (n.id !== id) return n;
         const prevHistory = n.accuracyHistory ? [...n.accuracyHistory] : [];
         const history = [...prevHistory, { date: new Date().toISOString(), accuracy }];
         const updated = { ...n, accuracy, accuracyHistory: history.slice(-10), lastPractice: new Date().toISOString() };
         updatedNb = updated;
         return updated;
      }));
      if (!isGuest && user && updatedNb) {
          try {
              const payload = { accuracy: updatedNb.accuracy, accuracy_history: updatedNb.accuracyHistory, last_practice: updatedNb.lastPractice };
              await supabase.from('notebooks').update(payload).eq('id', id);
          } catch (e) { console.error(e); setNotebooks(previousNotebooks); }
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
          try { await supabase.from('cycles').update({ schedule: newScheduleState }).eq('id', cycleId); } catch (e) { console.error(e); setCycles(previousCycles); }
      }
  };

  const moveNotebookToWeek = async (notebookId: string, weekId: string) => {
      if (!activeCycleId) { editNotebook(notebookId, { weekId }); return; }
      const newSlot: ScheduleItem = { instanceId: generateId(), notebookId, completed: false };
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

  const startSession = (notebook: Notebook) => setActiveSession(notebook);
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