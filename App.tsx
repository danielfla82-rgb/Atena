
import React, { useState } from 'react';
import { StoreProvider } from './store';
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
import { 
  LayoutDashboard, Settings, Layers, Menu, X, Library as LibraryIcon, 
  Activity, Lightbulb, Flame, Brain, Newspaper, Pill, Pyramid
} from 'lucide-react';
import { Logo } from './components/Logo';

const AppContent: React.FC = () => {
  const [view, setView] = useState<'login' | 'selection' | 'dashboard' | 'setup' | 'library' | 'diagnostics' | 'tips' | 'nietzsche' | 'psycho' | 'news' | 'protocol' | 'framework'>('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            <Logo size="sm" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">ATENA</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-300">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <nav className={`
        fixed md:sticky top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col z-30 transition-transform duration-300 overflow-y-auto custom-scrollbar
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="mb-8 hidden md:block cursor-pointer" onClick={() => setView('selection')}>
          <div className="flex items-center gap-3">
             <Logo size="md" />
             <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">ATENA</h1>
          </div>
          <div className="flex justify-between items-center mt-2 pl-1">
             <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/50 font-bold">v2.0.0</span>
          </div>
        </div>

        <div className="space-y-1 flex-1">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 mt-2">Estratégia</p>
          <button 
            onClick={() => { setView('dashboard'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={18} />
            <span className="font-medium text-sm">Dashboard</span>
          </button>
          
          <button 
            onClick={() => { setView('setup'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'setup' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Layers size={18} />
            <span className="font-medium text-sm">Planejamento</span>
          </button>

          <button 
            onClick={() => { setView('library'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'library' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LibraryIcon size={18} />
            <span className="font-medium text-sm">Banco de Dados</span>
          </button>

          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 mt-6">Inteligência</p>
          <button 
            onClick={() => { setView('diagnostics'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'diagnostics' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Activity size={18} />
            <span className="font-medium text-sm">Diagnóstico IA</span>
          </button>

          <button 
              onClick={() => { setView('news'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'news' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Newspaper size={18} />
              <span className="font-medium text-sm">Notícias</span>
          </button>

          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 mt-6">Mental & Físico</p>
          
          <button 
              onClick={() => { setView('framework'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'framework' ? 'bg-slate-700 text-white border border-slate-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Pyramid size={18} className={view === 'framework' ? 'text-emerald-400' : ''}/>
              <span className="font-medium text-sm">Framework</span>
          </button>

          <button 
              onClick={() => { setView('nietzsche'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'nietzsche' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Flame size={18} className={view === 'nietzsche' ? 'text-orange-500' : ''} />
              <span className="font-medium text-sm">Incentivador</span>
          </button>

          <button 
              onClick={() => { setView('psycho'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'psycho' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Brain size={18} />
              <span className="font-medium text-sm">Psicanalista</span>
          </button>

          <button 
              onClick={() => { setView('protocol'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'protocol' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Pill size={18} />
              <span className="font-medium text-sm">Protocolo</span>
          </button>
          
          <button 
              onClick={() => { setView('tips'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'tips' ? 'bg-yellow-600/80 text-white shadow-lg shadow-yellow-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Lightbulb size={18} />
              <span className="font-medium text-sm">Dicas de Elite</span>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold shadow-inner">
              CF
            </div>
            <div>
              <p className="text-sm font-bold text-white">Concurseiro Elite</p>
              <button onClick={() => setView('login')} className="text-xs text-slate-500 hover:text-white transition-colors">Sair</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen relative">
         {/* Background Glow */}
         <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-slate-950 to-slate-950 pointer-events-none -z-10"></div>
         
         {view === 'dashboard' ? <Dashboard /> : 
          view === 'setup' ? <Setup /> : 
          view === 'library' ? <Library /> :
          view === 'tips' ? <Tips /> :
          view === 'nietzsche' ? <Nietzsche /> :
          view === 'psycho' ? <Psychoanalyst /> :
          view === 'news' ? <News /> :
          view === 'protocol' ? <Protocol /> :
          view === 'framework' ? <Framework /> :
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
