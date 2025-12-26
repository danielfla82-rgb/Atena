
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notebook, AthensConfig, Weight, Relevance, Trend, SavedReport, ProtocolItem, NotebookStatus, Cycle, FrameworkData } from './types';
import { calculateNextReview } from './utils/algorithm';

// Mock Data Initializer (Fallback)
const MOCK_NOTEBOOKS: Notebook[] = [
  {
    id: 'generic-review-template',
    discipline: 'Revisão Geral',
    name: 'Bloco de Revisão Inteligente',
    subtitle: 'O algoritmo define o foco.',
    accuracy: 0,
    targetAccuracy: 100,
    weight: Weight.MUITO_ALTO,
    relevance: Relevance.ALTISSIMA,
    trend: Trend.ESTAVEL,
    status: NotebookStatus.MASTERED,
    nextReview: new Date().toISOString(), 
    weekId: null
  },
  {
    id: '1',
    discipline: 'Dir. Constitucional',
    name: 'Controle de Constitucionalidade',
    subtitle: 'Foco em ADI e ADC',
    accuracy: 55,
    targetAccuracy: 85,
    weight: Weight.MUITO_ALTO,
    relevance: Relevance.ALTISSIMA,
    trend: Trend.ALTA,
    status: NotebookStatus.REVIEWING,
    nextReview: new Date().toISOString(), 
    weekId: 'week-1'
  },
  {
    id: '2',
    discipline: 'Dir. Tributário',
    name: 'Sistema Tributário Nacional',
    subtitle: 'Limitações ao Poder de Tributar',
    accuracy: 82,
    targetAccuracy: 90,
    weight: Weight.ALTO,
    relevance: Relevance.ALTA,
    trend: Trend.ESTAVEL,
    status: NotebookStatus.MASTERED,
    nextReview: new Date(Date.now() + 86400000 * 5).toISOString(), 
    weekId: 'week-1'
  }
];

const MOCK_PROTOCOL: ProtocolItem[] = [
  { id: '1', name: 'Ômega 3', dosage: '1000mg', time: '08:00', type: 'Suplemento', checked: false },
  { id: '2', name: 'Creatina', dosage: '5g', time: '08:00', type: 'Suplemento', checked: false },
  { id: '3', name: 'Café Preto (Sem Açúcar)', dosage: '200ml', time: '14:00', type: 'Refeição', checked: false },
];

const DEFAULT_CONFIG: AthensConfig = {
    targetRole: 'Auditor Fiscal',
    weeksUntilExam: 12,
    studyPace: 'Intermediário',
    startDate: new Date().toISOString().split('T')[0],
    examName: 'Concurso Exemplo',
    examDate: '',
    banca: '',
    editalText: '',
    editalLink: ''
};

const DEFAULT_FRAMEWORK: FrameworkData = {
    values: '',
    dream: '',
    motivation: '',
    action: '',
    habit: ''
};

// HELPER: SAFE PARSER
// Previne que dados corrompidos quebrem a aplicação inteira
const safeJsonParse = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn(`Erro ao carregar dados de '${key}'. Usando fallback.`, e);
        // Opcional: Limpar dado corrompido para evitar erros futuros
        // localStorage.removeItem(key); 
        return fallback;
    }
};

interface StoreContextType {
  notebooks: Notebook[];
  config: AthensConfig;
  reports: SavedReport[];
  protocol: ProtocolItem[];
  cycles: Cycle[];
  activeCycleId: string | null;
  framework: FrameworkData;
  
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

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global Data (Universal)
  const [notebooks, setNotebooks] = useState<Notebook[]>(MOCK_NOTEBOOKS);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [protocol, setProtocol] = useState<ProtocolItem[]>(MOCK_PROTOCOL);
  const [framework, setFramework] = useState<FrameworkData>(DEFAULT_FRAMEWORK);
  
  // Cycle Management
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);

  // Active Context State (Derived from Active Cycle)
  const [config, setConfig] = useState<AthensConfig>(DEFAULT_CONFIG);

  // --- INITIALIZATION ---
  useEffect(() => {
    try {
      // 1. Load Universal Data using Safe Parser
      const loadedReports = safeJsonParse('athena_reports', [] as SavedReport[]);
      setReports(loadedReports);

      const loadedProtocol = safeJsonParse('athena_protocol', MOCK_PROTOCOL);
      setProtocol(loadedProtocol);
      
      const loadedFramework = safeJsonParse('athena_framework', DEFAULT_FRAMEWORK);
      setFramework(loadedFramework);

      let currentNotebooks = safeJsonParse('athena_notebooks', MOCK_NOTEBOOKS);
      setNotebooks(currentNotebooks);

      // 2. Load Cycles or Migrate Existing Data
      const loadedCycles = safeJsonParse('athena_cycles', null); // Default to null to trigger migration logic if empty

      if (loadedCycles && Array.isArray(loadedCycles) && loadedCycles.length > 0) {
          // Normal Load
          setCycles(loadedCycles);
          
          const lastActive = localStorage.getItem('athena_active_cycle');
          if (lastActive && loadedCycles.find((c: Cycle) => c.id === lastActive)) {
              setActiveCycleId(lastActive);
          } else {
              setActiveCycleId(loadedCycles[0].id);
          }
      } else {
          // First Run / Migration: Create Default Cycle based on EXISTING Notebooks
          console.info("Inicializando/Migrando Ciclos pela primeira vez...");
          const defaultCycleId = 'default-cycle-1';
          const initialPlanning: Record<string, string | null> = {};
          const initialCompletion: Record<string, boolean> = {};
          
          currentNotebooks.forEach(nb => {
              if (nb.weekId) initialPlanning[nb.id] = nb.weekId;
              if (nb.isWeekCompleted) initialCompletion[nb.id] = true;
          });

          const defaultCycle: Cycle = {
              id: defaultCycleId,
              name: 'Projeto Inicial',
              createdAt: new Date().toISOString(),
              lastAccess: new Date().toISOString(),
              config: DEFAULT_CONFIG,
              planning: initialPlanning,
              weeklyCompletion: initialCompletion
          };
          
          setCycles([defaultCycle]);
          setActiveCycleId(defaultCycleId);
      }

    } catch (e) {
      console.error("Critical Initialization Error:", e);
      // Fallback extreme case if everything fails
    }
  }, []);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => { localStorage.setItem('athena_reports', JSON.stringify(reports)); }, [reports]);
  useEffect(() => { localStorage.setItem('athena_protocol', JSON.stringify(protocol)); }, [protocol]);
  useEffect(() => { localStorage.setItem('athena_notebooks', JSON.stringify(notebooks)); }, [notebooks]);
  useEffect(() => { localStorage.setItem('athena_cycles', JSON.stringify(cycles)); }, [cycles]);
  useEffect(() => { localStorage.setItem('athena_framework', JSON.stringify(framework)); }, [framework]);
  useEffect(() => { 
      if (activeCycleId) localStorage.setItem('athena_active_cycle', activeCycleId); 
  }, [activeCycleId]);

  // --- CYCLE SWITCHING LOGIC ---
  useEffect(() => {
      if (activeCycleId) {
          const activeCycle = cycles.find(c => c.id === activeCycleId);
          if (activeCycle) {
              // 1. Restore Config
              setConfig(activeCycle.config);

              // 2. Hydrate Notebooks with Cycle Planning
              // Maps the Universal Notebooks to the specific Cycle's schedule
              setNotebooks(prev => prev.map(nb => ({
                  ...nb,
                  weekId: activeCycle.planning[nb.id] || null, // Restore allocation
                  isWeekCompleted: activeCycle.weeklyCompletion?.[nb.id] || false // Restore completion status
              })));
          }
      }
  }, [activeCycleId]); 

  // --- CYCLE ACTIONS ---

  const createCycle = (name: string, targetRole: string) => {
      const newId = Math.random().toString(36).substr(2, 9);
      const newCycle: Cycle = {
          id: newId,
          name: name,
          createdAt: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          config: { ...DEFAULT_CONFIG, targetRole },
          planning: {}, // Start with empty planning (Backlog)
          weeklyCompletion: {}
      };

      setCycles(prev => [...prev, newCycle]);
      setActiveCycleId(newId);
  };

  const selectCycle = (id: string) => {
      // Update last access
      setCycles(prev => prev.map(c => c.id === id ? { ...c, lastAccess: new Date().toISOString() } : c));
      setActiveCycleId(id);
  };

  const deleteCycle = (id: string) => {
      if (cycles.length <= 1) {
          alert("Você não pode excluir o último projeto.");
          return;
      }
      const newCycles = cycles.filter(c => c.id !== id);
      setCycles(newCycles);
      if (activeCycleId === id) {
          setActiveCycleId(newCycles[0].id);
      }
  };

  const updateActiveCycleData = (newConfig?: AthensConfig, newPlanning?: Record<string, string | null>, newCompletion?: Record<string, boolean>) => {
      if (!activeCycleId) return;
      
      setCycles(prev => prev.map(c => {
          if (c.id === activeCycleId) {
              return {
                  ...c,
                  config: newConfig || c.config,
                  planning: newPlanning ? { ...c.planning, ...newPlanning } : c.planning,
                  weeklyCompletion: newCompletion ? { ...c.weeklyCompletion, ...newCompletion } : c.weeklyCompletion
              };
          }
          return c;
      }));
  };

  // --- CORE FUNCTIONS ADAPTED FOR CYCLES ---

  const updateConfig = (newConfig: AthensConfig) => {
      setConfig(newConfig); // Update local view
      updateActiveCycleData(newConfig); // Persist to cycle
  };

  const updateFramework = (data: FrameworkData) => {
      setFramework(data);
  };

  const moveNotebookToWeek = (id: string, weekId: string | null) => {
      // 1. Update UI immediately
      setNotebooks(prev => prev.map(nb => nb.id === id ? { ...nb, weekId } : nb));
      
      // 2. Persist to Active Cycle Planning
      if (activeCycleId) {
          const activeCycle = cycles.find(c => c.id === activeCycleId);
          if (activeCycle) {
              const updatedPlanning = { ...activeCycle.planning, [id]: weekId };
              updateActiveCycleData(undefined, updatedPlanning);
          }
      }
  };

  const updateNotebookAccuracy = (id: string, newAccuracy: number) => {
    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== id) return nb;
      const nextDate = calculateNextReview(newAccuracy, nb.relevance);
      return {
        ...nb,
        accuracy: newAccuracy,
        lastPractice: new Date().toISOString(),
        nextReview: nextDate.toISOString()
      };
    }));
  };

  const addNotebook = (notebook: Omit<Notebook, 'id'>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newNotebook = { ...notebook, id: newId };
    
    setNotebooks(prev => [...prev, newNotebook]);
    
    // If added with a weekId, save to current cycle planning
    if (notebook.weekId) {
        if (activeCycleId) {
            const activeCycle = cycles.find(c => c.id === activeCycleId);
            if (activeCycle) {
                const updatedPlanning = { ...activeCycle.planning, [newId]: notebook.weekId };
                updateActiveCycleData(undefined, updatedPlanning);
            }
        }
    }
  };

  const editNotebook = (id: string, updates: Partial<Notebook>) => {
    setNotebooks(prev => prev.map(nb => nb.id === id ? { ...nb, ...updates } : nb));
    
    // Handle cycle-specific updates (weekId or completion)
    if (activeCycleId) {
        const activeCycle = cycles.find(c => c.id === activeCycleId);
        if (activeCycle) {
            let planningUpdate = undefined;
            let completionUpdate = undefined;

            if (updates.weekId !== undefined) {
                planningUpdate = { [id]: updates.weekId };
            }
            if (updates.isWeekCompleted !== undefined) {
                completionUpdate = { [id]: updates.isWeekCompleted };
            }

            if (planningUpdate || completionUpdate) {
                setCycles(prev => prev.map(c => {
                    if (c.id === activeCycleId) {
                        return {
                            ...c,
                            planning: planningUpdate ? { ...c.planning, ...planningUpdate } : c.planning,
                            weeklyCompletion: completionUpdate ? { ...c.weeklyCompletion, ...completionUpdate } : c.weeklyCompletion
                        }
                    }
                    return c;
                }));
            }
        }
    }
  };

  const deleteNotebook = (id: string) => {
    setNotebooks(prev => prev.filter(nb => nb.id !== id));
    // Also remove from all cycle plannings to clean up? Or just leave it.
    // Ideally clean up, but simpler to leave for now as it won't cause render issues (id won't be found).
  };

  const bulkUpdateNotebooks = (ids: string[], updates: Partial<Notebook> | 'DELETE') => {
    if (updates === 'DELETE') {
      setNotebooks(prev => prev.filter(nb => !ids.includes(nb.id)));
    } else {
      setNotebooks(prev => prev.map(nb => 
        ids.includes(nb.id) ? { ...nb, ...updates } : nb
      ));
    }
  };

  const saveReport = (report: Omit<SavedReport, 'id' | 'date'>) => {
    const newReport: SavedReport = {
      ...report,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };
    setReports(prev => [newReport, ...prev]);
  };

  const deleteReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const addProtocolItem = (item: Omit<ProtocolItem, 'id' | 'checked'>) => {
    const newItem: ProtocolItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      checked: false
    };
    setProtocol(prev => [...prev, newItem].sort((a,b) => a.time.localeCompare(b.time)));
  };

  const toggleProtocolItem = (id: string) => {
    setProtocol(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const deleteProtocolItem = (id: string) => {
    setProtocol(prev => prev.filter(item => item.id !== id));
  };

  const getWildcardNotebook = () => {
    const today = new Date().toISOString();
    const dueItems = notebooks.filter(nb => 
      nb.nextReview && 
      nb.nextReview <= today && 
      nb.discipline !== 'Revisão Geral'
    );
    
    dueItems.sort((a, b) => {
      const relevanceScoreA = getRelevanceScore(a.relevance);
      const relevanceScoreB = getRelevanceScore(b.relevance);
      if (relevanceScoreB !== relevanceScoreA) return relevanceScoreB - relevanceScoreA;
      
      const weightScoreA = getWeightScore(a.weight);
      const weightScoreB = getWeightScore(b.weight);
      return weightScoreB - weightScoreA;
    });

    return dueItems.length > 0 ? dueItems[0] : null;
  };

  return (
    <StoreContext.Provider value={{ 
      notebooks, 
      config, 
      reports,
      protocol,
      cycles,
      activeCycleId,
      framework,
      createCycle,
      selectCycle,
      deleteCycle,
      updateConfig, 
      updateNotebookAccuracy,
      moveNotebookToWeek,
      getWildcardNotebook,
      addNotebook,
      editNotebook,
      deleteNotebook,
      bulkUpdateNotebooks,
      saveReport,
      deleteReport,
      addProtocolItem,
      toggleProtocolItem,
      deleteProtocolItem,
      updateFramework
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};

const getRelevanceScore = (r: Relevance) => {
  switch (r) {
    case Relevance.ALTISSIMA: return 4;
    case Relevance.ALTA: return 3;
    case Relevance.MEDIA: return 2;
    case Relevance.BAIXA: return 1;
  }
};
const getWeightScore = (w: Weight) => {
  switch (w) {
    case Weight.MUITO_ALTO: return 4;
    case Weight.ALTO: return 3;
    case Weight.MEDIO: return 2;
    case Weight.BAIXO: return 1;
  }
};
