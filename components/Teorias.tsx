import React, { useState, useMemo } from "react";
import { useStore } from "../store";
import { Book, ChevronRight, ArrowLeft } from "lucide-react";
import { TheoryViewer } from "./TheoryViewer";
import { Theory } from "../types";

export const Teorias: React.FC = () => {
  const { theories } = useStore();
  const [selectedTheory, setSelectedTheory] = useState<Theory | null>(null);

  // Grouping: Discipline -> Topic -> Theory[]
  const groupedTheories = useMemo(() => {
    return theories.reduce(
      (acc, t) => {
        if (!acc[t.discipline]) acc[t.discipline] = {};
        if (!acc[t.discipline][t.topic]) acc[t.discipline][t.topic] = [];
        acc[t.discipline][t.topic].push(t);
        return acc;
      },
      {} as Record<string, Record<string, Theory[]>>,
    );
  }, [theories]);

  if (selectedTheory) {
    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
        <div className="mb-4">
          <button
            onClick={() => setSelectedTheory(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#ff6b00] transition-colors font-bold text-sm"
          >
            <ArrowLeft size={16} /> Voltar para Teorias
          </button>
        </div>
        <div className="flex-1 overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
          <TheoryViewer theory={selectedTheory} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Book className="text-[#ff6b00]" size={32} />
            Biblioteca Atena
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Acesse as trilhas de conhecimento e resumos de véspera focados nos
            principais pontos de cada edital.
          </p>
        </div>

        {Object.keys(groupedTheories).length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <Book
              className="mx-auto text-slate-300 dark:text-slate-700 mb-4"
              size={48}
            />
            <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">
              Nenhuma teoria disponível.
            </h3>
            <p className="text-sm mt-2">
              Peça para seu orientador sincronizar os módulos teóricos e
              cadernos de erro.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTheories)
              .sort()
              .map(([discipline, topics]) => (
                <div
                  key={discipline}
                  className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                >
                  <div className="bg-[#fff4ed] dark:bg-slate-800/50 px-6 py-4 border-b border-orange-100 dark:border-slate-800">
                    <h3 className="text-xl font-black text-[#803200] dark:text-[#ff6b00] uppercase tracking-wider">
                      {discipline}
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(topics)
                      .sort()
                      .map(([topic, theoryList]) => (
                        <div key={topic} className="p-6">
                          <h4 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                            <ChevronRight
                              className="text-[#ff6b00]"
                              size={20}
                            />
                            {topic}
                          </h4>
                          <div className="grid gap-4 pl-7 sm:grid-cols-2 lg:grid-cols-3">
                            {theoryList.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setSelectedTheory(t)}
                                className="text-left bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-[#ff6b00] hover:shadow-md transition-all group"
                              >
                                <div className="font-black text-slate-900 dark:text-white mb-2 group-hover:text-[#ff6b00] transition-colors">
                                  {t.subtopic || "Geral"}
                                </div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex flex-col gap-1">
                                  <span>
                                    {t.content.html
                                      ? "Conteúdo Estruturado"
                                      : "Formato Legado"}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
