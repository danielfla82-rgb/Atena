
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isUsingFallback } from './lib/supabase';
import { 
    Notebook, Cycle, Note, ProtocolItem, FrameworkData, SavedReport, 
    AthensConfig, NotebookStatus, Weight, Relevance, Trend, WeeklyStatus
} from './types';

interface StoreContextType {
    user: any;
    loading: boolean;
    notebooks: Notebook[];
    cycles: Cycle[];
    activeCycleId: string | null;
    framework: FrameworkData;
    protocol: ProtocolItem[];
    reports: SavedReport[];
    notes: Note[];
    config: AthensConfig;
    isGuest: boolean;
    
    // Actions
    enterGuestMode: () => void;
    selectCycle: (id: string) => void;
    createCycle: (name: string, role: string) => void;
    deleteCycle: (id: string) => void;
    
    addNotebook: (nb: Partial<Notebook>) => Promise<void>;
    updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
    deleteNotebook: (id: string) => Promise<void>;
    updateNotebookAccuracy: (id: string, newAccuracy: number) => Promise<void>;
    moveNotebookToWeek: (id: string, weekId: string) => Promise<void>;
    redistributeOverdue: () => Promise<void>;
    
    updateConfig: (cfg: AthensConfig) => void;
    updateFramework: (fw: FrameworkData) => void;
    
    addProtocolItem: (item: Omit<ProtocolItem, 'id' | 'checked'>) => void;
    toggleProtocolItem: (id: string) => void;
    deleteProtocolItem: (id: string) => void;
    
    saveReport: (report: Omit<SavedReport, 'id' | 'date'>) => void;
    deleteReport: (id: string) => void;
    
    addNote: () => void;
    updateNote: (id: string, content: string, color?: Note['color']) => void;
    deleteNote: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error("useStore must be used within StoreProvider");
    return context;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    
    const [notebooks, setNotebooks] = useState<Notebook[]>([]);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
    const [framework, setFramework] = useState<FrameworkData>({ values: '', dream: '', motivation: '', action: '', habit: '' });
    const [protocol, setProtocol] = useState<ProtocolItem[]>([]);
    const [reports, setReports] = useState<SavedReport[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [config, setConfig] = useState<AthensConfig>({ targetRole: 'Concurseiro Elite', weeksUntilExam: 12, startDate: new Date().toISOString().split('T')[0] });

    // Auth & Initial Load
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) fetchData(session.user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchData(session.user.id);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchData = async (userId: string) => {
        if (isUsingFallback) return; // Fallback mode skips DB

        const results = await Promise.allSettled([
            supabase.from('notebooks').select('*').eq('user_id', userId),
            supabase.from('cycles').select('*').eq('user_id', userId),
            supabase.from('frameworks').select('*').eq('user_id', userId).single(),
            supabase.from('protocol_items').select('*').eq('user_id', userId),
            supabase.from('reports').select('*').eq('user_id', userId),
            supabase.from('notes').select('*').eq('user_id', userId)
        ]);

        // Extract Notebooks
        if (results[0].status === 'fulfilled' && results[0].value.data) {
            const formattedNotebooks = results[0].value.data.map((n: any) => ({
                ...n,
                tecLink: n.tec_link,
                errorNotebookLink: n.error_notebook_link,
                legislationLink: n.legislation_link,
                obsidianLink: n.obsidian_link,
                targetAccuracy: n.target_accuracy,
                lastPractice: n.last_practice,
                nextReview: n.next_review,
                weekId: n.week_id, // Map database column
                images: n.images || (n.image ? [n.image] : [])
            }));
            setNotebooks(formattedNotebooks);
        }

        // Extract Cycles
        if (results[1].status === 'fulfilled' && results[1].value.data) {
            const fetchedCycles = results[1].value.data.map((c: any) => ({
                ...c,
                lastAccess: c.last_access
            }));
            setCycles(fetchedCycles);
            // Auto-select most recently accessed cycle
            if (fetchedCycles.length > 0) {
                const sorted = [...fetchedCycles].sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime());
                selectCycle(sorted[0].id);
            }
        }

        // Extract Framework
        if (results[2].status === 'fulfilled' && results[2].value.data) {
            setFramework(results[2].value.data);
        }

        // Extract Protocol
        if (results[3].status === 'fulfilled' && results[3].value.data) {
            setProtocol(results[3].value.data);
        }
        
        // Extract Reports
        if (results[4].status === 'fulfilled' && results[4].value.data) {
            setReports(results[4].value.data);
        }

        // Extract Notes
        if (results[5].status === 'fulfilled' && results[5].value.data) {
            setNotes(results[5].value.data.map((note: any) => ({
                ...note,
                updatedAt: note.updated_at
            })));
        }
    };

    const enterGuestMode = () => {
        setIsGuest(true);
        setUser({ id: 'guest', email: 'visitante@atena.app' });
        setLoading(false);
    };

    // --- ACTIONS ---

    const selectCycle = (id: string) => {
        setActiveCycleId(id);
        const cycle = cycles.find(c => c.id === id);
        if (cycle) {
            setConfig(cycle.config);
            // Update last access
            if (!isGuest && user) {
                supabase.from('cycles').update({ last_access: new Date().toISOString() }).eq('id', id).then();
            }
        }
    };

    const createCycle = async (name: string, role: string) => {
        const newCycle: Cycle = {
            id: crypto.randomUUID(),
            name,
            config: { targetRole: role, weeksUntilExam: 12, startDate: new Date().toISOString().split('T')[0] },
            lastAccess: new Date().toISOString()
        };
        
        setCycles([...cycles, newCycle]);
        setActiveCycleId(newCycle.id);
        setConfig(newCycle.config);

        if (!isGuest && user) {
            await supabase.from('cycles').insert({
                id: newCycle.id,
                user_id: user.id,
                name: newCycle.name,
                config: newCycle.config,
                last_access: newCycle.lastAccess
            });
        }
    };

    const deleteCycle = async (id: string) => {
        setCycles(cycles.filter(c => c.id !== id));
        if (activeCycleId === id) setActiveCycleId(null);
        if (!isGuest && user) {
            await supabase.from('cycles').delete().eq('id', id);
        }
    };

    const addNotebook = async (nb: Partial<Notebook>) => {
        const newNotebook: Notebook = {
            id: crypto.randomUUID(),
            discipline: nb.discipline || 'Geral',
            name: nb.name || 'Novo Caderno',
            subtitle: nb.subtitle || '',
            accuracy: 0,
            targetAccuracy: 90,
            weight: Weight.MEDIO,
            relevance: Relevance.MEDIA,
            trend: Trend.ESTAVEL,
            status: NotebookStatus.NOT_STARTED,
            images: [],
            ...nb
        } as Notebook;

        setNotebooks([...notebooks, newNotebook]);

        if (!isGuest && user) {
            const payload = {
                id: newNotebook.id,
                user_id: user.id,
                discipline: newNotebook.discipline,
                name: newNotebook.name,
                subtitle: newNotebook.subtitle,
                tec_link: newNotebook.tecLink,
                error_notebook_link: newNotebook.errorNotebookLink,
                legislation_link: newNotebook.legislationLink,
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
                week_id: newNotebook.weekId // Save week info
            };
            await supabase.from('notebooks').insert(payload);
        }
    };

    const updateNotebook = async (id: string, updates: Partial<Notebook>) => {
        setNotebooks(notebooks.map(n => n.id === id ? { ...n, ...updates } : n));

        if (!isGuest && user) {
            const dbUpdates: any = {};
            if(updates.name !== undefined) dbUpdates.name = updates.name;
            if(updates.discipline !== undefined) dbUpdates.discipline = updates.discipline;
            if(updates.tecLink !== undefined) dbUpdates.tec_link = updates.tecLink;
            if(updates.errorNotebookLink !== undefined) dbUpdates.error_notebook_link = updates.errorNotebookLink;
            if(updates.legislationLink !== undefined) dbUpdates.legislation_link = updates.legislationLink;
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
        setNotebooks(notebooks.filter(n => n.id !== id));
        if (!isGuest && user) {
            await supabase.from('notebooks').delete().eq('id', id);
        }
    };
    
    const updateNotebookAccuracy = async (id: string, newAccuracy: number) => {
        await updateNotebook(id, { accuracy: newAccuracy, lastPractice: new Date().toISOString() });
    };

    const moveNotebookToWeek = async (id: string, weekId: string) => {
        await updateNotebook(id, { weekId });
    };

    // --- ALGORITMO DE REDISTRIBUIÇÃO (PANIC BUTTON) ---
    const redistributeOverdue = async () => {
        if (!config.startDate) {
            alert("Configure a data de início do projeto primeiro.");
            return;
        }

        const today = new Date();
        const start = new Date(config.startDate);
        
        // Calculate current week index (1-based)
        const diffTime = Math.abs(today.getTime() - start.getTime());
        const currentWeekIndex = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
        
        // Find overdue items: Week < CurrentWeek AND Status != Completed
        const overdueItems = notebooks.filter(nb => {
            if (!nb.weekId || !nb.weekId.startsWith('week-')) return false;
            const weekNum = parseInt(nb.weekId.replace('week-', ''));
            return weekNum < currentWeekIndex && nb.status !== NotebookStatus.COMPLETED && nb.weeklyStatus !== WeeklyStatus.COMPLETED && nb.weeklyStatus !== WeeklyStatus.SKIPPED;
        });

        if (overdueItems.length === 0) {
            alert("Tudo em dia! Nenhuma tarefa atrasada para redistribuir.");
            return;
        }

        const confirmRedistribute = window.confirm(`Encontrados ${overdueItems.length} tópicos atrasados. Deseja mover para as próximas semanas?`);
        if (!confirmRedistribute) return;

        // Distribute across next 4 weeks
        const futureWeeksCount = 4;
        
        // Optimistic UI Update batch
        const updates = overdueItems.map((nb, idx) => {
            const offset = idx % futureWeeksCount;
            const targetWeek = `week-${currentWeekIndex + offset}`;
            return { id: nb.id, weekId: targetWeek };
        });

        // Apply locally
        setNotebooks(prev => prev.map(nb => {
            const update = updates.find(u => u.id === nb.id);
            return update ? { ...nb, weekId: update.weekId, weeklyStatus: WeeklyStatus.PENDING } : nb;
        }));

        // Persist
        if (!isGuest && user) {
            for (const item of updates) {
                await supabase.from('notebooks').update({ week_id: item.weekId, weekly_status: 'PENDING' }).eq('id', item.id);
            }
        }
    };

    const updateConfig = (cfg: AthensConfig) => {
        setConfig(cfg);
        // Persist if active cycle
        if (activeCycleId) {
            const cycle = cycles.find(c => c.id === activeCycleId);
            if (cycle) {
                const updatedCycle = { ...cycle, config: cfg };
                setCycles(cycles.map(c => c.id === activeCycleId ? updatedCycle : c));
                if (!isGuest && user) {
                    supabase.from('cycles').update({ config: cfg }).eq('id', activeCycleId).then();
                }
            }
        }
    };

    const updateFramework = async (fw: FrameworkData) => {
        setFramework(fw);
        if (!isGuest && user) {
            const { error } = await supabase.from('frameworks').upsert({ user_id: user.id, ...fw });
            if (error) console.error("Error saving framework", error);
        }
    };

    const addProtocolItem = async (item: Omit<ProtocolItem, 'id' | 'checked'>) => {
        const newItem = { ...item, id: crypto.randomUUID(), checked: false };
        setProtocol([...protocol, newItem]);
        if (!isGuest && user) {
            await supabase.from('protocol_items').insert({
                id: newItem.id,
                user_id: user.id,
                ...item
            });
        }
    };

    const toggleProtocolItem = async (id: string) => {
        const item = protocol.find(p => p.id === id);
        if (item) {
            const newChecked = !item.checked;
            setProtocol(protocol.map(p => p.id === id ? { ...p, checked: newChecked } : p));
            if (!isGuest && user) {
                await supabase.from('protocol_items').update({ checked: newChecked }).eq('id', id);
            }
        }
    };

    const deleteProtocolItem = async (id: string) => {
        setProtocol(protocol.filter(p => p.id !== id));
        if (!isGuest && user) {
            await supabase.from('protocol_items').delete().eq('id', id);
        }
    };

    const saveReport = async (report: Omit<SavedReport, 'id' | 'date'>) => {
        const newReport = { ...report, id: crypto.randomUUID(), date: new Date().toISOString() };
        setReports([newReport, ...reports]);
        if (!isGuest && user) {
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
        setReports(reports.filter(r => r.id !== id));
        if (!isGuest && user) {
            await supabase.from('reports').delete().eq('id', id);
        }
    };

    const addNote = async () => {
        const newNote: Note = { 
            id: crypto.randomUUID(), 
            content: '', 
            color: 'yellow', 
            updatedAt: new Date().toISOString() 
        };
        setNotes([newNote, ...notes]);
        if (!isGuest && user) {
            await supabase.from('notes').insert({
                id: newNote.id,
                user_id: user.id,
                content: '',
                color: 'yellow'
            });
        }
    };

    const updateNote = async (id: string, content: string, color?: Note['color']) => {
        const timestamp = new Date().toISOString();
        setNotes(notes.map(n => n.id === id ? { ...n, content, color: color || n.color, updatedAt: timestamp } : n));
        
        if (!isGuest && user) {
            const updates: any = { content, updated_at: timestamp };
            if (color) updates.color = color;
            await supabase.from('notes').update(updates).eq('id', id);
        }
    };

    const deleteNote = async (id: string) => {
        setNotes(notes.filter(n => n.id !== id));
        if (!isGuest && user) {
            await supabase.from('notes').delete().eq('id', id);
        }
    };

    return (
        <StoreContext.Provider value={{
            user, loading, isGuest,
            notebooks, cycles, activeCycleId, framework, protocol, reports, notes, config,
            enterGuestMode, selectCycle, createCycle, deleteCycle,
            addNotebook, updateNotebook, deleteNotebook, updateNotebookAccuracy, moveNotebookToWeek, redistributeOverdue,
            updateConfig, updateFramework,
            addProtocolItem, toggleProtocolItem, deleteProtocolItem,
            saveReport, deleteReport,
            addNote, updateNote, deleteNote
        }}>
            {children}
        </StoreContext.Provider>
    );
};
