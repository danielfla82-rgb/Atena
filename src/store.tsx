import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Notebook, AthensConfig, Weight, Relevance, Trend, SavedReport, ProtocolItem, NotebookStatus, Cycle, FrameworkData, Note, ScheduleItem } from './types';
import { calculateNextReview } from './utils/algorithm';
import { supabase } from './lib/supabase';

// Valores padrão para UI inicial
const DEFAULT_CONFIG: AthensConfig = {
    targetRole: 'Auditor Fiscal',
    weeksUntilExam: 12,
    studyPace: 'Intermediário',
    weeklyPace: {},
    startDate: new Date().toISOString().split('T')[0],
    structuredEdital: [],
    algorithm: {
        baseIntervals: { learning: 1, reviewing: 3, mastering: 7, maintaining: 15 },
        multipliers: { relevanceExtreme: 0.7, relevanceHigh: 0.9, trendHigh: 0.9 }
    }
};

const DEFAULT_FRAMEWORK: FrameworkData = {
    values: '', dream: '', motivation: '', action: '', habit: ''
};

// --- GUEST MOCK DATA (SIMULAÇÃO FIXA) ---
const GUEST_CYCLE_ID = 'guest-cycle-demo';
const TODAY = new Date().toISOString().split('T')[0];

const GUEST_MOCK_DB = {
    config: {
        ...DEFAULT_CONFIG,
        targetRole: 'Auditor Fiscal da Receita Federal',
        examName: 'Receita Federal 2025',
        banca: 'FGV',
        examDate: new Date(new Date().setDate(new Date().getDate() + 90)).toISOString().split('T')[0], // +90 dias
        editalLink: 'https://conhecimento.fgv.br/concursos/rfb21',
    } as AthensConfig,
    framework: {
        values: 'Liberdade, Excelência, Segurança, Impacto',
        dream: 'Ser Auditor Fiscal e garantir estabilidade financeira para minha família viajando o mundo.',
        motivation: 'A dor do estudo é temporária, a glória do cargo é eterna.',
        action: 'Estudar 4 horas líquidas diárias com foco total (Deep Work).',
        habit: 'Acordar 05:00, Treino, Leitura, Bloco 1 de Estudos.'
    } as FrameworkData,
    protocol: [
        { id: 'p1', name: 'Creatina', dosage: '5g', time: '07:00', type: 'Suplemento', checked: true },
        { id: 'p2', name: 'Magnésio Treonato', dosage: '300mg', time: '21:00', type: 'Suplemento', checked: false },
    ] as ProtocolItem[],
    notebooks: [
        {
            id: 'n1', discipline: 'Direito Tributário', name: 'Sistema Tributário Nacional', subtitle: 'Limitações ao Poder de Tributar',
            weight: Weight.MUITO_ALTO, relevance: Relevance.ALTISSIMA, trend: Trend.ALTA,
            accuracy: 45, targetAccuracy: 95, status: NotebookStatus.THEORY_DONE,
            weekId: 'week-1', isWeekCompleted: false, nextReview: TODAY
        },
        {
            id: 'n2', discipline: 'Contabilidade Geral', name: 'Demonstração de Resultado (DRE)', subtitle: 'CPC 26',
            weight: Weight.MUITO_ALTO, relevance: Relevance.ALTA, trend: Trend.ESTAVEL,
            accuracy: 55, targetAccuracy: 90, status: NotebookStatus.REVIEWING,
            weekId: 'week-1', isWeekCompleted: false, lastPractice: TODAY
        },
        {
            id: 'n3', discipline: 'Direito Constitucional', name: 'Controle de Constitucionalidade', subtitle: 'Ações do Controle Concentrado',
            weight: Weight.ALTO, relevance: Relevance.ALTISSIMA, trend: Trend.ALTA,
            accuracy: 82, targetAccuracy: 92, status: NotebookStatus.REVIEWING,
            weekId: 'week-1', isWeekCompleted: true, nextReview: TODAY, lastPractice: TODAY
        },
        {
            id: 'n4', discipline: 'Português', name: 'Sintaxe do Período Composto', subtitle: 'Orações Subordinadas',
            weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL,
            accuracy: 95, targetAccuracy: 90, status: NotebookStatus.MASTERED,
            weekId: 'week-2', isWeekCompleted: false, nextReview: new Date(Date.now() + 86400000 * 5).toISOString()
        }
    ] as Notebook[],
    notes: [] as Note[]
};

interface StoreContextType {
  notebooks: Notebook[];
  config: AthensConfig;
  reports: SavedReport[];
  protocol: ProtocolItem[];
  cycles: Cycle[];
  activeCycleId: string | null;
  framework: FrameworkData;
  notes: Note[];
  loading: boolean;
  isSyncing: boolean; // NOVO: Indicador visual de salvamento
  user: any;
  isGuest: boolean;
  
  // Navigation State
  focusedNotebookId: string | null;
  setFocusedNotebookId: (id: string | null) => void;
  pendingCreateData: Partial<Notebook> | null;
  setPendingCreateData: (data: Partial<Notebook> | null) => void;
  
  enterGuestMode: () => void;
  exportDatabase: () => void; // NOVO: Backup Manual

  createCycle: (name: string, targetRole: string) => void;
  selectCycle: (id: string) => void;
  deleteCycle: (id: string) => void;

  updateConfig: (config: AthensConfig) => void;
  updateNotebookAccuracy: (id: string, newAccuracy: number) => void;
  
  // V4.2 SCHEDULING METHODS
  moveNotebookToWeek: (notebookId: string, weekId: string | null) => Promise<void>;
  toggleSlotCompletion: (instanceId: string, weekId: string) => void;
  removeSlotFromWeek: (instanceId: string, weekId: string) => void;

  getWildcardNotebook: () => Notebook | null;
  addNotebook: (notebook: Omit<Notebook, 'id'>) => Promise<void>;
  editNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  bulkUpdateNotebooks: (ids: string[], updates: Partial<Notebook> | 'DELETE') => void;
  saveReport: (report: Omit<SavedReport, 'id' | 'date'>) => void;
  deleteReport: (id: string) => void;
  addProtocolItem: (item: Omit<ProtocolItem, 'id' | 'checked'>) => void;
  toggleProtocolItem: (id: string) => void;
  deleteProtocolItem: (id: string) => void;
  updateFramework: (data: FrameworkData) => void;
  
  addNote: () => void;
  updateNote: (id: string, content: string, color?: Note['color']) => void;
  deleteNote: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); // NOVO
  const [isGuest, setIsGuest] = useState(false);

  // Global Data
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [protocol, setProtocol] = useState<ProtocolItem[]>([]);
  const [framework, setFramework] = useState<FrameworkData>(DEFAULT_FRAMEWORK);
  const [notes, setNotes] = useState<Note[]>([]);
  
  // Navigation State
  const [focusedNotebookId, setFocusedNotebookId] = useState<string | null>(null);
  const [pendingCreateData, setPendingCreateData] = useState<Partial<Notebook> | null>(null);
  
  // Cycle Management
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [config, setConfig] = useState<AthensConfig>(DEFAULT_CONFIG);

  // --- SAFETY LOCK: PREVENT AUTO-OVERWRITE ---
  const isDataLoaded = useRef(false);

  useEffect(() => {
    const initSession = async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;

            if (!isGuest) {
                setUser(data.session?.user ?? null);
                if (data.session?.user) {
                    if (!isDataLoaded.current) await fetchAllData(data.session.user.id);
                } else {
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error("Erro crítico na inicialização:", err);
            setLoading(false);
        }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isGuest) {
        setUser(session?.user ?? null);
        
        // CRITICAL FIX: Only fetch if we strictly haven't loaded data yet. 
        if (session?.user && !isDataLoaded.current) {
            fetchAllData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
            setNotebooks([]);
            setCycles([]);
            isDataLoaded.current = false;
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [isGuest]);

  useEffect(() => {
      if (isGuest) {
          const guestData = { notebooks, reports, protocol, framework, cycles, activeCycleId, config, notes };
          localStorage.setItem('athena_guest_db', JSON.stringify(guestData));
      }
  }, [notebooks, reports, protocol, framework, cycles, activeCycleId, config, notes, isGuest]);

  const enterGuestMode = () => {
      setLoading(true);
      setIsGuest(true);
      setUser({ id: 'guest', email: 'visitante@atena.os' });
      isDataLoaded.current = true;
      
      try {
        const savedData = localStorage.getItem('athena_guest_db');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            setNotebooks(parsed.notebooks || []);
            setReports(parsed.reports || []);
            setProtocol(parsed.protocol || []);
            setFramework(parsed.framework || DEFAULT_FRAMEWORK);
            setCycles(parsed.cycles || []);
            setActiveCycleId(parsed.activeCycleId || null);
            setConfig(parsed.config || DEFAULT_CONFIG);
            setNotes(parsed.notes || []);
        } else {
            setNotebooks(GUEST_MOCK_DB.notebooks);
            setProtocol(GUEST_MOCK_DB.protocol);
            setFramework(GUEST_MOCK_DB.framework);
            setNotes(GUEST_MOCK_DB.notes);
            setConfig(GUEST_MOCK_DB.config);
            
            // Create Guest Cycle with Schedule
            const schedule: Record<string, ScheduleItem[]> = {};
            GUEST_MOCK_DB.notebooks.forEach(nb => {
                if(nb.weekId) {
                    if(!schedule[nb.weekId]) schedule[nb.weekId] = [];
                    schedule[nb.weekId].push({
                        instanceId: crypto.randomUUID(),
                        notebookId: nb.id,
                        completed: !!nb.isWeekCompleted
                    });
                }
            });

            const demoCycle: Cycle = {
                id: GUEST_CYCLE_ID,
                name: 'Projeto Elite (Demo)',
                createdAt: new Date().toISOString(),
                lastAccess: new Date().toISOString(),
                config: GUEST_MOCK_DB.config,
                planning: {},
                weeklyCompletion: {},
                schedule: schedule
            };
            
            setCycles([demoCycle]);
            setActiveCycleId(demoCycle.id);
        }
      } catch (e) {
          console.error("Erro ao carregar dados locais", e);
      } finally {
          setLoading(false);
      }
  };

  const exportDatabase = () => {
      const data = {
          exportDate: new Date().toISOString(),
          version: "4.3.0",
          user: user?.email || "guest",
          notebooks,
          cycles,
          framework,
          protocol,
          reports,
          notes
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atena_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const fetchAllData = async (userId: string) => {
      setLoading(true);
      try {
          const results = await Promise.allSettled([
              supabase.from('notebooks').select('*').eq('user_id', userId),
              supabase.from('cycles').select('*').eq('user_id', userId),
              supabase.from('frameworks').select('*').eq('user_id', userId).single(),
              supabase.from('protocol_items').select('*').eq('user_id', userId),
              supabase.from('reports').select('*').eq('user_id', userId),
              supabase.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
          ]);

          if (results[0].status === 'fulfilled' && results[0].value.data) {
              const formattedNotebooks = results[0].value.data.map((n: any) => ({
                  ...n,
                  tecLink: n.tec_link,
                  lawLink: n.law_link,
                  obsidianLink: n.obsidian_link,
                  targetAccuracy: n.target_accuracy,
                  lastPractice: n.last_practice,
                  nextReview: n.next_review,
                  images: n.images || (n.image ? [n.image] : []),
                  accuracyHistory: n.accuracy_history || [] 
              }));
              setNotebooks(formattedNotebooks);
          }
          if (results[1].status === 'fulfilled' && results[1].value.data) {
              const formattedCycles = results[1].value.data.map((c: any) => {
                 let schedule = c.schedule || {};
                 
                 // --- SENIOR FIX: HYDRATION FALLBACK ---
                 // If 'schedule' is empty (legacy DB or missing column), reconstruct it from 'planning'
                 // This ensures the view is never empty if data exists in the old format.
                 if (Object.keys(schedule).length === 0 && c.planning && Object.keys(c.planning).length > 0) {
                     Object.entries(c.planning).forEach(([nbId, weekId]) => {
                         if (typeof weekId === 'string') {
                             if (!schedule[weekId]) schedule[weekId] = [];
                             // Prevent duplicates during hydration
                             if (!schedule[weekId].find((s: any) => s.notebookId === nbId)) {
                                 schedule[weekId].push({
                                     instanceId: crypto.randomUUID(),
                                     notebookId: nbId as string,
                                     completed: c.weekly_completion?.[nbId] || false
                                 });
                             }
                         }
                     });
                 }

                 return {
                    ...c, 
                    lastAccess: c.last_access, 
                    createdAt: c.created_at, 
                    weeklyCompletion: c.weekly_completion, 
                    schedule: schedule,
                    planning: c.planning // Keep legacy data reference
                 };
              });
              setCycles(formattedCycles);
              const lastActive = localStorage.getItem('athena_active_cycle');
              const target = formattedCycles.find((c: any) => c.id === lastActive) || formattedCycles[0];
              if(target) setActiveCycleId(target.id);
          }
          if (results[2].status === 'fulfilled' && results[2].value.data) setFramework(results[2].value.data);
          if (results[3].status === 'fulfilled' && results[3].value.data) setProtocol(results[3].value.data);
          if (results[4].status === 'fulfilled' && results[4].value.data) setReports(results[4].value.data);
          if (results[5].status === 'fulfilled' && results[5].value.data) {
              const fmtNotes = results[5].value.data.map((n: any) => ({ ...n, createdAt: n.created_at, updatedAt: n.updated_at }));
              setNotes(fmtNotes);
          }
          
          isDataLoaded.current = true; // Mark as loaded to prevent overwrites
          
      } catch (error) {
          console.error("Erro geral ao sincronizar dados:", error);
      } finally {
          setLoading(false);
      }
  };

  // Sync Cycle State to Notebooks (Visual Helper)
  useEffect(() => {
      if (activeCycleId && cycles.length > 0) {
          const activeCycle = cycles.find(c => c.id === activeCycleId);
          if (activeCycle) {
              setConfig({ ...DEFAULT_CONFIG, ...activeCycle.config });
              
              // Helper: Determine if a notebook is "allocated" at all in the schedule
              const allocationMap: Record<string, boolean> = {};
              if (activeCycle.schedule) {
                  Object.values(activeCycle.schedule).forEach((slots: ScheduleItem[]) => {
                      slots.forEach(slot => {
                          allocationMap[slot.notebookId] = true;
                      });
                  });
              } else {
                  // Legacy Fallback
                  Object.keys(activeCycle.planning).forEach(nbId => allocationMap[nbId] = true);
              }

              setNotebooks(prev => prev.map(nb => ({
                  ...nb,
                  // weekId is now just a flag to say "Hey, I'm in the plan" for the Library view
                  weekId: allocationMap[nb.id] ? 'allocated' : null
              })));

              if (!isGuest) {
                  localStorage.setItem('athena_active_cycle', activeCycleId);
                  if(user) supabase.from('cycles').update({ last_access: new Date().toISOString() }).eq('id', activeCycleId).then();
              }
          }
      }
  }, [activeCycleId, cycles, isGuest, user]);

  // --- ACTIONS ---
  const updateFramework = async (data: FrameworkData) => {
      setFramework(data);
      if(user && !isGuest) {
          setIsSyncing(true);
          await supabase.from('frameworks').upsert({ user_id: user.id, ...data });
          setIsSyncing(false);
      }
  };

  const createCycle = async (name: string, targetRole: string) => {
      const newCycle: Cycle = {
          id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), lastAccess: new Date().toISOString(),
          config: { ...DEFAULT_CONFIG, targetRole }, planning: {}, weeklyCompletion: {}, schedule: {}
      };
      setCycles(prev => [...prev, newCycle]);
      setActiveCycleId(newCycle.id);
      if(user && !isGuest) {
          setIsSyncing(true);
          await supabase.from('cycles').insert({
              id: newCycle.id, user_id: user.id, name: newCycle.name, config: newCycle.config,
              planning: newCycle.planning, weekly_completion: newCycle.weeklyCompletion, schedule: newCycle.schedule
          });
          setIsSyncing(false);
      }
  };

  const selectCycle = (id: string) => setActiveCycleId(id);
  const deleteCycle = async (id: string) => {
      setCycles(prev => prev.filter(c => c.id !== id));
      if(activeCycleId === id) setActiveCycleId(null);
      if(user && !isGuest) {
          setIsSyncing(true);
          await supabase.from('cycles').delete().eq('id', id);
          setIsSyncing(false);
      }
  };

  const syncCycleData = async (cycleId: string, updates: Partial<Cycle>) => {
      if(!user || isGuest) return;
      setIsSyncing(true);
      try {
          const payload: any = {};
          if(updates.config) payload.config = updates.config;
          if(updates.weeklyCompletion) payload.weekly_completion = updates.weeklyCompletion;
          
          if(updates.schedule) {
              payload.schedule = updates.schedule;
              
              // --- POLYFILL: BACKWARD COMPATIBILITY ---
              // Force saving to 'planning' column as well. 
              // This ensures that if 'schedule' column doesn't exist in DB, the data is saved in 'planning'.
              const derivedPlanning: Record<string, string | null> = {};
              Object.entries(updates.schedule).forEach(([weekId, slots]) => {
                  (slots as ScheduleItem[]).forEach(slot => {
                      derivedPlanning[slot.notebookId] = weekId;
                  });
              });
              payload.planning = derivedPlanning;
          } else if (updates.planning) {
              payload.planning = updates.planning;
          }

          const { error } = await supabase.from('cycles').update(payload).eq('id', cycleId);
          if (error) {
              console.error("Supabase Save Error:", error);
              // Do not throw to avoid breaking UI, assume offline mode or column missing
          }
      } catch (e: any) {
          console.error("Erro crítico ao sincronizar ciclo:", e);
      } finally {
          setIsSyncing(false);
      }
  };

  const updateConfig = (newConfig: AthensConfig) => {
      setConfig(newConfig);
      if(activeCycleId) {
          setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, config: newConfig } : c));
          syncCycleData(activeCycleId, { config: newConfig });
      }
  };

  // --- SCHEDULING (V4.2) ---

  const moveNotebookToWeek = async (notebookId: string, weekId: string | null) => {
      if (!activeCycleId) return;
      
      const cycle = cycles.find(c => c.id === activeCycleId);
      if (!cycle) return;

      // Deep copy to prevent mutation of state references
      const newSchedule: Record<string, ScheduleItem[]> = {};
      if (cycle.schedule) {
          Object.keys(cycle.schedule).forEach(key => {
              newSchedule[key] = [...(cycle.schedule![key] || [])];
          });
      }
      
      // If weekId is provided, we are ADDING a new slot
      if (weekId) {
          if (!newSchedule[weekId]) newSchedule[weekId] = [];
          
          const newSlot: ScheduleItem = {
              instanceId: crypto.randomUUID(), // Unique instance
              notebookId: notebookId,
              completed: false
          };
          
          newSchedule[weekId].push(newSlot);
      } 
      
      // Update State Immediately (Optimistic UI)
      setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, schedule: newSchedule } : c));
      
      // Persist (Robust Sync)
      await syncCycleData(activeCycleId, { schedule: newSchedule });
  };

  const toggleSlotCompletion = async (instanceId: string, weekId: string) => {
      if (!activeCycleId) return;
      const cycle = cycles.find(c => c.id === activeCycleId);
      if (!cycle || !cycle.schedule || !cycle.schedule[weekId]) return;

      const newSchedule = { ...cycle.schedule };
      // Copy array for specific week
      const currentWeek = [...(newSchedule[weekId] || [])];
      
      const slotIndex = currentWeek.findIndex(s => s.instanceId === instanceId);
      
      if (slotIndex !== -1) {
          const slot = currentWeek[slotIndex];
          currentWeek[slotIndex] = { ...slot, completed: !slot.completed };
          newSchedule[weekId] = currentWeek; // Assign new array to object

          setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, schedule: newSchedule } : c));
          await syncCycleData(activeCycleId, { schedule: newSchedule });
      }
  };

  const removeSlotFromWeek = async (instanceId: string, weekId: string) => {
      if (!activeCycleId) return;
      const cycle = cycles.find(c => c.id === activeCycleId);
      if (!cycle || !cycle.schedule || !cycle.schedule[weekId]) return;

      const newSchedule = { ...cycle.schedule };
      // Immutable filter
      newSchedule[weekId] = newSchedule[weekId].filter(s => s.instanceId !== instanceId);

      setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, schedule: newSchedule } : c));
      await syncCycleData(activeCycleId, { schedule: newSchedule });
  };

  // --- PERSISTENCE ACTIONS (LEGACY & NEW) ---

  const addNotebook = async (notebook: Omit<Notebook, 'id'>): Promise<void> => {
      const newNotebook: Notebook = { ...notebook, id: crypto.randomUUID() };
      setNotebooks(prev => [...prev, newNotebook]);

      if (user && !isGuest) {
          setIsSyncing(true);
          try {
              const payload = {
                  id: newNotebook.id,
                  user_id: user.id,
                  discipline: newNotebook.discipline,
                  name: newNotebook.name,
                  subtitle: newNotebook.subtitle || "",
                  tec_link: newNotebook.tecLink || null,
                  law_link: newNotebook.lawLink || null,
                  obsidian_link: newNotebook.obsidianLink || null,
                  weight: newNotebook.weight,
                  relevance: newNotebook.relevance,
                  trend: newNotebook.trend,
                  target_accuracy: newNotebook.targetAccuracy,
                  accuracy: newNotebook.accuracy,
                  status: newNotebook.status,
                  notes: newNotebook.notes || null,
                  image: newNotebook.images?.[0] || null,
                  images: newNotebook.images || [],
                  last_practice: newNotebook.lastPractice || null,
                  next_review: newNotebook.nextReview || null,
                  accuracy_history: newNotebook.accuracyHistory || [] 
              };

              const { error } = await supabase.from('notebooks').insert(payload);
              if (error) throw error;

          } catch (error: any) {
              console.error("Critical: Failed to save notebook", error);
              setNotebooks(prev => prev.filter(n => n.id !== newNotebook.id));
              alert(`Erro ao salvar: ${error.message}`);
          } finally {
              setIsSyncing(false);
          }
      }
  };

  const editNotebook = async (id: string, updates: Partial<Notebook>): Promise<void> => {
      const prevNotebook = notebooks.find(n => n.id === id);
      if (!prevNotebook) return;
      
      setNotebooks(prev => prev.map(nb => nb.id === id ? { ...nb, ...updates } : nb));

      if(user && !isGuest) {
          setIsSyncing(true);
          try {
              const dbUpdates: any = {};
              if(updates.name !== undefined) dbUpdates.name = updates.name;
              if(updates.discipline !== undefined) dbUpdates.discipline = updates.discipline;
              if(updates.tecLink !== undefined) dbUpdates.tec_link = updates.tecLink || null;
              if(updates.lawLink !== undefined) dbUpdates.law_link = updates.lawLink || null;
              if(updates.obsidianLink !== undefined) dbUpdates.obsidian_link = updates.obsidianLink || null;
              if(updates.targetAccuracy !== undefined) dbUpdates.target_accuracy = updates.targetAccuracy;
              if(updates.accuracy !== undefined) dbUpdates.accuracy = updates.accuracy;
              if(updates.lastPractice !== undefined) dbUpdates.last_practice = updates.lastPractice || null;
              if(updates.nextReview !== undefined) dbUpdates.next_review = updates.nextReview || null;
              if(updates.status !== undefined) dbUpdates.status = updates.status;
              if(updates.weight !== undefined) dbUpdates.weight = updates.weight;
              if(updates.relevance !== undefined) dbUpdates.relevance = updates.relevance;
              if(updates.trend !== undefined) dbUpdates.trend = updates.trend;
              if(updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
              if(updates.accuracyHistory !== undefined) dbUpdates.accuracy_history = updates.accuracyHistory;
              
              if(updates.images !== undefined) {
                  dbUpdates.images = updates.images || [];
                  dbUpdates.image = updates.images?.[0] || null;
              }
              
              if(Object.keys(dbUpdates).length > 0) {
                  const { error } = await supabase.from('notebooks').update(dbUpdates).eq('id', id);
                  if (error) throw error;
              }
          } catch (err: any) {
              console.error("Critical: Failed to update notebook", err);
              setNotebooks(prev => prev.map(n => n.id === id ? prevNotebook : n));
              alert("Falha de conexão. Alterações não salvas.");
          } finally {
              setIsSyncing(false);
          }
      }
  };

  const updateNotebookAccuracy = (id: string, newAccuracy: number) => {
    const nb = notebooks.find(n => n.id === id);
    if (!nb) return;
    const nextDate = calculateNextReview(newAccuracy, nb.relevance, nb.trend, config.algorithm);
    const today = new Date().toISOString();
    
    const newHistory = [...(nb.accuracyHistory || []), { date: today, accuracy: newAccuracy }];
    
    editNotebook(id, { 
        accuracy: newAccuracy, 
        lastPractice: today, 
        nextReview: nextDate.toISOString(),
        accuracyHistory: newHistory
    });
  };

  const deleteNotebook = async (id: string): Promise<void> => {
      const prevNotebook = notebooks.find(n => n.id === id);
      setNotebooks(prev => prev.filter(n => n.id !== id));
      
      if(user && !isGuest) {
          setIsSyncing(true);
          try {
              const { error } = await supabase.from('notebooks').delete().eq('id', id);
              if (error) throw error;
          } catch (err) {
              console.error("Delete failed", err);
              if (prevNotebook) setNotebooks(prev => [...prev, prevNotebook]);
              alert("Erro ao excluir. Tente novamente.");
          } finally {
              setIsSyncing(false);
          }
      }
  };

  const bulkUpdateNotebooks = async (ids: string[], updates: Partial<Notebook> | 'DELETE') => {
      if (updates === 'DELETE') {
          setNotebooks(prev => prev.filter(nb => !ids.includes(nb.id)));
          if(user && !isGuest) {
              setIsSyncing(true);
              await supabase.from('notebooks').delete().in('id', ids);
              setIsSyncing(false);
          }
      } else {
          setNotebooks(prev => prev.map(nb => ids.includes(nb.id) ? { ...nb, ...updates } : nb));
          if(user && !isGuest) ids.forEach(id => editNotebook(id, updates));
      }
  };

  const getWildcardNotebook = () => {
    const today = new Date().toISOString();
    const dueItems = notebooks.filter(nb => nb.nextReview && nb.nextReview <= today && nb.discipline !== 'Revisão Geral');
    dueItems.sort((a, b) => (a.weight === Weight.MUITO_ALTO ? -1 : 1));
    return dueItems.length > 0 ? dueItems[0] : null;
  };

  const addProtocolItem = async (item: Omit<ProtocolItem, 'id' | 'checked'>) => {
      const newItem = { ...item, id: crypto.randomUUID(), checked: false };
      setProtocol(prev => [...prev, newItem]);
      if(user && !isGuest) {
          setIsSyncing(true);
          await supabase.from('protocol_items').insert({ ...newItem, user_id: user.id });
          setIsSyncing(false);
      }
  };
  
  const toggleProtocolItem = async (id: string) => {
      const item = protocol.find(i => i.id === id);
      if(item && user) {
          const newItem = { ...item, checked: !item.checked };
          setProtocol(prev => prev.map(i => i.id === id ? newItem : i));
          if (!isGuest) {
              setIsSyncing(true);
              await supabase.from('protocol_items').update({ checked: newItem.checked }).eq('id', id);
              setIsSyncing(false);
          }
      }
  };

  const deleteProtocolItem = async (id: string) => {
      setProtocol(prev => prev.filter(i => i.id !== id));
      if(user && !isGuest) {
          setIsSyncing(true);
          await supabase.from('protocol_items').delete().eq('id', id);
          setIsSyncing(false);
      }
  };

  const saveReport = async (report: Omit<SavedReport, 'id' | 'date'>) => {
      const newReport = { ...report, id: crypto.randomUUID(), date: new Date().toISOString() };
      setReports(prev => [newReport, ...prev]);
      if(user && !isGuest) {
          setIsSyncing(true);
          await supabase.from('reports').insert({ ...newReport, user_id: user.id });
          setIsSyncing(false);
      }
  };

  const deleteReport = async (id: string) => {
      setReports(prev => prev.filter(r => r.id !== id));
      if(user && !isGuest) {
          setIsSyncing(true);
          await supabase.from('reports').delete().eq('id', id);
          setIsSyncing(false);
      }
  };

  const addNote = async () => {
      const newNote: Note = { id: crypto.randomUUID(), content: '', color: 'yellow', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setNotes(prev => [newNote, ...prev]);
      if(user && !isGuest) {
          setIsSyncing(true);
          await supabase.from('notes').insert({ id: newNote.id, user_id: user.id, content: '', color: 'yellow' });
          setIsSyncing(false);
      }
  };

  const updateNote = async (id: string, content: string, color?: Note['color']) => {
      const updatedAt = new Date().toISOString();
      setNotes(prev => prev.map(n => n.id === id ? { ...n, content, color: color || n.color, updatedAt } : n));
      if(user && !isGuest) {
          // Notas geralmente não precisam de spinner de sync intrusivo, mas é bom ter
          const payload: any = { content, updated_at: updatedAt };
          if(color) payload.color = color;
          await supabase.from('notes').update(payload).eq('id', id);
      }
  };

  const deleteNote = async (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
      if(user && !isGuest) {
          setIsSyncing(true);
          await supabase.from('notes').delete().eq('id', id);
          setIsSyncing(false);
      }
  };

  return (
    <StoreContext.Provider value={{ 
      notebooks, config, reports, protocol, cycles, activeCycleId, framework, notes, loading, isSyncing, user, isGuest,
      focusedNotebookId, setFocusedNotebookId, pendingCreateData, setPendingCreateData,
      enterGuestMode, exportDatabase, createCycle, selectCycle, deleteCycle, updateConfig, updateNotebookAccuracy, 
      moveNotebookToWeek, toggleSlotCompletion, removeSlotFromWeek,
      getWildcardNotebook, addNotebook, editNotebook, deleteNotebook, bulkUpdateNotebooks, saveReport, deleteReport,
      addProtocolItem, toggleProtocolItem, deleteProtocolItem, updateFramework, addNote, updateNote, deleteNote
    }}>
      {children}
    </StoreContext.Provider>
  );
};
