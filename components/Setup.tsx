

import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store';
import { 
    Weight, Relevance, Trend, NotebookStatus, Notebook 
} from '../types';
import { 
    Plus, Search, Pencil, X, Link as LinkIcon, Calendar, Lock,
    Layout, FileCode, CheckSquare, Check, Timer, Calculator, AlertCircle, ArrowRight, Settings2, 
    GanttChartSquare, ZoomIn, Trash2, CalendarClock, Flag, ChevronLeft, ChevronRight, Inbox, 
    Layers, Star, ScanSearch, Scale, Loader2, CalendarDays, Sun, Save, Hand, MoveLeft, Sparkles, 
    TrendingUp, ToggleLeft, ToggleRight, Bookmark, AlertTriangle, ChevronsLeft, ChevronsRight, 
    RefreshCw, MoreHorizontal, Circle, CheckCircle2, XCircle
} from 'lucide-react';

const INITIAL_FORM_STATE = {
    discipline: '', name: '', subtitle: '', tecLink: '', errorNotebookLink: '', obsidianLink: '', legislationLink: '', 
    accuracy: 0, targetAccuracy: 90, 
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, 
    status: NotebookStatus.NOT_STARTED, notes: '', images: [] as string[],
    lastPractice: new Date().toISOString().split('T')[0],
    nextReview: '',
    weekId: '',
    notStudiedToggle: true
};

export const Setup: React.FC = () => {
    const { notebooks, addNotebook, updateNotebook, deleteNotebook, config, redistributeOverdue } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const filteredNotebooks = notebooks.filter(nb => 
        nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        nb.discipline.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate Available Weeks
    const weeks = useMemo(() => {
        const count = config.weeksUntilExam || 12;
        return Array.from({ length: count }, (_, i) => ({
            id: `week-${i + 1}`,
            label: `Semana ${i + 1}`
        }));
    }, [config.weeksUntilExam]);

    const handleEditClick = (notebook: Notebook) => {
        setEditingId(notebook.id);
        const hasStudied = notebook.status !== NotebookStatus.NOT_STARTED;
        const currentImages = notebook.images || (notebook.image ? [notebook.image] : []);
        
        setFormData({
            discipline: notebook.discipline,
            name: notebook.name,
            subtitle: notebook.subtitle || '',
            tecLink: notebook.tecLink || '',
            errorNotebookLink: notebook.errorNotebookLink || '',
            obsidianLink: notebook.obsidianLink || '',
            legislationLink: notebook.legislationLink || '',
            accuracy: notebook.accuracy,
            targetAccuracy: notebook.targetAccuracy,
            weight: notebook.weight,
            relevance: notebook.relevance,
            trend: notebook.trend,
            notes: notebook.notes || '',
            images: currentImages,
            lastPractice: notebook.lastPractice ? notebook.lastPractice.split('T')[0] : new Date().toISOString().split('T')[0],
            nextReview: notebook.nextReview ? notebook.nextReview.split('T')[0] : '',
            weekId: notebook.weekId || '',
            status: notebook.status,
            notStudiedToggle: !hasStudied
        });
        setIsModalOpen(true);
    };

    const handleCreateClick = () => {
        setEditingId(null);
        setFormData(INITIAL_FORM_STATE);
        setIsModalOpen(true);
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({ 
                        ...prev, 
                        images: [...prev.images, reader.result as string] 
                    }));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Partial<Notebook> = {
            discipline: formData.discipline,
            name: formData.name,
            subtitle: formData.subtitle,
            tecLink: formData.tecLink,
            errorNotebookLink: formData.errorNotebookLink,
            legislationLink: formData.legislationLink,
            obsidianLink: formData.obsidianLink,
            accuracy: formData.accuracy,
            targetAccuracy: formData.targetAccuracy,
            weight: formData.weight,
            relevance: formData.relevance,
            trend: formData.trend,
            status: formData.notStudiedToggle ? NotebookStatus.NOT_STARTED : (formData.status === NotebookStatus.NOT_STARTED ? NotebookStatus.IN_PROGRESS : formData.status),
            notes: formData.notes,
            images: formData.images,
            lastPractice: formData.lastPractice,
            nextReview: formData.nextReview || undefined,
            weekId: formData.weekId || null
        };

        if (editingId) {
            await updateNotebook(editingId, payload);
        } else {
            await addNotebook(payload);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Settings2 className="text-emerald-500" /> Planejamento Tático
                    </h1>
                    <p className="text-slate-400 mt-1">Configure seus cadernos, pesos e alocação temporal.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={redistributeOverdue} 
                        className="flex items-center gap-2 px-4 py-2 bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                        title="Mover tarefas atrasadas para frente"
                    >
                        <RefreshCw size={14} /> Panic Button
                    </button>
                    <button onClick={handleCreateClick} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors">
                        <Plus size={18} /> Novo Caderno
                    </button>
                </div>
            </div>

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
                <Search className="text-slate-500 mr-2" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar cadernos..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotebooks.map(nb => (
                    <div key={nb.id} onClick={() => handleEditClick(nb)} className="bg-slate-900 border border-slate-800 p-4 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-all group relative overflow-hidden">
                        {nb.weekId && (
                            <div className="absolute top-0 right-0 bg-slate-800 px-2 py-1 rounded-bl-lg border-b border-l border-slate-700 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                {weeks.find(w => w.id === nb.weekId)?.label || nb.weekId}
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{nb.discipline}</span>
                            <div className="flex gap-2">
                                <span className={`w-2 h-2 rounded-full ${nb.status === NotebookStatus.COMPLETED ? 'bg-emerald-500' : nb.status === NotebookStatus.IN_PROGRESS ? 'bg-amber-500' : 'bg-slate-600'}`}></span>
                            </div>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-emerald-400 transition-colors">{nb.name}</h3>
                        <p className="text-slate-500 text-sm truncate">{nb.subtitle || 'Sem subtítulo'}</p>
                        <div className="mt-4 flex gap-2 text-xs text-slate-400">
                             <span className="bg-slate-800 px-2 py-1 rounded">Peso: {nb.weight}</span>
                             <span className="bg-slate-800 px-2 py-1 rounded">Meta: {nb.targetAccuracy}%</span>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                            <h2 className="text-xl font-bold text-white">{editingId ? 'Editar Caderno' : 'Novo Caderno'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-slate-500 hover:text-white" /></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-8">
                            {/* Section 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Disciplina</label><input type="text" value={formData.discipline} onChange={e => handleChange('discipline', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" required /></div>
                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Tópico</label><input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500" required /></div>
                            </div>

                            {/* Section 1.5: Planning (NEW) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-2"><Calendar size={14} className="text-emerald-500"/> Alocação Semanal</label>
                                <select 
                                    value={formData.weekId} 
                                    onChange={(e) => handleChange('weekId', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 appearance-none"
                                >
                                    <option value="">-- Não Alocado (Backlog) --</option>
                                    {weeks.map(w => (
                                        <option key={w.id} value={w.id}>{w.label}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1">Defina em qual semana do ciclo este tópico deve ser estudado.</p>
                            </div>

                            {/* Section 2: Links */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">Links Externos</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="url" placeholder="Link TEC Concursos" value={formData.tecLink} onChange={e => handleChange('tecLink', e.target.value)} className="bg-slate-800 border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 border w-full text-sm" />
                                    <input type="url" placeholder="Link Caderno de Erros" value={formData.errorNotebookLink} onChange={e => handleChange('errorNotebookLink', e.target.value)} className="bg-slate-800 border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 border w-full text-sm" />
                                </div>
                            </div>

                            {/* Section 3: Rascunhos & Anotações */}
                            <div className="space-y-4 pt-2">
                                <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Rascunhos & Anotações</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Obsidian / Notion</label>
                                        <div className="relative">
                                            <FileCode className="absolute left-3 top-3.5 text-slate-500" size={16} />
                                            <input type="url" value={formData.obsidianLink} onChange={e => handleChange('obsidianLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="obsidian://open?vault=..." />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Link Legislação (Lei Seca)</label>
                                        <div className="relative">
                                            <Scale className="absolute left-3 top-3.5 text-slate-500" size={16} />
                                            <input type="url" value={formData.legislationLink} onChange={e => handleChange('legislationLink', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white outline-none focus:border-emerald-500" placeholder="https://planalto.gov.br..." />
                                        </div>
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

                            <div className="flex justify-end pt-6 border-t border-slate-800 gap-3 sticky bottom-0 bg-slate-900 pb-4">
                                {editingId && <button type="button" onClick={() => { deleteNotebook(editingId); setIsModalOpen(false); }} className="px-4 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-lg mr-auto">Excluir</button>}
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/20">Salvar Alterações</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Lightbox */}
            {lightboxIndex !== null && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxIndex(null)}>
                    <img src={formData.images[lightboxIndex]} className="max-w-full max-h-full rounded-lg shadow-2xl" />
                    <button className="absolute top-4 right-4 text-white hover:text-red-500"><X size={32}/></button>
                </div>
            )}
        </div>
    );
};