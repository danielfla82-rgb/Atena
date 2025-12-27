import React from 'react';
import { FileText, Layers, Library, Calendar, ArrowRight, CheckCircle2, Shield } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const steps = [
    {
      id: 1,
      title: "Cadastrar Edital",
      desc: "Vá em 'Planejamento' > 'Configurar'. Cole o texto do edital para a IA processar a verticalização e análise de riscos.",
      icon: <FileText size={24} className="text-blue-400" />,
      color: "border-blue-500/30 bg-blue-500/10"
    },
    {
      id: 2,
      title: "Organizar Ciclos",
      desc: "Crie um projeto específico (ex: 'Receita Federal'). Seus cadernos são universais, mas o planejamento é isolado por ciclo.",
      icon: <Layers size={24} className="text-purple-400" />,
      color: "border-purple-500/30 bg-purple-500/10"
    },
    {
      id: 3,
      title: "Banco de Disciplinas",
      desc: "Cadastre suas matérias em 'Banco de Dados'. Defina peso, relevância e deixe o algoritmo calcular suas revisões.",
      icon: <Library size={24} className="text-amber-400" />,
      color: "border-amber-500/30 bg-amber-500/10"
    },
    {
      id: 4,
      title: "Montar Planejamento",
      desc: "Na 'Visão Tática', arraste os cadernos para as semanas. O sistema gerencia as revisões automaticamente.",
      icon: <Calendar size={24} className="text-emerald-400" />,
      color: "border-emerald-500/30 bg-emerald-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950 -z-10"></div>

      <div className="max-w-5xl w-full z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-900/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Shield size={12} /> Protocolo de Iniciação
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Conhecendo a Plataforma</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            O Projeto Atena não é apenas um organizador, é um sistema tático. Entenda o fluxo de vitória em 4 passos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step, idx) => (
            <div key={step.id} className={`p-6 rounded-2xl border ${step.color} backdrop-blur-sm relative group hover:-translate-y-1 transition-transform duration-300`}>
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-white font-bold shadow-xl z-10">
                {step.id}
              </div>
              <div className="mb-4 bg-slate-900/50 p-3 rounded-xl w-fit">{step.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button 
            onClick={onComplete}
            className="group relative px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 flex items-center gap-3 text-lg"
          >
            <span>Acessar Command Center</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
};