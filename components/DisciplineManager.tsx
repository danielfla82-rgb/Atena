import React, { useState, useMemo } from 'react';
import { useStore, useMergedDisciplines } from '../store';
import { Discipline, Weight, Relevance, Notebook } from '../types';
import { Plus, Edit2, Trash2, X, Save, Book, Target, AlertCircle, Info, Activity, Search, ArrowUpDown, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { EditableLink } from './EditableLink';

export const DisciplineManager: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { addDiscipline, editDiscipline, deleteDiscipline, notebooks, setFocusedNotebookId } = useStore();
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

  // --- NEW FEATURE: Discipline Details Modal ---
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [editingRows, setEditingRows] = useState<Record<string, any>>({});
  const [isTopicsOpen, setIsTopicsOpen] = useState(true);
  const [isSubtopicsOpen, setIsSubtopicsOpen] = useState(true);
  const { editNotebook } = useStore();

  const currentDiscipline = useMemo(() => mergedDisciplines.find(d => d.id === editingId), [mergedDisciplines, editingId]);

  const disciplineSubtopics = useMemo(() => {
    if (!currentDiscipline) return [];
    
    const discNotebooks = notebooks.filter(nb => nb.discipline === currentDiscipline.name);
    const rows: any[] = [];

    discNotebooks.forEach(nb => {
      // Main notebook subtopic
      if (nb.subtitle) {
        rows.push({
          id: `main-${nb.id}`,
          notebookId: nb.id,
          isMain: true,
          assunto: nb.name,
          subtopico: nb.subtitle,
          accuracy: nb.accuracy,
          tecLink: nb.tecLink,
          errorNotebookLink: nb.errorNotebookLink || '',
          peso: nb.themeWeight || ''
        });
      }

      // Extra subtopics
      if (nb.extraSubtopics && Array.isArray(nb.extraSubtopics)) {
        nb.extraSubtopics.forEach((extra, idx) => {
          if (extra.subtitle) {
            rows.push({
              id: `extra-${nb.id}-${idx}`,
              notebookId: nb.id,
              extraIndex: idx,
              isMain: false,
              assunto: nb.name,
              subtopico: extra.subtitle,
              accuracy: extra.accuracy || 0,
              tecLink: extra.tecLink || '',
              errorNotebookLink: extra.errorNotebookLink || '',
              peso: extra.themeWeight || ''
            });
          }
        });
      }
    });

    return rows;
  }, [currentDiscipline, notebooks]);

  const filteredAndSortedSubtopics = useMemo(() => {
    let result = [...disciplineSubtopics];

    // Apply local edits for display
    result = result.map(row => {
      if (editingRows[row.id]) {
        return { ...row, ...editingRows[row.id] };
      }
      return row;
    });

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(row => 
        row.assunto.toLowerCase().includes(lowerTerm) || 
        row.subtopico.toLowerCase().includes(lowerTerm)
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [disciplineSubtopics, searchTerm, sortConfig, editingRows]);

  const discNotebooks = useMemo(() => {
    if (!currentDiscipline) return [];
    return notebooks.filter(nb => nb.discipline === currentDiscipline.name);
  }, [currentDiscipline, notebooks]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleRowChange = (id: string, field: string, value: any) => {
    setEditingRows(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  // ---------------------------------------------

  const handleOpenCreate = () => {
    setFormData({ name: '', edital: '', weight: Weight.MEDIO, relevance: Relevance.MEDIA });
    setEditingId(null);
    setError(null);
    setEditingRows({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (discipline: Discipline) => {
    setFormData({ ...discipline });
    setEditingId(discipline.id);
    setError(null);
    setEditingRows({});
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

      // Save subtopics if there are edits
      if (Object.keys(editingRows).length > 0) {
        const updatesByNotebook: Record<string, Partial<Notebook>> = {};

        for (const [rowId, edits] of Object.entries(editingRows)) {
          const row = disciplineSubtopics.find(r => r.id === rowId);
          if (!row) continue;

          const nbId = row.notebookId;
          if (!updatesByNotebook[nbId]) {
            const nb = notebooks.find(n => n.id === nbId);
            if (nb) {
              updatesByNotebook[nbId] = { ...nb }; // Clone current state
            }
          }

          const nbUpdate = updatesByNotebook[nbId];
          if (!nbUpdate) continue;

          if (row.isMain) {
            if (edits.assunto !== undefined) nbUpdate.name = edits.assunto;
            if (edits.subtopico !== undefined) nbUpdate.subtitle = edits.subtopico;
            if (edits.accuracy !== undefined) nbUpdate.accuracy = Number(edits.accuracy);
            if (edits.tecLink !== undefined) nbUpdate.tecLink = edits.tecLink;
            if (edits.errorNotebookLink !== undefined) nbUpdate.errorNotebookLink = edits.errorNotebookLink;
            if (edits.peso !== undefined) nbUpdate.themeWeight = edits.peso;
          } else {
            // It's an extra subtopic
            if (!nbUpdate.extraSubtopics) nbUpdate.extraSubtopics = [];
            const extraIdx = row.extraIndex;
            const extra = nbUpdate.extraSubtopics[extraIdx];
            if (extra) {
              if (edits.subtopico !== undefined) extra.subtitle = edits.subtopico;
              if (edits.accuracy !== undefined) extra.accuracy = Number(edits.accuracy);
              if (edits.tecLink !== undefined) extra.tecLink = edits.tecLink;
              if (edits.errorNotebookLink !== undefined) extra.errorNotebookLink = edits.errorNotebookLink;
              if (edits.peso !== undefined) extra.themeWeight = edits.peso;
            }
          }
        }

        const promises = Object.entries(updatesByNotebook).map(([id, data]) => editNotebook(id, data));
        await Promise.all(promises);
      }

      setIsModalOpen(false);
      setEditingRows({});
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
                  <h3 
                    className="text-lg font-bold text-slate-900 dark:text-white cursor-pointer hover:text-green-500 transition-colors"
                    onClick={() => handleOpenDetails(discipline)}
                  >
                    {discipline.name}
                  </h3>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Book className="text-green-500" size={20} />
                {editingId ? 'Editar Disciplina' : 'Nova Disciplina'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
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

              {editingId && currentDiscipline && (
                <div className="border-t border-slate-200 dark:border-slate-800">
                  <div className="p-6 bg-slate-50 dark:bg-slate-900">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          Subtópicos e Assuntos
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Gerencie os subtópicos vinculados aos cadernos desta disciplina.
                        </p>
                      </div>
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Buscar..." 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-green-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Accordion: Assuntos (Tópicos) */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div 
                          className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => setIsTopicsOpen(!isTopicsOpen)}
                        >
                          <div className="flex items-center gap-3">
                            {isTopicsOpen ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                            <span className="font-bold text-slate-900 dark:text-white">Assuntos (Tópicos)</span>
                          </div>
                          <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">{discNotebooks.length}</span>
                        </div>
                        
                        {isTopicsOpen && (
                          <div className="border-t border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                  <th className="p-4">Assunto</th>
                                  <th className="p-4">% Acerto</th>
                                  <th className="p-4">Peso</th>
                                  <th className="p-4 text-center">Link TEC</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {discNotebooks.map(nb => {
                                  const mainEdit = editingRows[`main-${nb.id}`];
                                  const displayAccuracy = mainEdit?.accuracy !== undefined ? mainEdit.accuracy : nb.accuracy;
                                  const displayWeight = mainEdit?.peso !== undefined ? mainEdit.peso : nb.weight;
                                  const displayTecLink = mainEdit?.tecLink !== undefined ? mainEdit.tecLink : nb.tecLink;
                                  const displayName = mainEdit?.assunto !== undefined ? mainEdit.assunto : nb.name;

                                  return (
                                    <tr key={`topic-${nb.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="p-4">
                                        <EditableLink 
                                          value={displayName} 
                                          onChange={val => handleRowChange(`main-${nb.id}`, 'assunto', val)}
                                          onClick={() => {
                                            setFocusedNotebookId(nb.id);
                                            onNavigate?.('library');
                                          }}
                                          className="font-medium"
                                        />
                                      </td>
                                      <td className="p-4">
                                        <div className="relative w-20">
                                          <input 
                                            type="number" 
                                            min="0" max="100"
                                            value={displayAccuracy} 
                                            onChange={e => handleRowChange(`main-${nb.id}`, 'accuracy', e.target.value)}
                                            className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-green-500 rounded px-2 py-1 pr-6 outline-none text-slate-900 dark:text-white transition-colors"
                                          />
                                          <span className="absolute right-2 top-1.5 text-xs text-slate-500">%</span>
                                        </div>
                                      </td>
                                      <td className="p-4">
                                        <span className="px-2 py-1 text-slate-500 dark:text-slate-400">{displayWeight}</span>
                                      </td>
                                      <td className="p-4 flex items-center justify-center gap-2">
                                        <input 
                                          type="url" 
                                          value={displayTecLink} 
                                          onChange={e => handleRowChange(`main-${nb.id}`, 'tecLink', e.target.value)}
                                          placeholder="Link TEC"
                                          className="w-32 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-green-500 rounded px-2 py-1 outline-none text-slate-900 dark:text-white transition-colors text-xs"
                                        />
                                        {displayTecLink && (
                                          <a href={displayTecLink} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Abrir no TEC">
                                            <ExternalLink size={14} />
                                          </a>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {discNotebooks.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                      Nenhum assunto encontrado.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Accordion: Subtópicos */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div 
                          className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => setIsSubtopicsOpen(!isSubtopicsOpen)}
                        >
                          <div className="flex items-center gap-3">
                            {isSubtopicsOpen ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                            <span className="font-bold text-slate-900 dark:text-white">Subtópicos</span>
                          </div>
                          <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">{filteredAndSortedSubtopics.length}</span>
                        </div>
                        
                        {isSubtopicsOpen && (
                          <div className="border-t border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                  <th className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('assunto')}>
                                    <div className="flex items-center gap-1">Assunto Pai <ArrowUpDown size={12} /></div>
                                  </th>
                                  <th className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('subtopico')}>
                                    <div className="flex items-center gap-1">Subtópico <ArrowUpDown size={12} /></div>
                                  </th>
                                  <th className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('accuracy')}>
                                    <div className="flex items-center gap-1">% Acerto <ArrowUpDown size={12} /></div>
                                  </th>
                                  <th className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('peso')}>
                                    <div className="flex items-center gap-1">Peso <ArrowUpDown size={12} /></div>
                                  </th>
                                  <th className="p-4 text-center">Link TEC</th>
                                  <th className="p-4 text-center">Caderno Erros</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredAndSortedSubtopics.map(row => (
                                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-slate-500 dark:text-slate-400">
                                      {row.assunto}
                                    </td>
                                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                                      <div className="flex items-center gap-2">
                                        <EditableLink 
                                          value={row.subtopico} 
                                          onChange={val => handleRowChange(row.id, 'subtopico', val)}
                                          onClick={() => {
                                            setFocusedNotebookId(row.notebookId);
                                            onNavigate?.('library');
                                          }}
                                        />
                                        {row.isMain && <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Principal</span>}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="relative w-20">
                                        <input 
                                          type="number" 
                                          min="0" max="100"
                                          value={row.accuracy} 
                                          onChange={e => handleRowChange(row.id, 'accuracy', e.target.value)}
                                          className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-green-500 rounded px-2 py-1 pr-6 outline-none text-slate-900 dark:text-white transition-colors"
                                        />
                                        <span className="absolute right-2 top-1.5 text-xs text-slate-500">%</span>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <input 
                                        type="text" 
                                        value={row.peso} 
                                        onChange={e => handleRowChange(row.id, 'peso', e.target.value)}
                                        placeholder="Peso"
                                        className="w-20 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-green-500 rounded px-2 py-1 outline-none text-slate-900 dark:text-white transition-colors"
                                      />
                                    </td>
                                    <td className="p-4 flex items-center justify-center gap-2">
                                      <input 
                                        type="url" 
                                        value={row.tecLink} 
                                        onChange={e => handleRowChange(row.id, 'tecLink', e.target.value)}
                                        placeholder="Link TEC"
                                        className="w-32 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-green-500 rounded px-2 py-1 outline-none text-slate-900 dark:text-white transition-colors text-xs"
                                      />
                                      {row.tecLink && (
                                        <a href={row.tecLink} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Abrir no TEC">
                                          <ExternalLink size={14} />
                                        </a>
                                      )}
                                    </td>
                                    <td className="p-4 flex items-center justify-center gap-2">
                                      <input 
                                        type="url" 
                                        value={row.errorNotebookLink} 
                                        onChange={e => handleRowChange(row.id, 'errorNotebookLink', e.target.value)}
                                        placeholder="Caderno Erros"
                                        className="w-32 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-red-500 rounded px-2 py-1 outline-none text-slate-900 dark:text-white transition-colors text-xs"
                                      />
                                      {row.errorNotebookLink && (
                                        <a href={row.errorNotebookLink} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Abrir Caderno de Erros">
                                          <ExternalLink size={14} />
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                {filteredAndSortedSubtopics.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                      Nenhum subtópico encontrado.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
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
