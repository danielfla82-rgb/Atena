import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Notebook, Weight, Relevance, Trend, NotebookStatus } from '../types';
import { calculateNextReview } from '../utils/algorithm';
import { 
    Search, Plus, Trash2, Edit2, Square, ChevronRight, ChevronDown, 
    BookOpen, Layers, CheckCircle2, LayoutGrid, Clock, AlertTriangle, Star, 
    History, Sparkles, X, Save, Maximize2, Thermometer,
    Pencil, Link as LinkIcon, XCircle, ZoomIn, ChevronLeft, Calendar, Loader2, TrendingUp, Info, Scale, FileCode, Flag
} from 'lucide-react';

export const Library: React.FC = () => {
  const { 
    notebooks, 
    config, 
    addNotebook, 
    editNotebook, 
    deleteNotebook, 
    pendingCreateData, 
    setPendingCreateData,
    focusedNotebookId,
    setFocusedNotebookId,
    startSession
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estado para controlar quais disciplinas (pastas) estão abertas
  // Inicia vazio ou com todas abertas dependendo da preferência.
  const [expandedDisciplines, setExpandedDisciplines] = useState<Record<string, boolean>>({});

  // --- FORM STATE (IDÊNTICO AO SETUP.TSX) ---
  const initialFormState = {
    discipline: '', name: '', subtitle: '', 
    tecLink: '', errorNotebookLink: '', favoriteQuestionsLink: '',
    lawLink: '', obsidianLink: '', 
    geminiLink1: '', geminiLink2: '',
    accuracy: 0, targetAccuracy: 90,
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, notes: '', images: [] as string[], accuracyHistory: [] as { date: string, accuracy: number }[]
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECTS ---
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
              // Força a abertura da pasta da disciplina do item focado
              setExpandedDisciplines(prev => ({...prev, [nb.discipline]: true}));
          }
          setFocusedNotebookId(null);
      }
  }, [focusedNotebookId, notebooks]);

  // --- CALCULATED DATA ---
  const existingDisciplines = useMemo(() => Array.from(new Set(notebooks.map(n => n.discipline))).sort(), [notebooks]);

  const computedNextReviewData = useMemo(() => {
      if (!isModalOpen) return null;
      const nextDate = calculateNextReview(Number(formData.accuracy), formData.relevance, formData.trend, config.algorithm);
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
      return { date: nextDate, label: weekLabel };
  }, [formData.accuracy, formData.relevance, formData.trend, config.algorithm, isModalOpen, config.startDate]);

  const stats = useMemo(() => {
      const validNotebooks = notebooks.filter(n => n.discipline !== 'Revisão Geral');
      const total = validNotebooks.length;
      const disciplines = new Set(validNotebooks.map(n => n.discipline)).size;
      const mastered = validNotebooks.filter(n => n.accuracy >= n.targetAccuracy).length;
      const globalAcc = total > 0 ? Math.round(validNotebooks.reduce((acc, n) => acc + n.accuracy, 0) / total) : 0;
      return { total, disciplines, mastered, globalAcc };
  }, [notebooks]);

  // Agrupamento por Disciplina (Lógica de Pastas)
  const groupedData = useMemo(() => {
      // 1. Filtragem
      const filtered = notebooks.filter(nb => {
          if (nb.discipline === 'Revisão Geral') return false; // Ocultar cards técnicos

          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
              nb.name.toLowerCase().includes(searchLower) || 
              nb.discipline.toLowerCase().includes(searchLower) ||
              (nb.subtitle && nb.subtitle.toLowerCase().includes(searchLower));

          if (!matchesSearch) return false;

          switch (activeFilter) {
              case 'review': return nb.status === NotebookStatus.REVIEWING;
              case 'critical': return nb.accuracy < 60 && nb.accuracy > 0;
              case 'new': return nb.accuracy === 0;
              case 'late': 
                  if (!nb.nextReview) return false;
                  return new Date(nb.nextReview).toISOString().split('T')[0] < new Date().toISOString().split('T')[0];
              case 'heavy': return nb.weight === Weight.MUITO_ALTO || nb.weight === Weight.ALTO;
              default: return true;
          }
      });

      // 2. Agrupamento
      const groups: Record<string, Notebook[]> = {};
      filtered.forEach(nb => {
          if (!groups[nb.discipline]) groups[nb.discipline] = [];
          groups[nb.discipline].push(nb);
      });

      // 3. Ordenação
      const sortedKeys = Object.keys(groups).sort();
      sortedKeys.forEach(key => {
          groups[key].sort((a, b) => a.name.localeCompare(b.name));
      });

      return { groups, sortedKeys };
  }, [notebooks, searchTerm, activeFilter]);

  // --- ACTIONS ---
  const toggleDiscipline = (discipline: string) => {
      setExpandedDisciplines(prev => ({ ...prev, [discipline]: !prev[discipline] }));
  };

  const handleOpenCreate = () => {
      setEditingId(null);
      setFormData(initialFormState);
      setIsModalOpen(true);
  };

  const handleOpenEdit = (nb: Notebook, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setEditingId(nb.id);
      let currentImages = nb.images || [];
      if (currentImages.length === 0 && nb.image) currentImages = [nb.image];
      
      setFormData({
          discipline: nb.discipline, name: nb.name, subtitle: nb.subtitle || '',
          tecLink: nb.tecLink || '', errorNotebookLink: nb.errorNotebookLink || '', favoriteQuestionsLink: nb.favoriteQuestionsLink || '',
          lawLink: nb.lawLink || '', obsidianLink: nb.obsidianLink || '',
          geminiLink1: nb.geminiLink1 || '', geminiLink2: nb.geminiLink2 || '',
          accuracy: nb.accuracy, targetAccuracy: nb.targetAccuracy,
          weight: nb.weight, relevance: nb.relevance, trend: nb.trend,
          notes: nb.notes || '', images: currentImages,
          accuracyHistory: nb.accuracyHistory || []
      });
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (window.confirm("Tem certeza que deseja excluir este caderno do banco de dados? Isso afetará o planejamento.")) await deleteNotebook(id);
  };

  // --- FORM FIELD HANDLERS ---
  const handleChange = (field: keyof typeof initialFormState, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      (Array.from(files) as File[]).forEach(file => {
          if (file.size > 2 * 1024 * 1024) { alert("Imagem muito grande (>2MB)."); return; }
          const reader = new FileReader();
          reader.onloadend = () => { if(reader.result) setFormData(prev => ({ ...prev, images: [...prev.images, reader.result as string] })); };
          reader.readAsDataURL(file);
      });
    }
  };
  
  const removeImage = (index: number) => { setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) })); };
  
  const navigateLightbox = (direction: 'next' | 'prev') => {
      if (lightboxIndex === null) return;
      if (direction === 'next') setLightboxIndex((lightboxIndex + 1) % formData.images.length);
      else setLightboxIndex((lightboxIndex - 1 + formData.images.length) % formData.images.length);
  };

  const handleQuickRecord = () => {
      const newAccuracy = Number(formData.accuracy);
      const newHistory = [...(formData.accuracyHistory || []), { date: new Date().toISOString(), accuracy: newAccuracy }].slice(-3);
      setFormData(prev => ({ ...prev, accuracyHistory: newHistory }));
  };

  const removeHistoryItem = (index: number) => {
      const newHistory = [...(formData.accuracyHistory || [])];
      newHistory.splice(index, 1);
      setFormData(prev => ({ ...prev, accuracyHistory: newHistory }));
  };

  const handleNotStudied = () => { setFormData(prev => ({ ...prev, accuracy: 0, status: NotebookStatus.NOT_STARTED as any })); };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          const nextDate = calculateNextReview(Number(formData.accuracy), formData.relevance, formData.trend, config.algorithm);
          const payload: any = { 
              ...formData, 
              accuracy: Number(formData.accuracy), 
              targetAccuracy: Number(formData.targetAccuracy),
              nextReview: nextDate.toISOString(),
              status: Number(formData.accuracy) > 0 ? NotebookStatus.REVIEWING : NotebookStatus.NOT_STARTED 
          };
          if (editingId) await editNotebook(editingId, payload);
          else await addNotebook(payload);
          setIsModalOpen(false);
      } catch (error) {
          console.error("Failed to save:", error);
          alert("Erro ao salvar.");
      } finally {
          setIsSaving(false);
      }
  };

  const getBadgeColor = (disc: string) => {
      const colors = [
          'bg-emerald-900/50 text-emerald-400 border-emerald-500/30', 
          'bg-cyan-900/50 text-cyan-400 border-cyan-500/30', 
          'bg-blue-900/50 text-blue-400 border-blue-500/30', 
          'bg-purple-900/50 text-purple-400 border-purple-500/30',
          'bg-pink-900/50 text-pink-400 border-pink-500/30',
          'bg-amber-900/50 text-amber-400 border-amber-500/30'
      ];
      const index = disc.length % colors.length;
      return colors[index];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20 h-full flex flex-col relative">
      
      {/* Lightbox for Images */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-2 gap-4">
          <div>
              <h1 className="text-2xl font-bold text-white mb-1">Banco de Disciplinas</h1>
              <p className="text-slate-400 text-sm">Gerencie seu conhecimento tático.</p>
          </div>
          <button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 w-full md:w-auto justify-center">
              <Plus size={18} /> Novo Caderno
          </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-slate-800 rounded-lg text-slate-400 hidden md:block"><BookOpen size={20} /></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total de Cadernos</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
              </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-slate-800 rounded-lg text-slate-400 hidden md:block"><Layers size={20} /></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Disciplinas</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.disciplines}</p>
              </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-emerald-900/20 rounded-lg text-emerald-500 hidden md:block"><CheckCircle2 size={20} /></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dominados</p>
                  <p className="text-2xl font-bold text-emerald-400">{stats.mastered} <span className="text-[10px] text-slate-500 font-normal">top</span></p>
              </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-slate-800 rounded-lg text-slate-400 hidden md:block"><LayoutGrid size={20} /></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Acurácia Global</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.globalAcc}%</p>
              </div>
          </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/50">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input 
                  type="text" 
                  placeholder="Buscar tópico..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-emerald-500 outline-none"
              />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
              {[
                  { id: 'all', label: 'Tudo', icon: null },
                  { id: 'review', label: 'Revisão', icon: <History size={12}/> },
                  { id: 'critical', label: 'Críticos', icon: <AlertTriangle size={12}/> },
                  { id: 'new', label: 'Nunca Vistos', icon: <Sparkles size={12}/> },
                  { id: 'late', label: 'Atrasados', icon: <Clock size={12}/> },
                  { id: 'heavy', label: 'Peso Alto', icon: <Star size={12}/> },
              ].map(f => (
                  <button 
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className={`
                          px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all border
                          ${activeFilter === f.id 
                              ? 'bg-emerald-600 text-white border-emerald-500' 
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}
                      `}
                  >
                      {f.icon} {f.label}
                  </button>
              ))}
          </div>
      </div>

      {/* LIST VIEW (GROUPED ACCORDION) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-10">
          {groupedData.sortedKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600 opacity-50">
                  <BookOpen size={48} className="mb-4" />
                  <p>Nenhum caderno encontrado com estes filtros.</p>
              </div>
          ) : (
              groupedData.sortedKeys.map(discipline => {
                  const items = groupedData.groups[discipline];
                  const avgAcc = Math.round(items.reduce((acc, i) => acc + i.accuracy, 0) / items.length);
                  const isExpanded = expandedDisciplines[discipline] !== false; // Default true se quiser

                  return (
                      <div key={discipline} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all shadow-sm hover:shadow-md hover:border-slate-700">
                          {/* Discipline Header Row */}
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors group select-none"
                            onClick={() => toggleDiscipline(discipline)}
                          >
                              <div className="flex items-center gap-4 min-w-0">
                                  <div className="text-slate-600 group-hover:text-white transition-colors">
                                      <Square size={20} />
                                  </div>
                                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-sm border ${getBadgeColor(discipline)}`}>
                                      {discipline.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                      <h3 className="text-white font-bold text-sm truncate">{discipline}</h3>
                                      <p className="text-xs text-slate-500 mt-0.5 truncate">{items.length} itens • <span className={avgAcc < 60 ? 'text-red-400' : 'text-emerald-400'}>{avgAcc}% acerto médio</span></p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                  <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                                      <div className={`h-full ${avgAcc < 60 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${avgAcc}%` }}></div>
                                  </div>
                                  <span className="text-xs font-mono text-slate-500 hidden sm:block">{avgAcc}%</span>
                                  <div className="p-2 text-slate-600 hover:text-white rounded-lg transition-colors">
                                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                  </div>
                              </div>
                          </div>

                          {/* Notebook Items (Accordion Body) */}
                          {isExpanded && (
                              <div className="bg-slate-950/30 border-t border-slate-800/50 divide-y divide-slate-800/30">
                                  {items.map(nb => {
                                      const isCritical = nb.weight === Weight.MUITO_ALTO && nb.accuracy < 60;
                                      
                                      return (
                                          <div key={nb.id} className={`group relative flex items-center justify-between p-3 pl-4 hover:bg-slate-900/80 transition-colors ${isCritical ? 'border-l-[3px] border-l-red-500 bg-red-900/5' : 'border-l-[3px] border-l-transparent'}`}>
                                              
                                              <div className="flex items-center gap-4 min-w-0 cursor-pointer flex-1" onClick={(e) => handleOpenEdit(nb, e)}>
                                                  <div className="text-slate-700 group-hover:text-emerald-500 transition-colors">
                                                      <Square size={18} />
                                                  </div>
                                                  
                                                  <div className="min-w-0 pr-4">
                                                      <h4 className={`text-sm font-medium truncate ${isCritical ? 'text-white' : 'text-slate-300'}`}>
                                                          {nb.name}
                                                      </h4>
                                                      {nb.subtitle && <p className="text-xs text-slate-500 truncate">{nb.subtitle}</p>}
                                                  </div>
                                              </div>

                                              <div className="flex items-center gap-3 flex-shrink-0">
                                                  {isCritical && (
                                                      <Thermometer size={14} className="text-red-500 hidden sm:block" />
                                                  )}
                                                  
                                                  <div className={`hidden md:flex items-center gap-2 px-2 py-1 rounded text-[10px] font-bold border ${nb.accuracy > 0 ? 'bg-blue-900/20 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                                      {nb.accuracy > 0 ? `Em Andamento (${nb.accuracy}%)` : 'Não Iniciado'}
                                                  </div>

                                                  <div className={`flex items-center justify-center px-2 py-1 rounded text-xs font-mono font-bold w-12 border ${nb.accuracy >= nb.targetAccuracy ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : nb.accuracy < 60 ? 'bg-red-900/20 text-red-400 border-red-500/30' : 'bg-amber-900/20 text-amber-400 border-amber-500/30'}`}>
                                                      {nb.accuracy}%
                                                  </div>

                                                  <div className="flex items-center gap-1">
                                                      <button 
                                                          onClick={() => startSession(nb)}
                                                          className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors" 
                                                          title="Estudar / Maximizar"
                                                      >
                                                          <Maximize2 size={14} />
                                                      </button>
                                                      <button 
                                                          onClick={(e) => handleOpenEdit(nb, e)}
                                                          className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                                          title="Editar"
                                                      >
                                                          <Edit2 size={14} />
                                                      </button>
                                                      <button 
                                                          onClick={(e) => handleDelete(nb.id, e)}
                                                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                                          title="Excluir"
                                                      >
                                                          <Trash2 size={14} />
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
              })
          )}
      </div>

      {/* RICH MODAL (IDENTICAL TO SETUP.TSX) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {editingId ? <Pencil size={20} className="text-blue-500"/> : <Plus size={20} className="text-emerald-500"/>}
                    {editingId ? 'Editar Caderno' : 'Novo Caderno'}
                </h3>
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
              </div>
              <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">2. Estratégia & Performance</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Peso</label><select value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Weight).map(w => <option key={w} value={w}>{w}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Relevância</label><select value={formData.relevance} onChange={(e) => handleChange('relevance', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Relevance).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Tendência</label><select value={formData.trend} onChange={(e) => handleChange('trend', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm">{Object.values(Trend).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Meta (%)</label><input type="number" min="0" max="100" value={formData.targetAccuracy} onChange={e => handleChange('targetAccuracy', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 text-sm text-center font-bold" /></div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-stretch gap-4">
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 w-full">
                             <div className="flex justify-between mb-1">
                                <label className="block text-[10px] font-bold text-emerald-400 uppercase">Taxa de Acerto Atual (%)</label>
                                {formData.accuracyHistory && formData.accuracyHistory.length > 0 && (
                                    <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                                        <History size={10}/> Últimos 3
                                    </span>
                                )}
                             </div>
                             <div className="flex gap-2">
                                <input type="number" min="0" max="100" value={formData.accuracy} onChange={e => handleChange('accuracy', e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-2 text-white font-mono text-center font-bold text-lg focus:border-emerald-500 outline-none" />
                                <button type="button" onClick={handleQuickRecord} disabled={isSaving} className="px-4 bg-emerald-600/20 border border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2">{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Registrar</button>
                             </div>
                             
                             {computedNextReviewData && (
                                 <div className="flex flex-col mt-2 gap-1">
                                     <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-slate-400">
                                         <span className="uppercase tracking-widest text-slate-500">Próxima Revisão:</span>
                                         <span className="text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                             <Calendar size={10} /> {computedNextReviewData.date.toLocaleDateString()}
                                         </span>
                                         <span className="text-slate-500 text-[9px] font-normal">{computedNextReviewData.label}</span>
                                     </div>
                                     <div className="flex justify-end relative group/help">
                                         <span className="flex items-center gap-1 text-[9px] text-slate-600 cursor-pointer hover:text-emerald-500 transition-colors underline decoration-dotted">
                                             <Info size={10} /> Como funciona o algoritmo?
                                         </span>
                                         <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl opacity-0 group-hover/help:opacity-100 transition-opacity z-50 pointer-events-none text-left">
                                             <h5 className="text-white text-xs font-bold mb-2 flex items-center gap-1"><Sparkles size={10}/> Método Atena (SRS)</h5>
                                             <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                                                 Baseado no Anki, mas calibrado para o mercado de concursos. O intervalo é calculado multiplicando:
                                             </p>
                                             <ul className="space-y-1.5">
                                                 <li className="text-[10px] text-slate-300 flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span><span><strong>Acurácia:</strong> Define o intervalo base (Aprendizado, Revisão ou Manutenção).</span></li>
                                                 <li className="text-[10px] text-slate-300 flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span><span><strong>Relevância:</strong> Acelera a revisão. "Altíssima" encurta o prazo em 30%.</span></li>
                                                 <li className="text-[10px] text-slate-300 flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span><span><strong>Tendência:</strong> Ajuste fino baseado na banca.</span></li>
                                             </ul>
                                         </div>
                                     </div>
                                 </div>
                             )}

                          </div>
                          <div className="flex-1 w-full flex gap-2">
                             <button type="button" onClick={handleNotStudied} className="flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600">
                                <Flag size={16} /> Não estudei
                             </button>
                          </div>
                      </div>
                      {formData.accuracyHistory && formData.accuracyHistory.length > 0 && (
                          <div className="border-t border-slate-700/50 pt-2 flex gap-2 overflow-x-auto pb-1 min-h-[45px]">
                              {formData.accuracyHistory.map((h, i) => (
                                  <div key={i} className="group relative flex flex-col items-center bg-slate-900 px-2 py-1 rounded border border-slate-800 min-w-[60px]">
                                      <button 
                                        type="button"
                                        onClick={() => removeHistoryItem(i)}
                                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-10 cursor-pointer shadow-sm"
                                        title="Excluir registro"
                                      >
                                          <X size={8} strokeWidth={3} />
                                      </button>
                                      <span className="text-[10px] text-slate-500 font-mono">{new Date(h.date).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}</span>
                                      <span className={`text-xs font-bold ${h.accuracy >= formData.targetAccuracy ? 'text-emerald-400' : h.accuracy < 60 ? 'text-red-400' : 'text-amber-400'}`}>{h.accuracy}%</span>
                                  </div>
                              ))}
                              <div className="flex items-center text-xs text-slate-500 gap-1 ml-2"><TrendingUp size={14} /> Tendência</div>
                          </div>
                      )}
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Rascunhos & Anotações</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-900/10 p-3 rounded-xl border border-indigo-500/20">
                    <div>
                        <label className="block text-[10px] font-bold text-indigo-300 mb-1 uppercase tracking-wider flex items-center gap-1"><Sparkles size={10}/> Link Gemini (Contexto 1)</label>
                        <input type="url" value={formData.geminiLink1} onChange={e => handleChange('geminiLink1', e.target.value)} className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg p-2.5 text-xs text-white outline-none focus:border-indigo-500 placeholder-indigo-300/30" placeholder="https://gemini.google.com/..." />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-indigo-300 mb-1 uppercase tracking-wider flex items-center gap-1"><Sparkles size={10}/> Link Gemini (Contexto 2)</label>
                        <input type="url" value={formData.geminiLink2} onChange={e => handleChange('geminiLink2', e.target.value)} className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg p-2.5 text-xs text-white outline-none focus:border-indigo-500 placeholder-indigo-300/30" placeholder="https://gemini.google.com/..." />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Texto de Lei</label>
                        <div className="relative"><Scale className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.lawLink} onChange={e => handleChange('lawLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="https://planalto.gov.br..." /></div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Obsidian / Notion</label>
                        <div className="relative"><FileCode className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.obsidianLink} onChange={e => handleChange('obsidianLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="obsidian://open?vault=..." /></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Anotações / Resumo</label><textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-all min-h-[200px] resize-none text-sm" placeholder="Mnemônicos..." /></div>
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