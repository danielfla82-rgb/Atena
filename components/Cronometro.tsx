import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Square, RotateCcw, Save, GripHorizontal, Sun, Cloud, CloudRain, CloudLightning, CloudFog, CloudSun, BarChart3, CalendarDays, CalendarRange, Calendar } from 'lucide-react';
import { Reorder, motion, useDragControls } from 'motion/react';
import { useStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StudySessionRecord } from '../types';

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center pointer-events-none select-none">
      <div className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">Horário Local</div>
      <div className="flex items-center space-x-6">
        <div className="flex flex-col items-end">
          <div className="text-7xl font-light tracking-tighter text-slate-800 dark:text-slate-100 leading-none">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xl font-light text-slate-400 dark:text-slate-500 mt-2">
            {time.toLocaleTimeString('pt-BR', { second: '2-digit' })}s
          </div>
        </div>
        <div className="w-px h-20 bg-slate-200 dark:bg-slate-800"></div>
        <div className="flex flex-col items-start justify-center">
          <div className="text-sm font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-1">
            {time.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0]}
          </div>
          <div className="text-xl font-light text-slate-600 dark:text-slate-300 capitalize">
            {time.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          </div>
          <div className="text-sm font-light text-slate-400 dark:text-slate-500 mt-1">
            {time.toLocaleDateString('pt-BR', { year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getWeatherInfo(code: number) {
  if (code === 0) return { text: 'Ensolarado', icon: Sun };
  if (code === 1) return { text: 'Sol com poucas nuvens', icon: CloudSun };
  if (code === 2) return { text: 'Sol com algumas nuvens', icon: CloudSun };
  if (code === 3) return { text: 'Nublado', icon: Cloud };
  if (code >= 45 && code <= 48) return { text: 'Neblina', icon: CloudFog };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { text: 'Chuva', icon: CloudRain };
  if (code >= 95) return { text: 'Tempestade', icon: CloudLightning };
  return { text: 'Limpo', icon: Sun };
}

function Weather() {
  const [weather, setWeather] = useState<{temp: number, code: number, min: number, max: number} | null>(null);
  const [locationName, setLocationName] = useState<string>("Carregando local...");

  useEffect(() => {
    // Busca a localização baseada no IP do usuário
    fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=pt')
      .then(res => res.json())
      .then(geoData => {
        const lat = geoData.latitude;
        const lon = geoData.longitude;
        
        const city = geoData.city || geoData.locality || "Local";
        const uf = geoData.principalSubdivisionCode ? geoData.principalSubdivisionCode.split('-').pop() : "";
        setLocationName(uf ? `${city}, ${uf}` : city);

        // Busca o clima usando as coordenadas detectadas e timezone automático
        return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
      })
      .then(res => res.json())
      .then(data => {
        if (data.current && data.daily) {
          setWeather({
            temp: data.current.temperature_2m,
            code: data.current.weather_code,
            max: data.daily.temperature_2m_max[0],
            min: data.daily.temperature_2m_min[0]
          });
        }
      })
      .catch(err => {
        console.error("Failed to fetch weather or location", err);
        setLocationName("Local Desconhecido");
      });
  }, []);

  const info = weather !== null ? getWeatherInfo(weather.code) : null;
  const Icon = info?.icon || Sun;

  return (
    <div className="flex flex-col items-center justify-center pointer-events-none select-none">
      <div className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">{locationName}</div>
      <div className="flex items-center space-x-6">
        <div className="flex flex-col items-end">
          <div className="text-7xl font-light tracking-tighter text-slate-800 dark:text-slate-100 leading-none">
            {weather !== null ? `${Math.round(weather.temp)}°` : '--°'}
          </div>
          {weather !== null && (
            <div className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-3 flex space-x-3">
              <span>Min {Math.round(weather.min)}°</span>
              <span>Max {Math.round(weather.max)}°</span>
            </div>
          )}
        </div>
        <div className="w-px h-24 bg-slate-200 dark:bg-slate-800"></div>
        <div className="flex flex-col items-start justify-center">
          {info ? (
            <>
              <Icon size={24} className="text-slate-400 dark:text-slate-500 mb-2" strokeWidth={1.5} />
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-[0.05em] max-w-[120px] leading-snug">
                {info.text}
              </div>
            </>
          ) : (
            <div className="text-sm font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
              ...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stopwatch({ onSave }: { onSave: (time: number) => void }) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let requestRef: number;
    const updateTime = () => {
      if (startTimeRef.current !== null) {
        setTime(Date.now() - startTimeRef.current);
        requestRef = requestAnimationFrame(updateTime);
      }
    };

    if (isRunning) {
      startTimeRef.current = Date.now() - time;
      requestRef = requestAnimationFrame(updateTime);
    }
    
    return () => {
      if (requestRef) cancelAnimationFrame(requestRef);
    };
  }, [isRunning, time]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    startTimeRef.current = null;
  };

  const handleSave = () => {
    if (time > 0) {
      onSave(time);
      handleReset();
    }
  };

  const minutes = Math.floor(time / 60000);
  const seconds = Math.floor((time % 60000) / 1000);
  const milliseconds = Math.floor((time % 1000) / 10);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 pointer-events-none select-none">Cronômetro</div>
      <div className="text-6xl font-mono font-light text-slate-800 dark:text-slate-100 tabular-nums tracking-tight mb-8 flex items-baseline pointer-events-none select-none">
        {minutes.toString().padStart(2, '0')}:
        {seconds.toString().padStart(2, '0')}.
        <span className="text-4xl text-slate-400 dark:text-slate-500">{milliseconds.toString().padStart(2, '0')}</span>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={handleStartPause}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-all active:scale-95 shadow-lg shadow-slate-800/20 cursor-pointer"
          title={isRunning ? "Pausar" : "Iniciar"}
        >
          {isRunning ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
        </button>
        <button
          onClick={handleReset}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer"
          title="Zerar"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={handleSave}
          disabled={time === 0}
          className={`w-14 h-14 flex items-center justify-center rounded-full transition-all active:scale-95 cursor-pointer ${time > 0 ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 shadow-lg shadow-emerald-100/50 dark:shadow-none' : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'}`}
          title="Finalizar e Salvar Sessão"
        >
          <Save size={18} />
        </button>
      </div>
    </div>
  );
}

function DraggableWidget({ item, onSaveSession }: { item: string, onSaveSession: (duration: number) => void }) {
  const dragControls = useDragControls();
  
  return (
    <Reorder.Item 
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className="relative group flex flex-col items-center p-8 rounded-3xl hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors bg-transparent"
    >
      <div 
        onPointerDown={(e) => dragControls.start(e)}
        style={{ touchAction: "none" }}
        className="absolute top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing p-2"
      >
        <GripHorizontal size={20} />
      </div>
      {item === 'clock' && <Clock />}
      {item === 'weather' && <Weather />}
      {item === 'stopwatch' && <Stopwatch onSave={onSaveSession} />}
    </Reorder.Item>
  );
}

function processChartData(sessions: StudySessionRecord[], view: 'day' | 'week' | 'month') {
  const now = new Date();
  
  if (view === 'day') {
    const data = Array.from({ length: 24 }, (_, i) => ({
      name: `${i}h`,
      duration: 0
    }));
    
    sessions.forEach(s => {
      const d = new Date(s.date);
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const hour = d.getHours();
        data[hour].duration += s.duration;
      }
    });
    
    return data.map(v => ({
      name: v.name,
      Horas: Number((v.duration / 3600000).toFixed(2))
    }));
  }
  
  if (view === 'week') {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const data = days.map((dayName) => ({ name: dayName, duration: 0 }));
    
    sessions.forEach(s => {
      const d = new Date(s.date);
      if (d.getTime() >= startOfWeek.getTime() && d.getTime() < startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000) {
        const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        data[dayIdx].duration += s.duration;
      }
    });
    
    return data.map(v => ({
      name: v.name,
      Horas: Number((v.duration / 3600000).toFixed(2))
    }));
  }
  
  if (view === 'month') {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => ({
      name: `${i + 1}`,
      duration: 0
    }));
    
    sessions.forEach(s => {
      const d = new Date(s.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const day = d.getDate();
        data[day - 1].duration += s.duration;
      }
    });
    
    return data.map(v => ({
      name: v.name,
      Horas: Number((v.duration / 3600000).toFixed(2))
    }));
  }
  
  return [];
}

export function Cronometro() {
  const { studySessions, addStudySession, deleteStudySession } = useStore();
  const [chartView, setChartView] = useState<'day' | 'week' | 'month'>('week');
  const showChart = true;
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [items, setItems] = useState(['clock', 'stopwatch', 'weather']);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const chartData = useMemo(() => processChartData(studySessions, chartView), [studySessions, chartView]);
  const yDomain = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.Horas), 0);
    return [0, Math.max(8, Math.ceil(maxVal))];
  }, [chartData]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const actuallyHorizontal = isHorizontal && isDesktop;

  const handleSaveSession = (duration: number) => {
    addStudySession(duration);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-6 px-4 font-sans relative overflow-x-hidden transition-colors duration-300">
      
      <div className="absolute top-6 right-6 flex space-x-2 z-10">
        <button 
          onClick={() => setIsHorizontal(false)} 
          className={`text-[10px] font-medium uppercase tracking-[0.2em] px-4 py-2 rounded-full transition-all ${!isHorizontal ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
        >
          Vertical
        </button>
        <button 
          onClick={() => setIsHorizontal(true)} 
          className={`text-[10px] font-medium uppercase tracking-[0.2em] px-4 py-2 rounded-full transition-all ${isHorizontal ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
        >
          Horizontal
        </button>
      </div>

      <div className="w-full max-w-6xl my-auto flex flex-col items-center py-12">
        <Reorder.Group
          axis={actuallyHorizontal ? "x" : "y"}
          values={items}
          onReorder={setItems}
          className={`w-full flex items-center justify-center transition-all duration-700 ease-in-out ${isHorizontal ? 'flex-col lg:flex-row gap-6 lg:gap-12 max-w-6xl' : 'flex-col gap-6 max-w-sm'}`}
        >
          {items.map(item => (
            <DraggableWidget key={item} item={item} onSaveSession={handleSaveSession} />
          ))}
        </Reorder.Group>

        {studySessions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row"
          >
            {/* Chart Section */}
            <div className={`p-6 flex-1 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 transition-all ${showChart ? 'block' : 'hidden md:block md:w-0 md:p-0 md:opacity-0 md:border-0'}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <BarChart3 size={14} />
                  Relatório
                </h3>
                
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button 
                    onClick={() => setChartView('day')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartView === 'day' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <CalendarDays size={12} /> Dia
                  </button>
                  <button 
                    onClick={() => setChartView('week')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartView === 'week' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <CalendarRange size={12} /> Semana
                  </button>
                  <button 
                    onClick={() => setChartView('month')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartView === 'month' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <Calendar size={12} /> Mês
                  </button>
                </div>
              </div>
              
              <div className="h-[250px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        dy={10} 
                      />
                      <YAxis 
                        domain={yDomain}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        dx={-10}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                      />
                      <Bar 
                        dataKey="Horas" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                    Nenhum dado para exibir neste período
                  </div>
                )}
              </div>
            </div>

            {/* List Section */}
            <div className="p-6 md:w-80 flex flex-col bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 text-center">Sessões Recentes</h3>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {studySessions.slice(-20).reverse().map((session, i) => (
                  <div key={session.id} className="group flex justify-between items-center text-sm p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <span className="text-slate-400 dark:text-slate-500 font-mono w-6">#{studySessions.length - i}</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium flex-1 text-center">{formatDuration(session.duration)}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 dark:text-slate-500 text-xs w-10 text-right">{new Date(session.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <button 
                          onClick={() => deleteStudySession(session.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity p-1"
                        >
                          <Square size={12} className="rotate-45" />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total Gravado</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono font-medium">{formatDuration(studySessions.reduce((acc, s) => acc + s.duration, 0))}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
