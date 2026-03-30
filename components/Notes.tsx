import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Note } from '../types';
import { Plus, Trash2, StickyNote, Palette, Calendar, Layout, List, CalendarDays, CheckCircle2, Maximize2, Minimize2, Bold } from 'lucide-react';

const COLORS = {
    yellow: 'bg-yellow-200 text-yellow-900 border-yellow-300 placeholder-yellow-900/50',
    blue: 'bg-blue-200 text-blue-900 border-blue-300 placeholder-blue-900/50',
    green: 'bg-green-200 text-green-900 border-green-300 placeholder-green-900/50',
    pink: 'bg-pink-200 text-pink-900 border-pink-300 placeholder-pink-900/50',
    purple: 'bg-purple-200 text-purple-900 border-purple-300 placeholder-purple-900/50',
    slate: 'bg-slate-700 text-slate-100 border-slate-600 placeholder-slate-400'
};

const COLOR_MAP = {
    yellow: 'bg-yellow-200',
    blue: 'bg-blue-200',
    green: 'bg-green-200',
    pink: 'bg-pink-200',
    purple: 'bg-purple-200',
    slate: 'bg-slate-700'
};

const StickyNoteItem: React.FC<{ note: Note }> = ({ note }) => {
    const { updateNote, deleteNote } = useStore();
    const [content, setContent] = useState(note.content);
    const [showPalette, setShowPalette] = useState(false);
    
    // Track the latest content for unmount save
    const contentRef = useRef(content);
    useEffect(() => { contentRef.current = content; }, [content]);

    // Auto-save logic (Debounce) for CONTENT only
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content !== note.content) {
                updateNote(note.id, content);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [content, note.id, note.content, updateNote]);

    const handleColorChange = (color: Note['color']) => {
        // Pass current local content to avoid overwriting with stale props
        updateNote(note.id, content, color, note.isBold);
        setShowPalette(false);
    };

    const handleBoldToggle = () => {
        updateNote(note.id, content, note.color, !note.isBold);
    };

    const handleBlur = () => {
        if (content !== note.content) {
            updateNote(note.id, content);
        }
    };

    return (
        <div className={`relative rounded-xl p-4 shadow-lg transition-all border-2 group ${COLORS[note.color] || COLORS.yellow}`}>
            <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleBlur}
                placeholder="Digite sua anotação..."
                // Removido o style fixo que resetava o redimensionamento no re-render
                className={`bg-transparent border-none resize outline-none text-sm leading-relaxed custom-scrollbar block w-[280px] h-[250px] min-w-[200px] min-h-[150px] ${note.isBold ? 'font-bold' : 'font-medium'}`}
            />
            
            <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${showPalette ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button 
                    onClick={handleBoldToggle}
                    className={`p-1.5 rounded-full transition-colors ${note.isBold ? 'bg-black/20 text-current' : 'bg-black/10 hover:bg-black/20 text-current'}`}
                    title="Negrito"
                >
                    <Bold size={14} />
                </button>

                <div className="relative">
                    <button 
                        onClick={() => setShowPalette(!showPalette)}
                        className={`p-1.5 rounded-full transition-colors ${showPalette ? 'bg-black/20' : 'bg-black/10 hover:bg-black/20'} text-current`}
                    >
                        <Palette size={14} />
                    </button>
                    {showPalette && (
                        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl p-2 flex gap-1 z-20 w-[120px] flex-wrap justify-end border border-slate-200">
                            {(Object.keys(COLORS) as Note['color'][]).map(c => (
                                <button 
                                    key={c}
                                    onClick={(e) => { e.stopPropagation(); handleColorChange(c); }}
                                    className={`w-5 h-5 rounded-full border border-slate-300 ${COLOR_MAP[c] || 'bg-gray-200'} hover:scale-110 transition-transform`}
                                    title={c}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <button 
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 bg-black/10 rounded-full hover:bg-red-500 hover:text-slate-900 dark:text-white text-current transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            
            <div className="text-[9px] opacity-50 font-bold uppercase tracking-wider text-right mt-2 select-none pointer-events-none">
                {new Date(note.updatedAt).toLocaleDateString()}
            </div>
        </div>
    );
};

// FERIADOS BRASIL 2026 (Datas Reais)
const MONTHS = [
    { name: 'Janeiro', holidays: ['01: Confraternização Universal'] },
    { name: 'Fevereiro', holidays: ['17: Carnaval'] },
    { name: 'Março', holidays: [] },
    { name: 'Abril', holidays: ['03: Paixão de Cristo', '21: Tiradentes'] },
    { name: 'Maio', holidays: ['01: Dia do Trabalho', '10: Dia das Mães'] },
    { name: 'Junho', holidays: ['04: Corpus Christi'] },
    { name: 'Julho', holidays: [] },
    { name: 'Agosto', holidays: ['09: Dia dos Pais'] },
    { name: 'Setembro', holidays: ['07: Independência'] },
    { name: 'Outubro', holidays: ['12: N. Sra. Aparecida'] },
    { name: 'Novembro', holidays: ['02: Finados', '15: Proclamação', '20: Consciência Negra'] },
    { name: 'Dezembro', holidays: ['25: Natal'] },
];

const PlanningBoard = () => {
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full custom-scrollbar items-start">
            {MONTHS.map((month, idx) => (
                <div key={idx} className="min-w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col h-[400px]">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-t-xl">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">{month.name}</h3>
                            <span className="text-slate-600 text-xs font-mono">2026</span>
                        </div>
                        {month.holidays.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                {month.holidays.map(h => (
                                    <div key={h} className="text-[10px] text-amber-500 bg-amber-900/10 border border-amber-500/20 px-2 py-1 rounded flex items-center gap-1">
                                        <Calendar size={10} /> {h}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[10px] text-slate-600 italic py-1">Sem feriados nacionais</div>
                        )}
                    </div>
                    <div className="flex-1 p-3">
                        <textarea 
                            className="w-full h-full bg-transparent text-sm text-slate-600 dark:text-slate-300 resize-none outline-none placeholder-slate-700 custom-scrollbar"
                            placeholder={`Metas para ${month.name}...`}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const Notes: React.FC = () => {
  const { notes, addNote } = useStore();
  const [viewMode, setViewMode] = useState<'sticky' | 'kanban'>('sticky');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <StickyNote className="text-yellow-500" /> Caderno de Anotações
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Quadro de lembretes e planejamento anual.</p>
        </div>
        
        <div className="flex gap-4">
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setViewMode('sticky')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'sticky' ? 'bg-yellow-600 text-slate-900 dark:text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800'}`}><Layout size={16} /> Post-its</button>
                <button onClick={() => setViewMode('kanban')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-indigo-600 text-slate-900 dark:text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800'}`}><CalendarDays size={16} /> Planejamento 2026</button>
            </div>

            {viewMode === 'sticky' && (
                <button 
                    onClick={addNote}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-bold shadow-lg shadow-green-900/20"
                >
                    <Plus size={18} /> Nova Nota
                </button>
            )}
        </div>
      </div>

      {viewMode === 'sticky' ? (
          // Switch from Grid to Flex to allow variable width/height items via drag
          <div className="flex flex-wrap gap-6 flex-1 overflow-y-auto custom-scrollbar content-start pb-20 items-start">
              {notes.length === 0 ? (
                  <div className="w-full flex flex-col items-center justify-center py-20 text-slate-600 opacity-50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      <StickyNote size={48} className="mb-4" />
                      <p>Seu quadro está vazio.</p>
                  </div>
              ) : (
                  notes.map(note => <StickyNoteItem key={note.id} note={note} />)
              )}
          </div>
      ) : (
          <div className="flex-1 overflow-hidden">
              <PlanningBoard />
          </div>
      )}
    </div>
  );
};