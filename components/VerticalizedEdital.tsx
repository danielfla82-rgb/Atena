
import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { 
    Notebook, Weight, Relevance, Trend, NotebookStatus 
} from '../types';
import { 
    CheckSquare, Square, AlertCircle, ArrowUpCircle, CheckCircle2, ListChecks, 
    Search, BrainCircuit, Loader2, Sparkles, ChevronDown, ChevronUp, FileWarning,
    ToggleLeft, ToggleRight, Plus, Link as LinkIcon, ExternalLink, Zap,
    Clock, AlertTriangle, Save, X, Pencil, FileCode, ZoomIn, Trash2, Flag, Scale
} from 'lucide-react';

const INITIAL_FORM_STATE = {
    discipline: '', name: '', subtitle: '', tecLink: '', obsidianLink: '', legislationLink: '', accuracy: 0, targetAccuracy: 90, 
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, 
    status: NotebookStatus.NOT_STARTED, notes: '', images: [] as string[],
    lastPractice: new Date().toISOString().split('T')[0] 
};

export const VerticalizedEdital: React.FC = () => {
    const { notebooks, updateNotebook, deleteNotebook } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [expandedDiscipline, setExpandedDiscipline] = useState<string | null>(null);

    // Group by discipline
    const groupedNotebooks = notebooks.reduce((acc, nb) => {
        if (!acc[nb.discipline]) acc[nb.discipline] = [];
        acc[nb.discipline].push(nb);
        return acc;
    }, {} as Record<string, Notebook[]>);

    const sortedDisciplines = Object.keys(groupedNotebooks).sort();

    const openModal = (nb: Notebook) => {
        setEditingId(nb.id);
        const currentImages = nb.images || (nb.image ? [nb.image] : []);
        setFormData({
            discipline: nb.discipline,
            name: nb.name,
            subtitle: nb.subtitle || '',
            tecLink: nb.tecLink || '',
            obsidianLink: nb.obsidianLink || '',
            legislationLink: nb.legislationLink || '',
            accuracy: nb.accuracy,
            targetAccuracy: nb.targetAccuracy,
            weight: nb.weight,
            relevance: nb.relevance,
            trend: nb.trend,
            status: nb.status || NotebookStatus.NOT_STARTED,
            notes: nb.notes || '',
            images: currentImages,
            lastPractice: nb.lastPractice ? nb.lastPractice.split('T')[0] : new Date().toISOString().split('T')[0]
        });
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
        if (editingId) {
            await updateNotebook(editingId, {
                notes: formData.notes,
                images: formData.images,
                tecLink: formData.tecLink,
                obsidianLink: formData.obsidianLink,
                legislationLink: formData.legislationLink
            });
            setIsModalOpen(false);
        }
    };

    const toggleStatus = async (nb: Notebook) => {
        const newStatus = nb.status === NotebookStatus.COMPLETED ? NotebookStatus.IN_PROGRESS : NotebookStatus.COMPLETED;
        await updateNotebook(nb.id, { status: newStatus });
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <ListChecks className="text-emerald-500" /> Edital Verticalizado
                    </h1>
                    <p className="text-slate-400 mt-1">Checklist de tópicos estudados.</p>
                </div>
            </div>

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 mb-6">
                <Search className="text-slate-500 mr-2" size={18} />
                <input 
                    type="text" 
                    placeholder="Filtrar tópicos..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
                />
            </div>

            <div className="space-y-4">
                {sortedDisciplines.map(discipline => {
                    const disciplineNotebooks = groupedNotebooks[discipline].filter(nb => 
                        nb.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    
                    if (disciplineNotebooks.length === 0) return null;

                    const completedCount = disciplineNotebooks.filter(nb => nb.status === NotebookStatus.COMPLETED).length;
                    const totalCount = disciplineNotebooks.length;
                    const progress = Math.round((completedCount / totalCount) * 100);
                    const isExpanded = expandedDiscipline === discipline || searchTerm.length > 0;

                    return (
                        <div key={discipline} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div 
                                onClick={() => setExpandedDiscipline(expandedDiscipline === discipline ? null : discipline)}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                                    <h3 className="text-white font-bold">{discipline}</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-xs font-mono text-slate-400">{completedCount}/{totalCount} ({progress}%)</div>
                                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="border-t border-slate-800">
                                    {disciplineNotebooks.map(nb => (
                                        <div key={nb.id} className="p-3 pl-10 border-b border-slate-800/50 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => toggleStatus(nb)} className={`transition-colors ${nb.status === NotebookStatus.COMPLETED ? 'text-emerald-500' : 'text-slate-600 hover:text-slate-400'}`}>
                                                    {nb.status === NotebookStatus.COMPLETED ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </button>
                                                <span className={`${nb.status === NotebookStatus.COMPLETED ? 'line-through text-slate-500' : 'text-slate-300'}`}>{nb.name}</span>
                                            </div>
                                            <button onClick={() => openModal(nb)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                            <h2 className="text-xl font-bold text-white">Editar Detalhes</h2>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-slate-500 hover:text-white" /></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-8">
                             {/* Section 3: Rascunhos & Anotações (Required Snippet) */}
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