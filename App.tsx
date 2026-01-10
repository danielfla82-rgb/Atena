import React, { useState, useEffect } from 'react';
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
import { StudyFeed } from './components/StudyFeed';
import { Protocol } from './components/Protocol';
import { Framework } from './components/Framework';
import { Documentation } from './components/Documentation';
import { VerticalizedEdital } from './components/VerticalizedEdital';
import { Notes } from './components/Notes';
import { About } from './components/About';
import { StudySession } from './components/StudySession';
import { ReviewList } from './components/ReviewList';
import { 
  LayoutDashboard, Layers, Menu, X, Library as LibraryIcon, 
  Activity, Lightbulb, Flame, Brain, ScrollText, Pill, Pyramid, Book, ListChecks, Shield, StickyNote, Command, LogOut, ChevronDown, CalendarCheck
} from 'lucide-react';
import { Logo } from './components/Logo';

const AppContent: React.FC = () => {
  // Estado principal de navegação
  const [view, setView] = useState<'login' | 'selection' | 'dashboard' | 'setup' | 'library' | 'diagnostics' | 'tips' | 'nietzsche' | 'psycho' | 'study-feed' | 'protocol' | 'framework' | 'docs' | 'verticalized' | 'notes' | 'about' | 'review-list'>('login');
  
  // Estados de UI
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Menus Suspensos
  const [strategyMenuOpen, setStrategyMenuOpen] = useState(true);
  const [intelligenceMenuOpen, setIntelligenceMenuOpen] = useState(true);
  const [mentalMenuOpen, setMentalMenuOpen] = useState(false);
  
  const { user, activeSession, endSession } = useStore();

  // Efeito: Abre o menu automaticamente se estiver navegando em um de seus sub-itens
  useEffect(() => {
    const strategyViews = ['dashboard', 'setup', 'verticalized', 'library', 'notes', 'review-list'];
    const intelligenceViews = ['diagnostics', 'study-feed'];
    const mentalViews = ['framework', 'nietzsche', 'psycho', 'protocol', 'tips'];

    if (strategyViews.includes(view)) setStrategyMenuOpen(true);
    if (intelligenceViews.includes(view)) setIntelligenceMenuOpen(true);
    if (mentalViews.includes(view)) setMentalMenuOpen(true);
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
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 font-sans">
      
      {/* Global Study Session Overlay */}
      {activeSession && <StudySession notebook={activeSession} onClose={endSession} />}

      {/* --- Mobile Header --- */}
      <div className="md:hidden bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1.5 rounded-lg"><Logo size="sm" /></div>
            <h1 className="text-lg font-black tracking-wider text-white">ATENA</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-300 hover:text-white transition-colors">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* --- Sidebar Navigation --- */}
      <nav className={`
        fixed md:sticky top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 p-5 flex flex-col z-30 transition-transform duration-300 ease-out overflow-y-auto custom-scrollbar
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Header do Projeto (Desktop) - UPDATED TEXT */}
        <div className="mb-10 mt-2 hidden md:flex flex-col items-center text-center cursor-pointer group" onClick={() => setView('selection')}>
            <div className="relative mb-4 transition-transform group-hover:scale-105 duration-500">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <Logo size="2xl" className="relative z-10 drop-shadow-2xl" />
            </div>
            <h1 className="text-2xl font-black tracking-[0.2em] text-white leading-none group-hover:text-emerald-400 transition-colors">
                ATENA
            </h1>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-2 opacity-80 group-hover:opacity-100 group-hover:tracking-[0.3em] transition-all whitespace-nowrap">
                PLANEJAMENTO DE CONCURSO
            </p>
        </div>

        {/* Links de Navegação */}
        <div className="space-y-1 flex-1">
          
          {/* === MENU ESTRATÉGIA (ACCORDION) === */}
          <div>
              <button 
                onClick={() => setStrategyMenuOpen(!strategyMenuOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 mt-2 mb-1 rounded-lg transition-colors group hover:bg-slate-800 cursor-pointer select-none`}
              >
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${strategyMenuOpen ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      Estratégia
                  </span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${strategyMenuOpen ? 'rotate-180 text-white' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1 ${strategyMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <button 
                    onClick={() => { setView('dashboard'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('dashboard') ? 'bg-slate-800 text-white border-emerald-500' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
                  >
                    <LayoutDashboard size={18} />
                    <span className="text-sm">Dashboard</span>
                  </button>
                  
                  <button 
                    onClick={() => { setView('setup'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('setup') ? 'bg-slate-800 text-white border-emerald-500' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
                  >
                    <Layers size={18} />
                    <span className="text-sm">Planejamento</span>
                  </button>

                  <button 
                    onClick={() => { setView('verticalized'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('verticalized') ? 'bg-slate-800 text-white border-emerald-500' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
                  >
                    <ListChecks size={18} />
                    <span className="text-sm">Edital Verticalizado</span>
                  </button>

                  <button 
                    onClick={() => { setView('review-list'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('review-list') ? 'bg-slate-800 text-white border-emerald-500' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
                  >
                    <CalendarCheck size={18} />
                    <span className="text-sm">Lista de Revisão</span>
                  </button>

                  <button 
                    onClick={() => { setView('library'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('library') ? 'bg-slate-800 text-white border-emerald-500' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
                  >
                    <LibraryIcon size={18} />
                    <span className="text-sm">Banco de Disciplinas</span>
                  </button>

                  <button 
                    onClick={() => { setView('notes'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('notes') ? 'bg-slate-800 text-white border-emerald-500' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
                  >
                    <StickyNote size={18} />
                    <span className="text-sm">Anotações</span>
                  </button>
              </div>
          </div>

          {/* === MENU INTELIGÊNCIA (ACCORDION) === */}
          <div className="pt-2">
              <button 
                onClick={() => setIntelligenceMenuOpen(!intelligenceMenuOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 mt-2 mb-1 rounded-lg transition-colors group hover:bg-slate-800 cursor-pointer select-none`}
              >
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${intelligenceMenuOpen ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      Inteligência
                  </span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${intelligenceMenuOpen ? 'rotate-180 text-white' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1 ${intelligenceMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <button 
                    onClick={() => { setView('diagnostics'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('diagnostics') ? 'bg-slate-800 text-white border-purple-500' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
                  >
                    <Activity size={18} />
                    <span className="text-sm">Diagnóstico IA</span>
                  </button>

                  <button 
                      onClick={() => { setView('study-feed'); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('study-feed') ? 'bg-slate-800 text-white border-cyan-500' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
                    >
                      <ScrollText size={18} />
                      <span className="text-sm">Feed Estudo</span>
                  </button>
              </div>
          </div>

          {/* === MENU MENTAL & FÍSICO (ACCORDION) === */}
          <div className="pt-2">
              <button 
                onClick={() => setMentalMenuOpen(!mentalMenuOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 mt-2 mb-1 rounded-lg transition-colors group hover:bg-slate-800 cursor-pointer select-none`}
              >
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${mentalMenuOpen ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      Mental & Físico
                  </span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${mentalMenuOpen ? 'rotate-180 text-white' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1 ${mentalMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <button 
                      onClick={() => { setView('framework'); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('framework') ? 'bg-slate-800 text-white border-emerald-500' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                    >
                      <Pyramid size={16} className={isActive('framework') ? 'text-emerald-400' : ''}/>
                      <span className="text-sm font-medium">Framework</span>
                  </button>

                  <button 
                      onClick={() => { setView('nietzsche'); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('nietzsche') ? 'bg-slate-800 text-white border-orange-500' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                    >
                      <Flame size={16} className={isActive('nietzsche') ? 'text-orange-500' : ''} />
                      <span className="text-sm font-medium">Incentivador</span>
                  </button>

                  <button 
                      onClick={() => { setView('psycho'); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('psycho') ? 'bg-slate-800 text-white border-indigo-500' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                    >
                      <Brain size={16} className={isActive('psycho') ? 'text-indigo-500' : ''} />
                      <span className="text-sm font-medium">Psicanalista</span>
                  </button>

                  <button 
                      onClick={() => { setView('protocol'); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('protocol') ? 'bg-slate-800 text-white border-blue-500' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                    >
                      <Pill size={16} className={isActive('protocol') ? 'text-blue-500' : ''} />
                      <span className="text-sm font-medium">Protocolo</span>
                  </button>
                  
                  <button 
                      onClick={() => { setView('tips'); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ml-1 border-l-2 ${isActive('tips') ? 'bg-slate-800 text-white border-yellow-500' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                    >
                      <Lightbulb size={16} className={isActive('tips') ? 'text-yellow-500' : ''} />
                      <span className="text-sm font-medium">Dicas de Elite</span>
                  </button>
              </div>
          </div>

          {/* Seção Sistema (Fixa) */}
          <div className="pt-2 mt-4 border-t border-slate-800/50">
            <button 
                onClick={() => { setView('docs'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${isActive('docs') ? 'bg-slate-800 text-white border border-slate-700 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
              >
                <Book size={18} />
                <span className="text-sm">Documentação</span>
            </button>
            <button 
                onClick={() => { setView('about'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${isActive('about') ? 'bg-slate-800 text-white border border-slate-700 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
              >
                <Shield size={18} />
                <span className="text-sm">Sobre</span>
            </button>
          </div>
        </div>

        {/* Footer do Usuário */}
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

      {/* --- Main Content Area --- */}
      <main className="flex-1 overflow-y-auto h-screen relative">
         {/* Background Glow */}
         <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-slate-950 to-slate-950 pointer-events-none -z-10"></div>
         
         {/* Roteamento de Views */}
         {view === 'dashboard' ? <Dashboard onNavigate={(v) => setView(v as any)} /> : 
          view === 'setup' ? <Setup onNavigate={(v) => setView(v as any)} /> : 
          view === 'verticalized' ? <VerticalizedEdital onNavigate={(v) => setView(v as any)} /> :
          view === 'review-list' ? <ReviewList onNavigate={(v) => setView(v as any)} /> :
          view === 'library' ? <Library /> :
          view === 'notes' ? <Notes /> :
          view === 'tips' ? <Tips /> :
          view === 'nietzsche' ? <Nietzsche /> :
          view === 'psycho' ? <Psychoanalyst /> :
          view === 'study-feed' ? <StudyFeed /> :
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