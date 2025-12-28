
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Notebook, NotebookStatus, Weight, Relevance, Trend } from '../types';
import { 
    Activity, Target, Settings, Calendar, 
    Save, X, AlertTriangle, CheckCircle2, TrendingUp, Clock, 
    ChevronDown, BarChart3, PieChart as PieIcon, LineChart as LineIcon,
    Pencil, Link as LinkIcon, FileCode, ZoomIn, Trash2, Flag, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import { LiquidityGauge } from './LiquidityGauge';
import { QuadrantChart } from './QuadrantChart';
import { calculateNextReview } from '../utils/algorithm';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend, LineChart, Line
} from 'recharts';

// --- COMPONENTS FOR DASHBOARD TILES ---

const StatCard = ({ label, value, sub, color, icon: Icon }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-3xl font-black text-white">{value}</h3>
            {sub && <p className={`text-xs mt-1 font-medium ${color}`}>{sub}</p>}
        </div>
        <div className={`p-4 rounded-full bg-slate-800/50 text-slate-600 group-hover:text-white transition-colors`}>
            <Icon size={24} />
        </div>
    </div>
);

const ConstancyStrip = () => {
    // Mock de constância visual
    const days = Array.from({ length: 14 }, (_, i) => {
        const status = i === 11 ? 'current' : i > 11 ? 'future' : Math.random() > 0.3 ? 'done' : 'missed';
        return { status, date: `Dia ${i + 1}` };
    });

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Constância nos Estudos</h3>
                <span className="text-xs text-slate-400">Você está há <strong className="text-white">1 dia</strong> sem falhar</span>
            </div>
            <div className="flex gap-2 justify-between overflow-x-auto pb-2 custom-scrollbar">
                {days.map((d, i) => (
                    <div key={i} className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all
                        ${d.status === 'done' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-500' : 
                          d.status === 'missed' ? 'bg-red-900/10 border-red-500/20 text-red-500 opacity-50' :
                          d.status === 'current' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-bold scale-110' :
                          'bg-slate-800/50 border-slate-800 text-slate-600'}
                    `}>
                        {d.status === 'done' || d.status === 'current' ? <CheckCircle2 size={16} /> : d.status === 'missed' ? <X size={16} /> : <span className="text-[10px]">{i+1}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const AlertCard = ({ title, desc, type = 'critical', actionLabel, onAction }: any) => (
    <div className={`rounded-xl p-1 border-l-4 ${type === 'critical' ? 'bg-red-900/10 border-red-500' : 'bg-amber-900/10 border-amber-500'}`}>
        <div className="bg-slate-900/80 p-4 rounded-r-lg flex items-start gap-4">
            <div className={`p-3 rounded-lg ${type === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                <AlertTriangle size={20} />
            </div>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${type === 'critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                        {type === 'critical' ? 'Crítico' : 'Atenção'}
                    </span>
                    <span className="text-xs text-slate-500">Atena Sugere Hoje</span>
                </div>
                <h4 className="text-white font-bold text-lg">{title}</h4>
                <p className="text-slate-400 text-sm mt-1">{desc}</p>
            </div>
            {onAction && (
                <button 
                    onClick={onAction}
                    className="ml-auto bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-slate-700 hover:border-slate-500 shadow-lg"
                >
                    {actionLabel || 'Ação'}
                </button>
            )}
        </div>
    </div>
);

const ConfigModal = ({ isOpen, onClose, config, onSave }: any) => {
    const [localConfig, setLocalConfig] = useState(config);
    useEffect(() => { if (isOpen) setLocalConfig(config); }, [isOpen, config]);
    
    const handleChange = (field: string, value: any) => setLocalConfig((prev: any) => ({ ...prev, [field]: value }));
    
    const handleAlgoChange = (field: string, value: number) => setLocalConfig((prev: any) => ({ 
        ...prev, 
        algorithm: { 
            ...prev.algorithm, 
            baseIntervals: { ...prev.algorithm.baseIntervals, [field]: value } 
        } 
    }));

    const runTests = () => {
        console.log("Running Algorithm Tests with:", localConfig.algorithm);
        alert("Teste de algoritmo executado. Verifique o console.");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="text-emerald-500" /> Configuração do Concurso</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    
                    {/* 1. DADOS DO CONCURSO */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">1. Dados do Concurso</h4>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Cargo Alvo</label>
                            <input 
                                type="text" 
                                value={localConfig.targetRole} 
                                onChange={e => handleChange('targetRole', e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Data de Início</label>
                                <input 
                                    type="date" 
                                    value={localConfig.startDate} 
                                    onChange={e => handleChange('startDate', e.target.value)} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Data da Prova</label>
                                <input 
                                    type="date" 
                                    value={localConfig.examDate} 
                                    onChange={e => handleChange('examDate', e.target.value)} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Semanas de Estudo</label>
                                <input 
                                    type="number" 
                                    value={localConfig.weeksUntilExam} 
                                    onChange={e => handleChange('weeksUntilExam', parseInt(e.target.value))} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Ritmo (Pace)</label>
                                <select 
                                    value={localConfig.studyPace} 
                                    onChange={e => handleChange('studyPace', e.target.value)} 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors appearance-none"
                                >
                                    <option value="Iniciante">Iniciante</option>
                                    <option value="Básico">Básico</option>
                                    <option value="Intermediário">Intermediário</option>
                                    <option value="Avançado">Avançado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. INTELIGÊNCIA (EDITAL) */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">2. Inteligência (Edital)</h4>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Conteúdo Programático (Texto)</label>
                            <textarea 
                                value={localConfig.editalText} 
                                onChange={e => handleChange('editalText', e.target.value)} 
                                className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-xs font-mono outline-none resize-none custom-scrollbar focus:border-emerald-500 transition-colors" 
                                placeholder="Cole o texto do edital aqui para análise da IA..." 
                            />
                        </div>
                    </div>

                    {/* 3. ALGORITMO SRS (AVANÇADO) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2">
                            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">3. Algoritmo SRS (Avançado)</h4>
                            <button onClick={runTests} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 transition-colors">Run Tests</button>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Learning</label>
                                <input 
                                    type="number" 
                                    value={localConfig.algorithm.baseIntervals.learning} 
                                    onChange={e => handleAlgoChange('learning', parseInt(e.target.value))} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-white text-sm outline-none focus:border-emerald-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Mastering</label>
                                <input 
                                    type="number" 
                                    value={localConfig.algorithm.baseIntervals.mastering} 
                                    onChange={e => handleAlgoChange('mastering', parseInt(e.target.value))} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-white text-sm outline-none focus:border-emerald-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Reviewing</label>
                                <input 
                                    type="number" 
                                    value={localConfig.algorithm.baseIntervals.reviewing} 
                                    onChange={e => handleAlgoChange('reviewing', parseInt(e.target.value))} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-white text-sm outline-none focus:border-emerald-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Maintaining</label>
                                <input 
                                    type="number" 
                                    value={localConfig.algorithm.baseIntervals.maintaining} 
                                    onChange={e => handleAlgoChange('maintaining', parseInt(e.target.value))} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-white text-sm outline-none focus:border-emerald-500" 
                                />
                            </div>
                        </div>
                    </div>

                </div>
                
                <div className="p-6 border-t border-slate-800 bg-slate-900 flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 font-bold transition-colors">Cancelar</button>
                    <button onClick={() => { onSave(localConfig); onClose(); }} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-500 font-bold transition-colors shadow-lg shadow-emerald-900/20">Salvar Configurações</button>
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC = () => {
  const { notebooks, config, updateConfig, editNotebook } = useStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // NOTEBOOK EDITOR STATE
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
      discipline: '', name: '', subtitle: '', tecLink: '', errorNotebookLink: '', obsidianLink: '', accuracy: 0, targetAccuracy: 90, 
      weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, 
      status: NotebookStatus.NOT_STARTED, notes: '', images: [] as string[],
      lastPractice: new Date().toISOString().split('T')[0],
      nextReview: ''
  });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calcula estatísticas
  const totalReviews = notebooks.filter(n => n.accuracy > 0).length;
  const globalAccuracy = totalReviews > 0 
    ? Math.round(notebooks.reduce((acc, n) => acc + n.accuracy, 0) / totalReviews) 
    : 0;
  
  const totalTopics = notebooks.length;
  const startedTopics = notebooks.filter(n => n.status !== 'Não Iniciado').length;
  const progressPercent = totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0;

  // Find critical topic
  const criticalTopic = notebooks
    .filter(n => n.weight === 'Muito Alto' && n.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)[0];

  // Aggregated data for Charts
  const disciplineStats = useMemo(() => {
      const stats: Record<string, { totalAcc: number, count: number }> = {};
      notebooks.forEach(nb => {
          if (!stats[nb.discipline]) stats[nb.discipline] = { totalAcc: 0, count: 0 };
          if (nb.accuracy > 0) {
              stats[nb.discipline].totalAcc += nb.accuracy;
              stats[nb.discipline].count += 1;
          }
      });
      return Object.keys(stats).map(d => ({
          name: d,
          accuracy: stats[d].count > 0 ? Math.round(stats[d].totalAcc / stats[d].count) : 0,
          count: stats[d].count
      })).filter(d => d.count > 0).sort((a, b) => b.accuracy - a.accuracy);
  }, [notebooks]);

  const timelineData = useMemo(() => {
      const data: Record<string, { totalAcc: number, count: number }> = {};
      notebooks.forEach(n => {
          if (n.lastPractice && n.accuracy > 0) {
              const date = new Date(n.lastPractice).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              if (!data[date]) data[date] = { totalAcc: 0, count: 0 };
              data[date].totalAcc += n.accuracy;
              data[date].count++;
          }
      });
      return Object.keys(data).map(date => ({
          date,
          accuracy: Math.round(data[date].totalAcc / data[date].count)
      })).slice(-7);
  }, [notebooks]);

  const statusData = useMemo(() => {
      const counts: Record<string, number> = {
          [NotebookStatus.NOT_STARTED]: 0,
          [NotebookStatus.THEORY_DONE]: 0,
          [NotebookStatus.REVIEWING]: 0,
          [NotebookStatus.MASTERED]: 0
      };
      notebooks.forEach(n => {
          if (counts[n.status] !== undefined) counts[n.status]++;
          else counts[NotebookStatus.NOT_STARTED]++;
      });
      return Object.entries(counts)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ 
            name, value, 
            fill: name === NotebookStatus.NOT_STARTED ? '#334155' : name === NotebookStatus.THEORY_DONE ? '#3b82f6' : name === NotebookStatus.REVIEWING ? '#f59e0b' : '#10b981' 
        }));
  }, [notebooks]);

  const toggleSection = (section: string) => {
      setExpandedSection(expandedSection === section ? null : section);
  };

  // --- MODAL LOGIC ---
  const handleEditClick = (nb: Notebook) => {
    setEditingId(nb.id);
    let currentImages = nb.images || [];
    if (currentImages.length === 0 && nb.image) currentImages = [nb.image];
    
    setFormData({
        discipline: nb.discipline,
        name: nb.name,
        subtitle: nb.subtitle || '',
        tecLink: nb.tecLink || '',
        errorNotebookLink: nb.errorNotebookLink || '',
        obsidianLink: nb.obsidianLink || '',
        accuracy: nb.accuracy,
        targetAccuracy: nb.targetAccuracy,
        weight: nb.weight,
        relevance: nb.relevance,
        trend: nb.trend,
        status: nb.status,
        notes: nb.notes || '',
        images: currentImages,
        lastPractice: nb.lastPractice ? nb.lastPractice.split('T')[0] : new Date().toISOString().split('T')[0],
        nextReview: nb.nextReview ? nb.nextReview.split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    let nextReviewIso = undefined;
    if (formData.nextReview) {
        nextReviewIso = new Date(formData.nextReview).toISOString();
    } else {
        const calculated = calculateNextReview(Number(formData.accuracy), formData.relevance, formData.trend, config.algorithm);
        nextReviewIso = calculated.toISOString();
    }

    await editNotebook(editingId, {
        ...formData,
        accuracy: Number(formData.accuracy),
        targetAccuracy: Number(formData.targetAccuracy),
        nextReview: nextReviewIso,
        lastPractice: new Date(formData.lastPractice).toISOString()
    });
    setIsEditModalOpen(false);
  };

  const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
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
  const removeImage = (index: number) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  const handleNotStudied = () => setFormData(prev => ({ ...prev, accuracy: 0, status: NotebookStatus.NOT_STARTED }));
  const navigateLightbox = (direction: 'next' | 'prev') => {
      if (lightboxIndex === null) return;
      if (direction === 'next') setLightboxIndex((lightboxIndex + 1) % formData.images.length);
      else setLightboxIndex((lightboxIndex - 1 + formData.images.length) % formData.images.length);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
       
       {/* HEADER ACTIONS */}
       <div className="flex justify-between items-center mb-2">
           <h2 className="text-xl font-bold text-white">Dashboard Estratégico</h2>
           <button 
                onClick={() => setIsConfigOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
           >
               <Settings size={14} /> Configurar Concurso
           </button>
       </div>

       {/* ROW 1: KEY STATS */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StatCard label="Tempo de Estudo" value="2h15min" color="text-slate-400" icon={Clock} />
           <StatCard label="Desempenho" value={`${globalAccuracy}%`} sub={`${globalAccuracy >= 80 ? 'Excelente' : 'A melhorar'}`} color={globalAccuracy >= 80 ? 'text-emerald-400' : 'text-red-400'} icon={Activity} />
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="relative z-10">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Progresso no Edital</p>
                    <h3 className="text-3xl font-black text-white">{progressPercent}%</h3>
                    <div className="flex gap-4 mt-2 text-[10px] font-bold uppercase">
                        <span className="text-emerald-400">{startedTopics} Concluídos</span>
                        <span className="text-amber-500">{totalTopics - startedTopics} Pendentes</span>
                    </div>
                </div>
                <div className="p-4 rounded-full bg-slate-800/50 text-slate-600"><TrendingUp size={24} /></div>
           </div>
       </div>

       {/* ROW 2: MOTIVATION */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2"><ConstancyStrip /></div>
            <div className="bg-slate-50 text-slate-900 p-6 rounded-xl flex flex-col justify-center items-center text-center shadow-xl">
                <span className="text-4xl font-serif text-slate-300 mb-2">“</span>
                <p className="font-serif italic font-medium text-lg leading-relaxed">"Quanto mais alto voamos, menores parecemos aos olhos de quem não sabe voar."</p>
                <span className="text-xs font-bold uppercase tracking-widest mt-4 text-slate-400">— Nietzsche</span>
            </div>
       </div>

       {/* ROW 3: ALERTS */}
       <div className="space-y-6">
           {criticalTopic ? (
               <AlertCard 
                    title={`Atenção Imediata: ${criticalTopic.discipline}`}
                    desc={`Matéria de peso Muito Alto com desempenho crítico (${criticalTopic.accuracy}%). Foco total aqui hoje.`}
                    type="critical"
                    actionLabel="Abrir Caderno"
                    onAction={() => handleEditClick(criticalTopic)}
               />
           ) : (
               <AlertCard title="Zona de Excelência" desc="Nenhum ponto crítico detectado. Mantenha o ritmo de revisão das matérias base." type="warning" />
           )}
       </div>

       {/* ROW 4: GOALS */}
       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
           <h3 className="text-white font-bold flex items-center gap-2 mb-6"><Target size={18} className="text-emerald-500" /> Metas do Dia (Prioridade)</h3>
           <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
               <CheckCircle2 size={48} className="text-slate-700 mb-4" />
               <h4 className="text-white font-bold">Você está em dia!</h4>
               <p className="text-slate-500 text-sm">Utilize o Modo Coringa para adiantar revisões.</p>
           </div>
       </div>

       {/* ROW 5: ACCORDIONS */}
       <div className="space-y-2">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Central de Análise Detalhada</p>
           
           <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300">
               <button onClick={() => toggleSection('tactical')} className={`w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors ${expandedSection === 'tactical' ? 'bg-slate-800/50' : ''}`}>
                   <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-lg transition-colors ${expandedSection === 'tactical' ? 'bg-emerald-900/30 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}><Target size={18}/></div>
                       <div className="text-left"><h4 className="text-white font-bold text-sm">Radiografia Tática</h4><p className="text-slate-500 text-xs">Liquidez do Conhecimento & Matriz Estratégica</p></div>
                   </div>
                   <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${expandedSection === 'tactical' ? 'rotate-180' : ''}`} />
               </button>
               {expandedSection === 'tactical' && (
                   <div className="p-6 border-t border-slate-800 bg-slate-950/30 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-2">
                       <QuadrantChart data={notebooks} />
                       <LiquidityGauge notebooks={notebooks} />
                   </div>
               )}
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300">
               <button onClick={() => toggleSection('evolution')} className={`w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors ${expandedSection === 'evolution' ? 'bg-slate-800/50' : ''}`}>
                   <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-lg transition-colors ${expandedSection === 'evolution' ? 'bg-blue-900/30 text-blue-500' : 'bg-slate-800 text-slate-400'}`}><BarChart3 size={18}/></div>
                       <div className="text-left"><h4 className="text-white font-bold text-sm">Evolução & Competência</h4><p className="text-slate-500 text-xs">Histórico de Desempenho e Equilíbrio de Matérias</p></div>
                   </div>
                   <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${expandedSection === 'evolution' ? 'rotate-180' : ''}`} />
               </button>
               {expandedSection === 'evolution' && (
                   <div className="p-6 border-t border-slate-800 bg-slate-950/30 animate-in slide-in-from-top-2">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="h-[250px] w-full bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                               <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><BarChart3 size={14}/> Média de Acurácia por Disciplina</h3>
                               {disciplineStats.length > 0 ? (
                                   <ResponsiveContainer width="100%" height="100%"><BarChart data={disciplineStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 9}} axisLine={false} tickLine={false} interval={0} /><YAxis stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false} /><Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px'}}/><Bar dataKey="accuracy" radius={[4, 4, 0, 0]} barSize={30}>{disciplineStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.accuracy >= 80 ? '#10b981' : entry.accuracy >= 60 ? '#f59e0b' : '#ef4444'} />))}</Bar></BarChart></ResponsiveContainer>
                               ) : <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">Sem dados.</div>}
                           </div>
                           <div className="h-[250px] w-full bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                               <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><PieIcon size={14}/> Distribuição de Status</h3>
                               {statusData.length > 0 ? (
                                   <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />))}</Pie><Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px'}} itemStyle={{color: '#fff'}} /><Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} /></PieChart></ResponsiveContainer>
                               ) : <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">Sem dados.</div>}
                           </div>
                           <div className="h-[250px] w-full md:col-span-2 bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                               <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><LineIcon size={14}/> Evolução de Desempenho (Últimas Sessões)</h3>
                               {timelineData.length > 1 ? (
                                   <ResponsiveContainer width="100%" height="100%"><LineChart data={timelineData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false} /><YAxis stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false} domain={[0, 100]} /><Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px'}} /><Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#1e293b'}} activeDot={{r: 6, fill: '#fff'}} /></LineChart></ResponsiveContainer>
                               ) : <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">{timelineData.length === 1 ? "Dados insuficientes para linha de tendência (mínimo 2 dias)." : "Pratique mais para gerar o gráfico de evolução."}</div>}
                           </div>
                       </div>
                   </div>
               )}
           </div>
       </div>

       <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} config={config} onSave={updateConfig} />

       {/* NOTEBOOK EDITOR MODAL */}
       {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pencil size={20} className="text-emerald-500"/> Editar Caderno (Visualização Completa)</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                  <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">1. Identificação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Disciplina</label><input required value={formData.discipline} onChange={e => handleChange('discipline', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nome do Tópico</label><input required value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Subtópico / Foco</label><input value={formData.subtitle} onChange={e => handleChange('subtitle', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link do Caderno</label><div className="relative"><LinkIcon className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.tecLink} onChange={e => handleChange('tecLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" /></div></div>
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
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center gap-4">
                      <div className="flex-1 w-full">
                         <label className="block text-[10px] font-bold text-emerald-400 mb-1 uppercase">Taxa de Acerto Atual (%)</label>
                         <input type="number" min="0" max="100" value={formData.accuracy} onChange={e => handleChange('accuracy', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white font-mono text-center font-bold text-lg focus:border-emerald-500 outline-none" />
                      </div>
                      <div className="flex-1 w-full flex gap-2">
                         <button type="button" onClick={handleNotStudied} className="flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600">
                            <Flag size={16} /> Não estudei
                         </button>
                      </div>
                  </div>
              </div>
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Rascunhos & Anotações</h4>
                <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Obsidian / Notion</label><div className="relative"><FileCode className="absolute left-3 top-3.5 text-slate-500" size={16} /><input type="url" value={formData.obsidianLink} onChange={e => handleChange('obsidianLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="obsidian://open?vault=..." /></div></div>
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
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 font-medium transition-colors">Cancelar</button>
                <button type="button" onClick={handleSave} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2">
                    <Save size={18} /> Salvar Alterações
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
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
          </div>
      )}

    </div>
  );
};
