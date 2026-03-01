import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { Discipline, Weight, Relevance, WEIGHT_SCORE, RELEVANCE_SCORE } from '../types';
import { Target, Grid3X3, ScatterChart as ScatterIcon, X, ExternalLink, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

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
  data: Discipline[];
  onNavigate?: (view: string) => void;
}

export const DisciplineQuadrantChart: React.FC<Props> = ({ data, onNavigate }) => {
  const { notebooks } = useStore();
  const [viewMode, setViewMode] = useState<'heatmap' | 'scatter'>('heatmap');
  const [selectedCell, setSelectedCell] = useState<{ disciplines: Discipline[], title: string } | null>(null);
  const [editalFilter, setEditalFilter] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('');

  const filteredData = useMemo(() => {
    let result = data;
    if (editalFilter.trim()) {
      const lowerFilter = editalFilter.toLowerCase();
      result = result.filter(d => d.edital?.toLowerCase().includes(lowerFilter));
    }
    if (disciplineFilter.trim()) {
      const lowerDiscFilter = disciplineFilter.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(lowerDiscFilter));
    }
    return result;
  }, [data, editalFilter, disciplineFilter]);

  const weights = [Weight.MUITO_ALTO, Weight.ALTO, Weight.MEDIO, Weight.BAIXO];
  const relevances = [Relevance.BAIXA, Relevance.MEDIA, Relevance.ALTA, Relevance.ALTISSIMA];

  const matrix = useMemo(() => {
    const grid: Record<string, { count: number; disciplines: Discipline[]; avgAccuracy: number | null }> = {};
    
    weights.forEach(w => {
      relevances.forEach(r => {
        grid[`${w}-${r}`] = { count: 0, disciplines: [], avgAccuracy: null };
      });
    });

    filteredData.forEach(disc => {
      const key = `${disc.weight}-${disc.relevance}`;
      if (grid[key]) {
        grid[key].count += 1;
        grid[key].disciplines.push(disc);
      }
    });

    // Calculate average accuracy for each cell
    Object.values(grid).forEach(cell => {
      if (cell.count > 0) {
        // Collect all notebooks for the disciplines in this cell
        const cellNotebooks = notebooks.filter(nb => 
          cell.disciplines.some(d => d.name === nb.discipline) && nb.accuracy > 0
        );
        
        if (cellNotebooks.length > 0) {
          const totalAcc = cellNotebooks.reduce((sum, nb) => sum + nb.accuracy, 0);
          cell.avgAccuracy = Math.round(totalAcc / cellNotebooks.length);
        }
      }
    });

    return grid;
  }, [filteredData, weights, relevances, notebooks]);

  const getCellColor = (count: number, avgAcc: number | null) => {
    if (count === 0) return 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400';
    if (avgAcc === null) return 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400';
    if (avgAcc >= 85) return 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-200 dark:hover:bg-emerald-900/60';
    if (avgAcc >= 60) return 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-900/60';
    return 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700/50 text-red-900 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-900/60';
  };

  const getCellIcon = (avgAcc: number | null) => {
    if (avgAcc === null) return null;
    if (avgAcc >= 85) return <CheckCircle2 size={18} />;
    if (avgAcc >= 60) return <TrendingUp size={18} />;
    return <AlertTriangle size={18} />;
  };

  const getQuadrantLabel = (weight: Weight, relevance: Relevance) => {
    const wScore = WEIGHT_SCORE[weight];
    const rScore = RELEVANCE_SCORE[relevance];
    if (wScore >= 4 && rScore >= 4) return 'Crítico';
    if (wScore >= 4 && rScore < 4) return 'Atenção';
    if (wScore < 4 && rScore >= 4) return 'Estratégico';
    return 'Manutenção';
  };

  const scatterData = useMemo(() => {
    // Filter out disciplines that have no notebooks with accuracy > 0
    const activeDisciplines = filteredData.filter(disc => {
      const discNotebooks = notebooks.filter(nb => nb.discipline === disc.name && nb.accuracy > 0);
      return discNotebooks.length > 0;
    });

    return {
      datasets: [
        {
          label: 'Disciplinas',
          data: activeDisciplines.map(disc => ({
            x: RELEVANCE_SCORE[disc.relevance] + (Math.random() * 0.2 - 0.1), // Jitter
            y: WEIGHT_SCORE[disc.weight] + (Math.random() * 0.2 - 0.1), // Jitter
            disc
          })),
          backgroundColor: activeDisciplines.map(disc => {
            const discNotebooks = notebooks.filter(nb => nb.discipline === disc.name && nb.accuracy > 0);
            const avgAccuracy = Math.round(discNotebooks.reduce((sum, nb) => sum + nb.accuracy, 0) / discNotebooks.length);
            
            if (avgAccuracy >= 85) return 'rgba(16, 185, 129, 0.7)'; // Emerald
            if (avgAccuracy >= 60) return 'rgba(245, 158, 11, 0.7)'; // Amber
            return 'rgba(239, 68, 68, 0.7)'; // Red
          }),
          borderColor: activeDisciplines.map(disc => {
            const discNotebooks = notebooks.filter(nb => nb.discipline === disc.name && nb.accuracy > 0);
            const avgAccuracy = Math.round(discNotebooks.reduce((sum, nb) => sum + nb.accuracy, 0) / discNotebooks.length);
            
            if (avgAccuracy >= 85) return 'rgb(16, 185, 129)'; // Emerald
            if (avgAccuracy >= 60) return 'rgb(245, 158, 11)'; // Amber
            return 'rgb(239, 68, 68)'; // Red
          }),
          borderWidth: 1,
          pointRadius: 6,
          pointHoverRadius: 8,
        }
      ]
    };
  }, [filteredData, notebooks]);

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: { display: true, text: 'Relevância', color: '#64748b', font: { weight: 'bold' as const } },
        min: 0.5, max: 4.5,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { 
          stepSize: 1,
          callback: (val: any) => ['', 'Baixa', 'Média', 'Alta', 'Altíssima'][val] || '',
          color: '#64748b' 
        }
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: 'Peso', color: '#64748b', font: { weight: 'bold' as const } },
        min: 0.5, max: 4.5,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { 
          stepSize: 1,
          callback: (val: any) => ['', 'Baixo', 'Médio', 'Alto', 'Muito Alto'][val] || '',
          color: '#64748b' 
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const disc = context.raw.disc as Discipline;
            const discNotebooks = notebooks.filter(nb => nb.discipline === disc.name);
            const avgAccuracy = discNotebooks.length > 0
              ? Math.round(discNotebooks.reduce((acc, nb) => acc + nb.accuracy, 0) / discNotebooks.length)
              : null;
            
            return [
              ` ${disc.name}`,
              ` Edital: ${disc.edital || 'N/A'}`,
              ` Peso: ${disc.weight}`,
              ` Relevância: ${disc.relevance}`,
              ` Acurácia Média: ${avgAccuracy !== null ? `${avgAccuracy}%` : 'N/A'}`
            ];
          }
        },
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(51, 65, 85, 0.5)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
      }
    }
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Target size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Matriz de Disciplinas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Priorização por Peso e Relevância</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Filtrar por disciplina..." 
            value={disciplineFilter}
            onChange={e => setDisciplineFilter(e.target.value)}
            className="w-full sm:w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
          />
          <input 
            type="text" 
            placeholder="Filtrar por Edital..." 
            value={editalFilter}
            onChange={e => setEditalFilter(e.target.value)}
            className="w-full sm:w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
          />
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setViewMode('heatmap')} 
              className={`p-1.5 rounded-md transition-all ${viewMode === 'heatmap' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              title="Visualização em Grade (Heatmap)"
            >
              <Grid3X3 size={16} />
            </button>
            <button 
              onClick={() => setViewMode('scatter')} 
              className={`p-1.5 rounded-md transition-all ${viewMode === 'scatter' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              title="Gráfico de Dispersão"
            >
              <ScatterIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'heatmap' ? (
        <div className="flex-1 w-full overflow-x-auto custom-scrollbar pb-4">
          <div className="min-w-[600px] h-full flex flex-col">
            <div className="flex mb-2">
              <div className="w-24 flex-shrink-0"></div>
              <div className="flex-1 grid grid-cols-4 gap-2">
                {relevances.map(r => (
                  <div key={r} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">{r}</div>
                ))}
              </div>
            </div>

            <div className="flex flex-1 relative">
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                Peso no Edital
              </div>
              
              <div className="w-24 flex-shrink-0 flex flex-col gap-2 pr-2">
                {weights.map(w => (
                  <div key={w} className="flex-1 flex items-center justify-end text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    {w}
                  </div>
                ))}
              </div>

              <div className="flex-1 flex flex-col gap-2">
                {weights.map(w => (
                  <div key={w} className="flex-1 grid grid-cols-4 gap-2">
                    {relevances.map(r => {
                      const cell = matrix[`${w}-${r}`];
                      const colorClass = getCellColor(cell.count, cell.avgAccuracy);
                      const label = getQuadrantLabel(w, r);
                      
                      return (
                        <div 
                          key={`${w}-${r}`} 
                          onClick={() => cell.count > 0 && setSelectedCell({ disciplines: cell.disciplines, title: `${w} / ${r}` })}
                          className={`relative rounded-xl border p-3 flex flex-col items-center justify-center transition-all duration-300 ${colorClass} ${cell.count > 0 ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : 'opacity-50'}`}
                        >
                          {cell.count > 0 && cell.avgAccuracy !== null ? (
                            <>
                              <div className="flex items-center gap-1 mb-1 font-bold">
                                {getCellIcon(cell.avgAccuracy)}
                                <span className="text-2xl font-black">{cell.avgAccuracy}%</span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">
                                {cell.count} {cell.count === 1 ? 'Item' : 'Itens'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-3xl font-black opacity-30">{cell.count}</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-50">{label}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Relevância para Aprovação
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[400px] bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <Scatter data={scatterData} options={scatterOptions} />
        </div>
      )}

      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedCell(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target size={18} className="text-emerald-500" />
                  Disciplinas: {selectedCell.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedCell.disciplines.length} disciplinas neste quadrante</p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedCell.disciplines.map(disc => {
                  const discNotebooks = notebooks.filter(nb => nb.discipline === disc.name);
                  const avgAccuracy = discNotebooks.length > 0
                    ? Math.round(discNotebooks.reduce((acc, nb) => acc + nb.accuracy, 0) / discNotebooks.length)
                    : null;

                  return (
                    <div key={disc.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 line-clamp-2">{disc.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{disc.edital || 'Sem edital'}</p>
                          {avgAccuracy !== null && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              avgAccuracy >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              avgAccuracy >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              avgAccuracy >= 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {avgAccuracy}%
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedCell(null);
                          if (onNavigate) onNavigate('disciplines');
                        }}
                        className="mt-3 w-full py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <ExternalLink size={12} /> Gerenciar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
