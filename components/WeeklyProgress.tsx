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
        const daysLeft = 7 - dayOfCycle;

        // Calculate Pace
        const remaining = Math.max(0, total - completed);
        // Use max(daysLeft, 1) to avoid division by zero on last day
        const dailyPace = daysLeft > 0 ? Math.ceil(remaining / Math.max(1, daysLeft)) : remaining;

        return { weekIndex, total, completed, percent, daysLeft, hasSchedule: total > 0, dailyPace };
    }, [activeCycleId, cycles, config.startDate]);

    if (!stats) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
                <Target className="text-slate-600 mb-2" size={32} />
                <p className="text-slate-500 text-xs">Selecione um ciclo para ver o progresso.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col justify-between relative overflow-hidden group">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>

            {/* Header */}
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-1">
                            <Clock className="text-emerald-500" size={20} />
                            Meta da Semana
                        </h3>
                        <p className="text-slate-400 text-xs font-medium">
                            Semana {stats.weekIndex} • <span className={stats.daysLeft <= 2 ? "text-amber-400" : "text-slate-400"}>{stats.daysLeft} dias restantes</span>
                        </p>
                    </div>
                    {stats.percent >= 100 && (
                        <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
                            <CheckCircle2 size={20} />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Metric */}
            <div className="flex items-baseline gap-2 my-4 relative z-10">
                <span className={`text-6xl font-black tracking-tight ${stats.percent >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                    {stats.percent}<span className="text-4xl">%</span>
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 mb-3 relative z-10">
                <div 
                    className={`h-full transition-all duration-1000 ease-out ${stats.percent >= 100 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-emerald-600'}`} 
                    style={{ width: `${Math.min(stats.percent, 100)}%` }}
                ></div>
            </div>

            {/* Footer Details */}
            <div className="flex justify-between items-center text-xs relative z-10 pt-2 border-t border-slate-800/50">
                <span className="text-slate-300 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    {stats.completed} <span className="text-slate-600 font-normal">/ {stats.total} Blocos</span>
                </span>
                
                {!stats.hasSchedule ? (
                    <span className="text-slate-500 italic flex items-center gap-1">
                        <AlertCircle size={12} /> Vazio
                    </span>
                ) : stats.percent >= 100 ? (
                    <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        Objetivo Concluído
                    </span>
                ) : (
                    <div className="flex flex-col items-end">
                        <span className="text-slate-400">
                            Faltam <strong>{stats.total - stats.completed}</strong>
                        </span>
                        {stats.dailyPace > 0 && (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-900/20 px-1.5 rounded mt-0.5 border border-emerald-500/20">
                                Meta Diária: {stats.dailyPace}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};