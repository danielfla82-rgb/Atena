
import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { 
    Notebook, Weight, Relevance, Trend, NotebookStatus 
} from '../types';
import { 
    Trash2, Plus, Search, X, Link as LinkIcon, Pencil, RefreshCw, 
    ChevronRight, ChevronLeft, Layers, Square, CheckSquare, 
    Circle, BookOpen, CheckCircle2, Siren, Star, Clock, Sparkles,
    Maximize2, FileCode, CalendarClock, ZoomIn, Flag, Save, Inbox, ScanSearch,
    Crown, Shield, Ghost, AlertOctagon, History, Scale
} from 'lucide-react';

const INITIAL_FORM_STATE = {
    discipline: '', name: '', subtitle: '', tecLink: '', obsidianLink: '', legislationLink: '', accuracy: 0, targetAccuracy: 90, 
    weight: Weight.MEDIO, relevance: Relevance.MEDIA, trend: Trend.ESTAVEL, 
    status: NotebookStatus.NOT_STARTED, notes: '', images: [] as string[],
    lastPractice: new Date().toISOString().split('T')[0] 
};

export const Library: React.FC = () => {
    const { notebooks, updateNotebook, deleteNotebook } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDiscipline, setFilterDiscipline] = useState<string>('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const disciplines = Array.from(new Set(notebooks.map(n => n.discipline))).sort();
    
    const filteredNotebooks = notebooks.filter(nb => {
        const matchesSearch = nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              nb.discipline.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterDiscipline === 'All' || nb.discipline === filterDiscipline;
        return matchesSearch && matchesFilter;
    });

    const openEditModal = (nb: Notebook) => {
        setEditingId(nb.id);
        const currentImages = nb.images || (nb.image ? [nb.image] : []);
        const safeDate = nb.lastPractice ? nb.lastPractice.split('T')[0] : new Date().toISOString().split('T')[0];
        
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
            lastPractice: safeDate
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
                discipline: formData.discipline,
                name: formData.name,
                subtitle: formData.subtitle,
                tecLink: formData.tecLink,
                legislationLink: formData.legislationLink,
                obsidianLink: formData.obsidianLink,
                accuracy: formData.accuracy,
                targetAccuracy: formData.targetAccuracy,
                weight: formData.weight,
                relevance: formData.relevance,
                trend: formData.trend,
                status: formData.status,
                notes: formData.notes,
                images: formData.images,
                lastPractice: formData.lastPractice
            });
            setIsModalOpen(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BookOpen className="text-amber-500" /> Banco de Conhecimento
                    </h1>
                    <p className="text-slate-400 mt-1">Repositório central de todos os cadernos.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                 <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex-1">
                    <Search className="text-slate-500 mr-2" size={18} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar tópico..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
                    />
                </div>
                <select 
                    value={filterDiscipline}
                    onChange={(e) => setFilterDiscipline(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-white rounded-lg px-4 py-2 outline-none"
                >
                    <option value="All">Todas Disciplinas</option>
                    {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            <div className="space-y-4">
                {filteredNotebooks.map(nb => (
                    <div key={nb.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-amber-500/30 transition-all">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{nb.discipline}</span>
                                {nb.status === NotebookStatus.COMPLETED && <CheckCircle2 size={14} className="text-emerald-500" />}
                            </div>
                            <h3 className="text-white font-bold text-lg">{nb.name}</h3>
                            <p className="text-slate-500 text-sm">{nb.subtitle}</p>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-slate-400">
                             <div className="flex flex-col items-end">
                                 <span className="text-[10px] uppercase font-bold">Acurácia</span>
                                 <span className={`font-mono font-bold ${nb.accuracy < 60 ? 'text-red-400' : nb.accuracy < 80 ? 'text-amber-400' : 'text-emerald-400'}`}>{nb.accuracy}%</span>
                             </div>
                             <div className="flex flex-col items-end">
                                 <span className="text-[10px] uppercase font-bold">Peso</span>
                                 <span className="text-white">{nb.weight}</span>
                             </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => openEditModal(nb)} className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                                <Pencil size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                            <h2 className="text-xl font-bold text-white">Detalhes do Caderno</h2>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-slate-500 hover:text-white" /></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Disciplina</label><input type="text" value={formData.discipline} onChange={e => handleChange('discipline', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-amber-500" /></div>
                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Tópico</label><input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-amber-500" /></div>
                            </div>
                            
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
                            
                            <div className="flex justify-end pt-6 border-t border-slate-800 gap-3">
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