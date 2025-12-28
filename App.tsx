import React, { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Dashboard } from './components/Dashboard';
import { Setup } from './components/Setup';
import { Login } from './components/Login';
import { ProjectSelection } from './components/ProjectSelection';
import { Library } from './components/Library';
import { Diagnostics } from './components/Diagnostics';
import { Tips } from './components/Tips';
import { Nietzsche } from './components/Nietzsche';
import { Psychoanalyst } from './components/Psychoanalyst';
import { News } from './components/News';
import { Protocol } from './components/Protocol';
import { Framework } from './components/Framework';
import { Documentation } from './components/Documentation';
import { VerticalizedEdital } from './components/VerticalizedEdital';
import { Notes } from './components/Notes';
import { About } from './components/About';
import { 
  LayoutDashboard, Settings, Layers, Menu, X, Library as LibraryIcon, 
  Activity, Lightbulb, Flame, Brain, Newspaper, Pill, Pyramid, Book, ListChecks, Shield, StickyNote, Command, LogOut
} from 'lucide-react';
import { Logo } from './components/Logo';

const AppContent: React.FC = () => {
  const [view, setView] = useState<'login' | 'selection' | 'dashboard' | 'setup' | 'library' | 'diagnostics' | 'tips' | 'nietzsche' | 'psycho' | 'news' | 'protocol' | 'framework' | 'docs' | 'verticalized' | 'notes' | 'about'>('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useStore();

  // If in login or selection, show full screen components
  if (view === 'login') {
    return <Login onLoginSuccess={() => setView('selection')} />;
  }

  if (view === 'selection') {
    return <ProjectSelection onNavigate={(v) => setView(v as any)} />;
  }

  // Main App Layout
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1.5 rounded-lg"><Logo size="sm" /></div>
            <h1 className="text-lg font-black tracking-wider text-white">ATENA <span className="text-[10px] text-emerald-500 bg-emerald-950/50 px-1.5 py-0.5 rounded ml-2 align-middle">v3.3</span></h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-300">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <nav className={`
        fixed md:sticky top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 p-5 flex flex-col z-30 transition-transform duration-300 overflow-y-auto custom-scrollbar
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* --- PROFESSIONAL HEADER BLOCK --- */}
        <div className="mb-8 hidden md:block group cursor-pointer" onClick={() => setView('selection')}>
            <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-xl backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden shadow-lg shadow-black/20">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Command className="text-emerald-500" size={40} />
                </div>
                
                <div className="flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 shadow-inner group-hover:border-emerald-500/20 transition-colors">
                        <Logo size="sm" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-[0.15em] text-white leading-none group-hover:text-emerald-400 transition-colors">ATENA</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/50 font-bold shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                v3.3.0
                            </span>
                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Elite OS</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-1 flex-1">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 mt-2 ml-2">Estratégia</p>
          <button 
            onClick={() => { setView('dashboard'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
          >
            <LayoutDashboard size={18} />
            <span className="text-sm">Dashboard</span>
          </button>
          
          <button 
            onClick={() => { setView('setup'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'setup' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
          >
            <Layers size={18} />
            <span className="text-sm">Planejamento</span>
          </button>

           <button 
            onClick={() => { setView('verticalized'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'verticalized' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
          >
            <ListChecks size={18} />
            <span className="text-sm">Edital Verticalizado</span>
          </button>

          <button 
            onClick={() => { setView('library'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'library' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
          >
            <LibraryIcon size={18} />
            <span className="text-sm">Banco de Dados</span>
          </button>

          <button 
            onClick={() => { setView('notes'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'notes' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
          >
            <StickyNote size={18} />
            <span className="text-sm">Anotações</span>
          </button>

          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 mt-6 ml-2">Inteligência</p>
          <button 
            onClick={() => { setView('diagnostics'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'diagnostics' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
          >
            <Activity size={18} />
            <span className="text-sm">Diagnóstico IA</span>
          </button>

          <button 
              onClick={() => { setView('news'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'news' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
            >
              <Newspaper size={18} />
              <span className="text-sm">Notícias</span>
          </button>

          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 mt-6 ml-2">Mental & Físico</p>
          
          <button 
              onClick={() => { setView('framework'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'framework' ? 'bg-slate-700 text-white border border-slate-600 shadow-lg font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
            >
              <Pyramid size={18} className={view === 'framework' ? 'text-emerald-400' : ''}/>
              <span className="text-sm">Framework</span>
          </button>

          <button 
              onClick={() => { setView('nietzsche'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'nietzsche' ? 'bg-slate-800 text-white border border-slate-600 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
            >
              <Flame size={18} className={view === 'nietzsche' ? 'text-orange-500' : ''} />
              <span className="text-sm">Incentivador</span>
          </button>

          <button 
              onClick={() => { setView('psycho'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'psycho' ? 'bg-indigo-600 text-white shadow-lg font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
            >
              <Brain size={18} />
              <span className="text-sm">Psicanalista</span>
          </button>

          <button 
              onClick={() => { setView('protocol'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'protocol' ? 'bg-blue-600 text-white shadow-lg font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
            >
              <Pill size={18} />
              <span className="text-sm">Protocolo</span>
          </button>
          
          <button 
              onClick={() => { setView('tips'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'tips' ? 'bg-yellow-600/80 text-white shadow-lg shadow-yellow-900/50 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
            >
              <Lightbulb size={18} />
              <span className="text-sm">Dicas de Elite</span>
          </button>

          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 mt-6 ml-2">Sistema</p>
          <button 
              onClick={() => { setView('docs'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'docs' ? 'bg-slate-800 text-white border border-slate-700 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
            >
              <Book size={18} />
              <span className="text-sm">Documentação</span>
          </button>
          <button 
              onClick={() => { setView('about'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'about' ? 'bg-slate-800 text-white border border-slate-700 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
            >
              <Shield size={18} />
              <span className="text-sm">Sobre</span>
          </button>
        </div>

        {/* --- USER FOOTER (Refined) --- */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner flex-shrink-0">
              {(user?.email?.[0] || 'V').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-bold text-white truncate leading-tight" title={user?.email || 'Visitante'}>
                  {user?.email || 'Visitante'}
              </p>
              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Online</p>
            </div>
            <button onClick={() => setView('login')} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Sair">
                <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen relative">
         {/* Background Glow */}
         <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-slate-950 to-slate-950 pointer-events-none -z-10"></div>
         
         {view === 'dashboard' ? <Dashboard onNavigate={(v) => setView(v as any)} /> : 
          view === 'setup' ? <Setup /> : 
          view === 'verticalized' ? <VerticalizedEdital onNavigate={(v) => setView(v as any)} /> :
          view === 'library' ? <Library /> :
          view === 'notes' ? <Notes /> :
          view === 'tips' ? <Tips /> :
          view === 'nietzsche' ? <Nietzsche /> :
          view === 'psycho' ? <Psychoanalyst /> :
          view === 'news' ? <News /> :
          view === 'protocol' ? <Protocol /> :
          view === 'framework' ? <Framework /> :
          view === 'docs' ? <Documentation /> :
          view === 'about' ? <About /> :
          <Diagnostics />
         }
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;