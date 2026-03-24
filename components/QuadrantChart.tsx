import React, { useMemo, useState } from 'react';
import { Notebook, Weight, Relevance, WEIGHT_SCORE, RELEVANCE_SCORE } from '../types';
import { AlertTriangle, CheckCircle2, Minus, Target, Grid3X3, ScatterChart as ScatterIcon, X, ExternalLink } from 'lucide-react';
import { getStatusColor } from '../utils/algorithm';
import { useStore } from '../store';

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
  onNavigate?: (view: string) => void;
}

export const QuadrantChart: React.FC<Props> = ({ data, onNavigate }) => {
  const { setFocusedNotebookId } = useStore();
  const [viewMode, setViewMode] = useState<'heatmap' | 'scatter'>('heatmap');
  const [selectedCell, setSelectedCell] = useState<{ notebooks: Notebook[], title: string } | null>(null);
  const [editalFilter, setEditalFilter] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('');

  const filteredData = useMemo(() => {
    let result = data;
    if (editalFilter.trim()) {
      const lowerFilter = editalFilter.toLowerCase();
      result = result.filter(nb => nb.edital?.toLowerCase().includes(lowerFilter));
    }
    if (disciplineFilter.trim()) {
      const lowerDiscFilter = disciplineFilter.toLowerCase();
      result = result.filter(nb => nb.discipline.toLowerCase().includes(lowerDiscFilter));
    }
    return result;
  }, [data, editalFilter, disciplineFilter]);

  // --- HEATMAP LOGIC ---
  const weights = [Weight.ALTO, Weight.MEDIO, Weight.BAIXO];
  const relevances = [Relevance.BAIXA, Relevance.MEDIA, Relevance.ALTA];

  const matrix = useMemo(() => {
    const grid: Record<string, { count: number; totalAcc: number; notebooks: Notebook[] }> = {};
    
    // Initialize grid
    weights.forEach(w => {
      relevances.forEach(r => {
        grid[`${w}-${r}`] = { count: 0, totalAcc: 0, notebooks: [] };
      });
    });

    // Populate
    filteredData.forEach(nb => {
      // AJUSTE PONTUAL: Ignorar não iniciados (0%) para não distorcer a média
      if (nb.accuracy === 0) return;

      const key = `${nb.weight}-${nb.relevance}`;
      if (grid[key]) {
        grid[key].count += 1;
        grid[key].totalAcc += nb.accuracy;
        grid[key].notebooks.push(nb);
      }
    });

    return grid;
  }, [filteredData]);

  const getCellColor = (count: number, avgAcc: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-600';
    if (avgAcc >= 85) return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30';
    if (avgAcc >= 60) return 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30';
    return 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30';
  };

  const getCellIcon = (avgAcc: number) => {
    if (avgAcc >= 85) return <CheckCircle2 size={16} />;
    if (avgAcc >= 60) return <Minus size={16} />;
    return <AlertTriangle size={16} />;
  };

  const handleCellClick = (w: Weight, r: Relevance, cellData: { notebooks: Notebook[], count: number }) => {
      if (cellData.count > 0) {
          setSelectedCell({
              notebooks: cellData.notebooks,
              title: `${w} • ${r}`
          });
      }
  };

  const handleNotebookClick = (id: string) => {
      setFocusedNotebookId(id);
      setSelectedCell(null);
      onNavigate?.('library');
  };

  // --- SCATTER PLOT LOGIC (Chart.js) ---
  const scatterData = useMemo(() => {
    // AJUSTE PONTUAL: Filtrar apenas os ativos (accuracy > 0)
    const activeNotebooks = filteredData.filter(n => n.accuracy > 0);

    const getJitter = (seed: string) => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        return ((Math.abs(hash) % 200) / 1000) - 0.1;
    };

    return {
        datasets: [{
            label: 'Cadernos',
            data: activeNotebooks.map(nb => ({
                x: RELEVANCE_SCORE[nb.relevance] + getJitter(nb.id + 'x'), // Jitter
                y: WEIGHT_SCORE[nb.weight] + getJitter(nb.id + 'y'), // Jitter
                r: 6, // Radius
                notebook: nb
            })),
            backgroundColor: activeNotebooks.map(nb => {
                if ((Number(nb.accuracy) || 0) >= (Number(nb.targetAccuracy) || 90)) return '#10b981'; // Green
                if (nb.accuracy <= 60) return '#ef4444'; // Red
                return '#f59e0b'; // Amber
            }),
            borderWidth: 0
        }]
    };
  }, [filteredData]);

  const scatterOptions = {
      scales: {
          x: {
              type: 'linear' as const,
              position: 'bottom' as const,
              title: { display: true, text: 'Relevância', color: '#94a3b8' },
              min: 0.5,
              max: 3.5,
              ticks: { 
                  stepSize: 1, 
                  callback: (val: any) => ['', 'Baixa', 'Média', 'Alta'][val] || '',
                  color: '#94a3b8'
              },
              grid: { color: '#334155' }
          },
          y: {
              type: 'linear' as const,
              title: { display: true, text: 'Peso no Edital', color: '#94a3b8' },
              min: 0.5,
              max: 3.5,
              ticks: { 
                  stepSize: 1, 
                  callback: (val: any) => ['', 'Baixo', 'Médio', 'Alto'][val] || '',
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
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-[480px] relative">
      <div className="flex justify-between items-start mb-6">
        <div>
           <h3 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
             <Target className="text-emerald-500" /> Matriz Estratégica
           </h3>
           <p className="text-slate-500 dark:text-slate-400 text-xs">Análise de Peso vs Relevância (Apenas Tópicos Ativos)</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-4">
            <input 
                type="text" 
                placeholder="Filtrar por disciplina..." 
                value={disciplineFilter} 
                onChange={(e) => setDisciplineFilter(e.target.value)} 
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 w-48"
            />
            <input 
                type="text" 
                placeholder="Filtrar por concurso..." 
                value={editalFilter} 
                onChange={(e) => setEditalFilter(e.target.value)} 
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 w-48"
            />
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button 
                    onClick={() => setViewMode('heatmap')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'heatmap' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    title="Mapa de Calor"
                >
                    <Grid3X3 size={20} />
                </button>
                <button 
                    onClick={() => setViewMode('scatter')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'scatter' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    title="Gráfico de Dispersão"
                >
                    <ScatterIcon size={20} />
                </button>
            </div>
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
                        {weights.map(w => <span key={w} className="h-full flex items-center justify-end">{w}</span>)}
                    </div>

                    {/* The Grid */}
                    <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-2">
                        {weights.map((w) => (
                            relevances.map((r) => {
                                const cellData = matrix[`${w}-${r}`];
                                const avgAcc = cellData.count > 0 ? Math.round(cellData.totalAcc / cellData.count) : 0;
                                
                                return (
                                    <div 
                                        key={`${w}-${r}`}
                                        onClick={() => handleCellClick(w, r, cellData)}
                                        className={`
                                            rounded-lg border flex flex-col items-center justify-center transition-all group relative
                                            ${getCellColor(cellData.count, avgAcc)}
                                            ${cellData.count > 0 ? 'cursor-pointer hover:brightness-110 active:scale-95' : 'cursor-default'}
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
                                                
                                                {/* Hover Hint */}
                                                <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-50 transition-opacity">
                                                    <ExternalLink size={12} />
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
                 <div className="absolute top-0 right-0 text-[10px] bg-white dark:bg-slate-900/90 p-2 rounded border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 backdrop-blur-sm pointer-events-none">
                    <div className="flex items-center gap-1.5 mb-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Crítico</div>
                    <div className="flex items-center gap-1.5 mb-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Atenção</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Dominado</div>
                 </div>
            </div>
        )}

      </div>

      {/* POPUP LIST MODAL */}
      {selectedCell && (
          <div className="absolute inset-0 z-50 bg-white dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-center rounded-xl p-4 animate-in fade-in zoom-in duration-200">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-full">
                  <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                          <h4 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wide">Quadrante Selecionado</h4>
                          <p className="text-emerald-500 text-xs font-bold mt-0.5">{selectedCell.title}</p>
                      </div>
                      <button onClick={() => setSelectedCell(null)} className="text-slate-500 hover:text-slate-900 dark:text-white transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="overflow-y-auto p-2 custom-scrollbar">
                      {selectedCell.notebooks.map(nb => (
                          <button 
                            key={nb.id}
                            onClick={() => handleNotebookClick(nb.id)}
                            className="w-full text-left p-3 hover:bg-slate-100 dark:bg-slate-800 rounded-lg flex justify-between items-center group transition-colors"
                          >
                              <div className="min-w-0 pr-2">
                                  <p className="text-xs font-bold text-slate-200 truncate">{nb.discipline}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{nb.name}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${nb.accuracy <= 60 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                      {nb.accuracy}%
                                  </span>
                                  <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-900 dark:text-white" />
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};