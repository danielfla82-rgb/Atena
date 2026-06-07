import React, { useState } from "react";
import { useStore } from "../store";
import { Theory } from "../types";
import {
  Search,
  Plus,
  Book,
  Trash2,
  Edit,
  Upload,
  Globe,
  CheckCircle2,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "./supabase";

export const AdminTeorias: React.FC = () => {
  const { theories, addTheory, editTheory, deleteTheory, user } = useStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentTheory, setCurrentTheory] = useState<Partial<Theory> | null>(
    null,
  );
  const [htmlInput, setHtmlInput] = useState("");

  const [isSpecificSyncModalOpen, setIsSpecificSyncModalOpen] = useState(false);
  const [theoryToSync, setTheoryToSync] = useState<Theory | null>(null);
  const [targetStudentEmail, setTargetStudentEmail] = useState("");
  const [targetSyncMessage, setTargetSyncMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);
  const [isSyncingSpecific, setIsSyncingSpecific] = useState(false);

  // Get unique disciplines
  const disciplines = Array.from(
    new Set(theories.map((t) => t.discipline)),
  ).sort();

  const handleSave = async () => {
    if (!currentTheory?.discipline || !currentTheory?.topic || !htmlInput) {
      alert("Preencha disciplina, tópico e o conteúdo HTML.");
      return;
    }

    const dataToSave = {
      ...currentTheory,
      content: { html: htmlInput },
    };

    if (currentTheory.id) {
      await editTheory(currentTheory.id, dataToSave);
    } else {
      await addTheory(dataToSave);
    }

    setIsEditing(false);
    setCurrentTheory(null);
    setHtmlInput("");
  };

  const handleEdit = (t: Theory) => {
    setCurrentTheory(t);
    setHtmlInput(t.content.html || "");
    setIsEditing(true);
  };

  const handleSync = async (theory: Theory) => {
    setTheoryToSync(theory);
    setIsSpecificSyncModalOpen(true);
  };

  const executeSync = async () => {
    if (!theoryToSync || isSyncingSpecific) return;
    setIsSyncingSpecific(true);
    setTargetSyncMessage(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // TODO: implement RPC
      const { data, error } = await supabase.rpc("admin_sync_theory", {
        p_admin_email: userData.user.email,
        p_theory_id: theoryToSync.id,
        p_target_email: targetStudentEmail.trim() || null,
      });

      if (error) throw error;
      if (data?.success) {
        setTargetSyncMessage({
          text: `Sincronizado! Atualizado(s) ${data.updated} aluno(s).`,
          type: "success",
        });
        setTimeout(() => {
          setIsSpecificSyncModalOpen(false);
          setTargetSyncMessage(null);
        }, 3000);
      } else {
        setTargetSyncMessage({ text: `Erro: ${data?.error}`, type: "error" });
      }
    } catch (e: any) {
      setTargetSyncMessage({ text: `Erro: ${e.message}`, type: "error" });
    } finally {
      setIsSyncingSpecific(false);
    }
  };

  const groupedTheories = theories.reduce(
    (acc, t) => {
      if (!acc[t.discipline]) acc[t.discipline] = {};
      if (!acc[t.discipline][t.topic]) acc[t.discipline][t.topic] = [];
      acc[t.discipline][t.topic].push(t);
      return acc;
    },
    {} as Record<string, Record<string, Theory[]>>,
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setHtmlInput(content);
    };
    reader.readAsText(file);
  };

  if (isEditing) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-slate-900 dark:text-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Book className="text-[#ff6b00]" />
            {currentTheory?.id ? "Editar Teoria" : "Nova Teoria"}
          </h2>
          <button
            onClick={() => setIsEditing(false)}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
          >
            <X />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Disciplina
              </label>
              <input
                value={currentTheory?.discipline || ""}
                onChange={(e) =>
                  setCurrentTheory({
                    ...currentTheory,
                    discipline: e.target.value,
                  })
                }
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                placeholder="Ex: Direito Administrativo"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tópico
              </label>
              <input
                value={currentTheory?.topic || ""}
                onChange={(e) =>
                  setCurrentTheory({ ...currentTheory, topic: e.target.value })
                }
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                placeholder="Ex: Lei 14.133/2021"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Subtópico (Opcional)
            </label>
            <input
              value={currentTheory?.subtopic || ""}
              onChange={(e) =>
                setCurrentTheory({ ...currentTheory, subtopic: e.target.value })
              }
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              placeholder="Ex: Geral"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Conteúdo HTML (Cole o código-fonte da página)</span>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition">
                  <Upload size={14} className="inline mr-1" />
                  Upload HTML
                  <input type="file" accept=".html,.htm" className="hidden" onChange={handleFileUpload} />
                </label>
                <a
                  href="#"
                  className="text-xs text-[#ff6b00] hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setHtmlInput(
                      "<!DOCTYPE html>\n<html>\n<head></head>\n<body></body>\n</html>",
                    );
                  }}
                >
                  Template Vazio
                </a>
              </div>
            </label>
            <textarea
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              className="w-full h-96 bg-slate-900 text-green-400 font-mono text-sm p-4 rounded-lg outline-none"
              placeholder="Cole o HTML da teoria aqui..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border rounded-lg font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#ff6b00] text-white rounded-lg font-bold hover:bg-orange-600"
            >
              Salvar Teoria
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Book className="text-[#ff6b00]" />
            Módulos Teóricos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie as trilhas de conhecimento e cadernos de erro (formato HTML
            ATENA).
          </p>
        </div>
        <button
          onClick={() => {
            setCurrentTheory({});
            setHtmlInput("");
            setIsEditing(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white rounded-xl font-bold shadow hover:bg-orange-600 transition"
        >
          <Plus size={18} /> Cadastrar Nova Teoria
        </button>
      </div>

      <div className="space-y-8">
        {Object.keys(groupedTheories).length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
            Nenhuma teoria cadastrada no sistema.
          </div>
        ) : (
          Object.entries(groupedTheories)
            .sort()
            .map(([discipline, topics]) => (
              <div
                key={discipline}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">
                    {discipline}
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(topics)
                    .sort()
                    .map(([topic, theoryList]) => (
                      <div key={topic} className="p-6">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
                          <ChevronRight className="text-[#ff6b00]" size={16} />
                          {topic}
                        </h4>
                        <div className="grid gap-3 pl-6">
                          {theoryList.map((t) => (
                            <div
                              key={t.id}
                              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-orange-200 dark:hover:border-orange-500/50 transition group"
                            >
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-white">
                                  {t.subtopic || "Geral"}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                                  <span>
                                    {t.content.html
                                      ? "Conteúdo HTML disponível"
                                      : "Conteúdo nativo legado"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSync(t)}
                                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                                  title="Sincronizar Aluno"
                                >
                                  <Upload size={18} />
                                </button>
                                <button
                                  onClick={() => handleEdit(t)}
                                  className="p-2 text-slate-400 dark:text-slate-500 flex-shrink-0 hover:text-orange-600 dark:hover:text-[#ff6b00] hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition"
                                  title="Editar"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm("Excluir teoria?"))
                                      deleteTheory(t.id);
                                  }}
                                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                  title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
        )}
      </div>

      {isSpecificSyncModalOpen && theoryToSync && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl w-full max-w-xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Sincronização de Teoria
              </h3>
              <button
                onClick={() => setIsSpecificSyncModalOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <strong className="dark:text-white">{theoryToSync.discipline}</strong> -{" "}
                {theoryToSync.topic}{" "}
                {theoryToSync.subtopic ? `(${theoryToSync.subtopic})` : ""}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                E-mail do aluno alvo (vazio para ATUALIZAR TODOS):
              </p>
              <input
                type="email"
                placeholder="ex: aluno@email.com"
                value={targetStudentEmail}
                onChange={(e) => setTargetStudentEmail(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff6b00]"
              />
              {targetSyncMessage && (
                <div
                  className={`text-sm font-bold p-3 rounded-lg ${targetSyncMessage.type === "error" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"}`}
                >
                  {targetSyncMessage.text}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                onClick={() => setIsSpecificSyncModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={executeSync}
                disabled={isSyncingSpecific}
                className="flex items-center gap-2 px-5 py-2 bg-[#ff6b00] hover:bg-orange-600 text-white rounded-xl transition font-bold disabled:opacity-50"
              >
                {isSyncingSpecific ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Globe size={18} />
                )}
                {isSyncingSpecific ? "Sincronizando..." : "Sincronizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
