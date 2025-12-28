
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notebook, AthensConfig, Weight, Relevance, Trend, SavedReport, ProtocolItem, NotebookStatus, Cycle, FrameworkData, Note, WeeklyStatus } from './types';
import { calculateNextReview } from './utils/algorithm';
import { supabase, isUsingFallback } from './lib/supabase';

// Default config constant
const DEFAULT_CONFIG: AthensConfig = {
    targetRole: 'Concurseiro de Elite',
    weeksUntilExam: 12,
    studyPace: 'Intermediário',
    startDate: new Date().toISOString().split('T')[0],
    structuredEdital: [],
    editalText: '',
    legislationText: '',
    algorithm: {
        baseIntervals: { learning: 1, reviewing: 3, mastering: 7, maintaining: 15 },
        multipliers: { relevanceExtreme: 0.7, relevanceHigh: 0.9, trendHigh: 0.9 }
    },
    longTermPlanning: {}
};

interface StoreContextType {
  user: any;
  loading: boolean;
  notebooks: Notebook[];
  config: AthensConfig;
  cycles: Cycle[];
  activeCycleId: string | null;
  protocol: ProtocolItem[];
  framework: FrameworkData;
  reports: SavedReport[];
  notes: Note[];
  
  updateConfig: (config: AthensConfig) => void;
  addNotebook: (notebook: Partial<Notebook>) => Promise<void>;
  editNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  bulkUpdateNotebooks: (ids: string[], updates: Partial<Notebook>) => Promise<void>;
  moveNotebookToWeek: (id: string, weekId: string) => Promise<void>;
  redistributeOverdue: () => void;
  createCycle: (name: string, role: string) => void;
  updateCycle: (id: string, updates: Partial<Cycle>) => Promise<void>;
  selectCycle: (id: string) => void;
  deleteCycle: (id: string) => void;
  addProtocolItem: (item: Omit<ProtocolItem, 'id' | 'checked'>) => void;
  toggleProtocolItem: (id: string) => void;
  deleteProtocolItem: (id: string) => void;
  updateFramework: (data: FrameworkData) => void;
  saveReport: (report: Omit<SavedReport, 'id' | 'date'>) => void;
  deleteReport: (id: string) => void;
  addNote: () => void;
  updateNote: (id: string, content: string, color?: Note['color']) => Promise<void>;
  deleteNote: (id: string) => void;
  enterGuestMode: () => void;
  updateNotebookAccuracy: (id: string, accuracy: number) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [config, setConfig] = useState<AthensConfig>(DEFAULT_CONFIG);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<ProtocolItem[]>([]);
  const [framework, setFramework] = useState<FrameworkData>({ habit: '', action: '', motivation: '', dream: '', values: '' });
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isGuest, setIsGuest] = useState(false);

  // Auth & Initial Load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      // UNIVERSAL MODE: Always fetch data, even if not logged in (Public Board)
      fetchData(session?.user?.id || 'guest');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Refresh data on auth change
      fetchData(session?.user?.id || 'guest');
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
      setLoading(true);
      
      // UNIVERSAL DATABASE MODE:
      // Removed .eq('user_id', userId) filters.
      // Fetches everything for everyone.
      
      try {
        const results = await Promise.allSettled([
            supabase.from('notebooks').select('*'),
            supabase.from('cycles').select('*'),
            supabase.from('frameworks').select('*').order('updated_at', { ascending: false }).limit(1).single(),
            supabase.from('protocol_items').select('*'),
            supabase.from('reports').select('*'),
            supabase.from('notes').select('*')
        ]);

        // Notebooks
        if (results[0].status === 'fulfilled' && results[0].value.data) {
            const formatted = results[0].value.data.map((n: any) => ({
                ...n,
                tecLink: n.tec_link,
                errorNotebookLink: n.error_notebook_link,
                obsidianLink: n.obsidian_link,
                targetAccuracy: n.target_accuracy,
                lastPractice: n.last_practice,
                nextReview: n.next_review,
                weekId: n.week_id,
                weeklyStatus: n.weekly_status,
                images: n.images || (n.image ? [n.image] : [])
            }));
            setNotebooks(formatted);
        }

        // Cycles
        if (results[1].status === 'fulfilled' && results[1].value.data) {
            const fetchedCycles = results[1].value.data.map((c: any) => ({
                ...c,
                config: c.config || DEFAULT_CONFIG,
                lastAccess: c.last_access
            }));
            setCycles(fetchedCycles);
            
            if (fetchedCycles.length > 0) {
                const sorted = [...fetchedCycles].sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime());
                setActiveCycleId(sorted[0].id);
                setConfig({ ...DEFAULT_CONFIG, ...sorted[0].config });
            }
        }

        // Framework
        if (results[2].status === 'fulfilled' && results[2].value.data) {
            setFramework(results[2].value.data);
        }

        // Protocol
        if (results[3].status === 'fulfilled' && results[3].value.data) {
            setProtocol(results[3].value.data);
        }

        // Reports
        if (results[4].status === 'fulfilled' && results[4].value.data) {
            setReports(results[4].value.data);
        }

        // Notes
        if (results[5].status === 'fulfilled' && results[5].value.data) {
            setNotes(results[5].value.data.map((n: any) => ({
                ...n,
                updatedAt: n.updated_at
            })));
        }

      } catch (err) {
          console.error("Error fetching data:", err);
      } finally {
          setLoading(false);
      }
  };

  const updateConfig = async (newConfig: AthensConfig) => {
      setConfig(newConfig);
      // Persist to DB immediately
      if (activeCycleId && user && !isGuest) {
          const cycle = cycles.find(c => c.id === activeCycleId);
          if (cycle) {
              const updatedCycle = { ...cycle, config: newConfig };
              setCycles(cycles.map(c => c.id === activeCycleId ? updatedCycle : c));
              
              const { error } = await supabase.from('cycles').update({ config: newConfig }).eq('id', activeCycleId);
              if (error) console.error("Failed to save config:", error);
          }
      }
  };

  const addNotebook = async (nb: Partial<Notebook>) => {
    const newNotebook: Notebook = {
      id: crypto.randomUUID(),
      discipline: nb.discipline || 'Geral',
      name: nb.name || 'Novo Caderno',
      accuracy: 0,
      targetAccuracy: 90,
      weight: Weight.MEDIO,
      relevance: Relevance.MEDIA,
      trend: Trend.ESTAVEL,
      status: NotebookStatus.NOT_STARTED,
      images: [],
      ...nb
    } as Notebook;

    setNotebooks(prev => [...prev, newNotebook]);

    if (user && !isGuest) {
        const payload = {
            id: newNotebook.id,
            user_id: user.id, 
            discipline: newNotebook.discipline,
            name: newNotebook.name,
            subtitle: newNotebook.subtitle,
            tec_link: newNotebook.tecLink,
            error_notebook_link: newNotebook.errorNotebookLink,
            obsidian_link: newNotebook.obsidianLink,
            weight: newNotebook.weight,
            relevance: newNotebook.relevance,
            trend: newNotebook.trend,
            target_accuracy: newNotebook.targetAccuracy,
            accuracy: newNotebook.accuracy,
            status: newNotebook.status,
            notes: newNotebook.notes,
            image: newNotebook.images?.[0] || null,
            images: newNotebook.images || [],
            last_practice: newNotebook.lastPractice,
            next_review: newNotebook.nextReview,
            week_id: newNotebook.weekId,
            weekly_status: newNotebook.weeklyStatus
        };
        await supabase.from('notebooks').insert(payload);
    }
  };

  const editNotebook = async (id: string, updates: Partial<Notebook>) => {
    setNotebooks(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

    if (user && !isGuest) {
        const dbUpdates: any = {};
        if(updates.name !== undefined) dbUpdates.name = updates.name;
        if(updates.discipline !== undefined) dbUpdates.discipline = updates.discipline;
        if(updates.tecLink !== undefined) dbUpdates.tec_link = updates.tecLink;
        if(updates.errorNotebookLink !== undefined) dbUpdates.error_notebook_link = updates.errorNotebookLink;
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
        if(updates.weekId !== undefined) dbUpdates.week_id = updates.weekId;
        if(updates.weeklyStatus !== undefined) dbUpdates.weekly_status = updates.weeklyStatus;
        if(updates.images !== undefined) {
            dbUpdates.images = updates.images;
            dbUpdates.image = updates.images[0] || null;
        }

        if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('notebooks').update(dbUpdates).eq('id', id);
        }
    }
  };

  const deleteNotebook = async (id: string) => {
    setNotebooks(prev => prev.filter(n => n.id !== id));
    if (user && !isGuest) {
        await supabase.from('notebooks').delete().eq('id', id);
    }
  };

  const bulkUpdateNotebooks = async (ids: string[], updates: Partial<Notebook>) => {
     setNotebooks(prev => prev.map(n => ids.includes(n.id) ? { ...n, ...updates } : n));
     if (user && !isGuest) {
         for (const id of ids) {
             await editNotebook(id, updates);
         }
     }
  };

  const moveNotebookToWeek = async (id: string, weekId: string) => {
    await editNotebook(id, { weekId });
  };

  const redistributeOverdue = () => {
    console.log("Redistributing overdue items...");
  };

  const createCycle = async (name: string, role: string) => {
    const newCycle: Cycle = {
      id: crypto.randomUUID(),
      name,
      config: { ...DEFAULT_CONFIG, targetRole: role },
      notebooks: [],
      lastAccess: new Date().toISOString()
    };
    
    setCycles(prev => [...prev, newCycle]);
    setActiveCycleId(newCycle.id);
    setConfig(newCycle.config);

    if (user && !isGuest) {
        await supabase.from('cycles').insert({
            id: newCycle.id,
            user_id: user.id,
            name: newCycle.name,
            config: newCycle.config,
            last_access: newCycle.lastAccess
        });
    }
  };

  const updateCycle = async (id: string, updates: Partial<Cycle>) => {
      setCycles(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      
      if (activeCycleId === id && updates.config) {
          setConfig(updates.config);
      }

      if (user && !isGuest) {
          const dbUpdates: any = {};
          if (updates.name) dbUpdates.name = updates.name;
          if (updates.config) dbUpdates.config = updates.config;
          
          if (Object.keys(dbUpdates).length > 0) {
              await supabase.from('cycles').update(dbUpdates).eq('id', id);
          }
      }
  };

  const selectCycle = (id: string) => {
    setActiveCycleId(id);
    const cycle = cycles.find(c => c.id === id);
    if (cycle) {
        setConfig(cycle.config);
        if (user && !isGuest) {
            supabase.from('cycles').update({ last_access: new Date().toISOString() }).eq('id', id).then();
        }
    }
  };

  const deleteCycle = async (id: string) => {
    setCycles(prev => prev.filter(c => c.id !== id));
    if (activeCycleId === id) setActiveCycleId(null);
    if (user && !isGuest) {
        await supabase.from('cycles').delete().eq('id', id);
    }
  };

  const addProtocolItem = async (item: Omit<ProtocolItem, 'id' | 'checked'>) => {
    const newItem: ProtocolItem = { ...item, id: crypto.randomUUID(), checked: false };
    setProtocol(prev => [...prev, newItem]);
    if (user && !isGuest) {
        await supabase.from('protocol_items').insert({ id: newItem.id, user_id: user.id, ...item });
    }
  };

  const toggleProtocolItem = async (id: string) => {
    const item = protocol.find(p => p.id === id);
    if (item) {
        setProtocol(prev => prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
        if (user && !isGuest) {
            await supabase.from('protocol_items').update({ checked: !item.checked }).eq('id', id);
        }
    }
  };

  const deleteProtocolItem = async (id: string) => {
    setProtocol(prev => prev.filter(p => p.id !== id));
    if (user && !isGuest) {
        await supabase.from('protocol_items').delete().eq('id', id);
    }
  };

  const updateFramework = async (data: FrameworkData) => {
      setFramework(data);
      if (user && !isGuest) {
          await supabase.from('frameworks').upsert({ user_id: user.id, ...data });
      }
  };

  const saveReport = async (report: Omit<SavedReport, 'id' | 'date'>) => {
    const newReport: SavedReport = { ...report, id: crypto.randomUUID(), date: new Date().toISOString() };
    setReports(prev => [newReport, ...prev]);
    if (user && !isGuest) {
        await supabase.from('reports').insert({
            id: newReport.id,
            user_id: user.id,
            type: newReport.type,
            summary: newReport.summary,
            data: newReport.data,
            date: newReport.date
        });
    }
  };

  const deleteReport = async (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    if (user && !isGuest) {
        await supabase.from('reports').delete().eq('id', id);
    }
  };

  const addNote = async () => {
    const newNote: Note = { id: crypto.randomUUID(), content: '', color: 'yellow', updatedAt: new Date().toISOString() };
    setNotes(prev => [newNote, ...prev]);
    if (user && !isGuest) {
        await supabase.from('notes').insert({
            id: newNote.id,
            user_id: user.id,
            content: '',
            color: 'yellow'
        });
    }
  };

  const updateNote = async (id: string, content: string, color?: Note['color']) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content, color: color || n.color, updatedAt: new Date().toISOString() } : n));
    if (user && !isGuest) {
        const updates: any = { content, updated_at: new Date().toISOString() };
        if (color) updates.color = color;
        await supabase.from('notes').update(updates).eq('id', id);
    }
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (user && !isGuest) {
        await supabase.from('notes').delete().eq('id', id);
    }
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    setUser({ email: 'visitante@atena.app', id: 'guest' });
    fetchData('guest'); // Guest sees shared data now
  };
  
  const updateNotebookAccuracy = async (id: string, accuracy: number) => {
      const notebook = notebooks.find(n => n.id === id);
      if (notebook) {
          const nextDate = calculateNextReview(accuracy, notebook.relevance, notebook.trend, config.algorithm);
          await editNotebook(id, { 
              accuracy, 
              lastPractice: new Date().toISOString(),
              nextReview: nextDate.toISOString()
          });
      }
  };

  const value = {
    user, loading, notebooks, config, cycles, activeCycleId, protocol, framework, reports, notes,
    updateConfig, addNotebook, editNotebook, deleteNotebook, bulkUpdateNotebooks, moveNotebookToWeek,
    redistributeOverdue, createCycle, updateCycle, selectCycle, deleteCycle, addProtocolItem, toggleProtocolItem, deleteProtocolItem,
    updateFramework, saveReport, deleteReport, addNote, updateNote, deleteNote, enterGuestMode, updateNotebookAccuracy
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
