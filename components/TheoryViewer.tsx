import React, { useState, useMemo, useRef, useEffect } from "react";
import { Theory } from "../types";
import {
  Book,
  Zap,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
} from "lucide-react";

interface TheoryViewerProps {
  theory: Theory;
}

export const TheoryViewer: React.FC<TheoryViewerProps> = ({ theory }) => {
  const [viewMode, setViewMode] = useState<"trilha" | "vespera">("trilha");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openTheory, setOpenTheory] = useState(-1);
  const [flipped, setFlipped] = useState(false);
  const [flashIndex, setFlashIndex] = useState(0);
  const errosRef = useRef<HTMLDivElement>(null);

  const { trilhaConhecimento = [], resumoVespera = [] } = theory.content;
  const selected = trilhaConhecimento[selectedIndex] || null;
  const currentFlashcard = selected?.flashcards?.[flashIndex] || null;

  const progress = useMemo(() => {
    const high = trilhaConhecimento.filter((item: any) =>
      String(item.incidence).toLowerCase().includes("alta"),
    ).length;
    const medium = trilhaConhecimento.filter((item: any) =>
      String(item.incidence).toLowerCase().includes("média"),
    ).length;
    return { high, medium, total: trilhaConhecimento.length };
  }, [trilhaConhecimento]);

  useEffect(() => {
    setTimeout(() => {
      setOpenTheory(-1); // Changed default to -1 (all closed)
      setFlipped(false);
      setFlashIndex(0);
    }, 0);
  }, [selectedIndex, theory]);

  if (theory.content?.html) {
    return (
      <div className="h-full w-full relative">
        <iframe
          srcDoc={theory.content.html}
          className="w-full h-full border-0 rounded-2xl"
          title="Teoria HTML"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    );
  }

  if (theory.content?.link) {
     return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950 text-slate-500 rounded-2xl">
           <ExternalLink className="mx-auto mb-4 text-[#ff6b00]" size={48} />
           <h3 className="text-xl font-bold dark:text-white mb-4">Acesso a Conteúdo Externo</h3>
           <a href={theory.content.link} target="_blank" rel="noreferrer" className="px-6 py-3 bg-[#ff6b00] hover:bg-orange-600 text-white rounded-xl font-bold transition flex items-center gap-2">
              <Book size={18} />
              {theory.content.linkDescription || 'Acessar Material'}
           </a>
        </div>
     );
  }

  if (theory.content?.text || (theory.content?.images && theory.content.images.length > 0)) {
     return (
      <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative w-full rounded-2xl">
         <div className="sticky top-0 z-40 border-b border-gray-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm backdrop-blur-md">
            <div className="mx-auto flex w-full flex-col gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.26em] text-[#ff6b00]">
                    Material Estruturado
                  </p>
                  <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white mt-1">
                    {theory.topic} 
                    {theory.subtopic && (
                      <span className="opacity-50 font-normal">
                        | {theory.subtopic}
                      </span>
                    )}
                  </h1>
                </div>
              </div>
            </div>
         </div>
         <main className="w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 flex-1 space-y-8">
            {theory.content?.text && (
               <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                  <div className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                     {theory.content.text}
                  </div>
               </div>
            )}
            {theory.content?.images && theory.content.images.length > 0 && (
               <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                  <h3 className="text-lg font-black mb-6 text-slate-800 dark:text-white flex items-center gap-2">
                     <Zap size={20} className="text-[#ff6b00]" />
                     Galeria de Imagens
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {theory.content.images.map((img, i) => (
                        <div key={i} className="rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                           <img src={img} alt={`Referencia ${i + 1}`} className="w-full h-auto object-contain" style={{ maxHeight: '80vh' }} />
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </main>
      </div>
     )
  }

  const scrollToErrors = () => {
    errosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nextFlash = () => {
    if (!selected?.flashcards?.length) return;
    setFlipped(false);
    setFlashIndex((value) => (value + 1) % selected.flashcards.length);
  };

  const prevFlash = () => {
    if (!selected?.flashcards?.length) return;
    setFlipped(false);
    setFlashIndex(
      (value) =>
        (value - 1 + selected.flashcards.length) % selected.flashcards.length,
    );
  };

  if (!trilhaConhecimento.length && !resumoVespera.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        <Book className="mx-auto mb-4 opacity-50" size={48} />
        <h3 className="text-xl font-bold">Conteúdo indisponível</h3>
        <p>O material desta teoria ainda não foi carregado corretamente.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative w-full rounded-2xl">
      <div className="sticky top-0 z-40 border-b border-gray-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-[#ff6b00]">
                  ATENA - Trilha do Aprendizado
                </p>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white mt-1">
                  {theory.topic}{" "}
                  {theory.subtopic && (
                    <span className="opacity-50 font-normal">
                      | {theory.subtopic}
                    </span>
                  )}
                </h1>
              </div>
            </div>
            <div className="hidden rounded-2xl border border-orange-100 dark:border-slate-700 bg-[#fff4ed] dark:bg-slate-800 px-4 py-3 text-right md:block">
              <p className="text-xs font-black uppercase tracking-widest text-[#803200] dark:text-[#ff6b00]">
                {theory.discipline}
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Caderno ATENA
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {trilhaConhecimento.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode("trilha")}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                  viewMode === "trilha"
                    ? "border-[#ff6b00] bg-[#ff6b00] text-white shadow-sm"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-orange-200 hover:bg-[#fff4ed] dark:hover:bg-slate-700"
                }`}
              >
                <Book size={16} /> Trilha Progressiva
              </button>
            )}
            {resumoVespera.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode("vespera")}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                  viewMode === "vespera"
                    ? "border-[#ff6b00] bg-[#ff6b00] text-white shadow-sm"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-orange-200 hover:bg-[#fff4ed] dark:hover:bg-slate-700"
                }`}
              >
                <Zap size={16} /> Resumo de Véspera
              </button>
            )}
          </nav>
        </div>
      </div>

      <main className="relative z-10 w-full px-4 py-8 sm:px-6 flex-1">
        {viewMode === "trilha" && selected ? (
          <>
            <section className="mb-6 rounded-[2rem] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff6b00]">
                    Linha de progressão
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                    Do enquadramento legal ao erro fino de prova
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-slate-400">
                    Role horizontalmente e avance dos fundamentos para os pontos
                    de maior detalhe da disciplina.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-[#fff4ed] dark:bg-slate-800 px-4 py-3">
                    <p className="text-xl font-black text-[#803200] dark:text-[#ff6b00]">
                      {progress.total}
                    </p>
                    <p className="text-[11px] font-bold uppercase text-[#803200] dark:text-[#ff6b00]">
                      Módulos
                    </p>
                  </div>
                  <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 px-4 py-3">
                    <p className="text-xl font-black text-red-700 dark:text-red-400">
                      {progress.high}
                    </p>
                    <p className="text-[11px] font-bold uppercase text-red-700 dark:text-red-400">
                      Alta
                    </p>
                  </div>
                  <div className="rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3">
                    <p className="text-xl font-black text-yellow-700 dark:text-yellow-400">
                      {progress.medium}
                    </p>
                    <p className="text-[11px] font-bold uppercase text-yellow-700 dark:text-yellow-400">
                      Média
                    </p>
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar-x flex gap-3 overflow-x-auto pb-4">
                {trilhaConhecimento.map((item: any, index: number) => (
                  <React.Fragment key={item.id || index}>
                    <button
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className={`min-w-[265px] h-full flex flex-col rounded-3xl border p-4 text-left transition duration-200 ${
                        selectedIndex === index
                          ? "border-[#ff6b00] bg-[#fff4ed] dark:bg-slate-800 shadow-md"
                          : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:-translate-y-0.5 hover:border-orange-200"
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3 w-full">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider text-white"
                          style={{
                            backgroundColor: item.colorCode || "#ff6b00",
                          }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {item.incidence}
                        </span>
                      </div>
                      <h3 className="text-base font-black leading-tight text-gray-900 dark:text-white flex-1">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {item.level}
                      </p>
                    </button>
                    {index < trilhaConhecimento.length - 1 && (
                      <div className="flex min-w-[32px] items-center justify-center text-[#ff6b00]">
                        <ArrowRight className="text-[#ff6b00]" size={20} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-[2rem] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff6b00]">
                        Deep Dive Teórico
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                        {selected.title}
                      </h2>
                      <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                        Módulo {selectedIndex + 1} • Nível {selected.level} •
                        Incidência {selected.incidence}
                      </p>
                    </div>
                    {selected.pegadinhas?.length > 0 && (
                      <button
                        type="button"
                        onClick={scrollToErrors}
                        className="inline-flex items-center justify-center rounded-full border border-orange-200 dark:border-slate-700 bg-[#fff4ed] dark:bg-slate-800 px-4 py-2 text-sm font-black text-[#803200] dark:text-[#ff6b00] transition hover:border-[#ff6b00]"
                      >
                        ↓ Ir para Erros
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {selected.theory?.map((topic: any, index: number) => (
                      <article
                        key={index}
                        className="overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenTheory(openTheory === index ? -1 : index)
                          }
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff4ed] dark:bg-slate-800 text-sm font-black text-[#803200] dark:text-[#ff6b00] flex-shrink-0">
                              {index + 1}
                            </span>
                            <h3 className="font-black text-gray-900 dark:text-white">
                              {topic.subtitle}
                            </h3>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 transition-transform ${openTheory === index ? "rotate-180 text-[#ff6b00]" : "text-slate-500"}`}
                          />
                        </button>
                        {openTheory === index && (
                          <div className="border-t border-gray-100 dark:border-slate-800 px-5 pb-5 pt-4">
                            <p className="text-sm leading-7 text-slate-800 dark:text-slate-300">
                              {topic.text}
                            </p>
                            {topic.example && (
                              <div className="mt-4 rounded-2xl border border-orange-100 dark:border-slate-800 bg-[#fff4ed] dark:bg-slate-800/50 p-4">
                                <p className="text-xs font-black uppercase tracking-widest text-[#803200] dark:text-[#ff6b00]">
                                  Cenário de Prova
                                </p>
                                <p className="mt-2 text-sm italic leading-6 text-[#803200] dark:text-slate-300">
                                  {topic.example}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>

                {selected.pegadinhas?.length > 0 && (
                  <div
                    ref={errosRef}
                    className="scroll-mt-32 rounded-[2rem] border border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10 p-5"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 font-bold text-xl">
                        !
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
                          Caderno de Erros
                        </p>
                        <h3 className="text-lg font-black text-red-950 dark:text-red-100">
                          Pegadinhas reais do módulo
                        </h3>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {selected.pegadinhas.map((erro: string, i: number) => (
                        <li
                          key={i}
                          className="flex gap-3 rounded-2xl bg-white/70 dark:bg-slate-900/50 p-4 text-sm leading-6 text-red-950 dark:text-red-100 border border-red-50 dark:border-red-900/30"
                        >
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-500" />
                          <span>{erro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {selected.flashcards?.length > 0 && currentFlashcard && (
                <aside className="lg:col-span-1 lg:sticky lg:top-28">
                  <div className="rounded-[2rem] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div className="mb-4">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff6b00]">
                        Flashcard Atena
                      </p>
                      <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                        {currentFlashcard.banca}
                      </h2>
                      <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                        Card {flashIndex + 1} de {selected.flashcards.length} •
                        clique para virar
                      </p>
                    </div>

                    <div className="relative h-[450px] [perspective:1000px]">
                      <button
                        type="button"
                        onClick={() => setFlipped((value) => !value)}
                        className="absolute inset-0 h-full w-full text-left focus:outline-none"
                      >
                        <div
                          className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
                        >
                          <div className="absolute inset-0 flex h-full flex-col rounded-[2rem] border border-orange-100 dark:border-slate-700 bg-[#fff4ed] dark:bg-slate-800 p-5 shadow-sm [backface-visibility:hidden]">
                            <div className="mb-4 flex items-center justify-between">
                              <span className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#803200] dark:text-[#ff6b00]">
                                Frente
                              </span>
                              <RotateCcw
                                className="text-[#803200] dark:text-[#ff6b00]"
                                size={18}
                              />
                            </div>
                            <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                              <p className="text-lg font-black leading-7 text-gray-900 dark:text-white">
                                {currentFlashcard.text}
                              </p>
                              {currentFlashcard.options?.length > 0 && (
                                <div className="mt-5 space-y-2">
                                  {currentFlashcard.options.map(
                                    (option: string, index: number) => (
                                      <div
                                        key={index}
                                        className="rounded-2xl border border-orange-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold leading-5 text-slate-700 dark:text-slate-300"
                                      >
                                        <span className="mr-2 font-black text-[#ff6b00]">
                                          {String.fromCharCode(65 + index)}.
                                        </span>
                                        {option}
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="mt-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 p-3 text-center text-xs font-black uppercase tracking-widest text-[#803200] dark:text-[#ff6b00]">
                              Clique para revelar a resposta
                            </div>
                          </div>

                          <div className="absolute inset-0 flex h-full flex-col rounded-[2rem] border border-emerald-100 dark:border-emerald-900 bg-white dark:bg-slate-800 p-5 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
                            <div className="mb-4 flex items-center justify-between">
                              <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                Verso
                              </span>
                              <RotateCcw
                                className="text-emerald-700 dark:text-emerald-400"
                                size={18}
                              />
                            </div>
                            <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">
                                Resposta correta
                              </p>
                              <p className="mt-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-base font-black leading-6 text-emerald-900 dark:text-emerald-100 border border-emerald-100 dark:border-emerald-900/50">
                                {currentFlashcard.correctAnswer}
                              </p>
                              <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                                Explicação Atena
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-800 dark:text-slate-300">
                                {currentFlashcard.explanation}
                              </p>
                            </div>
                            <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-900 p-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                              Clique para voltar à frente
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>

                    {selected.flashcards.length > 1 && (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={prevFlash}
                          className="flex-1 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:border-orange-200 hover:bg-[#fff4ed] dark:hover:bg-slate-700"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={nextFlash}
                          className="flex-1 rounded-full bg-[#ff6b00] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-orange-600"
                        >
                          Próximo
                        </button>
                      </div>
                    )}
                  </div>
                </aside>
              )}
            </section>
          </>
        ) : (
          <section className="rounded-[2rem] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6 max-w-6xl mx-auto w-full">
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff6b00]">
                  Dashboard objetivo
                </p>
                <h2 className="mt-1 text-3xl font-black text-gray-900 dark:text-white">
                  Resumo de Véspera
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-slate-400">
                  Leitura dinâmica com regras, exceções e pontos estratégicos
                  focados na prova.
                </p>
              </div>
            </div>

            {resumoVespera.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {resumoVespera.map((card: any, idx: number) => (
                  <article
                    key={idx}
                    className="rounded-[1.75rem] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 flex flex-col"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black leading-tight text-gray-900 dark:text-white">
                        {card.title}
                      </h3>
                      {card.badge && (
                        <span className="shrink-0 rounded-full bg-[#fff4ed] dark:bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#803200] dark:text-[#ff6b00]">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-3 mt-auto">
                      {card.items?.map((item: string, itemIdx: number) => (
                        <li
                          key={itemIdx}
                          className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300"
                        >
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ff6b00]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Nenhum resumo de véspera disponível para esta teoria.
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
