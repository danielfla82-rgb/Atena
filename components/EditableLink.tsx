import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';

export function EditableLink({ value, onChange, link, placeholder, className = "", onClick }: { value: string, onChange: (val: string) => void, link?: string, placeholder?: string, className?: string, onClick?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        onKeyDown={e => { if (e.key === 'Enter') setIsEditing(false); }}
        autoFocus
        placeholder={placeholder}
        className={`w-full bg-white dark:bg-slate-800 border border-green-500 rounded px-2 py-1 outline-none text-slate-900 dark:text-white transition-colors ${className}`}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      {onClick ? (
        <button onClick={onClick} className={`text-blue-600 dark:text-blue-400 hover:underline truncate text-left ${className}`} title="Editar caderno">
          {value || placeholder}
        </button>
      ) : link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className={`text-blue-600 dark:text-blue-400 hover:underline truncate ${className}`} title="Abrir caderno">
          {value || placeholder}
        </a>
      ) : (
        <span className={`truncate text-slate-900 dark:text-white ${className}`}>{value || placeholder}</span>
      )}
      <button 
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-green-500 transition-opacity rounded shrink-0"
        title="Editar"
      >
        <Edit2 size={14} />
      </button>
    </div>
  );
}
