import React, { useState } from "react";
import { useStore } from "../store";
import {
  Settings,
  Calendar,
  Play,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  Save,
  Grid,
  List as ListIcon,
  X,
  Globe,
  Upload,
  Loader2,
  Target,
  Users,
  Book,
} from "lucide-react";
import { supabase } from "./supabase";
import { Cycle } from "../types";

export const AdminPlanejamentos: React.FC = () => {
  const { cycles, user } = useStore();

  const [isSpecificSyncModalOpen, setIsSpecificSyncModalOpen] = useState(false);
  const [cycleToSync, setCycleToSync] = useState<Cycle | null>(null);
  const [targetStudentEmail, setTargetStudentEmail] = useState("");
  const [targetSyncMessage, setTargetSyncMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);
  const [isSyncingSpecific, setIsSyncingSpecific] = useState(false);

  if (!cycles || cycles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
        <Calendar size={48} className="mb-4 opacity-50" />
        <h3 className="text-lg font-bold">Nenhum planejamento criado.</h3>
        <p className="text-sm">
          Inicie um novo ciclo tático no Dashboard primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="text-indigo-600 dark:text-indigo-500" />
              Planejamentos (Ciclos)
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Sincronize seus ciclos completos para a conta dos alunos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cycles.map((cycle) => (
            <div
              key={cycle.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col transition-all hover:border-indigo-500 dark:hover:border-indigo-500 shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Target size={20} />
                </div>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md font-mono">
                  {Object.keys(cycle.schedule || {}).length} semanas
                </span>
              </div>

              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 line-clamp-1">
                {cycle.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {cycle.config.targetRole || "Sem edital"}
              </p>

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    setCycleToSync(cycle);
                    setIsSpecificSyncModalOpen(true);
                  }}
                  className="flex w-full justify-center items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-sm transition-colors border border-indigo-100 dark:border-indigo-800/50"
                >
                  <Upload size={16} /> Sincronizar Plano
                </button>
              </div>
            </div>
          ))}
        </div>

        {isSpecificSyncModalOpen && cycleToSync && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl w-full max-w-xl shadow-2xl space-y-6 transform transition-all">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Mentoria (Sincronização Específica)
                </h3>
                <button
                  onClick={() => setIsSpecificSyncModalOpen(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  E-mail do aluno alvo (vazio para ATUALIZAR TODOS que têm este
                  ciclo)
                </p>
                <input
                  type="email"
                  placeholder="ex: aluno@email.com"
                  value={targetStudentEmail}
                  onChange={(e) => setTargetStudentEmail(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
                {targetSyncMessage && (
                  <div
                    className={`text-sm font-bold p-3 rounded-lg ${targetSyncMessage.type === "error" ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"}`}
                  >
                    {targetSyncMessage.text}
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => setIsSpecificSyncModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (isSyncingSpecific) return;
                    setIsSyncingSpecific(true);
                    setTargetSyncMessage(null);
                    try {
                      const { data: userData } = await supabase.auth.getUser();
                      if (!userData.user)
                        throw new Error("Usuário não autenticado");

                      const { data, error } = await supabase.rpc(
                        "admin_sync_cycle",
                        {
                          p_admin_email: userData.user.email,
                          p_cycle_id: cycleToSync.id,
                          p_target_email: targetStudentEmail.trim() || null,
                        },
                      );

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
                        setTargetSyncMessage({
                          text: `Erro: ${data?.error}`,
                          type: "error",
                        });
                      }
                    } catch (e: any) {
                      setTargetSyncMessage({
                        text: `Erro: ${e.message}`,
                        type: "error",
                      });
                    } finally {
                      setIsSyncingSpecific(false);
                    }
                  }}
                  disabled={isSyncingSpecific}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-bold disabled:opacity-50"
                >
                  {isSyncingSpecific ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Globe size={18} />
                  )}
                  {isSyncingSpecific ? "Sincronizando..." : "Sincronizar Plano"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
