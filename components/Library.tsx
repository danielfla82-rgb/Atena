import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { supabase } from './supabase';
import { Notebook, Weight, Relevance, Trend, NotebookStatus, ScheduleItem } from '../types';
import { calculateNextReview, DEFAULT_ALGO_CONFIG } from '../utils/algorithm';
import { 
    Search, Plus, Trash2, Edit2, Square, ChevronRight, ChevronDown, 
    BookOpen, Layers, CheckCircle2, LayoutGrid, Clock, AlertTriangle, Star, 
    History, Sparkles, X, Save, Maximize2, Thermometer,
    Pencil, Link as LinkIcon, XCircle, ZoomIn, ChevronLeft, Calendar, Loader2, TrendingUp, Info, Scale, FileCode, Flag, List, Book, Brain, BrainCircuit, AlertCircle, PlayCircle,
    Zap, Gauge
} from 'lucide-react';

export const Library: React.FC = () => {
  const { 
    notebooks, 
    cycles,
    activeCycleId,
    config, 
    updateConfig,
    addNotebook, 
    editNotebook, 
    deleteNotebook, 
    pendingCreateData, 
    setPendingCreateData,
    focusedNotebookId,
    setFocusedNotebookId,
    startSession,
    fetchNotebookImages,
    isGuest
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // DELETE MODAL STATE
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<{id: string, name: string} | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'discipline' | 'status'>('discipline');
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const initialFormState = {
    discipline: '', name: '', subtitle: '', 
    tecLink: '', errorNotebookLink: '', favoriteQuestionsLink: '',
    lawLink: '', obsidianLink: '', 
    geminiLink1: '', geminiLink2: '',
    accuracy: 0, targetAccuracy: 90,
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, 
    status: NotebookStatus.NOT_STARTED,
    notes: '', images: [] as string[], accuracyHistory: [] as { date: string, accuracy: number }[],
    nextReview: '' as string | undefined | null
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ALGORITHM ACCELERATION LOGIC ---
  const currentReviewInterval = config.algorithm?.baseIntervals?.reviewing || DEFAULT_ALGO_CONFIG.baseIntervals.reviewing;
  const defaultReviewInterval = DEFAULT_ALGO_CONFIG.baseIntervals.reviewing;
  const currentFactor = Math.round(currentReviewInterval / defaultReviewInterval);

  const applyAcceleration = (factor: number) => {
      const base = DEFAULT_ALGO_CONFIG.baseIntervals;
      const newAlgoConfig = {
          ...config.algorithm,
          baseIntervals: {
              learning: Math.ceil(base.learning * factor),
              reviewing: Math.ceil(base.reviewing * factor),
              mastering: Math.ceil(base.mastering * factor),
              maintaining: Math.ceil(base.maintaining * factor)
          }
      };
      updateConfig({ ...config, algorithm: newAlgoConfig });
  };

  const INTERVAL_LABELS: Record<string, string> = {
      learning: 'Aprendizado (Fase 1)',
      reviewing: 'Revisão (Fase 2)',
      mastering: 'Domínio (Fase 3)',
      maintaining: 'Manutenção (Fase 4)'
  };

  // Helper to check if notebook is scheduled in active cycle
  const isScheduledInActiveCycle = useCallback((notebookId: string) => {
      const activeCycle = cycles.find(c => c.id === activeCycleId);
      if (!activeCycle) return false;
      
      // Check legacy weekId
      const nb = notebooks.find(n => n.id === notebookId);
      if (nb?.weekId) return true;

      // Check V10 Schedule
      if (activeCycle.schedule) {
          return Object.values(activeCycle.schedule).some(slots => 
              (slots as ScheduleItem[]).some(slot => slot.notebookId === notebookId)
          );
      }
      return false;
  }, [cycles, activeCycleId, notebooks]);

  const handleEdit = useCallback(async (notebook: Notebook) => {
      setEditingId(notebook.id);
      let currentImages = notebook.images || [];
      
      if (currentImages.length === 0 && !isGuest) {
          currentImages = await fetchNotebookImages(notebook.id);
      }

      if (currentImages.length === 0 && notebook.image) currentImages = [notebook.image];
      
      setFormData({
          discipline: notebook.discipline, name: notebook.name, subtitle: notebook.subtitle,
          tecLink: notebook.tecLink || '', errorNotebookLink: notebook.errorNotebookLink || '', favoriteQuestionsLink: notebook.favoriteQuestionsLink || '',
          lawLink: notebook.lawLink || '', obsidianLink: notebook.obsidianLink || '',
          geminiLink1: notebook.geminiLink1 || '', geminiLink2: notebook.geminiLink2 || '',
          accuracy: notebook.accuracy, targetAccuracy: notebook.targetAccuracy, weight: notebook.weight,
          relevance: notebook.relevance, trend: notebook.trend, notes: notebook.notes || '',
          status: notebook.status,
          images: currentImages, accuracyHistory: notebook.accuracyHistory || [],
          nextReview: notebook.nextReview || '' 
      });
      setIsModalOpen(true);
  }, [fetchNotebookImages, isGuest]);

  React.useEffect(() => {
      if (pendingCreateData) {
          setFormData({ ...initialFormState, ...pendingCreateData });
          setEditingId(null);
          setIsModalOpen(true);
          setPendingCreateData(null);
      }
  }, [pendingCreateData]);

  React.useEffect(() => {
      if (focusedNotebookId) {
          const nb = notebooks.find(n => n.id === focusedNotebookId);
          if (nb) {
              setSearchTerm(nb.name);
              const groupKey = viewMode === 'discipline' ? nb.discipline : nb.status;
              setExpandedGroups(prev => ({...prev, [groupKey]: true}));
              handleEdit(nb);
          }
          setFocusedNotebookId(null);
      }
  }, [focusedNotebookId, notebooks, viewMode, handleEdit]);

  const existingDisciplines = useMemo(() => Array.from(new Set(notebooks.map(n => n.discipline))).sort(), [notebooks]);

  const computedNextReviewData = useMemo(() => {
      if (!isModalOpen) return null;

      // LÓGICA ATUALIZADA: Se não iniciado e zerado, não calcula revisão
      if (formData.status === NotebookStatus.NOT_STARTED && Number(formData.accuracy) === 0) {
          return { isNotStarted: true };
      }

      const dateStr = formData.nextReview || calculateNextReview(Number(formData.accuracy), formData.relevance, formData.trend, config.algorithm).toISOString();
      const nextDate = new Date(dateStr);
      let weekLabel = '';
      if (config.startDate) {
          const start = new Date(config.startDate);
          start.setHours(0,0,0,0);
          const target = new Date(nextDate);
          target.setHours(0,0,0,0);
          const diffTime = target.getTime() - start.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0) {
              const weekNum = Math.floor(diffDays / 7) + 1;
              weekLabel = `(Semana ${weekNum})`;
          } else {
              weekLabel = '(Passado)';
          }
      }
      return { date: nextDate, label: weekLabel, isNotStarted: false };
  }, [formData.accuracy, formData.relevance, formData.trend, formData.nextReview, config.algorithm, isModalOpen, config.startDate, formData.status]);

  const stats = useMemo(() => {
      const validNotebooks = notebooks.filter(n => n.discipline !== 'Revisão Geral');
      const total = validNotebooks.length;
      const disciplines = new Set(validNotebooks.map(n => n.discipline)).size;
      const mastered = validNotebooks.filter(n => n.accuracy >= n.targetAccuracy).length;
      const globalAcc = total > 0 ? Math.round(validNotebooks.reduce((acc, n) => acc + n.accuracy, 0) / total) : 0;
      return { total, disciplines, mastered, globalAcc };
  }, [notebooks]);

  const groupedData = useMemo(() => {
      const filtered = notebooks.filter(nb => {
          if (nb.discipline === 'Revisão Geral') return false; 
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
              nb.name.toLowerCase().includes(searchLower) || 
              nb.discipline.toLowerCase().includes(searchLower) ||
              (nb.subtitle && nb.subtitle.toLowerCase().includes(searchLower));
          if (!matchesSearch) return false;
          switch (activeFilter) {
              case 'review': 
                  if (nb.status === NotebookStatus.REVIEWING) return true;
                  if (nb.nextReview) {
                      const today = new Date().toISOString().split('T')[0];
                      return nb.nextReview.split('T')[0] <= today;
                  }
                  return false;
              case 'critical': return nb.accuracy < 60 && nb.accuracy > 0;
              case 'new': return nb.accuracy === 0;
              case 'late': 
                  if (!nb.nextReview) return false;
                  return new Date(nb.nextReview).toISOString().split('T')[0] < new Date().toISOString().split('T')[0];
              case 'heavy': return nb.weight === Weight.MUITO_ALTO || nb.weight === Weight.ALTO;
              default: return true;
          }
      });

      const groups: Record<string, Notebook[]> = {};
      filtered.forEach(nb => {
          let key = '';
          if (viewMode === 'discipline') {
              key = nb.discipline;
          } else {
              if (nb.accuracy >= nb.targetAccuracy) key = 'Concluídos (Meta Batida)';
              else if (nb.accuracy > 0) key = 'Em Andamento';
              else key = 'Não Iniciados';
          }
          if (!groups[key]) groups[key] = [];
          groups[key].push(nb);
      });

      const sortedKeys = Object.keys(groups).sort();
      if (viewMode === 'status') {
          const priority = ['Em Andamento', 'Não Iniciados', 'Concluídos (Meta Batida)'];
          sortedKeys.sort((a,b) => {
              const idxA = priority.indexOf(a);
              const idxB = priority.indexOf(b);
              return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
          });
      }
      sortedKeys.forEach(key => {
          groups[key].sort((a, b) => a.name.localeCompare(b.name));
      });
      return { groups, sortedKeys };
  }, [notebooks, searchTerm, activeFilter, viewMode]);

  const toggleGroup = (key: string) => {
      setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenCreate = () => {
      setEditingId(null);
      setFormData(initialFormState);
      setIsModalOpen(true);
  };

  // --- DELETE LOGIC ---
  const requestDelete = (nb: {id: string, name: string}) => {
      // Direct state update - no event args needed here to keep it clean
      setNotebookToDelete(nb);
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (notebookToDelete) {
          try {
              await deleteNotebook(notebookToDelete.id);
              setDeleteModalOpen(false);
              setNotebookToDelete(null);
          } catch (error) {
              console.error("Delete error:", error);
              alert("Erro ao excluir.");
          }
      }
  };

  const handleChange = (field: keyof typeof initialFormState, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const handleUpdateAlgoInterval = (key: string, value: number) => {
      const currentAlgo = config.algorithm || DEFAULT_ALGO_CONFIG;
      const newAlgo = { ...currentAlgo, baseIntervals: { ...currentAlgo.baseIntervals, [key]: value } };
      updateConfig({ ...config, algorithm: newAlgo });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      (Array.from(files) as File[]).forEach(file => {
          if (file.size > 30 * 1024 * 1024) { alert("Imagem muito grande (>30MB)."); return; }
          const reader = new FileReader();
          reader.onloadend = () => { if(reader.result) setFormData(prev => ({ ...prev, images: [...prev.images, reader.result as string] })); };
          reader.readAsDataURL(file);
      });
    }
  };
  
  const removeImage = (index: number) => { setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) })); };
  
  // --- AUTOMATED CLOUD UPLOAD UTILS ---
  const base64ToBlob = async (base64: string): Promise<Blob> => {
      const res = await fetch(base64);
      return await res.blob();
  };

  const uploadImageToStorage = async (base64: string, prefix: string): Promise<string> => {
      try {
          const blob = await base64ToBlob(base64);
          const fileExt = base64.substring("data:image/".length, base64.indexOf(";base64"));
          const fileName = `uploads/${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
              .from('notebook-images')
              .upload(fileName, blob, { contentType: blob.type, upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('notebook-images').getPublicUrl(fileName);
          return data.publicUrl;
      } catch (e) {
          console.error("Auto-upload failed for one image, keeping base64 fallback", e);
          return base64; // Fallback to keep data safe even if upload fails
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        let nextDateStr: string | null | undefined = formData.nextReview;
        
        // LÓGICA CRÍTICA: Se "Não Iniciado" e "0%", remove da fila de revisão (null)
        if (formData.status === NotebookStatus.NOT_STARTED && Number(formData.accuracy) === 0) {
            nextDateStr = null;
        } else if (!nextDateStr) {
            // Caso contrário, se não tiver data, calcula
            const nextDate = calculateNextReview(Number(formData.accuracy), formData.relevance, formData.trend, config.algorithm);
            nextDateStr = nextDate.toISOString();
        }

        // --- AUTO UPLOAD LOGIC ---
        let processedImages = [...formData.images];
        if (!isGuest) {
            const uploadedImages: string[] = [];
            for (const img of processedImages) {
                if (img.startsWith('data:image')) {
                    // It's a new Base64 image, upload it!
                    // Use editingId or 'new' as prefix
                    const url = await uploadImageToStorage(img, editingId || 'new');
                    uploadedImages.push(url);
                } else {
                    // Already a URL
                    uploadedImages.push(img);
                }
            }
            processedImages = uploadedImages;
        }
        // -------------------------

        const payload: any = { 
            ...formData, 
            images: processedImages,
            accuracy: Number(formData.accuracy), 
            targetAccuracy: Number(formData.targetAccuracy),
            nextReview: nextDateStr
        };
        if (editingId) await editNotebook(editingId, payload);
        else await addNotebook(payload);
        setIsModalOpen(false);
    } catch (error: any) {
        console.error("Failed to save:", error);
        // Alert handled in store, but we keep modal open
        // Error message already shown by store alert logic or we can show it here if needed
        // Since store alerts, we just stop here.
    } finally {
        setIsSaving(false);
    }
  };

  const navigateLightbox = (direction: 'next' | 'prev') => {
      if (lightboxIndex === null) return;
      if (direction === 'next') setLightboxIndex((lightboxIndex + 1) % formData.images.length);
      else setLightboxIndex((lightboxIndex - 1 + formData.images.length) % formData.images.length);
  };

  const handleConcludeReview = async () => {
      setIsSaving(true);
      try {
          const newAccuracy = Number(formData.accuracy);
          const nextDate = calculateNextReview(newAccuracy, formData.relevance, formData.trend, config.algorithm);
          const newHistory = [...(formData.accuracyHistory || []), { date: new Date().toISOString(), accuracy: newAccuracy }].slice(-3);
          
          // Se estava "Não Iniciado" e concluiu revisão, muda para "Em Andamento" automaticamente
          let newStatus = formData.status;
          if (formData.status === NotebookStatus.NOT_STARTED && newAccuracy > 0) {
              newStatus = NotebookStatus.REVIEWING;
          }
          // Se bateu a meta, sugere "Dominado" (opcional, por enquanto mantemos manual ou apenas visual)
          
          if(editingId) {
              await editNotebook(editingId, { 
                  accuracy: newAccuracy, 
                  accuracyHistory: newHistory, 
                  lastPractice: new Date().toISOString(),
                  nextReview: nextDate.toISOString(),
                  status: newStatus
              });
              setFormData(prev => ({ 
                  ...prev, 
                  accuracyHistory: newHistory, 
                  nextReview: nextDate.toISOString(),
                  status: newStatus
              }));
          }
      } catch (err) { console.error("Quick save failed", err); } finally { setIsSaving(false); }
  };

  const removeHistoryItem = (index: number) => {
      const newHistory = [...(formData.accuracyHistory || [])];
      newHistory.splice(index, 1);
      setFormData(prev => ({ ...prev, accuracyHistory: newHistory }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20 relative h-full flex flex-col">
      {lightboxIndex !== null && (
          <div className="fixed inset-0 z-[60] bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-sm">
             <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white hover:text-emerald-500 z-50"><X size={32} /></button>
             {formData.images.length > 1 && (
                 <>
                    <button onClick={() => navigateLightbox('prev')} className="absolute left-4 p-2 bg-slate-800/50 rounded-full hover:bg-emerald-600 text-white"><ChevronLeft size={32}/></button>
                    <button onClick={() => navigateLightbox('next')} className="absolute right-4 p-2 bg-slate-800/50 rounded-full hover:bg-emerald-600 text-white"><ChevronRight size={32}/></button>
                 </>
             )}
             <img src={formData.images[lightboxIndex]} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
             <div className="absolute bottom-4 bg-black/50 px-4 py-1 rounded-full text-white text-sm">{lightboxIndex + 1} / {formData.images.length}</div>
          </div>
      )}

      {/* Delete Confirmation Modal - Rendered at Root Level */}
      {deleteModalOpen && notebookToDelete && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                  <div className="flex flex-col items-center text-center gap-4">
                      <div className="p-4 bg-red-500/10 rounded-full text-red-500">
                          <Trash2 size={32} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-white mb-2">Excluir Caderno?</h3>
                          <p className="text-sm text-slate-400">
                              Tem certeza que deseja apagar <strong>"{notebookToDelete.name}"</strong>? Esta ação não pode ser desfeita.
                          </p>
                      </div>
                      <div className="flex gap-3 w-full mt-2">
                          <button onClick={() => setDeleteModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors">Cancelar</button>
                          <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20">Excluir</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-6 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <LayoutGrid className="text-emerald-500" /> Banco de Disciplinas
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Gerencie seus cadernos e acompanhe o progresso por tópico.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar tópicos..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-emerald-500 outline-none"
                />
             </div>
             <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                 <button onClick={() => setViewMode('discipline')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'discipline' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Por Disciplina</button>
                 <button onClick={() => setViewMode('status')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'status' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Por Status</button>
             </div>
             <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-emerald-900/20 whitespace-nowrap justify-center"><Plus size={16} /> Novo Caderno</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 flex-shrink-0">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
              <div className="p-3 bg-slate-800 rounded-lg text-slate-400"><BookOpen size={20} /></div>
              <div><p className="text-[10px] text-slate-500 font-bold uppercase">Cadernos</p><p className="text-xl font-bold text-white">{stats.total}</p></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
              <div className="p-3 bg-slate-800 rounded-lg text-slate-400"><Layers size={20} /></div>
              <div><p className="text-[10px] text-slate-500 font-bold uppercase">Disciplinas</p><p className="text-xl font-bold text-white">{stats.disciplines}</p></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
              <div className="p-3 bg-emerald-900/20 rounded-lg text-emerald-500"><CheckCircle2 size={20} /></div>
              <div><p className="text-[10px] text-slate-500 font-bold uppercase">Dominados</p><p className="text-xl font-bold text-emerald-400">{stats.mastered}</p></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
              <div className="p-3 bg-indigo-900/20 rounded-lg text-indigo-500"><Thermometer size={20} /></div>
              <div><p className="text-[10px] text-slate-500 font-bold uppercase">Acurácia Global</p><p className="text-xl font-bold text-indigo-400">{stats.globalAcc}%</p></div>
          </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 custom-scrollbar">
          {[
              { id: 'all', label: 'Todos' },
              { id: 'review', label: 'Em Revisão', icon: Clock },
              { id: 'critical', label: 'Críticos (<60%)', icon: AlertTriangle },
              { id: 'new', label: 'Novos', icon: Sparkles },
              { id: 'late', label: 'Atrasados', icon: History },
              { id: 'heavy', label: 'Peso Alto', icon: Star }
          ].map(f => (
              <button 
                key={f.id} 
                onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-all ${activeFilter === f.id ? 'bg-slate-800 text-white border-slate-600' : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-700'}`}
              >
                  {f.icon && <f.icon size={12} />} {f.label}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          {groupedData.sortedKeys.map(groupKey => {
              const items = groupedData.groups[groupKey];
              const isExpanded = expandedGroups[groupKey];
              const avgAcc = Math.round(items.reduce((acc, i) => acc + i.accuracy, 0) / items.length);
              
              return (
                  <div key={groupKey} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all">
                      <div 
                        onClick={() => toggleGroup(groupKey)}
                        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                      >
                          <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${viewMode === 'status' ? 'text-white' : 'text-slate-400'} ${viewMode === 'status' && groupKey.includes('Concluídos') ? 'bg-emerald-500' : viewMode === 'status' && groupKey.includes('Andamento') ? 'bg-blue-500' : viewMode === 'status' ? 'bg-slate-700' : 'bg-slate-800'}`}>
                                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </div>
                              <div>
                                  <h3 className="font-bold text-white text-sm md:text-base">{groupKey}</h3>
                                  <p className="text-xs text-slate-500">{items.length} tópicos</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className={`px-2 py-1 rounded text-xs font-bold border ${avgAcc >= 90 ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : avgAcc < 60 ? 'bg-red-900/20 text-red-400 border-red-500/30' : 'bg-amber-900/20 text-amber-400 border-amber-500/30'}`}>
                                  Avg: {avgAcc}%
                              </div>
                          </div>
                      </div>

                      {isExpanded && (
                          <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                              {items.map(nb => {
                                  const isScheduled = isScheduledInActiveCycle(nb.id);
                                  
                                  return (
                                  <div key={nb.id} className="flex items-center justify-between group hover:bg-slate-800/20">
                                      {/* CONTENT AREA - CLICK TO EDIT */}
                                      <div 
                                        className="flex-1 min-w-0 p-4 cursor-pointer" 
                                        onClick={() => handleEdit(nb)}
                                      >
                                          <div className="flex items-center gap-2 mb-1">
                                              <h4 className="font-bold text-slate-200 text-sm truncate">{nb.name}</h4>
                                              {nb.weight === Weight.MUITO_ALTO && <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 rounded uppercase font-bold">Peso Max</span>}
                                              {viewMode === 'status' && <span className="text-[9px] text-slate-500 border border-slate-700 px-1.5 rounded uppercase font-bold">{nb.discipline}</span>}
                                              {isScheduled && <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 rounded uppercase font-bold flex items-center gap-1"><span className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse"></span> No Ciclo</span>}
                                          </div>
                                          <p className="text-xs text-slate-500 truncate">{nb.subtitle}</p>
                                          
                                          {/* Mobile Stats (only visible on small screens) */}
                                          <div className="flex md:hidden gap-3 mt-2 text-[10px] text-slate-500 font-mono">
                                              <span>Acc: <strong className={nb.accuracy < 60 ? 'text-red-400' : 'text-emerald-400'}>{nb.accuracy}%</strong></span>
                                              <span>Rev: {nb.nextReview ? nb.nextReview.split('T')[0].split('-').reverse().join('/') : '--'}</span>
                                          </div>
                                      </div>
                                      
                                      {/* ACTIONS AREA - STRICTLY SEPARATED */}
                                      <div className="flex items-center gap-4 md:gap-8 px-4 py-2 border-l border-slate-800/30">
                                          <div className="text-right hidden md:block">
                                              <p className="text-[10px] text-slate-500 uppercase font-bold">Acurácia</p>
                                              <p className={`font-mono font-bold text-sm ${nb.accuracy >= nb.targetAccuracy ? 'text-emerald-400' : nb.accuracy < 60 ? 'text-red-400' : 'text-amber-400'}`}>{nb.accuracy}%</p>
                                          </div>
                                          <div className="text-right hidden md:block">
                                              <p className="text-[10px] text-slate-500 uppercase font-bold">Revisão</p>
                                              <p className={`font-mono font-bold text-sm ${nb.nextReview && new Date(nb.nextReview) < new Date() ? 'text-red-400' : 'text-slate-300'}`}>
                                                  {nb.nextReview ? nb.nextReview.split('T')[0].split('-').reverse().join('/') : '--'}
                                              </p>
                                          </div>
                                          
                                          <div className="flex gap-2">
                                              <button type="button" onClick={() => startSession(nb)} className="p-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-lg transition-colors" title="Iniciar Sessão">
                                                  <Maximize2 size={16} />
                                              </button>
                                              
                                              {/* THE DELETE BUTTON - Isolated */}
                                              <button 
                                                type="button" 
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Double safe
                                                    requestDelete(nb);
                                                }} 
                                                className="p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 hover:border-red-500" 
                                                title="Excluir"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              );
          })}
          
          {groupedData.sortedKeys.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                  <BookOpen size={48} className="mb-4 opacity-50" />
                  <p className="text-sm">Nenhum caderno encontrado com este filtro.</p>
              </div>
          )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* ... Modal content remains the same ... */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pencil size={20} className="text-emerald-500"/> {editingId ? 'Editar Caderno' : 'Novo Caderno'}</h3>
                <button onClick={() => !isSaving && setIsModalOpen(false)} className="text-slate-400 hover:text-white" disabled={isSaving}><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                  <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">1. Identificação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Disciplina</label><input required list="disciplines" value={formData.discipline} onChange={e => handleChange('discipline', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /><datalist id="disciplines">{existingDisciplines.map(d => <option key={d} value={d} />)}</datalist></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nome do Tópico</label><input required value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                  </div>
                  <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Subtópico / Foco</label><input value={formData.subtitle} onChange={e => handleChange('subtitle', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Caderno TEC</label>
                        <div className="relative"><LinkIcon className="absolute left-3 top-3 text-slate-500" size={14} /><input type="url" value={formData.tecLink} onChange={e => handleChange('tecLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-9 text-xs text-white outline-none focus:border-emerald-500" placeholder="https://tecconcursos..." /></div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-red-400 mb-1 uppercase tracking-wider">Caderno de Erros</label>
                        <div className="relative"><XCircle className="absolute left-3 top-3 text-red-500" size={14} /><input type="url" value={formData.errorNotebookLink} onChange={e => handleChange('errorNotebookLink', e.target.value)} className="w-full bg-slate-800 border border-red-500/20 rounded-lg py-2.5 pl-9 text-xs text-white outline-none focus:border-red-500 placeholder-red-900/50" placeholder="Link de Erros..." /></div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-yellow-400 mb-1 uppercase tracking-wider">Questões Favoritas</label>
                        <div className="relative"><Star className="absolute left-3 top-3 text-yellow-500" size={14} /><input type="url" value={formData.favoriteQuestionsLink} onChange={e => handleChange('favoriteQuestionsLink', e.target.value)} className="w-full bg-slate-800 border border-yellow-500/20 rounded-lg py-2.5 pl-9 text-xs text-white outline-none focus:border-yellow-500 placeholder-yellow-900/50" placeholder="Link Favoritas..." /></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Externo 1</label>
                        <div className="relative"><Book className="absolute left-3 top-3 text-slate-500" size={14} /><input type="url" value={formData.lawLink} onChange={e => handleChange('lawLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-9 text-xs text-white outline-none focus:border-emerald-500" placeholder="Planalto..." /></div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-purple-400 mb-1 uppercase tracking-wider">Link Externo 2</label>
                        <div className="relative"><FileCode className="absolute left-3 top-3 text-purple-500" size={14} /><input type="url" value={formData.obsidianLink} onChange={e => handleChange('obsidianLink', e.target.value)} className="w-full bg-slate-800 border border-purple-500/20 rounded-lg py-2.5 pl-9 text-xs text-white outline-none focus:border-purple-500 placeholder-purple-900/50" placeholder="Link anotações..." /></div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-cyan-400 mb-1 uppercase tracking-wider">Link Externo 3</label>
                        <div className="relative"><Brain className="absolute left-3 top-3 text-cyan-500" size={14} /><input type="url" value={formData.geminiLink1} onChange={e => handleChange('geminiLink1', e.target.value)} className="w-full bg-slate-800 border border-cyan-500/20 rounded-lg py-2.5 pl-9 text-xs text-white outline-none focus:border-cyan-500 placeholder-cyan-900/50" placeholder="Link Chat..." /></div>
                    </div>
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">2. Estratégia & Performance</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Peso</label><select value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Weight).map(w => <option key={w} value={w}>{w}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Relevância</label><select value={formData.relevance} onChange={(e) => handleChange('relevance', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Relevance).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Tendência</label><select value={formData.trend} onChange={(e) => handleChange('trend', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Trend).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Meta (%)</label><input type="number" min="0" max="100" value={formData.targetAccuracy} onChange={e => handleChange('targetAccuracy', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm text-center font-bold" /></div>
                  </div>

                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Status do Caderno</label>
                      <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">
                          <option value={NotebookStatus.NOT_STARTED}>Não Iniciado</option>
                          <option value={NotebookStatus.REVIEWING}>Em Andamento</option>
                          <option value={NotebookStatus.MASTERED}>Concluído</option>
                      </select>
                  </div>

                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-stretch gap-4 shadow-inner">
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 w-full">
                             <div className="flex justify-between mb-1">
                                <label className="block text-[10px] font-bold text-emerald-400 uppercase">Acurácia na Revisão de Hoje (%)</label>
                                {formData.accuracyHistory && formData.accuracyHistory.length > 0 && (
                                    <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                                        <History size={10}/> Histórico
                                    </span>
                                )}
                             </div>
                             <div className="flex gap-2">
                                <input type="number" min="0" max="100" value={formData.accuracy} onChange={e => handleChange('accuracy', e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white font-mono text-center font-bold text-xl focus:border-emerald-500 outline-none" placeholder="0" />
                                <button type="button" onClick={handleConcludeReview} disabled={isSaving} className="px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30 border border-emerald-500/50">
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                                    Concluir Revisão
                                </button>
                             </div>
                             
                             {computedNextReviewData?.isNotStarted ? (
                                 <div className="flex flex-col mt-3 gap-1 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                     <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                         <span className="uppercase tracking-widest text-slate-500 flex items-center gap-1"><BrainCircuit size={12}/> Algoritmo Atena:</span>
                                         <span className="text-slate-400 bg-slate-800/80 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                                            <PlayCircle size={12} /> Aguardando Início
                                         </span>
                                     </div>
                                     <p className="text-[9px] text-slate-500 mt-1 italic">Este caderno entrará no fluxo de revisão apenas após o primeiro estudo.</p>
                                 </div>
                             ) : computedNextReviewData && (
                                 <div className="flex flex-col mt-3 gap-1 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                     <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                         <span className="uppercase tracking-widest text-slate-500 flex items-center gap-1"><BrainCircuit size={12}/> Algoritmo Atena:</span>
                                         <div className="flex items-center gap-2">
                                            <span className="text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                                                <Calendar size={12} /> {computedNextReviewData.date.toLocaleDateString()}
                                            </span>
                                            <span className="text-slate-500 text-[9px] font-normal">{computedNextReviewData.label}</span>
                                         </div>
                                     </div>
                                 </div>
                             )}

                          </div>
                      </div>
                      
                      {formData.accuracyHistory && formData.accuracyHistory.length > 0 && (
                          <div className="border-t border-slate-700/50 pt-2 flex gap-2 overflow-x-auto pb-1 min-h-[45px]">
                              {formData.accuracyHistory.map((h, i) => (
                                  <div key={i} className="group relative flex flex-col items-center bg-slate-900 px-2 py-1 rounded border border-slate-800 min-w-[60px]">
                                      <button type="button" onClick={() => removeHistoryItem(i)} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-10 cursor-pointer shadow-sm"><X size={8} strokeWidth={3} /></button>
                                      <span className="text-[10px] text-slate-500 font-mono">{new Date(h.date).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}</span>
                                      <span className={`text-xs font-bold ${h.accuracy >= formData.targetAccuracy ? 'text-emerald-400' : h.accuracy < 60 ? 'text-red-400' : 'text-amber-400'}`}>{h.accuracy}%</span>
                                  </div>
                              ))}
                              <div className="flex items-center text-xs text-slate-500 gap-1 ml-2"><TrendingUp size={14} /></div>
                          </div>
                      )}
                  </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                      <h3 className="text-sm font-bold text-purple-500 uppercase tracking-widest flex items-center gap-2">
                          <BrainCircuit size={16} /> Ajuste Fino do Algoritmo
                      </h3>
                      
                      {/* ACCELERATED MODE BUTTONS */}
                      <div className="flex items-center gap-1">
                          {[
                              { factor: 1, label: 'Normal' },
                              { factor: 2, label: 'Turbo 2x' },
                              { factor: 3, label: 'Turbo 3x' },
                              { factor: 4, label: 'Max 4x' }
                          ].map(mode => (
                              <button
                                  type="button"
                                  key={mode.factor}
                                  onClick={() => applyAcceleration(mode.factor)}
                                  className={`
                                      px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 border
                                      ${currentFactor === mode.factor 
                                          ? 'bg-purple-600 text-white border-purple-500' 
                                          : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-white'}
                                  `}
                                  title={`Multiplicar intervalos por ${mode.factor}`}
                              >
                                  {mode.factor > 1 && <Zap size={8} />}
                                  {mode.label}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(config.algorithm?.baseIntervals || DEFAULT_ALGO_CONFIG.baseIntervals).map(([key, val]) => (
                          <div key={key}>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  {INTERVAL_LABELS[key] || key} (Dias)
                              </label>
                              <input 
                                  type="number" 
                                  value={val} 
                                  onChange={(e) => handleUpdateAlgoInterval(key, parseFloat(e.target.value))} 
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-center font-bold outline-none focus:border-purple-500" 
                              />
                          </div>
                      ))}
                  </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Rascunhos & Anotações</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Anotações / Resumo</label><textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-all min-h-[200px] resize-none text-sm custom-scrollbar" placeholder="Mnemônicos..." /></div>
                    <div className="flex flex-col h-full">
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Galeria de Mapas Mentais</label>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 min-h-[200px] flex flex-col">
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative group aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer">
                                        <img src={img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onClick={() => setLightboxIndex(idx)} />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none"><ZoomIn size={16} className="text-white" /></div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                                <div onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-slate-700/50 transition-colors text-slate-500 hover:text-emerald-500"><Plus size={24} /><span className="text-[10px] uppercase font-bold mt-1">Add Imagem</span></div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                            <p className="text-[10px] text-slate-500 mt-auto text-center italic">Suporta múltiplas imagens. Clique em uma imagem para ampliar.</p>
                        </div>
                    </div>
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex gap-4">
                <button type="button" onClick={() => !isSaving && setIsModalOpen(false)} disabled={isSaving} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 font-medium transition-colors disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:bg-emerald-800 disabled:text-emerald-400 disabled:cursor-wait">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};