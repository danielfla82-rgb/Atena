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
  const [loading, setLoading] = useState(true); // Default true to prevent flash
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

  // --- CLOUD SYNC LOGIC ---
  const fetchCloudData = async () => {
      setLoading(true);
      try {
          console.log("[System] Sincronizando dados da nuvem...");
          // Parallel fetch for speed
          const [
              { data: dbNotebooks },
              { data: dbCycles },
              { data: dbReports },
              { data: dbProtocol },
              { data: dbNotes },
              { data: dbFramework }
          ] = await Promise.all([
              supabase.from('notebooks').select('*'),
              supabase.from('cycles').select('*'),
              supabase.from('reports').select('*'),
              supabase.from('protocol').select('*'),
              supabase.from('notes').select('*'),
              supabase.from('frameworks').select('*').single()
          ]);

          if (dbNotebooks) {
              setNotebooks(dbNotebooks);
              // DIAGNOSTIC LOG: Check if custom fields exist in DB
              if (dbNotebooks.length > 0) {
                  const sample = dbNotebooks[0];
                  console.log("[DB Diagnostic] Sample Notebook Keys:", Object.keys(sample));
                  if (!('tecLink' in sample) && !('tec_link' in sample)) {
                      console.warn("[DB Warning] Coluna 'tecLink' não encontrada. Verifique se as colunas existem no Supabase.");
                  }
              }
          }
          
          if (dbCycles && dbCycles.length > 0) {
              setCycles(dbCycles);
              // Auto-select most recently accessed cycle if none selected
              if (!activeCycleId) {
                  const sorted = [...dbCycles].sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime());
                  setActiveCycleId(sorted[0].id);
              }
          } else {
              setCycles([]);
              if (!activeCycleId) setActiveCycleId(null);
          }

          if (dbReports) setReports(dbReports);
          if (dbProtocol) setProtocol(dbProtocol);
          if (dbNotes) setNotes(dbNotes);
          if (dbFramework) setFramework(dbFramework);

          console.log("[System] Dados carregados com sucesso.");
      } catch (error) {
          console.error("[System] Erro ao buscar dados da nuvem:", error);
      } finally {
          setLoading(false);
      }
  };

  // Initialize: Load Supabase or Migrated IndexedDB Data
  useEffect(() => {
    const init = async () => {
        setLoading(true);
        try {
            // 1. Check Supabase
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                setUser(session.user);
                setIsGuest(false);
                await fetchCloudData();
            } else {
                // 2. If no user, check Local Storage (Guest)
                const idbData = await get('athena_guest_db');
                if (idbData) {
                    setIsGuest(true);
                    restoreState(idbData);
                } else {
                    const lsData = localStorage.getItem('athena_guest_db');
                    if (lsData) {
                        console.log("[System] Migrando dados para armazenamento ilimitado (IndexedDB)...");
                        setIsGuest(true);
                        const parsed = JSON.parse(lsData);
                        restoreState(parsed);
                        await set('athena_guest_db', parsed);
                    }
                }
                setLoading(false); // Guest load finished
            }
        } catch (e) {
            console.error("[System] Erro na inicialização do storage:", e);
            setLoading(false); // Ensure loading stops even on error
        }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
          setIsGuest(false);
          fetchCloudData(); // Trigger fetch on explicit login
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

  // Persist Guest Data (Using IndexedDB for Unlimited Storage)
  useEffect(() => {
      if (isGuest && !loading) {
          const guestData = { notebooks, reports, protocol, framework, cycles, activeCycleId, notes };
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

  // --- ACTIONS WITH ROBUST SUPABASE PERSISTENCE & ROLLBACK ---

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
      
      const previousCycles = [...cycles];
      setCycles(prev => [...prev, newCycle]);
      setActiveCycleId(newCycle.id);

      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('cycles').insert(newCycle);
              if (error) throw error;
          } catch (e) {
              console.error("DB Error: Create Cycle", e);
              setCycles(previousCycles);
              alert("Erro ao criar ciclo na nuvem. Verifique sua conexão.");
          }
      }
  };

  const selectCycle = async (id: string) => {
      const now = new Date().toISOString();
      setActiveCycleId(id);
      setCycles(prev => prev.map(c => c.id === id ? { ...c, lastAccess: now } : c));

      if (!isGuest && user) {
          supabase.from('cycles').update({ lastAccess: now }).eq('id', id).then(({error}) => {
              if (error) console.error("Falha ao atualizar acesso do ciclo", error);
          });
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
              console.error("DB Error: Delete Cycle", e);
              setCycles(previousCycles);
              if (activeCycleId === id) setActiveCycleId(id);
              alert("Erro ao excluir ciclo. Tente novamente.");
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
              console.error("DB Error: Update Config", e);
              setCycles(previousCycles); // Rollback optimistic update
          }
      }
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
      
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => [...prev, newNb]);

      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('notebooks').insert(newNb);
              if (error) throw error;
          } catch (e) {
              console.error("DB Error: Add Notebook", e);
              setNotebooks(previousNotebooks); // Rollback
              alert("Erro ao salvar caderno. Tente novamente.");
          }
      }
  };

  const editNotebook = async (id: string, data: Partial<Notebook>) => {
      const previousNotebooks = [...notebooks];
      setNotebooks(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));

      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('notebooks').update(data).eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error("DB Error: Edit Notebook", e);
              setNotebooks(previousNotebooks);
              alert("Erro de sincronização ao editar caderno.");
          }
      }
  };

  const deleteNotebook = async (id: string) => {
      const previousNotebooks = [...notebooks];
      const previousCycles = [...cycles];

      setNotebooks(prev => prev.filter(n => n.id !== id));
      
      let updatedCycles: Cycle[] = [];
      setCycles(prev => {
          updatedCycles = prev.map(c => {
              if (!c.schedule) return c;
              const newSchedule: any = {};
              Object.keys(c.schedule).forEach(weekId => {
                  newSchedule[weekId] = c.schedule![weekId].filter(s => s.notebookId !== id);
              });
              return { ...c, schedule: newSchedule };
          });
          return updatedCycles;
      });

      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('notebooks').delete().eq('id', id);
              if (error) throw error;
              
              // Sync cycle cleanup (non-critical if fails, but good for integrity)
              if (activeCycleId) {
                  const currentCycle = updatedCycles.find(c => c.id === activeCycleId);
                  if (currentCycle) {
                      await supabase.from('cycles').update({ schedule: currentCycle.schedule }).eq('id', activeCycleId);
                  }
              }
          } catch (e) {
              console.error("DB Error: Delete Notebook", e);
              setNotebooks(previousNotebooks);
              setCycles(previousCycles);
              alert("Erro ao excluir caderno. O servidor rejeitou a operação.");
          }
      }
  };

  const updateNotebookAccuracy = async (id: string, accuracy: number) => {
      let updatedNb: Notebook | undefined;
      const previousNotebooks = [...notebooks];

      setNotebooks(prev => prev.map(n => {
         if (n.id !== id) return n;
         const prevHistory = n.accuracyHistory || [];
         const history = [...prevHistory, { date: new Date().toISOString(), accuracy }];
         const updated = { ...n, accuracy, accuracyHistory: history.slice(-10), lastPractice: new Date().toISOString() };
         updatedNb = updated;
         return updated;
      }));

      if (!isGuest && user && updatedNb) {
          try {
              const { error } = await supabase.from('notebooks').update({
                  accuracy: updatedNb.accuracy,
                  accuracyHistory: updatedNb.accuracyHistory,
                  lastPractice: updatedNb.lastPractice
              }).eq('id', id);
              
              if (error) throw error;
          } catch (e) {
              console.error("DB Error: Update Accuracy", e);
              setNotebooks(previousNotebooks);
          }
      }
  };

  const updateCycleSchedule = async (cycleId: string, modifier: (schedule: Record<string, ScheduleItem[]>) => Record<string, ScheduleItem[]>) => {
      let newScheduleState: Record<string, ScheduleItem[]> | null = null;
      const previousCycles = [...cycles];

      setCycles(prev => {
          const newCycles = prev.map(c => {
              if (c.id !== cycleId) return c;
              const newSchedule = modifier({ ...(c.schedule || {}) });
              newScheduleState = newSchedule;
              return { ...c, schedule: newSchedule };
          });
          return newCycles;
      });

      // Side Effect: Sync to Cloud outside state setter to prevent closure staleness
      if (!isGuest && user && newScheduleState) {
          try {
              const { error } = await supabase.from('cycles').update({ schedule: newScheduleState }).eq('id', cycleId);
              if (error) throw error;
          } catch (e) {
              console.error("DB Error: Update Schedule", e);
              setCycles(previousCycles); // Rollback
              alert("Erro de conexão. A alteração no planejamento não foi salva.");
          }
      }
  };

  const moveNotebookToWeek = async (notebookId: string, weekId: string) => {
      if (!activeCycleId) {
          editNotebook(notebookId, { weekId });
          return;
      }
      
      const newSlot: ScheduleItem = {
          instanceId: generateId(),
          notebookId,
          completed: false
      };

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
      if (!activeCycleId) {
          const nb = notebooks.find(n => n.id === instanceId.replace('-legacy', ''));
          if(nb) editNotebook(nb.id, { isWeekCompleted: !nb.isWeekCompleted });
          return;
      }

      await updateCycleSchedule(activeCycleId, (schedule) => {
          if (!schedule[weekId]) return schedule;
          schedule[weekId] = schedule[weekId].map(s => 
              s.instanceId === instanceId ? { ...s, completed: !s.completed } : s
          );
          return schedule;
      });
  };

  const removeSlotFromWeek = async (instanceId: string, weekId: string) => {
      if (!activeCycleId) {
           const nb = notebooks.find(n => n.id === instanceId.replace('-legacy', ''));
           if(nb) editNotebook(nb.id, { weekId: null });
           return;
      }

      await updateCycleSchedule(activeCycleId, (schedule) => {
          if (!schedule[weekId]) return schedule;
          schedule[weekId] = schedule[weekId].filter(s => s.instanceId !== instanceId);
          return schedule;
      });
  };

  const saveReport = async (reportData: Omit<SavedReport, 'id' | 'date'>) => {
      const newReport: SavedReport = {
          id: generateId(),
          date: new Date().toISOString(),
          ...reportData
      };
      
      const previousReports = [...reports];
      setReports(prev => [newReport, ...prev]);

      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('reports').insert(newReport);
              if (error) throw error;
          } catch (e) {
              console.error("DB Error: Save Report", e);
              setReports(previousReports);
              alert("Erro ao salvar relatório.");
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
              console.error("DB Error: Delete Report", e);
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
              const { error } = await supabase.from('protocol').insert(newItem);
              if (error) throw error;
          } catch(e) {
              console.error("DB Error: Add Protocol", e);
              setProtocol(previousProtocol);
          }
      }
  };

  const toggleProtocolItem = async (id: string) => {
      let updatedItem: ProtocolItem | undefined;
      const previousProtocol = [...protocol];
      
      setProtocol(prev => prev.map(p => {
          if (p.id === id) {
              updatedItem = { ...p, checked: !p.checked };
              return updatedItem;
          }
          return p;
      }));

      if (!isGuest && user && updatedItem) {
          try {
              const { error } = await supabase.from('protocol').update({ checked: updatedItem.checked }).eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error("DB Error: Toggle Protocol", e);
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
              setProtocol(previousProtocol);
          }
      }
  };

  const updateFramework = async (data: FrameworkData) => {
      const previousFramework = { ...framework };
      setFramework(data);
      if (!isGuest && user) {
          try {
              const { data: existing } = await supabase.from('frameworks').select('id').single();
              if (existing) {
                  await supabase.from('frameworks').update(data).eq('id', existing.id);
              } else {
                  await supabase.from('frameworks').insert(data);
              }
          } catch (e) {
              console.error("DB Error: Update Framework", e);
              setFramework(previousFramework);
          }
      }
  };

  const addNote = async () => {
      const newNote: Note = {
          id: generateId(),
          content: '',
          color: 'yellow',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };
      const previousNotes = [...notes];
      setNotes(prev => [newNote, ...prev]);
      
      if (!isGuest && user) {
          try {
              const { error } = await supabase.from('notes').insert(newNote);
              if (error) throw error;
          } catch (e) {
              console.error("DB Error: Add Note", e);
              setNotes(previousNotes);
          }
      }
  };

  const updateNote = async (id: string, content: string, color?: Note['color']) => {
      const now = new Date().toISOString();
      const previousNotes = [...notes];
      
      setNotes(prev => prev.map(n => n.id === id ? { 
          ...n, 
          content, 
          color: color || n.color,
          updatedAt: now
      } : n));

      if (!isGuest && user) {
          const payload: any = { content, updatedAt: now };
          if (color) payload.color = color;
          try {
              const { error } = await supabase.from('notes').update(payload).eq('id', id);
              if (error) throw error;
          } catch(e) {
              console.error("DB Error: Update Note", e);
              // Optionally rollback, but for notes real-time typing might be aggressive to rollback on every char. 
              // Leaving as warn for now or could implement debounced sync properly.
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
              console.error("DB Error: Delete Note", e);
              setNotes(previousNotes);
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