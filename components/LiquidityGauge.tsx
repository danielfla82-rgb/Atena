import React, { useMemo } from 'react';
import { Notebook } from '../types';
import { Droplets, AlertTriangle, HelpCircle,  Info } from 'lucide-react';

interface Props {
  notebooks: Notebook[];
}

export const LiquidityGauge: React.FC<Props> = ({ notebooks }) => {
  const stats = useMemo(() => {
    const validNotebooks = notebooks.filter(n => n.discipline !== 'Revisão Geral');
    const totalItems = validNotebooks.length;

    if (totalItems === 0) return { liquidity: 0, coverage: 0, illusion: 0, rawLiquidityCount: 0 };

    // 1. Cobertura Bruta: Itens que já foram iniciados (Status != Not Started ou Accuracy > 0)
    const touchedItems = validNotebooks.filter(n => n.accuracy > 0 || (n.status && n.status !== 'Não Iniciado')).length;
    
    // 2. Liquidez Real: Itens com Acurácia >= 80% (Conhecimento Sólido)
    const liquidItems = validNotebooks.filter(n => n.accuracy >= 80).length;

    // 3. Ilusão (Espuma): Cobertura - Liquidez
    const foamItems = touchedItems - liquidItems;

    return {
      liquidity: Math.round((liquidItems / totalItems) * 100),
      coverage: Math.round((touchedItems / totalItems) * 100),
      illusion: Math.round((foamItems / totalItems) * 100),
      rawLiquidityCount: liquidItems,
      totalItems
    };
  }, [notebooks]);

  // Determine status color based on liquidity
  const getStatusColor = (liq: number) => {
      if (liq < 30) return 'text-red-500';
      if (liq < 60) return 'text-amber-500';
      if (liq < 85) return 'text-blue-400';
      return 'text-green-500';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative overflow-hidden group">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6 z-10 relative">
        <div>
           <h3 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
             <Droplets className="text-cyan-500" size={20} /> 
             Liquidez do Edital
           </h3>
           <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Sua retenção real vs. matérias apenas "lidas".</p>
        </div>
        <div className="text-right">
            <span className={`text-3xl font-black ${getStatusColor(stats.liquidity)}`}>{stats.liquidity}%</span>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Índice Real</p>
        </div>
      </div>

      {/* Main Gauge Bar */}
      <div className="relative h-12 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 mb-6 overflow-hidden flex items-center">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-5 pointer-events-none"></div>
          
          {/* 1. Liquid Layer (Solid Knowledge) */}
          <div 
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 relative group/liquid transition-all duration-1000 ease-out flex items-center justify-end px-2 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            style={{ width: `${stats.liquidity}%` }}
          >
             {stats.liquidity > 10 && <span className="text-[10px] font-bold text-cyan-950 whitespace-nowrap">Sólido</span>}
          </div>

          {/* 2. Foam Layer (Illusion) */}
          <div 
            className="h-full bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.1),rgba(245,158,11,0.1)_10px,rgba(245,158,11,0.2)_10px,rgba(245,158,11,0.2)_20px)] border-l border-white/10 relative group/foam transition-all duration-1000 ease-out flex items-center justify-center"
            style={{ width: `${stats.illusion}%` }}
          >
             {stats.illusion > 10 && <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider drop-shadow-md">Ilusão</span>}
          </div>
      </div>

      {/* Legend / Metrics */}
      <div className="grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
          
          <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  Cobertura Bruta <Info size={10} />
              </span>
              <span className="text-slate-900 dark:text-white font-mono font-bold text-lg">{stats.coverage}%</span>
              <span className="text-[9px] text-slate-500">Matérias estudadas</span>
          </div>

          <div className="flex flex-col gap-1 relative">
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  Taxa de Espuma <AlertTriangle size={10} />
              </span>
              <span className="text-amber-400 font-mono font-bold text-lg">{stats.illusion}%</span>
              <span className="text-[9px] text-amber-500/60">Risco de esquecimento</span>
              
              {/* Tooltip for Foam */}
              <div className="absolute bottom-full mb-2 left-0 w-40 bg-amber-900/90 border border-amber-500/30 text-amber-100 text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Matérias que você estudou mas tem acurácia &lt; 80%. Isso cria falsa segurança.
              </div>
          </div>

          <div className="flex flex-col gap-1 text-right">
              <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                  Pontos de Elite
              </span>
              <span className="text-cyan-400 font-mono font-bold text-lg">{stats.rawLiquidityCount} <span className="text-xs text-slate-500">/ {stats.totalItems}</span></span>
              <span className="text-[9px] text-slate-500">Tópicos Dominados ({'>'}80%)</span>
          </div>

      </div>
    </div>
  );
};