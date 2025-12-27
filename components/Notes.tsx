import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Note } from '../types';
import { Plus, Trash2, StickyNote, Palette, Save } from 'lucide-react';

const COLORS = {
    yellow: 'bg-yellow-200 text-yellow-900 border-yellow-300 placeholder-yellow-900/50',
    blue: 'bg-blue-200 text-blue-900 border-blue-300 placeholder-blue-900/50',
    green: 'bg-emerald-200 text-emerald-900 border-emerald-300 placeholder-emerald-900/50',
    pink: 'bg-pink-200 text-pink-900 border-pink-300 placeholder-pink-900/50',
    purple: 'bg-purple-200 text-purple-900 border-purple-300 placeholder-purple-900/50',
    slate: 'bg-slate-700 text-slate-100 border-slate-600 placeholder-slate-400'
};

const StickyNoteItem: React.FC<{ note: Note }> = ({ note }) => {
    const { updateNote, deleteNote } = useStore();
    const [content, setContent] = useState(note.content);
    
    // Auto-save logic (Debounce)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content !== note.content) {
                updateNote(note.id, content);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [content, note.id, note.content, updateNote]);

    const handleColorChange = (color: Note['color']) => {
        updateNote(note.id, content, color);
    };

    return (
        <div className={`aspect-square rounded-xl p-4 shadow-lg transition-all hover:scale-[1.02] flex flex-col group relative border-2 ${COLORS[note.color]}`}>
            <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite sua anotação..."
                className="w-full h-full bg-transparent border-none resize-none outline-none text-sm font-medium leading-relaxed custom-scrollbar"
            />
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <div className="group/palette relative">
                    <button className="p-1.5 bg-black/10 rounded-full hover:bg-black/20 text-current transition-colors">
                        <Palette size={14} />
                    </button>
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl p-2 flex gap-1 z-10 hidden group-hover/palette:flex">
                        {(Object.keys(COLORS) as Note['color'][]).map(c => (
                            <button 
                                key={c}
                                onClick={() => handleColorChange(c)}
                                className={`w-4 h-4 rounded-full border border-slate-300 ${c === 'slate' ? 'bg-slate-700' : `bg-${c === 'green' ? 'emerald' : c}-200`}`}
                            />
                        ))}
                    </div>
                </div>
                <button 
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 bg-black/10 rounded-full hover:bg-red-500 hover:text-white text-current transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            
            <div className="text-[9px] opacity-50 font-bold uppercase tracking-wider text-right mt-2 select-none">
                {new Date(note.updatedAt).toLocaleDateString()}
            </div>
        </div>
    );
};

export const Notes: React.FC = () => {
  const { notes, addNote } = useStore();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-slate-800 pb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <StickyNote className="text-yellow-500" /> Anotações Rápidas
          </h1>
          <p className="text-slate-400 mt-1">Quadro de lembretes e ideias soltas (Post-its).</p>
        </div>
        <button 
            onClick={addNote}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold shadow-lg shadow-emerald-900/20"
        >
            <Plus size={18} /> Nova Nota
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 flex-1 overflow-y-auto custom-scrollbar content-start pb-20">
          {notes.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl">
                  <StickyNote size={48} className="mb-4" />
                  <p>Seu quadro está vazio.</p>
              </div>
          ) : (
              notes.map(note => <StickyNoteItem key={note.id} note={note} />)
          )}
      </div>
    </div>
  );
};