import React, { useState, useMemo } from 'react';
import { useStore, useMergedDisciplines } from '../store';
import { Discipline, Weight, Relevance } from '../types';
import { Plus, Edit2, Trash2, X, Save, Book, Target, AlertCircle, Info, Activity } from 'lucide-react';

export const DisciplineManager: React.FC = () => {
  const { addDiscipline, editDiscipline, deleteDiscipline, notebooks } = useStore();
  const mergedDisciplines = useMergedDisciplines();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Discipline>>({
    name: '',
    edital: '',
    weight: Weight.MEDIO,
    relevance: Relevance.MEDIA,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setFormData({ name: '', edital: '', weight: Weight.MEDIO, relevance: Relevance.MEDIA });
    setEditingId(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (discipline: Discipline) => {
    setFormData({ ...discipline });
    setEditingId(discipline.id);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setIsSaving(true);
    setError(null);
    
    try {
      if (editingId && !editingId.startsWith('virtual-')) {
        await editDiscipline(editingId, formData);
      } else {
        // If it's a virtual discipline or a new one, we add it.
        // The store will generate a real UUID for it.
        await addDiscipline({
          name: formData.name,
          edital: formData.edital,
          weight: formData.weight || Weight.MEDIO,
          relevance: formData.relevance || Relevance.MEDIA
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving discipline:", err);
      setError(err.message || "Erro ao salvar disciplina. Verifique sua conexão ou tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('virtual-')) {
      alert('Esta disciplina é gerada automaticamente a partir dos seus cadernos. Para removê-la, altere ou exclua os cadernos associados a ela.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir esta disciplina?')) {
      await deleteDiscipline(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Book className="text-green-500" /> Disciplinas Mães
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Gerencie as disciplinas principais, seus pesos e relevâncias. Disciplinas usadas em cadernos aparecem aqui automaticamente.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-green-900/20">
          <Plus size={16} /> Nova Disciplina
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mergedDisciplines.map(discipline => {
          const isVirtual = discipline.id.startsWith('virtual-');
          const discNotebooks = notebooks.filter(nb => nb.discipline === discipline.name && nb.accuracy > 0);
          const avgAccuracy = discNotebooks.length > 0
            ? Math.round(discNotebooks.reduce((acc, nb) => acc + nb.accuracy, 0) / discNotebooks.length)
            : null;

          return (
            <div key={discipline.id} className={`bg-white dark:bg-slate-900 border ${isVirtual ? 'border-slate-200 dark:border-slate-800/50 border-dashed' : 'border-slate-200 dark:border-slate-800'} rounded-xl p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden`}>
              {isVirtual && (
                <div className="absolute top-0 right-0 bg-slate-100 dark:bg-slate-800/50 text-slate-500 text-[9px] px-2 py-1 font-bold uppercase tracking-wider rounded-bl-lg flex items-center gap-1" title="Gerada automaticamente a partir dos cadernos">
                  <Info size={10} /> Automática
                </div>
              )}
              <div className="flex justify-between items-start mt-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{discipline.name}</h3>
                  {discipline.edital && <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-1 inline-block">{discipline.edital}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenEdit(discipline)} className="p-1.5 text-slate-400 hover:text-green-500 bg-slate-100 dark:bg-slate-800 rounded-md transition-colors" title={isVirtual ? "Editar para salvar configurações" : "Editar"}><Edit2 size={14} /></button>
                  {!isVirtual && <button onClick={() => handleDelete(discipline.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-slate-800 rounded-md transition-colors"><Trash2 size={14} /></button>}
                </div>
              </div>
              <div className="flex gap-2 mt-auto flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${isVirtual ? 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 border-dashed' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} border border-slate-200 dark:border-slate-700 flex items-center gap-1`}>
                  <Target size={10} /> Peso: {discipline.weight}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${isVirtual ? 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 border-dashed' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} border border-slate-200 dark:border-slate-700 flex items-center gap-1`}>
                  <AlertCircle size={10} /> Relevância: {discipline.relevance}
                </span>
                {avgAccuracy !== null && (
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1 ${
                    avgAccuracy >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    avgAccuracy >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    avgAccuracy >= 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    <Activity size={10} /> Média: {avgAccuracy}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {mergedDisciplines.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            Nenhuma disciplina cadastrada ou encontrada nos cadernos.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? 'Editar Disciplina' : 'Nova Disciplina'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Nome da Disciplina</label>
                <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-green-500" placeholder="Ex: Direito Administrativo" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Edital (Opcional)</label>
                <input type="text" value={formData.edital || ''} onChange={e => setFormData({ ...formData, edital: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-green-500" placeholder="Ex: TCU 2024" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Peso</label>
                  <select value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value as Weight })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-green-500">
                    <option value={Weight.BAIXO}>Baixo (1)</option>
                    <option value={Weight.MEDIO}>Médio (2)</option>
                    <option value={Weight.ALTO}>Alto (3)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Relevância</label>
                  <select value={formData.relevance} onChange={e => setFormData({ ...formData, relevance: e.target.value as Relevance })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-green-500">
                    <option value={Relevance.BAIXA}>Baixa (1)</option>
                    <option value={Relevance.MEDIA}>Média (2)</option>
                    <option value={Relevance.ALTA}>Alta (3)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Cancelar</button>
              <button onClick={handleSave} disabled={!formData.name || isSaving} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Activity size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
