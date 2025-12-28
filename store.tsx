
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notebook, AthensConfig, Weight, Relevance, Trend, SavedReport, ProtocolItem, NotebookStatus, Cycle, FrameworkData, Note, Allocation } from './types';
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

const DEFAULT_FRAMEWORK: FrameworkData = { values: '', dream: '', motivation: '', action: '', habit: '' };

const GUEST_CYCLE_ID = 'guest-cycle-demo';
const TODAY = new Date().toISOString().split('T')[0];

const GUEST_MOCK_DB: any = {
    config: { ...DEFAULT_CONFIG },
    framework: { values: 'Demo Values', dream: 'Demo Dream', motivation: '', action: '', habit: '' },
    protocol: [],
    notebooks: [],
    notes: []
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
  user: any;
  isGuest: boolean;
  
  focusedNotebookId: string | null;
  setFocusedNotebookId: (id: string | null) => void;
  pendingCreateData: Partial<Notebook> | null;
  setPendingCreateData: (data: Partial<Notebook> | null) => void;
  
  enterGuestMode: () => void;
  createCycle: (name: string, targetRole: string) => void;
  selectCycle: (id: string) => void;
  deleteCycle: (id: string) => void;
  updateConfig: (config: AthensConfig) => void;
  
  // Notebook CRUD
  addNotebook: (notebook: Omit<Notebook, 'id'>) => Promise<void>;
  editNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  updateNotebookAccuracy: (id: string, newAccuracy: number) => void;
  bulkUpdateNotebooks: (ids: string[], updates: Partial<Notebook> | 'DELETE') => void;
  getWildcardNotebook: () => Notebook | null;

  // Allocation (Planning) CRUD
  addAllocation: (notebookId: string, weekId: string) => void;
  removeAllocation: (allocationId: string) => void;
  moveAllocation: (allocationId: string, targetWeekId: string) => void;
  toggleAllocationComplete: (allocationId: string, completed: boolean) => void;

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
  if (context === undefined) throw new Error('useStore must be used within a StoreProvider');
  return context;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [protocol, setProtocol] = useState<ProtocolItem[]>([]);
  const [framework, setFramework] = useState<FrameworkData>(DEFAULT_FRAMEWORK);
  const [notes, setNotes] = useState<Note[]>([]);
  
  const [focusedNotebookId, setFocusedNotebookId] = useState<string | null>(null);
  const [pendingCreateData, setPendingCreateData] = useState<Partial<Notebook> | null>(null);
  
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [config, setConfig] = useState<AthensConfig>(DEFAULT_CONFIG);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initSession = async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (!isGuest) {
                setUser(data.session?.user ?? null);
                if (data.session?.user) await fetchAllData(data.session.user.id);
                else setLoading(false);
            }
        } catch (err) {
            console.error("Init Error:", err);
            setLoading(false);
        }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isGuest) {
        setUser(session?.user ?? null);
        if (session?.user) fetchAllData(session.user.id);
        else { setNotebooks([]); setCycles([]); }
      }
    });
    return () => subscription.unsubscribe();
  }, [isGuest]);

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
              setNotebooks(results[0].value.data.map((n: any) => ({
                  ...n,
                  tecLink: n.tec_link, lawLink: n.law_link, obsidianLink: n.obsidian_link,
                  targetAccuracy: n.target_accuracy, lastPractice: n.last_practice, nextReview: n.next_review,
                  images: n.images || (n.image ? [n.image] : []), accuracyHistory: n.accuracy_history || []
              })));
          }
          if (results[1].status === 'fulfilled' && results[1].value.data) {
              const loadedCycles = results[1].value.data.map((c: any) => {
                  // MIGRATION LOGIC: Convert old map to Allocation[]
                  let planning = c.planning;
                  if (planning && !Array.isArray(planning)) {
                      const allocations: Allocation[] = [];
                      Object.entries(planning).forEach(([nbId, wId]) => {
                          if (wId) {
                              allocations.push({
                                  id: `migrated-${nbId}`,
                                  notebookId: nbId,
                                  weekId: wId as string,
                                  completed: c.weekly_completion?.[nbId] || false
                              });
                          }
                      });
                      planning = allocations;
                  }
                  return { ...c, lastAccess: c.last_access, createdAt: c.created_at, planning: planning || [] };
              });
              setCycles(loadedCycles);
              const lastActive = localStorage.getItem('athena_active_cycle');
              if (lastActive && loadedCycles.find((c: any) => c.id === lastActive)) setActiveCycleId(lastActive);
              else if (loadedCycles.length > 0) setActiveCycleId(loadedCycles[0].id);
          }
          if (results[2].status === 'fulfilled' && results[2].value.data) setFramework(results[2].value.data);
          if (results[3].status === 'fulfilled' && results[3].value.data) setProtocol(results[3].value.data);
          if (results[4].status === 'fulfilled' && results[4].value.data) setReports(results[4].value.data);
          if (results[5].status === 'fulfilled' && results[5].value.data) {
              setNotes(results[5].value.data.map((n: any) => ({ ...n, createdAt: n.created_at, updatedAt: n.updated_at })));
          }
      } catch (error) { console.error("Sync Error:", error); } finally { setLoading(false); }
  };

  useEffect(() => {
      if (activeCycleId && cycles.length > 0) {
          const activeCycle = cycles.find(c => c.id === activeCycleId);
          if (activeCycle) {
              setConfig({ ...DEFAULT_CONFIG, ...activeCycle.config });
              if (!isGuest) localStorage.setItem('athena_active_cycle', activeCycleId);
          }
      }
  }, [activeCycleId, cycles, isGuest]);

  // --- HELPER: SYNC CYCLE ---
  const syncCyclePlanning = async (cycleId: string, newPlanning: Allocation[]) => {
      // Update Local
      setCycles(prev => prev.map(c => c.id === cycleId ? { ...c, planning: newPlanning } : c));
      // Update Remote
      if (user && !isGuest) {
          await supabase.from('cycles').update({ planning: newPlanning }).eq('id', cycleId);
      }
  };

  // --- NOTEBOOK CRUD ---
  const addNotebook = async (notebook: Omit<Notebook, 'id'>): Promise<void> => {
      const newNotebook = { ...notebook, id: crypto.randomUUID() };
      setNotebooks(prev => [...prev, newNotebook]);

      if (user && !isGuest) {
          try {
              const payload = {
                  id: newNotebook.id, user_id: user.id, discipline: newNotebook.discipline, name: newNotebook.name,
                  subtitle: newNotebook.subtitle || "", tec_link: newNotebook.tecLink || null, law_link: newNotebook.lawLink || null,
                  obsidian_link: newNotebook.obsidianLink || null, weight: newNotebook.weight, relevance: newNotebook.relevance,
                  trend: newNotebook.trend, target_accuracy: newNotebook.targetAccuracy, accuracy: newNotebook.accuracy,
                  status: newNotebook.status, notes: newNotebook.notes || null, images: newNotebook.images || [],
                  accuracy_history: newNotebook.accuracyHistory || []
              };
              const { error } = await supabase.from('notebooks').insert(payload);
              if (error) throw error;
          } catch (error: any) {
              console.error("Save Error:", error);
              setNotebooks(prev => prev.filter(n => n.id !== newNotebook.id));
              alert(`Erro ao salvar: ${error.message}`);
          }
      }
  };

  const editNotebook = async (id: string, updates: Partial<Notebook>): Promise<void> => {
      const prev = notebooks.find(n => n.id === id);
      if (!prev) return;
      setNotebooks(current => current.map(nb => nb.id === id ? { ...nb, ...updates } : nb));

      if (user && !isGuest) {
          const dbUpdates: any = {};
          if(updates.name) dbUpdates.name = updates.name;
          if(updates.discipline) dbUpdates.discipline = updates.discipline;
          if(updates.accuracy !== undefined) dbUpdates.accuracy = updates.accuracy;
          if(updates.status) dbUpdates.status = updates.status;
          if(updates.lastPractice) dbUpdates.last_practice = updates.lastPractice;
          if(updates.nextReview) dbUpdates.next_review = updates.nextReview;
          if(updates.accuracyHistory) dbUpdates.accuracy_history = updates.accuracyHistory;
          
          await supabase.from('notebooks').update(dbUpdates).eq('id', id);
      }
  };

  const deleteNotebook = async (id: string): Promise<void> => {
      // 1. Remove definitions
      setNotebooks(prev => prev.filter(n => n.id !== id));
      
      // 2. Remove allocations in ALL cycles
      setCycles(prev => prev.map(c => ({
          ...c,
          planning: (c.planning as Allocation[]).filter(a => a.notebookId !== id)
      })));

      if (user && !isGuest) {
          try {
              // Delete from DB (Allocations in cycles are JSONB, need to update row)
              await supabase.from('notebooks').delete().eq('id', id);
              
              // Sync cleaned cycles
              for (const cycle of cycles) {
                  const cleanedPlanning = (cycle.planning as Allocation[]).filter(a => a.notebookId !== id);
                  await supabase.from('cycles').update({ planning: cleanedPlanning }).eq('id', cycle.id);
              }
          } catch (err) {
              console.error("Delete Failed", err);
              alert("Erro ao excluir do banco de dados.");
          }
      }
  };

  // --- ALLOCATION CRUD (PLANNING) ---
  const addAllocation = (notebookId: string, weekId: string) => {
      if (!activeCycleId) return;
      const cycle = cycles.find(c => c.id === activeCycleId);
      if (!cycle) return;

      const newAllocation: Allocation = {
          id: crypto.randomUUID(),
          notebookId,
          weekId,
          completed: false
      };

      const newPlanning = [...(cycle.planning as Allocation[]), newAllocation];
      syncCyclePlanning(activeCycleId, newPlanning);
  };

  const removeAllocation = (allocationId: string) => {
      if (!activeCycleId) return;
      const cycle = cycles.find(c => c.id === activeCycleId);
      if (!cycle) return;

      const newPlanning = (cycle.planning as Allocation[]).filter(a => a.id !== allocationId);
      syncCyclePlanning(activeCycleId, newPlanning);
  };

  const moveAllocation = (allocationId: string, targetWeekId: string) => {
      if (!activeCycleId) return;
      const cycle = cycles.find(c => c.id === activeCycleId);
      if (!cycle) return;

      const newPlanning = (cycle.planning as Allocation[]).map(a => 
          a.id === allocationId ? { ...a, weekId: targetWeekId } : a
      );
      syncCyclePlanning(activeCycleId, newPlanning);
  };

  const toggleAllocationComplete = (allocationId: string, completed: boolean) => {
      if (!activeCycleId) return;
      const cycle = cycles.find(c => c.id === activeCycleId);
      if (!cycle) return;

      const newPlanning = (cycle.planning as Allocation[]).map(a => 
          a.id === allocationId ? { ...a, completed } : a
      );
      syncCyclePlanning(activeCycleId, newPlanning);
      
      // Update Last Practice on Notebook Definition as well
      if (completed) {
          const allocation = (cycle.planning as Allocation[]).find(a => a.id === allocationId);
          if (allocation) editNotebook(allocation.notebookId, { lastPractice: new Date().toISOString() });
      }
  };

  // --- OTHER ACTIONS ---
  const updateNotebookAccuracy = (id: string, newAccuracy: number) => {
    const nb = notebooks.find(n => n.id === id);
    if (!nb) return;
    const nextDate = calculateNextReview(newAccuracy, nb.relevance, nb.trend, config.algorithm);
    const today = new Date().toISOString();
    const newHistory = [...(nb.accuracyHistory || []), { date: today, accuracy: newAccuracy }];
    
    editNotebook(id, { accuracy: newAccuracy, lastPractice: today, nextReview: nextDate.toISOString(), accuracyHistory: newHistory });
  };

  const updateConfig = (newConfig: AthensConfig) => {
      setConfig(newConfig);
      if(activeCycleId) {
          setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, config: newConfig } : c));
          if(user && !isGuest) supabase.from('cycles').update({ config: newConfig }).eq('id', activeCycleId).then();
      }
  };

  const createCycle = async (name: string, targetRole: string) => {
      const newCycle: Cycle = {
          id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), lastAccess: new Date().toISOString(),
          config: { ...DEFAULT_CONFIG, targetRole }, planning: [] // Start with empty array
      };
      setCycles(prev => [...prev, newCycle]);
      setActiveCycleId(newCycle.id);
      if(user && !isGuest) {
          await supabase.from('cycles').insert({
              id: newCycle.id, user_id: user.id, name: newCycle.name, config: newCycle.config, planning: []
          });
      }
  };

  const enterGuestMode = () => {
      setLoading(true); setIsGuest(true); setUser({ id: 'guest', email: 'visitante@atena.os' });
      // ... (Guest Init Logic Omitted for Brevity, assumes similar structure)
      setLoading(false);
  };

  // Placeholders for minor features
  const getWildcardNotebook = () => null;
  const bulkUpdateNotebooks = () => {};
  const selectCycle = setActiveCycleId;
  const deleteCycle = (id: string) => {
      setCycles(p => p.filter(c => c.id !== id));
      if (user && !isGuest) supabase.from('cycles').delete().eq('id', id);
  };
  const updateFramework = (d: FrameworkData) => { setFramework(d); if(user && !isGuest) supabase.from('frameworks').upsert({user_id: user.id, ...d}); };
  const addProtocolItem = (i: any) => { setProtocol(p => [...p, {...i, id: crypto.randomUUID()}]); };
  const toggleProtocolItem = (id: string) => { setProtocol(p => p.map(i => i.id === id ? {...i, checked: !i.checked} : i)); };
  const deleteProtocolItem = (id: string) => { setProtocol(p => p.filter(i => i.id !== id)); };
  const saveReport = (r: any) => { setReports(p => [...p, {...r, id: crypto.randomUUID(), date: new Date().toISOString()}]); };
  const deleteReport = (id: string) => { setReports(p => p.filter(r => r.id !== id)); };
  const addNote = () => { setNotes(p => [...p, {id: crypto.randomUUID(), content:'', color:'yellow', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()}]); };
  const updateNote = (id: string, c: string, color?: any) => { setNotes(p => p.map(n => n.id === id ? {...n, content:c, color: color||n.color} : n)); };
  const deleteNote = (id: string) => { setNotes(p => p.filter(n => n.id !== id)); };

  return (
    <StoreContext.Provider value={{ 
      notebooks, config, reports, protocol, cycles, activeCycleId, framework, notes, loading, user, isGuest,
      focusedNotebookId, setFocusedNotebookId, pendingCreateData, setPendingCreateData,
      enterGuestMode, createCycle, selectCycle, deleteCycle, updateConfig, updateNotebookAccuracy,
      getWildcardNotebook, addNotebook, editNotebook, deleteNotebook, bulkUpdateNotebooks, saveReport, deleteReport,
      addProtocolItem, toggleProtocolItem, deleteProtocolItem, updateFramework, addNote, updateNote, deleteNote,
      addAllocation, removeAllocation, moveAllocation, toggleAllocationComplete
    }}>
      {children}
    </StoreContext.Provider>
  );
};
