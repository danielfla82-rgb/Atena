import React, { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Dashboard } from './components/Dashboard';
import { Setup } from './components/Setup';
import { Login } from './components/Login';
import { ProjectSelection } from './components/ProjectSelection';
import { Onboarding } from './components/Onboarding';
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
  LayoutDashboard, Layers, Menu, X, Library as LibraryIcon, 
  Activity, Lightbulb, Flame, Brain, Newspaper, Pill, Pyramid, Book, ListChecks, Shield, StickyNote, Command, LogOut,
  ChevronDown, ChevronRight, Target
} from 'lucide-react';
import { Logo } from './components/Logo';

// --- SUBCOMPONENT: Nav Group (Collapsible) ---
const NavGroup = ({ title, children, defaultOpen = false }: { title: string, children?: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="mb-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] text-slate-500 uppercase font-bold tracking-wider hover:text-emerald-400 transition-colors group"
            >
                <span>{title}</span>
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-1 mt-1 pl-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
  const [view, setView] = useState<'login' | 'onboarding' | 'selection' | 'dashboard' | 'setup' | 'library' | 'diagnostics' | 'tips' | 'nietzsche' | 'psycho' | 'news' | 'protocol' | 'framework' | 'docs' | 'verticalized' | 'notes' | 'about'>('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useStore();

  // If in login or selection, show full screen components
  if (view === 'login') {
    return <Login onLoginSuccess={() => setView('selection')} />;
  }

  if (view === 'onboarding') {
    return <Onboarding onComplete={() => setView('selection')} />;
  }

  if (view === 'selection') {
    return <ProjectSelection onNavigate={(v) => setView(v as any)} />;
  }

  const NavItem = ({ id, label, icon: Icon }: { id: typeof view, label: string, icon: any }) => (
      <button 
        onClick={() => { setView(id); setSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
      >
        <Icon size={18} />
        <span className="text-sm">{label}</span>
      </button>
  );

  // Main App Layout
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1.5 rounded-lg"><Logo size="sm" /></div>
            <h1 className="text-lg font-black tracking-wider text-white">ATENA</h1>
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
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1 block">
                            System OS
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 space-y-1">
            <NavGroup title="Estratégia" defaultOpen={true}>
                <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
                <NavItem id="setup" label="Planejamento" icon={Layers} />
                <NavItem id="verticalized" label="Edital Verticalizado" icon={ListChecks} />
                <NavItem id="library" label="Banco de Dados" icon={LibraryIcon} />
                <NavItem id="notes" label="Anotações" icon={StickyNote} />
            </NavGroup>

            <NavGroup title="Inteligência">
                <NavItem id="diagnostics" label="Diagnóstico IA" icon={Activity} />
                <NavItem id="news" label="Notícias" icon={Newspaper} />
            </NavGroup>

            <NavGroup title="Mental & Físico">
                <NavItem id="framework" label="Framework" icon={Pyramid} />
                <NavItem id="nietzsche" label="Incentivador" icon={Flame} />
                <NavItem id="psycho" label="Psicanalista" icon={Brain} />
                <NavItem id="protocol" label="Protocolo" icon={Pill} />
                <NavItem id="tips" label="Dicas de Elite" icon={Lightbulb} />
            </NavGroup>

            <NavGroup title="Sistema">
                <NavItem id="docs" label="Documentação" icon={Book} />
                <NavItem id="about" label="Sobre" icon={Shield} />
            </NavGroup>
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
         
         {view === 'dashboard' ? <Dashboard /> : 
          view === 'setup' ? <Setup /> : 
          view === 'verticalized' ? <VerticalizedEdital /> :
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