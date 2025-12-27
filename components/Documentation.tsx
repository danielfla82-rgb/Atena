
import React from 'react';
import { Book, Code, Database, Cpu, Layers, Shield, Server, FileJson, GitCommit, GraduationCap, Sword, Eye } from 'lucide-react';

export const Documentation: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Book className="text-emerald-500" /> Documentação Técnica
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Projeto Atena (GurujaApp) <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/50 font-bold ml-2">v3.5.0</span></p>
        </div>
        <div className="text-right hidden md:block">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Última Atualização</p>
            <p className="text-slate-300 font-mono">Titan Edition</p>
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
                   <a href="#changelog" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 transition-colors group">
                       <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-500"></span> 5. Changelog
                   </a>
                   <div className="border-t border-slate-700 my-2 pt-2"></div>
                   <a href="#sobre" className="flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors group">
                       <Shield size={14} /> Sobre Atena
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
                       <TechItem label="Vite" desc="Build Tooling ultra-rápido (Static Replacement)" />
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

            {/* Section 5: Changelog */}
           <section id="changelog" className="space-y-6 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                 <GitCommit size={24} className="text-slate-400" />
                 <h2 className="text-2xl font-bold text-white">5. Histórico de Versões</h2>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                   {/* v3.5.0 */}
                   <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                      <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs shadow-lg shadow-emerald-900/50">v3.5.0</span> 
                              Titan Edition (Stable)
                          </h3>
                          <span className="text-xs text-slate-500 font-mono">Current Build</span>
                      </div>
                      <ul className="space-y-3">
                          <ChangelogItem 
                            type="core" 
                            desc="[Macro Calendar 2.0] Refinamento da lógica de datas (Timezone-safe) para evitar deslocamento de dias." 
                          />
                          <ChangelogItem 
                            type="feat" 
                            desc="[UX] Identificação visual de Feriados Nacionais e Alerta de Prova (Pulsação) no calendário anual." 
                          />
                          <ChangelogItem 
                            type="feat" 
                            desc="[Estratégia] Adicionado ritmo 'Iniciante' (Teal) e 'Micro-Datas' nas semanas para precisão de planejamento." 
                          />
                      </ul>
                  </div>

                   {/* v3.3.0 */}
                   <div className="p-6 border-b border-slate-800">
                      <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs border border-slate-600">v3.3.0</span> 
                              Elite OS Update
                          </h3>
                      </div>
                      <ul className="space-y-3">
                          <ChangelogItem 
                            type="ui" 
                            desc="[UI/UX] Redesign completo do bloco de navegação lateral para estética 'Command Center' mais profissional." 
                          />
                          <ChangelogItem 
                            type="feat" 
                            desc="[Anotações] Módulo de Post-its (Anotações Rápidas) agora persistente e integrado." 
                          />
                      </ul>
                  </div>
              </div>
           </section>

           {/* SECTION 6: SOBRE ATENA */}
           <section id="sobre" className="space-y-8 scroll-mt-24 pt-8">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-2xl">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="p-8 md:p-12 relative z-10">
                      <div className="flex flex-col md:flex-row items-start gap-8">
                          <div className="md:w-1/3 flex flex-col items-center text-center md:text-left">
                              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-emerald-500/30 flex items-center justify-center mb-6 shadow-lg shadow-emerald-900/20">
                                  <Shield size={48} className="text-emerald-500" />
                              </div>
                              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Deusa Atena</h2>
                              <p className="text-sm text-emerald-400 font-bold uppercase tracking-widest mb-4">Pallas Athena</p>
                              <p className="text-slate-400 text-sm leading-relaxed">
                                  Filha de Zeus, nascida de sua cabeça, já vestida para a batalha. Ela não é apenas uma guerreira; ela é a general que vence antes do primeiro golpe.
                              </p>
                          </div>

                          <div className="md:w-2/3 space-y-6">
                              <div>
                                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                      <GraduationCap className="text-indigo-400" size={20} />
                                      Por que Atena para Concursos?
                                  </h3>
                                  <p className="text-slate-300 leading-relaxed text-sm">
                                      No mundo dos concursos de alto nível, força bruta (estudar 12h sem direção) não vence. Atena representa a união da <strong>Sabedoria (Sophia)</strong> com a <strong>Estratégia (Metis)</strong>. Ela é a padroeira daqueles que lutam com a mente.
                                  </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                      <h4 className="font-bold text-emerald-300 mb-2 flex items-center gap-2 text-sm">
                                          <Sword size={14} /> Guerra Justa e Estratégica
                                      </h4>
                                      <p className="text-xs text-slate-400">
                                          Diferente de Ares (fúria sanguinária), Atena rege a guerra disciplinada. Passar no concurso é uma guerra contra a banca e contra si mesmo, vencida com planejamento tático, não com desespero.
                                      </p>
                                  </div>
                                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                      <h4 className="font-bold text-amber-300 mb-2 flex items-center gap-2 text-sm">
                                          <Eye size={14} /> A Visão da Coruja
                                      </h4>
                                      <p className="text-xs text-slate-400">
                                          Seu símbolo, a coruja, enxerga na escuridão. O Projeto Atena visa iluminar os pontos cegos do seu edital (Matriz de Riscos) que outros candidatos ignoram.
                                      </p>
                                  </div>
                              </div>

                              <div className="border-l-2 border-emerald-500/30 pl-4 py-2 italic text-slate-400 text-sm">
                                  "A vitória pertence àquele que calcula os riscos e domina o terreno antes da batalha."
                              </div>
                          </div>
                      </div>
                  </div>
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

const ChangelogItem = ({ type, desc }: { type: 'fix' | 'feat' | 'core' | 'ui' | 'docs', desc: string }) => {
    const colors = {
        fix: 'text-red-400 bg-red-900/20 border-red-500/30',
        feat: 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30',
        core: 'text-purple-400 bg-purple-900/20 border-purple-500/30',
        ui: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
        docs: 'text-amber-400 bg-amber-900/20 border-amber-500/30'
    };
    
    return (
        <li className="flex items-start gap-3 text-sm">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 mt-0.5 ${colors[type]}`}>
                {type}
            </span>
            <span className="text-slate-300">{desc}</span>
        </li>
    );
};
