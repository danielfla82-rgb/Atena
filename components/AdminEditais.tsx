import React, { useState, useEffect } from 'react';
import { createAIClient } from '../utils/ai';
import { Book, Plus, ListChecks, ArrowLeft, Download, Trash2, Edit, Loader2, Save, Globe, Upload, X } from 'lucide-react';
import { EditalDiscipline } from '../types';
import { supabase } from './supabase';

interface EditalTemplate {
    id: string;
    name: string;
    text: string;
    structuredEdital: EditalDiscipline[];
    createdAt: string;
}

export const AdminEditais: React.FC = () => {
    const [templates, setTemplates] = useState<EditalTemplate[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<EditalTemplate | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [isSpecificSyncModalOpen, setIsSpecificSyncModalOpen] = useState(false);
    const [templateToSync, setTemplateToSync] = useState<EditalTemplate | null>(null);
    const [targetStudentEmail, setTargetStudentEmail] = useState('');
    const [targetSyncMessage, setTargetSyncMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);
    const [isSyncingSpecific, setIsSyncingSpecific] = useState(false);
    
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

    // Load templates
    useEffect(() => {
        const saved = localStorage.getItem('admin_edital_templates');
        if (saved) {
            setTemplates(JSON.parse(saved));
        }
    }, []);

    const handleSyncGlobal = async () => {
        setIsSyncing(true);
        try {
            // Delete all existing global templates first
            await supabase.from('notebooks')
                .delete()
                .is('user_id', null)
                .eq('discipline', 'ATENA_EDITAL_TEMPLATE');

            let count = 0;
            // Push all templates from admin
            for (const t of templates) {
                const payload = {
                    id: t.id,
                    user_id: null,
                    edital: t.id,
                    discipline: 'ATENA_EDITAL_TEMPLATE',
                    name: t.name,
                    subtitle: 'Template Global',
                    notes: JSON.stringify({
                        text: t.text,
                        structuredEdital: t.structuredEdital
                    }),
                    accuracy: 0,
                    target_accuracy: 90,
                    weight: 'Médio',
                    relevance: 'Média',
                    trend: 'Estável',
                    status: 'NOT_STARTED',
                    is_global: true
                };
                await supabase.from('notebooks').insert(payload);
                count++;
            }
            alert(`Sincronização concluída! ${count} editais publicados na nuvem.`);
        } catch (e: any) {
            console.error(e);
            alert("Erro ao sincronizar editais: " + (e.message || "Erro desconhecido"));
        } finally {
            setIsSyncing(false);
        }
    };

    const saveTemplates = (newTemplates: EditalTemplate[]) => {
        setTemplates(newTemplates);
        localStorage.setItem('admin_edital_templates', JSON.stringify(newTemplates));
    };

    const handleCreateNew = () => {
        setEditingTemplate({
            id: Date.now().toString(),
            name: '',
            text: '',
            structuredEdital: [],
            createdAt: new Date().toISOString()
        });
    };

    const handleAIGenerate = async () => {
        if (!editingTemplate || editingTemplate.text.trim().length < 50) {
            alert("Cole o conteúdo programático do edital primeiro (mínimo 50 caracteres).");
            return;
        }

        setIsProcessing(true);
        const ai = createAIClient();

        try {
            const prompt = `
            Você é um especialista em concursos públicos.
            Analise o seguinte texto de edital e estruture-o de forma clara.
            
            TEXTO:
            ${editingTemplate.text.substring(0, 30000)} 
            
            Retorne APENAS JSON estrito:
            { "disciplines": [ { "name": "Nome", "topics": [ { "name": "Nome do Tópico" } ] } ] }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            if (response.text) {
                const result = JSON.parse(response.text);
                const structured: EditalDiscipline[] = result.disciplines.map((d: any) => ({
                    name: d.name,
                    topics: d.topics.map((t: any) => ({
                        name: t.name,
                        probability: 'Média', 
                        checked: false
                    }))
                }));
                
                setEditingTemplate({ ...editingTemplate, structuredEdital: structured });
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao processar o texto.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = () => {
        if (!editingTemplate || !editingTemplate.name) {
            alert("O template precisa de um nome.");
            return;
        }

        const newTemplates = [...templates];
        const existingIndex = newTemplates.findIndex(t => t.id === editingTemplate.id);
        
        if (existingIndex >= 0) {
            newTemplates[existingIndex] = editingTemplate;
        } else {
            newTemplates.push(editingTemplate);
        }

        saveTemplates(newTemplates);
        setEditingTemplate(null);
    };

    const handleDelete = (id: string) => {
        setTemplateToDelete(id);
    };

    const confirmDelete = () => {
        if (templateToDelete) {
            saveTemplates(templates.filter(t => t.id !== templateToDelete));
            setTemplateToDelete(null);
        }
    };

    const handleExport = (template: EditalTemplate) => {
        const payload = {
            type: 'atena_edital_export',
            version: '10.0.0',
            data: {
                structuredEdital: template.structuredEdital,
                editalText: template.text
            }
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edital_${template.name.replace(/\s+/g, '_').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (editingTemplate) {
        return (
            <div className="p-6 pb-24 h-full overflow-y-auto">
                <button 
                    onClick={() => setEditingTemplate(null)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6"
                >
                    <ArrowLeft size={18} /> Voltar para Lista
                </button>

                <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <ListChecks className="text-indigo-500" />
                    {editingTemplate.structuredEdital.length > 0 ? "Editando Template" : "Novo Template de Edital"}
                </h1>

                <div className="space-y-6 max-w-4xl">
                    <div>
                        <label className="block text-sm font-bold mb-2">Nome do Edital (Ex: Polícia Federal 2025)</label>
                        <input
                            type="text"
                            value={editingTemplate.name}
                            onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 focus:border-indigo-500 outline-none"
                            placeholder="Nome identificador"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2">Conteúdo Programático Bruto</label>
                        <textarea
                            value={editingTemplate.text}
                            onChange={e => setEditingTemplate({...editingTemplate, text: e.target.value})}
                            className="w-full h-48 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 focus:border-indigo-500 outline-none font-mono text-sm"
                            placeholder="Cole aqui o texto do conteúdo programático..."
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleAIGenerate}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Book size={18} />}
                            {isProcessing ? 'Processando com IA...' : 'Estruturar com IA'}
                        </button>
                        
                        <button
                            onClick={handleSave}
                            disabled={isProcessing || !editingTemplate.name}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                        >
                            <Save size={18} /> Salvar Template
                        </button>
                    </div>

                    {editingTemplate.structuredEdital.length > 0 && (
                        <div className="mt-8">
                            <h2 className="text-xl font-bold mb-4">Estrutura Gerada ({editingTemplate.structuredEdital.length} Disciplinas)</h2>
                            <div className="space-y-4">
                                {editingTemplate.structuredEdital.map((disc, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                                        <h3 className="font-bold text-lg mb-2 text-indigo-500">{disc.name}</h3>
                                        <ul className="list-disc pl-5 space-y-1">
                                            {disc.topics.map((t, tidx) => (
                                                <li key={tidx} className="text-sm text-slate-700 dark:text-slate-300">{t.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 pb-24 h-full overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <ListChecks className="text-indigo-500" />
                        Editais Verticalizados (Templates)
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Crie e gerencie templates de editais verticalizados para exportar aos alunos.
                    </p>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={handleSyncGlobal}
                        disabled={isSyncing || templates.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm transition-colors shadow-sm disabled:opacity-50 border border-slate-300 dark:border-slate-600"
                    >
                        {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />} 
                        Sincronizar Nuvem
                    </button>
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
                    >
                        <Plus size={18} /> Novo Edital
                    </button>
                </div>
            </div>

            {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <ListChecks size={48} className="text-slate-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Nenhum template criado</h3>
                    <p className="text-slate-500 max-w-sm text-center mb-6">
                        Você ainda não criou nenhum template de edital verticalizado.
                    </p>
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors"
                    >
                        <Plus size={18} /> Criar Primeiro Template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(template => (
                        <div key={template.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group">
                            <h3 className="font-bold mb-2 text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors line-clamp-1">{template.name}</h3>
                            <div className="text-xs text-slate-500 mb-4 font-mono">
                                {template.structuredEdital.length} disciplinas • {template.structuredEdital.reduce((acc, d) => acc + d.topics.length, 0)} tópicos
                            </div>
                            
                            <div className="mt-auto flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-1 overflow-x-auto custom-scrollbar">
                                    <button
                                        onClick={() => setEditingTemplate(template)}
                                        className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors shrink-0"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTemplateToSync(template);
                                            setIsSpecificSyncModalOpen(true);
                                        }}
                                        className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors shrink-0"
                                        title="Mentoria (Sincronização Específica)"
                                    >
                                        <Upload size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleExport(template)}
                                        className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors shrink-0"
                                        title="Exportar"
                                    >
                                        <Download size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors shrink-0"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isSpecificSyncModalOpen && templateToSync && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl w-full max-w-xl shadow-2xl space-y-6 transform transition-all">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Mentoria (Sincronização Específica)</h3>
                            <button onClick={() => setIsSpecificSyncModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">E-mail do aluno alvo (vazio para ATUALIZAR TODOS que têm este edital)</p>
                            <input 
                                type="email" 
                                placeholder="ex: aluno@email.com" 
                                value={targetStudentEmail} 
                                onChange={e => setTargetStudentEmail(e.target.value)} 
                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
                            />
                            {targetSyncMessage && (
                                <div className={`text-sm font-bold p-3 rounded-lg ${targetSyncMessage.type === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>
                                    {targetSyncMessage.text}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsSpecificSyncModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={async () => {
                                    if (isSyncingSpecific) return;
                                    setIsSyncingSpecific(true);
                                    setTargetSyncMessage(null);
                                    try {
                                        const { data: userData } = await supabase.auth.getUser();
                                        if (!userData.user) throw new Error("Usuário não autenticado");

                                        const { data, error } = await supabase.rpc('admin_sync_edital_config', {
                                            p_admin_email: userData.user.email,
                                            p_edital_json: {
                                                structuredEdital: templateToSync.structuredEdital,
                                                editalText: templateToSync.text
                                            },
                                            p_target_email: targetStudentEmail.trim() || null
                                        });

                                        if (error) throw error;
                                        if (data?.success) {
                                            setTargetSyncMessage({ text: `Sincronizado! Atualizado(s) ${data.updated} ciclo(s).`, type: 'success' });
                                            setTimeout(() => { setIsSpecificSyncModalOpen(false); setTargetSyncMessage(null); }, 3000);
                                        } else {
                                            setTargetSyncMessage({ text: `Erro: ${data?.error}`, type: 'error' });
                                        }
                                    } catch (e: any) {
                                        setTargetSyncMessage({ text: `Erro: ${e.message}`, type: 'error' });
                                    } finally {
                                        setIsSyncingSpecific(false);
                                    }
                                }}
                                disabled={isSyncingSpecific}
                                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-bold disabled:opacity-50"
                            >
                                {isSyncingSpecific ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
                                {isSyncingSpecific ? 'Sincronizando...' : 'Sincronizar Edital'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {templateToDelete && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Confirmar Exclusão</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 text-center">
                            Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-3 font-medium">
                            <button
                                onClick={() => setTemplateToDelete(null)}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
