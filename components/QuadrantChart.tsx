import React, { useMemo, useState } from 'react';
import { Notebook, Weight, Relevance, WEIGHT_SCORE, RELEVANCE_SCORE } from '../types';
import { AlertTriangle, CheckCircle2, Minus, Target, Grid3X3, ScatterChart as ScatterIcon } from 'lucide-react';
import { getStatusColor } from '../utils/algorithm';

// Chart.js imports
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

interface Props {
  data: Notebook[];
}

export const QuadrantChart: React.FC<Props> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'heatmap' | 'scatter'>('heatmap');

  // --- HEATMAP LOGIC ---
  const weights = [Weight.MUITO_ALTO, Weight.ALTO, Weight.MEDIO, Weight.BAIXO];
  const relevances = [Relevance.BAIXA, Relevance.MEDIA, Relevance.ALTA, Relevance.ALTISSIMA];

  const matrix = useMemo(() => {
    const grid: Record<string, { count: number; totalAcc: number; notebooks: Notebook[] }> = {};
    
    // Initialize grid
    weights.forEach(w => {
      relevances.forEach(r => {
        grid[`${w}-${r}`] = { count: 0, totalAcc: 0, notebooks: [] };
      });
    });

    // Populate
    data.forEach(nb => {
      const key = `${nb.weight}-${nb.relevance}`;
      if (grid[key]) {
        grid[key].count += 1;
        grid[key].totalAcc += nb.accuracy;
        grid[key].notebooks.push(nb);
      }
    });

    return grid;
  }, [data]);

  const getCellColor = (count: number, avgAcc: number) => {
    if (count === 0) return 'bg-slate-800/30 border-slate-800 text-slate-600';
    if (avgAcc >= 85) return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30';
    if (avgAcc >= 60) return 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30';
    return 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30';
  };

  const getCellIcon = (avgAcc: number) => {
    if (avgAcc >= 85) return <CheckCircle2 size={14} />;
    if (avgAcc >= 60) return <Minus size={14} />;
    return <AlertTriangle size={14} />;
  };

  // --- SCATTER PLOT LOGIC (Chart.js) ---
  const scatterData = useMemo(() => {
    return {
        datasets: [{
            label: 'Cadernos',
            data: data.map(nb => ({
                x: RELEVANCE_SCORE[nb.relevance] + (Math.random() * 0.2 - 0.1), // Jitter
                y: WEIGHT_SCORE[nb.weight] + (Math.random() * 0.2 - 0.1), // Jitter
                r: 6, // Radius
                notebook: nb
            })),
            backgroundColor: data.map(nb => {
                if (nb.accuracy >= nb.targetAccuracy) return '#10b981'; // Green
                if (nb.accuracy < 60) return '#ef4444'; // Red
                return '#f59e0b'; // Amber
            }),
            borderWidth: 0
        }]
    };
  }, [data]);

  const scatterOptions = {
      scales: {
          x: {
              type: 'linear' as const,
              position: 'bottom' as const,
              title: { display: true, text: 'Relevância', color: '#94a3b8' },
              min: 0.5,
              max: 4.5,
              ticks: { 
                  stepSize: 1, 
                  callback: (val: any) => ['', 'Baixa', 'Média', 'Alta', 'Altíssima'][val] || '',
                  color: '#94a3b8'
              },
              grid: { color: '#334155' }
          },
          y: {
              type: 'linear' as const,
              title: { display: true, text: 'Peso no Edital', color: '#94a3b8' },
              min: 0.5,
              max: 4.5,
              ticks: { 
                  stepSize: 1, 
                  callback: (val: any) => ['', 'Baixo', 'Médio', 'Alto', 'M. Alto'][val] || '',
                  color: '#94a3b8'
              },
              grid: { color: '#334155' }
          }
      },
      plugins: {
          legend: { display: false },
          tooltip: {
              callbacks: {
                  label: (ctx: any) => {
                      const nb = ctx.raw.notebook;
                      return `${nb.name} (${nb.accuracy}%)`;
                  }
              }
          }
      },
      maintainAspectRatio: false
  };

  return (
    <div className="w-full bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col h-[480px]">
      <div className="flex justify-between items-start mb-6">
        <div>
           <h3 className="text-white font-bold text-lg flex items-center gap-2">
             <Target className="text-emerald-500" /> Matriz Estratégica
           </h3>
           <p className="text-slate-400 text-xs">Análise de Peso vs Relevância</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button 
                onClick={() => setViewMode('heatmap')}
                className={`p-2 rounded-md transition-all ${viewMode === 'heatmap' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                title="Mapa de Calor"
            >
                <Grid3X3 size={18} />
            </button>
            <button 
                onClick={() => setViewMode('scatter')}
                className={`p-2 rounded-md transition-all ${viewMode === 'scatter' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                title="Gráfico de Dispersão"
            >
                <ScatterIcon size={18} />
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        
        {viewMode === 'heatmap' ? (
            // --- HEATMAP RENDER ---
            <>
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Peso no Edital
                </div>

                <div className="flex flex-1 gap-2">
                    {/* Y-Axis Ticks */}
                    <div className="flex flex-col justify-between py-2 text-[10px] text-slate-500 font-bold text-right w-16 pr-2">
                        {weights.map(w => <span key={w} className="h-full flex items-center justify-end">{w.replace('Muito ', 'M. ')}</span>)}
                    </div>

                    {/* The Grid */}
                    <div className="flex-1 grid grid-cols-4 grid-rows-4 gap-2">
                        {weights.map((w) => (
                            relevances.map((r) => {
                                const cellData = matrix[`${w}-${r}`];
                                const avgAcc = cellData.count > 0 ? Math.round(cellData.totalAcc / cellData.count) : 0;
                                
                                return (
                                    <div 
                                        key={`${w}-${r}`}
                                        className={`
                                            rounded-lg border flex flex-col items-center justify-center transition-all cursor-default group relative
                                            ${getCellColor(cellData.count, avgAcc)}
                                        `}
                                    >
                                        {cellData.count > 0 ? (
                                            <>
                                                <div className="flex items-center gap-1 mb-1 font-bold">
                                                    {getCellIcon(avgAcc)}
                                                    <span className="text-lg">{avgAcc}%</span>
                                                </div>
                                                <span className="text-[10px] opacity-70 uppercase font-bold tracking-wider">
                                                    {cellData.count} {cellData.count === 1 ? 'Item' : 'Itens'}
                                                </span>
                                                
                                                {/* Hover Tooltip */}
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-950 border border-slate-700 rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                    <p className="text-xs font-bold text-white mb-2 border-b border-slate-800 pb-1">
                                                        {w} • {r}
                                                    </p>
                                                    <ul className="text-[10px] space-y-1 text-slate-400">
                                                        {cellData.notebooks.slice(0, 5).map(nb => (
                                                            <li key={nb.id} className="truncate flex justify-between">
                                                                <span>{nb.discipline.substring(0, 15)}...</span>
                                                                <span className={nb.accuracy < 60 ? 'text-red-400' : 'text-emerald-400'}>{nb.accuracy}%</span>
                                                            </li>
                                                        ))}
                                                        {cellData.count > 5 && <li className="italic text-center pt-1">+ {cellData.count - 5} outros</li>}
                                                    </ul>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-slate-700 text-xs font-mono">-</span>
                                        )}
                                    </div>
                                );
                            })
                        ))}
                    </div>
                </div>

                {/* X-Axis Ticks */}
                <div className="flex ml-16 pl-2 pt-2 gap-2">
                     {relevances.map(r => (
                         <div key={r} className="flex-1 text-center text-[10px] text-slate-500 font-bold uppercase truncate">
                            {r}
                         </div>
                     ))}
                </div>
                
                {/* X-Axis Label */}
                <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 ml-16">
                    Relevância Estratégica
                </div>
            </>
        ) : (
            // --- CHART.JS SCATTER RENDER ---
            <div className="w-full h-full relative">
                 <Scatter data={scatterData} options={scatterOptions} />
                 
                 {/* Legend */}
                 <div className="absolute top-0 right-0 text-[10px] bg-slate-900/90 p-2 rounded border border-slate-700 text-slate-400 backdrop-blur-sm pointer-events-none">
                    <div className="flex items-center gap-1.5 mb-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Crítico</div>
                    <div className="flex items-center gap-1.5 mb-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Atenção</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Dominado</div>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};