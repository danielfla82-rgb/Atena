
import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { QuadrantChart } from './QuadrantChart';
import { StudySession } from './StudySession';
import { LiquidityGauge } from './LiquidityGauge';
import { Notebook, Allocation } from '../types';
import { BookOpen, Target, Siren, Sparkles, Zap, ArrowRight, Settings } from 'lucide-react';

export const Dashboard: React.FC<{ onNavigate: (v:string) => void }> = ({ onNavigate }) => {
  const { notebooks, cycles, activeCycleId, getWildcardNotebook, setFocusedNotebookId } = useStore();
  
  const activeCycle = useMemo(() => cycles.find(c => c.id === activeCycleId), [cycles, activeCycleId]);
  const allocations = useMemo(() => (activeCycle?.planning as Allocation[]) || [], [activeCycle]);

  const metrics = useMemo(() => {
      // Time: 45 min per completed allocation
      const completedBlocks = allocations.filter(a => a.completed).length;
      const totalMinutes = completedBlocks * 45;
      const hours = Math.floor(totalMinutes / 60);
      
      // Performance (Avg of all notebooks)
      const activeNotebooks = notebooks.filter(n => n.accuracy > 0);
      const totalAcc = activeNotebooks.reduce((sum, n) => sum + n.accuracy, 0);
      const avgAccuracy = activeNotebooks.length > 0 ? Math.round(totalAcc / activeNotebooks.length) : 0;

      // Progress (Total defined topics vs Mastered)
      const totalTopics = notebooks.length;
      const mastered = notebooks.filter(n => n.status === 'Dominado' || n.accuracy >= 90).length;
      const progressPercent = totalTopics > 0 ? Math.round((mastered / totalTopics) * 100) : 0;

      return {
          time: `${hours}h`,
          avgAccuracy,
          completedTopics: mastered,
          progressPercent
      };
  }, [allocations, notebooks]);

  // Simplified render for brevity - keeping core structure
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Dashboard Estratégico</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-lg text-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tempo de Estudo</span>
              <div className="text-3xl font-black mt-2">{metrics.time}</div>
          </div>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-lg text-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Desempenho Médio</span>
              <div className="text-3xl font-black mt-2">{metrics.avgAccuracy}%</div>
          </div>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-lg text-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progresso Global</span>
              <div className="text-3xl font-black mt-2">{metrics.progressPercent}%</div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">Metas do Dia</h3>
             <div className="space-y-3">
                 {/* Logic to show items due based on date would go here, simplified */}
                 <div className="text-center text-slate-500 text-sm py-4">Verifique o cronograma na aba Planejamento.</div>
             </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <QuadrantChart data={notebooks} />
          </div>
      </div>
    </div>
  );
};
