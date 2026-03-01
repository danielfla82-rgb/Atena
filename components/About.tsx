import React from 'react';
import { Shield, Sword, Eye, Brain, Scroll, Crown, Feather } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl min-h-[400px] flex items-center">
          {/* Background Gradient & Texture */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/30 z-0"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="relative z-10 p-8 md:p-16 flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/2 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-900/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                      <Crown size={12} /> Olympiana
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-tight">
                      O Legado de <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">Pallas Atena</span>
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-light">
                      A padroeira da guerra estratégica, da sabedoria prática e dos heróis que vencem pela mente, não apenas pela força.
                  </p>
              </div>
              <div className="md:w-1/2 flex justify-center">
                  <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-2xl group">
                      {/* Image Overlay */}
                      <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay z-10"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10"></div>
                      
                      <img 
                        src="https://i.postimg.cc/2y9X2pYQ/Gemini-Generated-Image-j8kwpaj8kwpaj8kw.png" 
                        alt="Pallas Athena" 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                      />
                      
                      {/* Floating Shield Icon overlay for branding */}
                      <div className="absolute bottom-4 right-4 z-20 text-emerald-400 opacity-80">
                          <Shield size={32} />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Philosophy Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <Brain className="text-indigo-500" /> Metis vs. Bia
              </h2>
              <div className="prose prose-invert text-slate-500 dark:text-slate-400">
                  <p>
                      Na mitologia grega, existem duas formas de vencer um conflito. <strong>Bia</strong> representa a força bruta, a violência e o gasto excessivo de energia. É o estudante que estuda 12 horas por dia sem direção, lendo capa a capa, exaurindo-se sem resultado.
                  </p>
                  <p>
                      Atena representa <strong>Metis</strong>: a astúcia, o planejamento, a inteligência prática. É a capacidade de prever os movimentos do adversário (a Banca Examinadora) e aplicar a força mínima necessária no ponto exato de maior impacto (Pareto 80/20).
                  </p>
                  <p className="text-emerald-400 font-bold italic">
                      "O Projeto Atena foi construído para transformar estudantes de Bia em discípulos de Metis."
                  </p>
              </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl hover:border-indigo-500/30 transition-all group">
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-900/20 rounded-lg text-indigo-400 group-hover:text-indigo-300"><Sword size={24} /></div>
                      <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Guerra Justa</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Diferente de Ares (fúria sanguinária), Atena rege a guerra disciplinada e organizada. O concurso é uma guerra fria e mental.</p>
                      </div>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-emerald-900/20 rounded-lg text-emerald-400 group-hover:text-emerald-300"><Scroll size={24} /></div>
                      <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Nascida Pronta</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Atena nasceu da cabeça de Zeus já vestida com armadura. A plataforma visa preparar você para chegar no dia da prova "vestido para a batalha", sem improvisos.</p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Symbols Section */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center uppercase tracking-widest text-sm text-slate-500">Simbologia Aplicada</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center hover:-translate-y-2 transition-transform duration-500">
                  <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-amber-400 shadow-lg shadow-amber-900/10">
                      <Eye size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">A Coruja</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Símbolo da visão noturna. Enquanto outros dormem ou se perdem na escuridão do edital, a Coruja enxerga o que está oculto: as tendências da banca e as pegadinhas sutis.
                  </p>
              </div>

              <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center hover:-translate-y-2 transition-transform duration-500 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500"></div>
                  <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-emerald-400 shadow-lg shadow-emerald-900/10">
                      <Shield size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">A Égide (Escudo)</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      O escudo impenetrável de Atena. Nos estudos, representa a resiliência emocional e a técnica de revisão que blinda o conhecimento contra a Curva do Esquecimento.
                  </p>
              </div>

              <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center hover:-translate-y-2 transition-transform duration-500">
                  <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-cyan-400 shadow-lg shadow-cyan-900/10">
                      <Feather size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">A Lança (Foco)</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      A capacidade de direcionar toda a energia para um único ponto. O "Edital Verticalizado" e o "Modo Coringa" são suas lanças para atacar os pontos fracos da sua preparação.
                  </p>
              </div>
          </div>
      </div>

      {/* Quote */}
      <div className="text-center py-12 px-6 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800/50">
          <p className="text-xl md:text-2xl font-serif italic text-slate-600 dark:text-slate-300 mb-4">
              "A vitória pertence àquele que calcula os riscos e domina o terreno antes da batalha começar."
          </p>
          <div className="h-1 w-20 bg-emerald-500 mx-auto rounded-full"></div>
      </div>

    </div>
  );
};