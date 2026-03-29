import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './store';
import { ThemeProvider } from './ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { Dashboard } from './components/Dashboard';
import { Setup } from './components/Setup';
import { Login } from './components/Login';
import { ProjectSelection } from './components/ProjectSelection';
import { Library } from './components/Library';
import { DisciplineManager } from './components/DisciplineManager';
import { Framework } from './components/Framework';
import { VerticalizedEdital } from './components/VerticalizedEdital';
import { Notes } from './components/Notes';
import { About } from './components/About';
import { StudySession } from './components/StudySession';
import { ReviewList } from './components/ReviewList';
import { Simulados } from './components/Simulados';
import { 
  LayoutDashboard, Layers, Menu, X, Library as LibraryIcon, 
  Pyramid, ListChecks, Shield, StickyNote, LogOut, ChevronDown, CalendarCheck, Book, Target
} from 'lucide-react';
import { Logo } from './components/Logo';

const AppContent: React.FC = () => {
  // Estado principal de navegação
  const [view, setView] = useState<'login' | 'selection' | 'dashboard' | 'setup' | 'library' | 'framework' | 'verticalized' | 'notes' | 'about' | 'review-list' | 'disciplines' | 'simulados'>('login');
  
  // Estados de UI
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Menus Suspensos
  const [strategyMenuOpen, setStrategyMenuOpen] = useState(true);
  
  const { user, activeSession, endSession } = useStore();

  // Efeito: Abre o menu automaticamente se estiver navegando em um de seus sub-itens
  React.useEffect(() => {
    const strategyViews = ['dashboard', 'setup', 'verticalized', 'library', 'disciplines', 'notes', 'review-list', 'simulados'];
    if (strategyViews.includes(view)) setStrategyMenuOpen(true);
  }, [view]);

  // Renderização condicional para telas de Login e Seleção (Full Screen)
  if (view === 'login') {
    return <Login onLoginSuccess={() => setView('selection')} />;
  }

  if (view === 'selection') {
    return <ProjectSelection onNavigate={(v) => setView(v as any)} />;
  }

  // Helper para verificar ativo
  const isActive = (v: string) => view === v;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Global Study Session Overlay */}
      {activeSession && <StudySession notebook={activeSession} onClose={endSession} />}

      {/* --- Mobile Header --- */}
      <div className="md:hidden bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 z-40 transition-colors duration-300">
        <div className="flex items-center gap-2">
            <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg"><Logo size="sm" /></div>
            <h1 className="text-lg font-black tracking-wider text-slate-900 dark:text-white">ATENA</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
            {sidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* --- Mobile Backdrop --- */}
      {sidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar Navigation --- */}
      <nav className={`
        fixed md:sticky top-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col z-40 transition-transform duration-300 ease-out overflow-y-auto custom-scrollbar
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Header do Projeto (Desktop) - UPDATED TEXT */}
        <div className="mb-10 mt-2 hidden md:flex flex-col items-center text-center cursor-pointer group" onClick={() => setView('selection')}>
            <div className="relative mb-4 transition-transform group-hover:scale-105 duration-500">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <Logo size="2xl" className="relative z-10 drop-shadow-2xl" />
            </div>
            <h1 className="text-2xl font-black tracking-[0.2em] text-slate-900 dark:text-white leading-none group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                ATENA
            </h1>
            <p className="text-[10px] text-green-600 dark:text-green-500 font-bold uppercase tracking-[0.2em] mt-2 opacity-80 group-hover:opacity-100 group-hover:tracking-[0.3em] transition-all whitespace-nowrap">
                PLANEJAMENTO DE CONCURSO
            </p>
        </div>

        {/* Links de Navegação */}
        <div className="space-y-1 flex-1">
          
          {/* === MENU ESTRATÉGIA (ACCORDION) === */}
          <div>
              <button 
                onClick={() => setStrategyMenuOpen(!strategyMenuOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 mt-2 mb-1 rounded-lg transition-colors group hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer select-none`}
              >
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${strategyMenuOpen ? 'text-slate-900 dark:text-white' : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-600 dark:text-slate-300'}`}>
                      Planejamento
                  </span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${strategyMenuOpen ? 'rotate-180 text-slate-900 dark:text-white' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1 ${strategyMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <button 
                    onClick={() => { setView('dashboard'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('dashboard') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-green-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                  >
                    <LayoutDashboard size={18} />
                    <span className="text-sm">Dashboard</span>
                  </button>
                  
                  <button 
                    onClick={() => { setView('setup'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('setup') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-green-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                  >
                    <Layers size={18} />
                    <span className="text-sm">Planejamento</span>
                  </button>

                  <button 
                    onClick={() => { setView('verticalized'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('verticalized') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-green-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                  >
                    <ListChecks size={18} />
                    <span className="text-sm">Edital Verticalizado</span>
                  </button>

                  <button 
                    onClick={() => { setView('review-list'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('review-list') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-green-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                  >
                    <CalendarCheck size={18} />
                    <span className="text-sm">Lista de Revisão</span>
                  </button>

                  <button 
                    onClick={() => { setView('library'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('library') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-green-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                  >
                    <LibraryIcon size={18} />
                    <span className="text-sm">Banco de Tópicos</span>
                  </button>

                  <button 
                    onClick={() => { setView('disciplines'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('disciplines') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-green-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                  >
                    <Book size={18} />
                    <span className="text-sm">Disciplinas Mães</span>
                  </button>

                  <button 
                    onClick={() => { setView('simulados'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('simulados') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-green-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                  >
                    <Target size={18} />
                    <span className="text-sm">Simulados</span>
                  </button>

                  <button 
                    onClick={() => { setView('notes'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('notes') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-green-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                  >
                    <StickyNote size={18} />
                    <span className="text-sm">Anotações</span>
                  </button>
              </div>
          </div>

          {/* === OUTRAS FERRAMENTAS === */}
          <div className="pt-4 mt-2">
              <span className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Ferramentas
              </span>
              <div className="mt-2 space-y-1">
                  <button 
                      onClick={() => { setView('framework'); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('framework') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-green-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                    >
                      <Pyramid size={18} className={isActive('framework') ? 'text-green-500 dark:text-green-400' : ''}/>
                      <span className="text-sm font-medium">Framework</span>
                  </button>
                  
                  <button 
                      onClick={() => { setView('about'); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('about') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                    >
                      <Shield size={18} />
                      <span className="text-sm">Sobre</span>
                  </button>
              </div>
          </div>
        </div>

        {/* Footer do Usuário */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner flex-shrink-0">
              {(user?.email?.[0] || 'V').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight" title={user?.email || 'Visitante'}>
                  {user?.email || 'Visitante'}
              </p>
              <p className="text-[10px] text-green-600 dark:text-green-400 font-mono mt-0.5">Online</p>
            </div>
            <ThemeToggle />
            <button onClick={() => setView('login')} className="text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1" title="Sair">
                <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* --- Main Content Area --- */}
      <main className="flex-1 overflow-y-auto h-screen relative bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
         {/* Background Glow */}
         <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-100 dark:from-green-900/10 via-slate-50 dark:via-slate-950 to-slate-50 dark:to-slate-950 pointer-events-none -z-10 transition-colors duration-300"></div>
         
         {/* Roteamento de Views */}
         {view === 'dashboard' ? <Dashboard onNavigate={(v) => setView(v as any)} /> : 
          view === 'setup' ? <Setup onNavigate={(v) => setView(v as any)} /> : 
          view === 'verticalized' ? <VerticalizedEdital onNavigate={(v) => setView(v as any)} /> :
          view === 'review-list' ? <ReviewList onNavigate={(v) => setView(v as any)} /> :
          view === 'library' ? <Library /> :
          view === 'disciplines' ? <DisciplineManager /> :
          view === 'simulados' ? <Simulados /> :
          view === 'notes' ? <Notes /> :
          view === 'framework' ? <Framework /> :
          <About />
         }
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </StoreProvider>
  );
};

export default App;