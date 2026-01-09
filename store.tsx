import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
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
        baseIntervals: { learning: 1, reviewing: 3, mastering: 7, maintaining: 15 },
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
    status: db.status || NotebookStatus.NOT_STARTED,
    weekId: db.week_id || db.weekId || null,
    isWeekCompleted: !!(db.is_week_completed || db.isWeekCompleted),
    lastPractice: db.last_practice || db.lastPractice || null,
    nextReview: db.next_review || db.nextReview || null,
    accuracyHistory: Array.isArray(db.accuracy_history) ? db.accuracy_history : [],
    notes: db.notes || '',
    images: Array.isArray(db.images) ? db.images : (db.image ? [db.image] : [])
});

const mapNotebookToDB = (nb: Partial<Notebook>) => {
    return {
        id: nb.id,
        discipline: nb.discipline,
        name: nb.name,
        subtitle: nb.subtitle,
        tec_link: nb.tecLink,
        error_notebook_link: nb.errorNotebookLink,
        favorite_questions_link: nb.favoriteQuestionsLink,
        law_link: nb.lawLink,
        obsidian_link: nb.obsidianLink,
        gemini_link_1: nb.geminiLink1,
        gemini_link_2: nb.geminiLink2,
        target_accuracy: nb.targetAccuracy,
        accuracy: nb.accuracy,
        weight: nb.weight,
        relevance: nb.relevance,
        trend: nb.trend,
        status: nb.status,
        week_id: nb.weekId,
        is_week_completed: nb.isWeekCompleted,
        last_practice: nb.lastPractice,
        next_review: nb.nextReview,
        accuracy_history: nb.accuracyHistory,
        notes: nb.notes,
        images: nb.images 
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
const GUEST_SEED_DATA = {
    // ... (Mantido igual)
    notebooks: [],
    cycles: [],
    activeCycleId: null,
    reports: [],
    protocol: [],
    framework: DEFAULT_FRAMEWORK,
    notes: []
};

interface StoreContextType {
  user: any;
  isGuest: boolean;
  loading: boolean;
  isSyncing: boolean;
  
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

const OPTIMIZED_COLUMNS = `
  id, discipline, name, subtitle, 
  tec_link, error_notebook_link, favorite_questions_link, law_link, obsidian_link, gemini_link_1, gemini_link_2,
  accuracy, target_accuracy, weight, relevance, trend, status, 
  week_id, is_week_completed, last_practice, next_review, accuracy_history, notes
`;

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true); 
  const [isSyncing, setIsSyncing] = useState(false);

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

  const fetchCloudData = async () => {
      setLoading(true);
      try {
          // 1. Garantir que temos o ID do usuário
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
              setLoading(false);
              return;
          }

          let notebooksData: any[] | null = null;
          try {
              const { data, error } = await supabase.from('notebooks').select(OPTIMIZED_COLUMNS);
              if (error) throw error;
              notebooksData = data;
          } catch (optimizedError) {
              const { data: fullData } = await supabase.from('notebooks').select('*');
              notebooksData = fullData;
          }

          const [
              { data: dbCycles },
              { data: dbReports },
              { data: dbProtocol },
              { data: dbNotes },
              { data: dbFramework }
          ] = await Promise.all([
              supabase.from('cycles').select('*'),
              supabase.from('reports').select('*'),
              supabase.from('protocol').select('*'),
              supabase.from('notes').select('*'),
              // Filtro EXPLÍCITO pelo ID do usuário
              supabase.from('frameworks').select('*').eq('user_id', currentUser.id).maybeSingle()
          ]);

          let validNotebookIds = new Set<string>();

          if (notebooksData) {
              const mappedNotebooks = notebooksData.map(mapNotebookFromDB);
              setNotebooks(mappedNotebooks);
              validNotebookIds = new Set(mappedNotebooks.map(n => n.id));
          }
          
          if (dbCycles && dbCycles.length > 0) {
              const mappedCycles = dbCycles.map(mapCycleFromDB).map(cycle => sanitizeCycleData(cycle, validNotebookIds));
              setCycles(mappedCycles);
              if (!activeCycleId) {
                  const sorted = [...mappedCycles].sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime());
                  setActiveCycleId(sorted[0].id);
              }
          } else {
              setCycles([]);
              if (!activeCycleId) setActiveCycleId(null);
          }

          if (dbReports) setReports(dbReports);
          if (dbProtocol) setProtocol(dbProtocol);
          if (dbNotes) setNotes(dbNotes.map(mapNoteFromDB));
          
          if (dbFramework) {
              console.log("[Store] Framework carregado:", dbFramework);
              setFramework(mapFrameworkFromDB(dbFramework));
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
            await fetchCloudData();
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
          setIsGuest(false);
          fetchCloudData();
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
      await set('athena_guest_db', GUEST_SEED_DATA);
      setLoading(false);
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
              const payload = mapCycleToDB(newCycle);
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
          try { await supabase.from('cycles').update({ config: newConfig }).eq('id', activeCycleId); } catch (e) { console.error(e); setCycles(previousCycles); }
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
              const payload = mapNotebookToDB(newNb);
              const { error } = await supabase.from('notebooks').insert(payload);
              if (error) throw error;
          } catch (e) { setNotebooks(previousNotebooks); alert("Erro ao salvar caderno."); }
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
          } catch (e) { setNotebooks(previousNotebooks); alert("Erro ao editar."); }
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
          try { await supabase.from('reports').insert(newReport); } catch (e) { console.error(e); setReports(previousReports); }
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
      if (!isGuest && user) { try { await supabase.from('protocol').insert(newItem); } catch(e) { console.error(e); setProtocol(previousProtocol); } }
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
              if (e.code === '42P01') {
                  alert("Erro: A tabela 'frameworks' não existe no Supabase. Execute o script SQL fornecido.");
              } else {
                  alert(`Erro ao salvar framework: ${e.message || 'Verifique sua conexão.'}`);
              }
          }
      }
  };

  const addNote = async () => {
      const newNote: Note = { id: generateId(), content: '', color: 'yellow', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const previousNotes = [...notes];
      setNotes(prev => [newNote, ...prev]);
      if (!isGuest && user) { try { const payload = mapNoteToDB(newNote); await supabase.from('notes').insert(payload); } catch (e) { console.error(e); setNotes(previousNotes); } }
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
      user, isGuest, loading, isSyncing,
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