
import React from 'react';
import { Book, Code, Database, Cpu, Layers, Shield, Server, FileJson } from 'lucide-react';

export const Documentation: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Book className="text-emerald-500" /> Documentação Técnica
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Projeto Atena (GurujaApp) <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/50 font-bold ml-2">v2.1.0</span></p>
        </div>
        <div className="text-right hidden md:block">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Última Atualização</p>
            <p className="text-slate-300 font-mono">22 Maio 2024</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar (Sticky) */}
        <div className="hidden lg:block space-y-4 sticky top-6 h-fit">
           <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Índice</p>
               <nav className="space-y-3">
                   <a href="#visao-geral" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 transition-colors group">
                       <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-500"></span> 1. Visão Geral
                   </a>
                   <a href="#arquitetura" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 transition-colors group">
                       <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-500"></span> 2. Stack Tecnológica
                   </a>
                   <a href="#algoritmo" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 transition-colors group">
                       <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-500"></span> 3. O Algoritmo
                   </a>
                   <a href="#dados" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 transition-colors group">
                       <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-500"></span> 4. Modelagem de Dados
                   </a>
               </nav>
           </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-16">
           
           {/* Section 1: Overview */}
           <section id="visao-geral" className="space-y-6 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                 <Shield size={24} className="text-emerald-500" />
                 <h2 className="text-2xl font-bold text-white">1. Visão Geral do Produto</h2>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-slate-300 leading-relaxed shadow-xl">
                 <p className="mb-4 text-lg">
                    O <strong>Projeto Atena (GurujaApp)</strong> é uma plataforma SaaS de alta performance projetada especificamente para "concurseiros de elite".
                 </p>
                 <p className="mb-4">
                    Diferente de gerenciadores de tarefas convencionais (como Trello ou Notion), o Atena integra um 
                    <strong> Sistema de Revisão Espaçada (SRS)</strong> proprietário, ajustado dinamicamente por Inteligência Artificial (Gemini 2.0).
                 </p>
                 <p>
                    A plataforma resolve o problema da "Curva de Esquecimento" através de uma matriz estratégica que pondera não apenas a data da última revisão, 
                    mas também o <strong>Peso no Edital</strong>, a <strong>Relevância Estratégica</strong> e a <strong>Tendência da Banca</strong>.
                 </p>
              </div>
           </section>

           {/* Section 2: Architecture */}
           <section id="arquitetura" className="space-y-6 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                 <Code size={24} className="text-blue-500" />
                 <h2 className="text-2xl font-bold text-white">2. Stack Tecnológica</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-blue-500/30 transition-colors">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Code size={18} className="text-blue-400"/> Frontend Core
                    </h3>
                    <ul className="space-y-2">
                       <TechItem label="React 19" desc="Hooks, Context API, Suspense" />
                       <TechItem label="Vite" desc="Build Tooling ultra-rápido" />
                       <TechItem label="TypeScript" desc="Tipagem estrita e interfaces compartilhadas" />
                       <TechItem label="Tailwind CSS" desc="Estilização utilitária e Design System Dark" />
                    </ul>
                 </div>

                 <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-purple-500/30 transition-colors">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Server size={18} className="text-purple-400"/> Backend & Services
                    </h3>
                    <ul className="space-y-2">
                       <TechItem label="Supabase" desc="PostgreSQL, Auth, Row Level Security (RLS)" />
                       <TechItem label="Google Gemini" desc="IA Generativa (Diagnósticos, Nietzsche, Tips)" />
                       <TechItem label="LocalStorage" desc="Persistência offline (Modo Visitante)" />
                    </ul>
                 </div>
              </div>
           </section>

           {/* Section 3: Algorithm */}
           <section id="algoritmo" className="space-y-6 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                 <Cpu size={24} className="text-purple-500" />
                 <h2 className="text-2xl font-bold text-white">3. O Algoritmo Atena (v2.0)</h2>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Cpu size={120} />
                 </div>
                 
                 <p className="text-slate-300 mb-6 relative z-10">
                    O coração do sistema é a função de agendamento que determina a próxima data de revisão ideal. 
                    Diferente do Anki (que usa apenas multiplicadores fixos), o Atena introduz variáveis de mercado ("Peso" e "Tendência").
                 </p>

                 <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-mono text-sm text-emerald-400 overflow-x-auto shadow-inner relative z-10">
                    <pre>{`// Função Core de Cálculo de Intervalo
f(A, R, T) = BaseInterval(A) * Multiplier(R) * Multiplier(T)

Entradas:
  A = Acurácia (0-100%)
  R = Relevância (Baixa a Altíssima)
  T = Tendência da Banca (Estável, Alta)

Lógica de Intervalos Base (Step Function):
  Se A < 60%  -> Intervalo: 1 dia (Learning)
  Se 60-79%   -> Intervalo: 3 dias (Reviewing)
  Se 80-89%   -> Intervalo: 7 dias (Mastering)
  Se > 90%    -> Intervalo: 15 dias (Maintaining)

Ajuste Fino (Multiplicadores):
  Relevância "Altíssima" -> x0.7 (Comprime o tempo, forçando revisões mais frequentes)
  Tendência "Alta"       -> x0.9 (Leve aumento de frequência)`}</pre>
                 </div>
              </div>
           </section>

           {/* Section 4: Data Model */}
           <section id="dados" className="space-y-6 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                 <Database size={24} className="text-amber-500" />
                 <h2 className="text-2xl font-bold text-white">4. Modelagem de Dados</h2>
              </div>
              
              <div className="space-y-4">
                 <DataEntity 
                    title="Notebook (Caderno)"
                    desc="A unidade atômica de estudo. Representa um tópico específico de uma disciplina."
                    fields={[
                        { name: "id", type: "UUID" },
                        { name: "discipline", type: "string" },
                        { name: "accuracy", type: "number (0-100)" },
                        { name: "weight", type: "Enum (Baixo...Muito Alto)" },
                        { name: "images", type: "string[] (Base64)" }
                    ]}
                 />
                 
                 <DataEntity 
                    title="Cycle (Ciclo)"
                    desc="Um contêiner de planejamento tático. Permite que o usuário gerencie múltiplos editais (ex: PF e Receita) simultaneamente, reutilizando o mesmo banco de cadernos."
                    fields={[
                        { name: "id", type: "UUID" },
                        { name: "config", type: "JSONB (AthensConfig)" },
                        { name: "planning", type: "JSONB (Map<NotebookID, WeekID>)" },
                        { name: "weeklyCompletion", type: "JSONB (Map<NotebookID, boolean>)" }
                    ]}
                 />
              </div>
           </section>

        </div>
      </div>
    </div>
  );
};

// Helper Components
const TechItem = ({ label, desc }: { label: string, desc: string }) => (
    <li className="flex items-start gap-2 text-sm">
        <span className="font-bold text-slate-200 min-w-[100px]">{label}:</span>
        <span className="text-slate-400">{desc}</span>
    </li>
);

const DataEntity = ({ title, desc, fields }: { title: string, desc: string, fields: {name: string, type: string}[] }) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
            <Layers className="text-slate-500" size={20} />
            <h3 className="font-bold text-white text-lg">{title}</h3>
        </div>
        <p className="text-slate-400 text-sm mb-4">{desc}</p>
        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/50">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-1">
                <FileJson size={14} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-500 uppercase">Schema Parcial</span>
            </div>
            <ul className="space-y-1 font-mono text-xs">
                {fields.map((f, i) => (
                    <li key={i} className="flex gap-2">
                        <span className="text-blue-400">{f.name}:</span>
                        <span className="text-slate-500">{f.type}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);
