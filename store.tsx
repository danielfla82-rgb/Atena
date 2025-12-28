import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notebook, AthensConfig, Weight, Relevance, Trend, SavedReport, ProtocolItem, NotebookStatus, Cycle, FrameworkData, Note } from './types';
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
        structuredEdital: [
            {
                name: "Direito Tributário",
                topics: [
                    { name: "Sistema Tributário Nacional", probability: "Alta", checked: true },
                    { name: "Limitações ao Poder de Tributar", probability: "Alta", checked: true },
                    { name: "Impostos da União", probability: "Média", checked: false },
                    { name: "Obrigação Tributária", probability: "Alta", checked: false }
                ]
            },
            {
                name: "Contabilidade Geral",
                topics: [
                    { name: "CPC 00 - Estrutura Conceitual", probability: "Alta", checked: true },
                    { name: "CPC 26 - Apresentação das Demonstrações", probability: "Média", checked: true },
                    { name: "CPC 16 - Estoques", probability: "Baixa", checked: false }
                ]
            },
            {
                name: "Direito Administrativo",
                topics: [
                    { name: "Atos Administrativos", probability: "Alta", checked: false },
                    { name: "Licitações (Lei 14.133)", probability: "Alta", checked: false },
                    { name: "Improbidade Administrativa", probability: "Média", checked: false }
                ]
            }
        ]
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
        { id: 'p3', name: 'Treino de Força', dosage: '45min', time: '06:00', type: 'Hábito', checked: true },
        { id: 'p4', name: 'Jantar Low Carb', dosage: 'Proteína + Veg', time: '19:30', type: 'Refeição', checked: false },
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
        },
        {
            id: 'n6', discipline: 'Auditoria', name: 'NBC TA 200', subtitle: 'Objetivos Gerais do Auditor',
            weight: Weight.ALTO, relevance: Relevance.MEDIA, trend: Trend.ALTA,
            accuracy: 0, targetAccuracy: 85, status: NotebookStatus.NOT_STARTED,
            weekId: null, isWeekCompleted: false
        }
    ] as Notebook[],
    notes: [
        { id: 'note1', content: 'Focar na jurisprudência do STF sobre ICMS essa semana.', color: 'yellow', createdAt: TODAY, updatedAt: TODAY }
    ] as Note[]
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
  
  // Navigation State
  focusedNotebookId: string | null;
  setFocusedNotebookId: (id: string | null) => void;
  pendingCreateData: Partial<Notebook> | null;
  setPendingCreateData: (data: Partial<Notebook> | null) => void;
  
  enterGuestMode: () => void;

  createCycle: (name: string, targetRole: string) => void;
  selectCycle: (id: string) => void;
  deleteCycle: (id: string) => void;

  updateConfig: (config: AthensConfig) => void;
  updateNotebookAccuracy: (id: string, newAccuracy: number) => void;
  moveNotebookToWeek: (id: string, weekId: string | null) => Promise<void>;
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

  useEffect(() => {
    const initSession = async () => {
        try {
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
            console.error("Erro crítico na inicialização:", err);
            setLoading(false);
        }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isGuest) {
        setUser(session?.user ?? null);
        if (session?.user) {
            fetchAllData(session.user.id);
        } else {
            setNotebooks([]);
            setCycles([]);
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
            
            const demoCycle: Cycle = {
                id: GUEST_CYCLE_ID,
                name: 'Projeto Elite (Demo)',
                createdAt: new Date().toISOString(),
                lastAccess: new Date().toISOString(),
                config: GUEST_MOCK_DB.config,
                planning: {},
                weeklyCompletion: {}
            };
            GUEST_MOCK_DB.notebooks.forEach(nb => {
                if (nb.weekId) {
                    demoCycle.planning[nb.id] = nb.weekId;
                    demoCycle.weeklyCompletion[nb.id] = nb.isWeekCompleted || false;
                }
            });
            setCycles([demoCycle]);
            setActiveCycleId(demoCycle.id);
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
                  // DB is now updated, we can safely read this column
                  accuracyHistory: n.accuracy_history || [] 
              }));
              setNotebooks(formattedNotebooks);
          }
          // ... rest of fetch logic same as before ...
          if (results[1].status === 'fulfilled' && results[1].value.data) {
              const formattedCycles = results[1].value.data.map((c: any) => ({
                 ...c, lastAccess: c.last_access, createdAt: c.created_at, weeklyCompletion: c.weekly_completion
              }));
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
      } catch (error) {
          console.error("Erro geral ao sincronizar dados:", error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      if (activeCycleId && cycles.length > 0) {
          const activeCycle = cycles.find(c => c.id === activeCycleId);
          if (activeCycle) {
              setConfig({ ...DEFAULT_CONFIG, ...activeCycle.config });
              setNotebooks(prev => prev.map(nb => ({
                  ...nb,
                  weekId: activeCycle.planning[nb.id] || null,
                  isWeekCompleted: activeCycle.weeklyCompletion?.[nb.id] || false
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
      if(user && !isGuest) await supabase.from('frameworks').upsert({ user_id: user.id, ...data });
  };

  const createCycle = async (name: string, targetRole: string) => {
      const newCycle: Cycle = {
          id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), lastAccess: new Date().toISOString(),
          config: { ...DEFAULT_CONFIG, targetRole }, planning: {}, weeklyCompletion: {}
      };
      setCycles(prev => [...prev, newCycle]);
      setActiveCycleId(newCycle.id);
      if(user && !isGuest) {
          await supabase.from('cycles').insert({
              id: newCycle.id, user_id: user.id, name: newCycle.name, config: newCycle.config,
              planning: newCycle.planning, weekly_completion: newCycle.weeklyCompletion
          });
      }
  };

  const selectCycle = (id: string) => setActiveCycleId(id);
  const deleteCycle = async (id: string) => {
      setCycles(prev => prev.filter(c => c.id !== id));
      if(activeCycleId === id) setActiveCycleId(null);
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

  // --- PERSISTENCE ACTIONS (RESTORED) ---

  const addNotebook = async (notebook: Omit<Notebook, 'id'>): Promise<void> => {
      const newNotebook = { ...notebook, id: crypto.randomUUID() };
      setNotebooks(prev => [...prev, newNotebook]);

      if (user && !isGuest) {
          try {
              // Now we send ALL data, assuming DB schema is updated
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

              if (newNotebook.weekId && activeCycleId) {
                 const activeCycle = cycles.find(c => c.id === activeCycleId);
                 if(activeCycle) {
                     const newPlanning = { ...activeCycle.planning, [newNotebook.id]: newNotebook.weekId };
                     setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, planning: newPlanning } : c));
                     await syncCycleData(activeCycleId, { planning: newPlanning });
                 }
              }
          } catch (error: any) {
              console.error("Critical: Failed to save notebook", error);
              setNotebooks(prev => prev.filter(n => n.id !== newNotebook.id));
              
              // Intelligent Error Handling for Schema Mismatch
              if (error.message && (error.message.includes("Could not find the") || error.message.includes("column"))) {
                  alert(`⚠️ ERRO DE SCHEMA DO BANCO DE DADOS ⚠️\n\nO Supabase não possui a coluna necessária: ${error.message}.\n\nPOR FAVOR: Execute o script 'migration_v4.sql' no painel do Supabase para corrigir.`);
              } else {
                  alert(`Erro ao salvar: ${error.message}`);
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

  const editNotebook = async (id: string, updates: Partial<Notebook>): Promise<void> => {
      const prevNotebook = notebooks.find(n => n.id === id);
      if (!prevNotebook) return;
      
      const activeCycle = cycles.find(c => c.id === activeCycleId);
      const prevPlanning = activeCycle ? { ...activeCycle.planning } : {};

      setNotebooks(prev => prev.map(nb => nb.id === id ? { ...nb, ...updates } : nb));

      if (activeCycleId && activeCycle) {
          let planningUpdate: any = undefined;
          let completionUpdate: any = undefined;
          if (updates.weekId !== undefined) planningUpdate = { ...activeCycle.planning, [id]: updates.weekId };
          if (updates.isWeekCompleted !== undefined) completionUpdate = { ...activeCycle.weeklyCompletion, [id]: updates.isWeekCompleted };

          if (planningUpdate || completionUpdate) {
              setCycles(prev => prev.map(c => c.id === activeCycleId ? {
                  ...c, planning: planningUpdate || c.planning, weeklyCompletion: completionUpdate || c.weeklyCompletion
              }: c));
          }
      }

      if(user && !isGuest) {
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

              if (activeCycleId && (updates.weekId !== undefined || updates.isWeekCompleted !== undefined)) {
                  let pUpdate = updates.weekId !== undefined ? { ...activeCycle?.planning, [id]: updates.weekId } : undefined;
                  let cUpdate = updates.isWeekCompleted !== undefined ? { ...activeCycle?.weeklyCompletion, [id]: updates.isWeekCompleted } : undefined;
                  await syncCycleData(activeCycleId, { planning: pUpdate, weeklyCompletion: cUpdate });
              }
          } catch (err: any) {
              console.error("Critical: Failed to update notebook", err);
              setNotebooks(prev => prev.map(n => n.id === id ? prevNotebook : n));
              if (activeCycleId) setCycles(prev => prev.map(c => c.id === activeCycleId ? { ...c, planning: prevPlanning } : c));
              
              if (err.message && (err.message.includes("Could not find the") || err.message.includes("column"))) {
                  alert(`⚠️ ERRO DE SCHEMA DO BANCO DE DADOS ⚠️\n\nColuna faltando: ${err.message}.\n\nPOR FAVOR: Execute o script 'migration_v4.sql' no painel do Supabase.`);
              } else {
                  alert("Falha de conexão. Alterações não salvas.");
              }
          }
      }
  };

  const updateNotebookAccuracy = (id: string, newAccuracy: number) => {
    const nb = notebooks.find(n => n.id === id);
    if (!nb) return;
    const nextDate = calculateNextReview(newAccuracy, nb.relevance, nb.trend, config.algorithm);
    const today = new Date().toISOString();
    
    // Add to history
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
          try {
              const { error } = await supabase.from('notebooks').delete().eq('id', id);
              if (error) throw error;
          } catch (err) {
              console.error("Delete failed", err);
              if (prevNotebook) setNotebooks(prev => [...prev, prevNotebook]);
              alert("Erro ao excluir. Tente novamente.");
          }
      }
  };

  const bulkUpdateNotebooks = async (ids: string[], updates: Partial<Notebook> | 'DELETE') => {
      if (updates === 'DELETE') {
          setNotebooks(prev => prev.filter(nb => !ids.includes(nb.id)));
          if(user && !isGuest) await supabase.from('notebooks').delete().in('id', ids);
      } else {
          setNotebooks(prev => prev.map(nb => ids.includes(nb.id) ? { ...nb, ...updates } : nb));
          if(user && !isGuest) ids.forEach(id => editNotebook(id, updates));
      }
  };

  const moveNotebookToWeek = async (id: string, weekId: string | null) => {
      await editNotebook(id, { weekId });
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

  const addNote = async () => {
      const newNote: Note = { id: crypto.randomUUID(), content: '', color: 'yellow', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setNotes(prev => [newNote, ...prev]);
      if(user && !isGuest) await supabase.from('notes').insert({ id: newNote.id, user_id: user.id, content: '', color: 'yellow' });
  };

  const updateNote = async (id: string, content: string, color?: Note['color']) => {
      const updatedAt = new Date().toISOString();
      setNotes(prev => prev.map(n => n.id === id ? { ...n, content, color: color || n.color, updatedAt } : n));
      if(user && !isGuest) {
          const payload: any = { content, updated_at: updatedAt };
          if(color) payload.color = color;
          await supabase.from('notes').update(payload).eq('id', id);
      }
  };

  const deleteNote = async (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
      if(user && !isGuest) await supabase.from('notes').delete().eq('id', id);
  };

  return (
    <StoreContext.Provider value={{ 
      notebooks, config, reports, protocol, cycles, activeCycleId, framework, notes, loading, user, isGuest,
      focusedNotebookId, setFocusedNotebookId, pendingCreateData, setPendingCreateData,
      enterGuestMode, createCycle, selectCycle, deleteCycle, updateConfig, updateNotebookAccuracy, moveNotebookToWeek, 
      getWildcardNotebook, addNotebook, editNotebook, deleteNotebook, bulkUpdateNotebooks, saveReport, deleteReport,
      addProtocolItem, toggleProtocolItem, deleteProtocolItem, updateFramework, addNote, updateNote, deleteNote
    }}>
      {children}
    </StoreContext.Provider>
  );
};