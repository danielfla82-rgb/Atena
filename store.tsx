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

// --- GUEST SEED DATA (DEMO) ---
const TODAY_ISO = new Date().toISOString();
const PAST_7_DAYS = new Date(Date.now() - 7 * 86400000).toISOString();
const PAST_14_DAYS = new Date(Date.now() - 14 * 86400000).toISOString();

const GUEST_SEED_DATA = {
    notebooks: [
      { 
          id: 'nb1', discipline: 'Direito Constitucional', name: 'Controle de Constitucionalidade', subtitle: 'Concentrado vs Difuso', 
          accuracy: 85, targetAccuracy: 90, weight: Weight.MUITO_ALTO, relevance: Relevance.ALTISSIMA, trend: Trend.ALTA, status: NotebookStatus.REVIEWING, weekId: null, 
          image: 'https://i.postimg.cc/Bnq7x0wz/law.jpg',
          accuracyHistory: [{date: PAST_14_DAYS, accuracy: 60}, {date: PAST_7_DAYS, accuracy: 75}, {date: TODAY_ISO, accuracy: 85}]
      },
      { 
          id: 'nb2', discipline: 'Contabilidade Geral', name: 'Demonstração do Resultado (DRE)', subtitle: 'Receita Líquida e Deduções', 
          accuracy: 65, targetAccuracy: 85, weight: Weight.ALTO, relevance: Relevance.ALTA, trend: Trend.ESTAVEL, status: NotebookStatus.THEORY_DONE, weekId: null,
          accuracyHistory: [{date: PAST_7_DAYS, accuracy: 50}, {date: TODAY_ISO, accuracy: 65}]
      },
      { 
          id: 'nb3', discipline: 'Direito Administrativo', name: 'Licitações (Lei 14.133)', subtitle: 'Modalidades e Dispensa', 
          accuracy: 92, targetAccuracy: 90, weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ALTA, status: NotebookStatus.MASTERED, weekId: null,
          accuracyHistory: [{date: PAST_14_DAYS, accuracy: 80}, {date: TODAY_ISO, accuracy: 92}]
      },
      { 
          id: 'nb4', discipline: 'Auditoria', name: 'Testes de Observância', subtitle: 'Procedimentos Analíticos', 
          accuracy: 45, targetAccuracy: 80, weight: Weight.BAIXO, relevance: Relevance.BAIXA, trend: Trend.ESTAVEL, status: NotebookStatus.NOT_STARTED, weekId: null 
      },
      { 
          id: 'nb5', discipline: 'Português', name: 'Sintaxe do Período Composto', subtitle: 'Orações Subordinadas', 
          accuracy: 78, targetAccuracy: 90, weight: Weight.ALTO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, status: NotebookStatus.REVIEWING, weekId: null,
          accuracyHistory: [{date: TODAY_ISO, accuracy: 78}]
      },
      { 
          id: 'nb6', discipline: 'Raciocínio Lógico', name: 'Análise Combinatória', subtitle: 'Permutação e Arranjo', 
          accuracy: 55, targetAccuracy: 80, weight: Weight.MEDIO, relevance: Relevance.ALTA, trend: Trend.BAIXA, status: NotebookStatus.THEORY_DONE, weekId: null 
      },
    ],
    cycles: [
      {
        id: 'cycle-demo',
        name: 'Auditor Fiscal 2025 (Demo)',
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        config: { ...DEFAULT_CONFIG, targetRole: 'Auditor Fiscal', weeksUntilExam: 16, studyPace: 'Avançado', examDate: new Date(new Date().getTime() + 120 * 24 * 60 * 60 * 1000).toISOString() },
        planning: {},
        weeklyCompletion: {},
        schedule: {
          'week-1': [
             { instanceId: 'inst-1', notebookId: 'nb1', completed: true },
             { instanceId: 'inst-2', notebookId: 'nb2', completed: true },
             { instanceId: 'inst-3', notebookId: 'nb3', completed: true },
             { instanceId: 'inst-4', notebookId: 'nb5', completed: true },
             { instanceId: 'inst-5', notebookId: 'nb1', completed: false }, // Re-review
          ],
          'week-2': [
             { instanceId: 'inst-6', notebookId: 'nb4', completed: false },
             { instanceId: 'inst-7', notebookId: 'nb6', completed: false },
             { instanceId: 'inst-8', notebookId: 'nb2', completed: false },
          ]
        }
      }
    ],
    activeCycleId: 'cycle-demo',
    reports: [],
    protocol: [
        { id: 'p1', name: 'Cafeína', dosage: '200mg', time: '07:00', type: 'Suplemento', checked: true },
        { id: 'p2', name: 'Creatina', dosage: '5g', time: '07:00', type: 'Suplemento', checked: false }
    ],
    framework: { values: 'Liberdade, Excelência', dream: 'Aprovação na Receita', motivation: 'Estabilidade Financeira', action: '4h líquidas/dia', habit: 'Acordar 05:00' },
    notes: [{ id: 'note1', content: 'Revisar súmulas vinculantes do STF antes da prova.', color: 'yellow', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
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

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Data State
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [protocol, setProtocol] = useState<ProtocolItem[]>([]);
  const [framework, setFramework] = useState<FrameworkData>(DEFAULT_FRAMEWORK);
  const [notes, setNotes] = useState<Note[]>([]);

  // UI State
  const [activeSession, setActiveSession] = useState<Notebook | null>(null);
  const [pendingCreateData, setPendingCreateData] = useState<Partial<Notebook> | null>(null);
  const [focusedNotebookId, setFocusedNotebookId] = useState<string | null>(null);

  // Derived Config
  const config = cycles.find(c => c.id === activeCycleId)?.config || DEFAULT_CONFIG;

  // Initialize: Load Supabase or Migrated IndexedDB Data
  useEffect(() => {
    const init = async () => {
        setLoading(true);
        try {
            // 1. Check Supabase
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            // 2. If no user, check Local Storage (Guest)
            if (!session?.user) {
                // Try IndexedDB first (The new High Capacity Storage)
                const idbData = await get('athena_guest_db');
                
                if (idbData) {
                    // Data found in High Capacity Storage
                    setIsGuest(true);
                    restoreState(idbData);
                } else {
                    // Fallback: Check for legacy LocalStorage data to migrate
                    const lsData = localStorage.getItem('athena_guest_db');
                    if (lsData) {
                        console.log("[System] Migrando dados para armazenamento ilimitado (IndexedDB)...");
                        setIsGuest(true);
                        const parsed = JSON.parse(lsData);
                        restoreState(parsed);
                        await set('athena_guest_db', parsed);
                    } else {
                        // NO DATA FOUND? THIS IS A NEW GUEST. DO NOT LOAD YET.
                        // Wait for explicit "Enter Guest Mode"
                    }
                }
            }
        } catch (e) {
            console.error("[System] Erro na inicialização do storage:", e);
        } finally {
            setLoading(false);
        }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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

  // Persist Guest Data (Using IndexedDB for Unlimited Storage)
  useEffect(() => {
      if (isGuest && !loading) {
          const guestData = { notebooks, reports, protocol, framework, cycles, activeCycleId, notes };
          // Save async to IndexedDB (No 5MB limit)
          set('athena_guest_db', guestData).catch(e => {
              console.error("[System] Falha ao salvar no disco:", e);
          });
      }
  }, [notebooks, reports, protocol, framework, cycles, activeCycleId, notes, isGuest, loading]);

  const enterGuestMode = async () => {
      setIsGuest(true);
      setLoading(true);
      try {
          const idbData = await get('athena_guest_db');
          if (idbData) {
              restoreState(idbData);
          } else {
              // INJECT SEED DATA FOR NEW GUESTS
              console.log("[System] Iniciando modo visitante com dados de exemplo...");
              restoreState(GUEST_SEED_DATA);
              await set('athena_guest_db', GUEST_SEED_DATA);
          }
      } catch(e) {
          console.error("Erro ao entrar modo visitante", e);
      } finally {
          setLoading(false);
      }
  };

  const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  // --- ACTIONS ---

  const createCycle = async (name: string, role: string) => {
      const newCycle: Cycle = {
          id: generateId(),
          name,
          createdAt: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          config: { ...DEFAULT_CONFIG, targetRole: role },
          planning: {},
          weeklyCompletion: {},
          schedule: {}
      };
      setCycles(prev => [...prev, newCycle]);
      setActiveCycleId(newCycle.id);
  };

  const selectCycle = (id: string) => {
      setActiveCycleId(id);
      setCycles(prev => prev.map(c => c.id === id ? { ...c, lastAccess: new Date().toISOString() } : c));
  };

  const deleteCycle = async (id: string) => {
      setCycles(prev => prev.filter(c => c.id !== id));
      if (activeCycleId === id) setActiveCycleId(null);
  };

  const updateConfig = async (newConfig: AthensConfig) => {
      if (!activeCycleId) return;
      setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, config: newConfig } : c));
  };

  const addNotebook = async (notebook: Partial<Notebook>) => {
      const newNb: Notebook = {
          id: generateId(),
          discipline: notebook.discipline || 'Geral',
          name: notebook.name || 'Novo Tópico',
          subtitle: notebook.subtitle || '',
          accuracy: notebook.accuracy || 0,
          targetAccuracy: notebook.targetAccuracy || 90,
          weight: notebook.weight || Weight.MEDIO,
          relevance: notebook.relevance || Relevance.MEDIA,
          trend: notebook.trend || Trend.ESTAVEL,
          status: NotebookStatus.NOT_STARTED,
          images: notebook.images || [],
          notes: notebook.notes || '',
          ...notebook
      };
      setNotebooks(prev => [...prev, newNb]);
  };

  const editNotebook = async (id: string, data: Partial<Notebook>) => {
      setNotebooks(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
  };

  const deleteNotebook = async (id: string) => {
      setNotebooks(prev => prev.filter(n => n.id !== id));
      // Also remove from schedules
      setCycles(prev => prev.map(c => {
          if (!c.schedule) return c;
          const newSchedule: any = {};
          Object.keys(c.schedule).forEach(weekId => {
              newSchedule[weekId] = c.schedule![weekId].filter(s => s.notebookId !== id);
          });
          return { ...c, schedule: newSchedule };
      }));
  };

  const updateNotebookAccuracy = async (id: string, accuracy: number) => {
      setNotebooks(prev => prev.map(n => {
         if (n.id !== id) return n;
         const history = [...(n.accuracyHistory || []), { date: new Date().toISOString(), accuracy }];
         return { ...n, accuracy, accuracyHistory: history.slice(-10), lastPractice: new Date().toISOString() };
      }));
  };

  const moveNotebookToWeek = async (notebookId: string, weekId: string) => {
      if (!activeCycleId) {
          // Fallback legacy
          editNotebook(notebookId, { weekId });
          return;
      }
      
      const newSlot: ScheduleItem = {
          instanceId: generateId(),
          notebookId,
          completed: false
      };

      setCycles(prev => prev.map(c => {
          if (c.id !== activeCycleId) return c;
          const schedule = { ...(c.schedule || {}) };
          if (!schedule[weekId]) schedule[weekId] = [];
          schedule[weekId] = [...schedule[weekId], newSlot];
          return { ...c, schedule };
      }));
  };

  const reorderSlotInWeek = async (weekId: string, oldIndex: number, newIndex: number) => {
      if (!activeCycleId) return;
      setCycles(prev => prev.map(c => {
          if (c.id !== activeCycleId) return c;
          const schedule = { ...(c.schedule || {}) };
          if (!schedule[weekId]) return c;
          
          const items = [...schedule[weekId]];
          const [moved] = items.splice(oldIndex, 1);
          items.splice(newIndex, 0, moved);
          
          schedule[weekId] = items;
          return { ...c, schedule };
      }));
  };

  const toggleSlotCompletion = async (instanceId: string, weekId: string) => {
      if (!activeCycleId) {
          // Legacy check
          const nb = notebooks.find(n => n.id === instanceId.replace('-legacy', ''));
          if(nb) editNotebook(nb.id, { isWeekCompleted: !nb.isWeekCompleted });
          return;
      }

      setCycles(prev => prev.map(c => {
          if (c.id !== activeCycleId) return c;
          const schedule = { ...(c.schedule || {}) };
          if (!schedule[weekId]) return c;
          
          schedule[weekId] = schedule[weekId].map(s => 
              s.instanceId === instanceId ? { ...s, completed: !s.completed } : s
          );
          return { ...c, schedule };
      }));
  };

  const removeSlotFromWeek = async (instanceId: string, weekId: string) => {
      if (!activeCycleId) {
           const nb = notebooks.find(n => n.id === instanceId.replace('-legacy', ''));
           if(nb) editNotebook(nb.id, { weekId: null });
           return;
      }

      setCycles(prev => prev.map(c => {
          if (c.id !== activeCycleId) return c;
          const schedule = { ...(c.schedule || {}) };
          if (!schedule[weekId]) return c;
          
          schedule[weekId] = schedule[weekId].filter(s => s.instanceId !== instanceId);
          return { ...c, schedule };
      }));
  };

  const saveReport = async (reportData: Omit<SavedReport, 'id' | 'date'>) => {
      const newReport: SavedReport = {
          id: generateId(),
          date: new Date().toISOString(),
          ...reportData
      };
      setReports(prev => [newReport, ...prev]);
  };

  const deleteReport = async (id: string) => {
      setReports(prev => prev.filter(r => r.id !== id));
  };

  const addProtocolItem = async (item: Omit<ProtocolItem, 'id' | 'checked'>) => {
      setProtocol(prev => [...prev, { ...item, id: generateId(), checked: false }]);
  };

  const toggleProtocolItem = async (id: string) => {
      setProtocol(prev => prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  };

  const deleteProtocolItem = async (id: string) => {
      setProtocol(prev => prev.filter(p => p.id !== id));
  };

  const updateFramework = async (data: FrameworkData) => {
      setFramework(data);
  };

  const addNote = async () => {
      const newNote: Note = {
          id: generateId(),
          content: '',
          color: 'yellow',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };
      setNotes(prev => [newNote, ...prev]);
  };

  const updateNote = async (id: string, content: string, color?: Note['color']) => {
      setNotes(prev => prev.map(n => n.id === id ? { 
          ...n, 
          content, 
          color: color || n.color,
          updatedAt: new Date().toISOString() 
      } : n));
  };

  const deleteNote = async (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
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
      addNotebook, editNotebook, deleteNotebook, updateNotebookAccuracy,
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
