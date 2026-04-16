import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Notebook } from '../types';

interface HeatmapCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  notebooks: Notebook[];
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({ value, onChange, notebooks }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const [isOpen, setIsOpen] = useState(false);

  // Compute heatmap data
  const heatmapData = useMemo(() => {
    const counts: Record<string, number> = {};
    notebooks.forEach(nb => {
      if (nb.nextReview) {
        const dateObj = new Date(nb.nextReview);
        if (!isNaN(dateObj.getTime())) {
          const dateStr = dateObj.toISOString().split('T')[0];
          counts[dateStr] = (counts[dateStr] || 0) + 1;
        }
      }
    });
    return counts;
  }, [notebooks]);

  // Calendar logic
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0);
    onChange(newDate);
    setIsOpen(false);
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8 md:w-10 md:h-10"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0).toISOString().split('T')[0];
    const count = heatmapData[dateStr] || 0;
    const isSelected = value.getDate() === day && value.getMonth() === currentMonth.getMonth() && value.getFullYear() === currentMonth.getFullYear();
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    // Determine heat color
    let heatClass = "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300";
    if (count > 0 && count <= 2) heatClass = "bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 text-green-700 dark:text-green-300";
    else if (count > 2 && count <= 5) heatClass = "bg-green-300 dark:bg-green-700/60 hover:bg-green-400 dark:hover:bg-green-600/80 text-green-900 dark:text-green-100";
    else if (count > 5) heatClass = "bg-green-500 dark:bg-green-500 hover:bg-green-600 dark:hover:bg-green-400 text-white";

    if (isSelected) {
        heatClass = "bg-blue-500 text-white ring-2 ring-blue-300 dark:ring-blue-500 ring-offset-2 dark:ring-offset-slate-900";
    }

    days.push(
      <button 
        key={day} 
        type="button"
        onClick={(e) => { e.stopPropagation(); handleSelectDate(day); }}
        className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex flex-col items-center justify-center relative transition-all ${heatClass} ${isToday && !isSelected ? 'border border-blue-500' : ''}`}
        title={`${count} disciplina(s) alocada(s) para revisão`}
      >
        <span className="text-xs md:text-sm font-bold">{day}</span>
        {count > 0 && !isSelected && (
           <span className="text-[8px] absolute bottom-0.5 leading-none opacity-80">{count}</span>
        )}
      </button>
    );
  }

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 min-w-[120px] text-green-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 rounded-lg flex items-center justify-between gap-2 cursor-pointer hover:border-green-500 transition-all relative overflow-hidden group shadow-sm"
        title="Alterar data da revisão - Ver mapa de calor"
      >
        <div className="flex items-center gap-2">
            <CalendarIcon size={14} className="text-green-500" /> 
            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{value.toLocaleDateString()}</span>
        </div>
        
        {heatmapData[value.toISOString().split('T')[0]] > 0 && (
            <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded text-[9px] font-bold text-green-600 dark:text-green-400 border border-green-500/20">
                {heatmapData[value.toISOString().split('T')[0]]}
            </div>
        )}
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-10 p-5 w-full max-w-[340px] animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"><ChevronLeft size={20} /></button>
                    <span className="font-bold text-base text-slate-800 dark:text-slate-200 uppercase tracking-wider">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                    <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 md:gap-2 mb-3">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                        <div key={i} className="text-center text-xs font-bold text-slate-400">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {days}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2 overflow-x-auto text-[10px] text-slate-500 font-medium">
                   <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"></div> Livre</div>
                   <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded bg-green-100 dark:bg-green-900/40"></div> 1-2 disc</div>
                   <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded bg-green-300 dark:bg-green-700/60"></div> 3-5 disc</div>
                   <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded bg-green-500"></div> +5 disc.</div>
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};
