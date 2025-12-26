
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notebook, AthensConfig, Weight, Relevance, Trend, SavedReport, ProtocolItem, NotebookStatus, Cycle, FrameworkData } from './types';
import { calculateNextReview } from './utils/algorithm';
import { supabase } from './lib/supabase';

// Valores padrão para UI inicial
const DEFAULT_CONFIG: AthensConfig = {
    targetRole: 'Auditor Fiscal',
    weeksUntilExam: 12,
    studyPace: 'Intermediário',
    startDate: new Date().toISOString().split('T')[0],
    algorithm: {
        baseIntervals: { learning: 1, reviewing: 3, mastering: 7, maintaining: 15 },
        multipliers: { relevanceExtreme: 0.7, relevanceHigh: 0.9, trendHigh: 0.9 }
    }
};

const DEFAULT_FRAMEWORK: FrameworkData = {
    values: '', dream: '', motivation: '', action: '', habit: ''
};

interface StoreContextType {
  notebooks: Notebook[];
  config: AthensConfig;
  reports: SavedReport[];
  protocol: ProtocolItem[];
  cycles: Cycle[];
  activeCycleId: string | null;
  framework: FrameworkData;
  loading: boolean;
  user: any;
  isGuest: boolean;
  
  enterGuestMode: () => void;

  createCycle: (name: string, targetRole: string) => void;
  selectCycle: (id: string) => void;
  deleteCycle: (id: string) => void;

  updateConfig: (config: AthensConfig) => void;
  updateNotebookAccuracy: (id: string, newAccuracy: number) => void;
  moveNotebookToWeek: (id: string, weekId: string | null) => void;
  getWildcardNotebook: () => Notebook | null;
  addNotebook: (notebook: Omit<Notebook, 'id'>) => void;
  editNotebook: (id: string, updates: Partial<Notebook>) => void;
  deleteNotebook: (id: string) => void;
  bulkUpdateNotebooks: (ids: string[], updates: Partial<Notebook> | 'DELETE') => void;
  saveReport: (report: Omit<SavedReport, 'id' | 'date'>) => void;
  deleteReport: (id: string) => void;
  addProtocolItem: (item: Omit<ProtocolItem, 'id' | 'checked'>) => void;
  toggleProtocolItem: (id: string) => void;
  deleteProtocolItem: (id: string) => void;
  updateFramework: (data: FrameworkData) => void;
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
  const [isGuest, setIsGuest] = useState(false);

  // Global Data
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [protocol, setProtocol] = useState<ProtocolItem[]>([]);
  const [framework, setFramework] = useState<FrameworkData>(DEFAULT_FRAMEWORK);
  
  // Cycle Management
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [config, setConfig] = useState<AthensConfig>(DEFAULT_CONFIG);

  // --- 1. AUTH & INITIAL FETCH ---
  useEffect(() => {
    const initSession = async () => {
        try {
            // Verificar sessão atual
            const { data, error } = await supabase.auth.getSession();
            
            if (error) throw error;

            if (!isGuest) {
                setUser(data.session?.user ?? null);
                if (data.session?.user) {
                    await fetchAllData(data.session.user.id);
                } else {
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error("Erro crítico na inicialização (Verifique sua chave Supabase):", err);
            // IMPORTANTE: Se der erro (ex: chave inválida), paramos o loading 
            // para permitir que o usuário use o Modo Visitante.
            setLoading(false);
        }
    };

    initSession();

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isGuest) {
        setUser(session?.user ?? null);
        if (session?.user) {
            fetchAllData(session.user.id);
        } else {
            setNotebooks([]);
            setCycles([]);
            // Não forçamos loading false aqui pois o initSession cuida do load inicial
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [isGuest]);

  // --- GUEST MODE PERSISTENCE ---
  useEffect(() => {
      if (isGuest) {
          const guestData = {
              notebooks,
              reports,
              protocol,
              framework,
              cycles,
              activeCycleId,
              config
          };
          localStorage.setItem('athena_guest_db', JSON.stringify(guestData));
      }
  }, [notebooks, reports, protocol, framework, cycles, activeCycleId, config, isGuest]);

  const enterGuestMode = () => {
      setLoading(true);
      setIsGuest(true);
      setUser({ id: 'guest', email: 'visitante@offline.mode' });
      
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
        } else {
            setNotebooks([]);
            setCycles([]);
        }
      } catch (e) {
          console.error("Erro ao carregar dados locais", e);
      } finally {
          setLoading(false);
      }
  };

  const fetchAllData = async (userId: string) => {
      setLoading(true);
      try {
          const [nbRes, cyRes, frRes, prRes, rpRes] = await Promise.all([
              supabase.from('notebooks').select('*').eq('user_id', userId),
              supabase.from('cycles').select('*').eq('user_id', userId),
              supabase.from('frameworks').select('*').eq('user_id', userId).single(),
              supabase.from('protocol_items').select('*').eq('user_id', userId),
              supabase.from('reports').select('*').eq('user_id', userId)
          ]);

          if(nbRes.data) {
              const formattedNotebooks = nbRes.data.map((n: any) => ({
                  ...n,
                  tecLink: n.tec_link,
                  obsidianLink: n.obsidian_link,
                  targetAccuracy: n.target_accuracy,
                  lastPractice: n.last_practice,
                  nextReview: n.next_review
              }));
              setNotebooks(formattedNotebooks);
          }

          if(cyRes.data && cyRes.data.length > 0) {
              const formattedCycles = cyRes.data.map((c: any) => ({
                 ...c,
                 lastAccess: c.last_access,
                 createdAt: c.created_at,
                 weeklyCompletion: c.weekly_completion
              }));
              setCycles(formattedCycles);
              const lastActive = localStorage.getItem('athena_active_cycle');
              const target = formattedCycles.find((c: any) => c.id === lastActive) || formattedCycles[0];
              setActiveCycleId(target.id);
          } else {
              setCycles([]);
          }

          if(frRes.data) {
              setFramework({
                  values: frRes.data.values || '',
                  dream: frRes.data.dream || '',
                  motivation: frRes.data.motivation || '',
                  action: frRes.data.action || '',
                  habit: frRes.data.habit || ''
              });
          }

          if(prRes.data) setProtocol(prRes.data);
          if(rpRes.data) setReports(rpRes.data);

      } catch (error) {
          console.error("Erro ao sincronizar dados:", error);
      } finally {
          setLoading(false);
      }
  };

  // --- CYCLE SWITCHING LOGIC ---
  useEffect(() => {
      if (activeCycleId && cycles.length > 0) {
          const activeCycle = cycles.find(c => c.id === activeCycleId);
          if (activeCycle) {
              setConfig(activeCycle.config);
              
              setNotebooks(prev => prev.map(nb => ({
                  ...nb,
                  weekId: activeCycle.planning[nb.id] || null,
                  isWeekCompleted: activeCycle.weeklyCompletion?.[nb.id] || false
              })));
              
              if (!isGuest) {
                  localStorage.setItem('athena_active_cycle', activeCycleId);
                  if(user) {
                      supabase.from('cycles')
                        .update({ last_access: new Date().toISOString() })
                        .eq('id', activeCycleId)
                        .then();
                  }
              }
          }
      }
  }, [activeCycleId, cycles, isGuest, user]);

  // --- ACTIONS ---

  const updateFramework = async (data: FrameworkData) => {
      setFramework(data);
      if(user && !isGuest) {
          await supabase.from('frameworks').upsert({ user_id: user.id, ...data });
      }
  };

  const createCycle = async (name: string, targetRole: string) => {
      const newCycle: Cycle = {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          config: { ...DEFAULT_CONFIG, targetRole },
          planning: {},
          weeklyCompletion: {}
      };

      setCycles(prev => [...prev, newCycle]);
      setActiveCycleId(newCycle.id);

      if(user && !isGuest) {
          await supabase.from('cycles').insert({
              id: newCycle.id,
              user_id: user.id,
              name: newCycle.name,
              config: newCycle.config,
              planning: newCycle.planning,
              weekly_completion: newCycle.weeklyCompletion
          });
      }
  };

  const selectCycle = (id: string) => setActiveCycleId(id);

  const deleteCycle = async (id: string) => {
      const newCycles = cycles.filter(c => c.id !== id);
      setCycles(newCycles);
      if(activeCycleId === id && newCycles.length > 0) setActiveCycleId(newCycles[0].id);
      
      if(user && !isGuest) await supabase.from('cycles').delete().eq('id', id);
  };

  const syncCycleData = async (cycleId: string, updates: Partial<Cycle>) => {
      if(!user || isGuest) return;
      
      const payload: any = {};
      if(updates.config) payload.config = updates.config;
      if(updates.planning) payload.planning = updates.planning;
      if(updates.weeklyCompletion) payload.weekly_completion = updates.weeklyCompletion;
      
      await supabase.from('cycles').update(payload).eq('id', cycleId);
  };

  const updateConfig = (newConfig: AthensConfig) => {
      setConfig(newConfig);
      if(activeCycleId) {
          setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, config: newConfig } : c));
          syncCycleData(activeCycleId, { config: newConfig });
      }
  };

  const addNotebook = async (notebook: Omit<Notebook, 'id'>) => {
      const newNotebook = { ...notebook, id: crypto.randomUUID() };
      setNotebooks(prev => [...prev, newNotebook]);

      if(user && !isGuest) {
          const { error } = await supabase.from('notebooks').insert({
              id: newNotebook.id,
              user_id: user.id,
              discipline: newNotebook.discipline,
              name: newNotebook.name,
              subtitle: newNotebook.subtitle,
              tec_link: newNotebook.tecLink,
              obsidian_link: newNotebook.obsidianLink,
              weight: newNotebook.weight,
              relevance: newNotebook.relevance,
              trend: newNotebook.trend,
              target_accuracy: newNotebook.targetAccuracy,
              accuracy: newNotebook.accuracy,
              status: newNotebook.status,
              notes: newNotebook.notes,
              image: newNotebook.image,
              last_practice: newNotebook.lastPractice,
              next_review: newNotebook.nextReview
          });
          if(error) console.error("Error adding notebook:", error);

          if (newNotebook.weekId && activeCycleId) {
             const activeCycle = cycles.find(c => c.id === activeCycleId);
             if(activeCycle) {
                 const newPlanning = { ...activeCycle.planning, [newNotebook.id]: newNotebook.weekId };
                 setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, planning: newPlanning } : c));
                 syncCycleData(activeCycleId, { planning: newPlanning });
             }
          }
      } else if (isGuest && activeCycleId) {
          const activeCycle = cycles.find(c => c.id === activeCycleId);
          if (activeCycle && newNotebook.weekId) {
              const newPlanning = { ...activeCycle.planning, [newNotebook.id]: newNotebook.weekId };
              setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, planning: newPlanning } : c));
          }
      }
  };

  const editNotebook = async (id: string, updates: Partial<Notebook>) => {
      setNotebooks(prev => prev.map(nb => nb.id === id ? { ...nb, ...updates } : nb));

      if (activeCycleId) {
          const activeCycle = cycles.find(c => c.id === activeCycleId);
          if (activeCycle) {
              let planningUpdate = undefined;
              let completionUpdate = undefined;

              if (updates.weekId !== undefined) {
                  planningUpdate = { ...activeCycle.planning, [id]: updates.weekId };
              }
              if (updates.isWeekCompleted !== undefined) {
                  completionUpdate = { ...activeCycle.weeklyCompletion, [id]: updates.isWeekCompleted };
              }

              if(planningUpdate || completionUpdate) {
                  setCycles(prev => prev.map(c => c.id === activeCycleId ? {
                      ...c,
                      planning: planningUpdate || c.planning,
                      weeklyCompletion: completionUpdate || c.weeklyCompletion
                  }: c));
              }
              
              if (user && !isGuest && (planningUpdate || completionUpdate)) {
                 syncCycleData(activeCycleId, { 
                    planning: planningUpdate, 
                    weeklyCompletion: completionUpdate 
                 });
              }
          }
      }

      if(user && !isGuest) {
          const dbUpdates: any = {};
          if(updates.name !== undefined) dbUpdates.name = updates.name;
          if(updates.discipline !== undefined) dbUpdates.discipline = updates.discipline;
          if(updates.tecLink !== undefined) dbUpdates.tec_link = updates.tecLink;
          if(updates.obsidianLink !== undefined) dbUpdates.obsidian_link = updates.obsidianLink;
          if(updates.targetAccuracy !== undefined) dbUpdates.target_accuracy = updates.targetAccuracy;
          if(updates.accuracy !== undefined) dbUpdates.accuracy = updates.accuracy;
          if(updates.lastPractice !== undefined) dbUpdates.last_practice = updates.lastPractice;
          if(updates.nextReview !== undefined) dbUpdates.next_review = updates.nextReview;
          if(updates.status !== undefined) dbUpdates.status = updates.status;
          if(updates.weight !== undefined) dbUpdates.weight = updates.weight;
          if(updates.relevance !== undefined) dbUpdates.relevance = updates.relevance;
          if(updates.trend !== undefined) dbUpdates.trend = updates.trend;
          if(updates.notes !== undefined) dbUpdates.notes = updates.notes;
          if(updates.image !== undefined) dbUpdates.image = updates.image;
          
          if(Object.keys(dbUpdates).length > 0) {
              await supabase.from('notebooks').update(dbUpdates).eq('id', id);
          }
      }
  };

  const updateNotebookAccuracy = (id: string, newAccuracy: number) => {
    const nb = notebooks.find(n => n.id === id);
    if (!nb) return;

    const nextDate = calculateNextReview(newAccuracy, nb.relevance, nb.trend, config.algorithm);
    
    editNotebook(id, {
        accuracy: newAccuracy,
        lastPractice: new Date().toISOString(),
        nextReview: nextDate.toISOString()
    });
  };

  const deleteNotebook = async (id: string) => {
      setNotebooks(prev => prev.filter(n => n.id !== id));
      if(user && !isGuest) await supabase.from('notebooks').delete().eq('id', id);
  };

  const bulkUpdateNotebooks = async (ids: string[], updates: Partial<Notebook> | 'DELETE') => {
      if (updates === 'DELETE') {
          setNotebooks(prev => prev.filter(nb => !ids.includes(nb.id)));
          if(user && !isGuest) await supabase.from('notebooks').delete().in('id', ids);
      } else {
          setNotebooks(prev => prev.map(nb => ids.includes(nb.id) ? { ...nb, ...updates } : nb));
          if(user && !isGuest) {
              ids.forEach(id => editNotebook(id, updates));
          }
      }
  };

  const moveNotebookToWeek = (id: string, weekId: string | null) => {
      editNotebook(id, { weekId });
  };

  const getWildcardNotebook = () => {
    const today = new Date().toISOString();
    const dueItems = notebooks.filter(nb => 
      nb.nextReview && 
      nb.nextReview <= today && 
      nb.discipline !== 'Revisão Geral'
    );
    
    dueItems.sort((a, b) => {
        if (a.weight !== b.weight) return a.weight === Weight.MUITO_ALTO ? -1 : 1;
        return 0;
    });

    return dueItems.length > 0 ? dueItems[0] : null;
  };

  const addProtocolItem = async (item: Omit<ProtocolItem, 'id' | 'checked'>) => {
      const newItem = { ...item, id: crypto.randomUUID(), checked: false };
      setProtocol(prev => [...prev, newItem]);
      if(user && !isGuest) await supabase.from('protocol_items').insert({ ...newItem, user_id: user.id });
  };
  
  const toggleProtocolItem = async (id: string) => {
      const item = protocol.find(i => i.id === id);
      if(item && user) {
          const newItem = { ...item, checked: !item.checked };
          setProtocol(prev => prev.map(i => i.id === id ? newItem : i));
          if (!isGuest) await supabase.from('protocol_items').update({ checked: newItem.checked }).eq('id', id);
      }
  };

  const deleteProtocolItem = async (id: string) => {
      setProtocol(prev => prev.filter(i => i.id !== id));
      if(user && !isGuest) await supabase.from('protocol_items').delete().eq('id', id);
  };

  const saveReport = async (report: Omit<SavedReport, 'id' | 'date'>) => {
      const newReport = { ...report, id: crypto.randomUUID(), date: new Date().toISOString() };
      setReports(prev => [newReport, ...prev]);
      if(user && !isGuest) await supabase.from('reports').insert({ ...newReport, user_id: user.id });
  };

  const deleteReport = async (id: string) => {
      setReports(prev => prev.filter(r => r.id !== id));
      if(user && !isGuest) await supabase.from('reports').delete().eq('id', id);
  };

  return (
    <StoreContext.Provider value={{ 
      notebooks, config, reports, protocol, cycles, activeCycleId, framework,
      loading, user, isGuest,
      enterGuestMode,
      createCycle, selectCycle, deleteCycle,
      updateConfig, updateNotebookAccuracy, moveNotebookToWeek, getWildcardNotebook,
      addNotebook, editNotebook, deleteNotebook, bulkUpdateNotebooks,
      saveReport, deleteReport,
      addProtocolItem, toggleProtocolItem, deleteProtocolItem,
      updateFramework
    }}>
      {children}
    </StoreContext.Provider>
  );
};
