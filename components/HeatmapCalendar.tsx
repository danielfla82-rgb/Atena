import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Notebook, Cycle } from '../types';

interface HeatmapCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  notebooks: Notebook[];
  activeCycle?: Cycle;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({ value, onChange, notebooks, activeCycle }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const [isOpen, setIsOpen] = useState(false);

  // Compute heatmap data
  const heatmapData = useMemo(() => {
    const data: Record<string, { count: number, manualCount: number }> = {};
    
    // Auto Revisions
    notebooks.forEach(nb => {
      if (nb.nextReview) {
        const dateObj = new Date(nb.nextReview);
        if (!isNaN(dateObj.getTime())) {
          const dateStr = dateObj.toISOString().split('T')[0];
          if (!data[dateStr]) data[dateStr] = { count: 0, manualCount: 0 };
          data[dateStr].count += 1;
        }
      }
    });

    // Manual Revisions
    if (activeCycle?.schedule && activeCycle.config.startDate) {
        const cycleStart = new Date(activeCycle.config.startDate);
        cycleStart.setHours(0,0,0,0);
        
        const todayDate = new Date();
        todayDate.setHours(0,0,0,0);

        Object.entries(activeCycle.schedule).forEach(([weekId, slots]) => {
            if (!Array.isArray(slots) || slots.length === 0) return;
            const weekIndex = parseInt(weekId.replace('week-', ''));
            if (isNaN(weekIndex)) return;

            const weekStart = new Date(cycleStart);
            weekStart.setDate(weekStart.getDate() + ((weekIndex - 1) * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            let remainingDays = 0;
            const countStart = todayDate > weekStart ? todayDate : weekStart;
            if (countStart <= weekEnd) {
                remainingDays = Math.ceil((weekEnd.getTime() - countStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            }

            const activeSlots = slots.filter(s => !!s.notebookId && !s.completed);

            if (remainingDays > 0 && activeSlots.length > 0) {
                const itemsPerDay = Math.ceil(activeSlots.length / remainingDays);

                for (let i = 0; i < remainingDays; i++) {
                    const dateInWeek = new Date(countStart);
                    dateInWeek.setDate(dateInWeek.getDate() + i);
                    
                    const adjustedDate = new Date(dateInWeek.getTime() - (dateInWeek.getTimezoneOffset() * 60000));
                    const dateStr = adjustedDate.toISOString().split('T')[0];
                    if (!data[dateStr]) data[dateStr] = { count: 0, manualCount: 0 };
                    data[dateStr].manualCount += itemsPerDay;
                }
            }
        });
    }

    return data;
  }, [notebooks, activeCycle]);

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
    const data = heatmapData[dateStr] || { count: 0, manualCount: 0 };
    const { count, manualCount } = data;
    const totalLoad = count + manualCount;
    const isSelected = value.getDate() === day && value.getMonth() === currentMonth.getMonth() && value.getFullYear() === currentMonth.getFullYear();
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    // Determine heat color
    let heatClass = "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300";
    if (totalLoad > 0 && totalLoad <= 2) heatClass = "bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 text-emerald-800 dark:text-emerald-300";
    else if (totalLoad > 2 && totalLoad <= 5) heatClass = "bg-emerald-200 dark:bg-emerald-800/60 hover:bg-emerald-300 dark:hover:bg-emerald-700/80 text-emerald-900 dark:text-emerald-100";
    else if (totalLoad > 5) heatClass = "bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-500 text-white";

    if (isSelected) {
        heatClass = "bg-blue-500 text-white ring-2 ring-blue-300 dark:ring-blue-500 ring-offset-2 dark:ring-offset-slate-900";
    }

    days.push(
      <button 
        key={day} 
        type="button"
        onClick={(e) => { e.stopPropagation(); handleSelectDate(day); }}
        className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex flex-col items-center justify-center relative transition-all ${heatClass} ${isToday && !isSelected ? 'border border-blue-500' : ''}`}
        title={`${count} revisão automática, ${manualCount} manual`}
      >
        <span className="text-xs md:text-sm font-bold absolute md:top-1 md:left-2 opacity-50 z-0">{day}</span>
        
        <div className="flex flex-col items-center gap-0 mt-2 z-10 hidden md:flex">
             {count > 0 && !isSelected && <span className="text-[10px] font-black leading-none">{count}</span>}
             {manualCount > 0 && !isSelected && <span className="text-[9px] font-bold leading-none text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40 px-1 rounded border border-sky-500/20">+{manualCount}</span>}
        </div>
        
        <div className="flex flex-col items-center gap-0 scale-75 transform origin-bottom -mt-1 md:hidden">
            {count > 0 && !isSelected && <span className="text-[8px] font-black leading-none">{count}</span>}
            {manualCount > 0 && !isSelected && <span className="text-[7px] font-bold leading-none text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40 px-0.5 rounded border border-sky-500/20">+{manualCount}</span>}
        </div>
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
        
        {(() => {
            const data = heatmapData[value.toISOString().split('T')[0]] || { count: 0, manualCount: 0 };
            const total = data.count + data.manualCount;
            if (total > 0) {
                return (
                    <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded text-[9px] font-bold text-green-600 dark:text-green-400 border border-green-500/20">
                        {total}
                    </div>
                );
            }
            return null;
        })()}
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
                   <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded bg-emerald-100 dark:bg-emerald-900/40"></div> 1-2 disc</div>
                   <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded bg-emerald-200 dark:bg-emerald-800/60"></div> 3-5 disc</div>
                   <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded bg-emerald-500 dark:bg-emerald-600"></div> +5 disc.</div>
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};
