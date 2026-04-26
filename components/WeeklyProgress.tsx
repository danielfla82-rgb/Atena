import React, { useMemo } from 'react';
import { useStore } from '../store';
import { Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Target } from 'lucide-react';

export const WeeklyProgress: React.FC = () => {
    const { activeCycleId, cycles, config } = useStore();

    const stats = useMemo(() => {
        const cycle = cycles.find(c => c.id === activeCycleId);
        if (!cycle) return null;

        // Calculate Current Week based on Start Date
        const start = config.startDate ? new Date(config.startDate) : new Date();
        start.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        // If diffDays < 0 (future start) or 0, it's Week 1.
        // Week index = floor(days / 7) + 1
        const weekIndex = diffDays < 0 ? 1 : Math.floor(diffDays / 7) + 1;
        const weekId = `week-${weekIndex}`;
        
        // Get Schedule for this week
        const rawSlots = cycle.schedule?.[weekId] || [];
        
        // FIX: Ensure filtered slots are valid objects
        const slots = rawSlots.filter(s => !!s && typeof s === 'object');
        
        const total = slots.length;
        const completed = slots.filter(s => s.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Days remaining in week (assuming 7 day cycles starting from start date)
        // Day of cycle 0-6
        const dayOfCycle = diffDays < 0 ? 0 : diffDays % 7;
        const daysLeft = Math.max(1, 7 - dayOfCycle); // Never zero to avoid division issues

        // Calculate Pace
        const remaining = Math.max(0, total - completed);
        const dailyPace = Math.ceil(remaining / daysLeft);

        return { weekIndex, total, completed, percent, daysLeft, hasSchedule: total > 0, dailyPace };
    }, [activeCycleId, cycles, config.startDate]);

    if (!stats) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
                <Target className="text-slate-600 mb-2" size={32} />
                <p className="text-slate-500 text-xs">Selecione um ciclo para ver o progresso.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between relative overflow-hidden group gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="bg-green-500/10 p-3 rounded-lg text-green-500 flex-shrink-0">
                    <Clock size={24} />
                </div>
                <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-2">
                        Meta da Semana {stats.weekIndex}
                        {stats.percent >= 100 && (
                            <CheckCircle2 size={16} className="text-green-500" />
                        )}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {stats.daysLeft <= 2 ? (
                            <span className="text-amber-500">{stats.daysLeft} dias restantes</span>
                        ) : (
                            <span>{stats.daysLeft} dias restantes</span>
                        )}
                        {' '} • {stats.completed} de {stats.total} blocos
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-1/2 md:w-1/3">
                <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Progresso</span>
                        <span className={`text-sm font-black ${stats.percent >= 100 ? 'text-green-500' : 'text-slate-900 dark:text-white'}`}>
                            {stats.percent}%
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out ${stats.percent >= 100 ? 'bg-green-500' : 'bg-green-600'}`} 
                            style={{ width: `${Math.min(stats.percent, 100)}%` }}
                        ></div>
                    </div>
                </div>
                
                {stats.percent < 100 && stats.dailyPace > 0 && (
                    <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ritmo Reforçado</span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded mt-0.5 border border-green-200 dark:border-green-800">
                            {stats.dailyPace} p/ dia
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};