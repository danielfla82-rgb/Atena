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
  Eye,
  ExternalLink,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { supabase } from "./supabase";

export const AdminTeorias: React.FC = () => {
  const { theories, addTheory, editTheory, deleteTheory, user } = useStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentTheory, setCurrentTheory] = useState<Partial<Theory> | null>(
    null,
  );
  const [contentType, setContentType] = useState<"html" | "link" | "images" | "text">("html");
  const [htmlInput, setHtmlInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [linkDescriptionInput, setLinkDescriptionInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [imagesInput, setImagesInput] = useState<string[]>([]);
  const [descriptionInput, setDescriptionInput] = useState("");

  const [isSpecificSyncModalOpen, setIsSpecificSyncModalOpen] = useState(false);
  const [theoryToSync, setTheoryToSync] = useState<Theory | null>(null);
  const [targetStudentEmail, setTargetStudentEmail] = useState("");
  const [targetSyncMessage, setTargetSyncMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);
  const [isSyncingSpecific, setIsSyncingSpecific] = useState(false);
  const [previewTheory, setPreviewTheory] = useState<Theory | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get unique disciplines
  const disciplines = Array.from(
    new Set(theories.map((t) => t.discipline)),
  ).sort();

  const handleSave = async () => {
    if (!currentTheory?.discipline || !currentTheory?.topic) {
      alert("Preencha disciplina e tópico.");
      return;
    }

    let contentToSave: Partial<Theory['content']> = {};
    if (contentType === 'html') {
      if (!htmlInput) { alert("Preencha o HTML."); return; }
      contentToSave = { html: htmlInput };
    } else if (contentType === 'link') {
      if (!linkInput) { alert("Preencha o Link."); return; }
      contentToSave = { link: linkInput, linkDescription: linkDescriptionInput };
    } else if (contentType === 'images') {
      if (imagesInput.length === 0) { alert("Anexe pelo menos uma imagem."); return; }
      contentToSave = { images: imagesInput };
    } else if (contentType === 'text') {
      if (!textInput) { alert("Preencha o texto."); return; }
      contentToSave = { text: textInput };
    }

    // Keep description logic if you want an explicit description for this subject
    contentToSave.description = descriptionInput || undefined;

    // keep the old trilhaConhecimento if it exists
    if (currentTheory.content?.trilhaConhecimento) {
       contentToSave.trilhaConhecimento = currentTheory.content.trilhaConhecimento;
    }

    const dataToSave = {
      ...currentTheory,
      content: contentToSave,
    };

    if (currentTheory.id) {
      await editTheory(currentTheory.id, dataToSave as Partial<Theory>);
    } else {
      await addTheory(dataToSave as Partial<Theory>);
    }

    setIsEditing(false);
    setCurrentTheory(null);
    setHtmlInput("");
    setLinkInput("");
    setLinkDescriptionInput("");
    setTextInput("");
    setImagesInput([]);
    setDescriptionInput("");
  };

  const handleEdit = (t: Theory) => {
    setCurrentTheory(t);
    setHtmlInput(t.content.html || "");
    setLinkInput(t.content.link || "");
    setLinkDescriptionInput(t.content.linkDescription || "");
    setTextInput(t.content.text || "");
    setImagesInput(t.content.images || []);
    setDescriptionInput(t.content.description || "");

    if (t.content.html) setContentType('html');
    else if (t.content.link) setContentType('link');
    else if (t.content.images && t.content.images.length > 0) setContentType('images');
    else if (t.content.text) setContentType('text');
    else setContentType('html');

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      (Array.from(files) as File[]).forEach((file) => {
        if (file.size > 30 * 1024 * 1024) {
          alert("Imagem muito grande (>30MB).");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
             setImagesInput((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
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
             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descrição de Exibição (Opcional)
             </label>
             <input
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm"
                placeholder="Ex: Conteúdo Estruturado, Resumo em Texto, Mapa Mental..."
             />
             <p className="text-xs text-slate-500 mt-1">Este texto aparecerá abaixo do título do subtópico na Biblioteca.</p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
               Formato do Conteúdo
             </label>
             <div className="flex gap-4 mb-4">
                {(['html', 'link', 'images', 'text'] as const).map(type => (
                   <label key={type} className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg dark:border-slate-700 flex-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                      <input 
                         type="radio" 
                         name="contentType" 
                         checked={contentType === type}
                         onChange={() => setContentType(type)}
                         className="text-[#ff6b00] focus:ring-[#ff6b00]"
                      />
                      <span className="text-sm font-medium capitalize text-slate-900 dark:text-white">
                         {type === 'html' ? 'HTML' : type === 'link' ? 'Hyperlink' : type === 'images' ? 'Anexos (Imagem)' : 'Texto Simples'}
                      </span>
                   </label>
                ))}
             </div>

             {/* HTML */}
             {contentType === 'html' && (
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
             )}

             {/* Link */}
             {contentType === 'link' && (
                <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">URL do Link</label>
                     <input
                        type="url"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        placeholder="Ex: https://meusite.com/resumo"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição que vai no botão (opcional)</label>
                     <input
                        type="text"
                        value={linkDescriptionInput}
                        onChange={(e) => setLinkDescriptionInput(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        placeholder="Ex: Abrir Resumo no Drive"
                     />
                   </div>
                </div>
             )}

             {/* Text */}
             {contentType === 'text' && (
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Conteúdo de Texto</label>
                   <textarea
                     value={textInput}
                     onChange={(e) => setTextInput(e.target.value)}
                     className="w-full h-96 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-4 rounded-lg outline-none text-slate-900 dark:text-white text-sm whitespace-pre-wrap"
                     placeholder="Escreva sua anotação ou teoria aqui..."
                   />
                </div>
             )}

             {/* Images */}
             {contentType === 'images' && (
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Imagens</label>
                   <div className="flex gap-4 flex-wrap">
                      {imagesInput.map((img, i) => (
                         <div key={i} className="relative w-32 h-32 group">
                            <img src={img} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                            <button 
                               onClick={() => setImagesInput(imagesInput.filter((_, idx) => idx !== i))}
                               className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                            >
                               <X size={14} />
                            </button>
                         </div>
                      ))}
                      <label className="w-32 h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                         <Upload size={24} className="text-slate-400 mb-2" />
                         <span className="text-xs text-slate-500 font-medium">Adicionar</span>
                         <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                   </div>
                </div>
             )}
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
                                  {t.subtopic || t.topic}
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
                                  onClick={() => setPreviewTheory(t)}
                                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition"
                                  title="Visualizar"
                                >
                                  <Eye size={18} />
                                </button>
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

      {previewTheory && (
        <div className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col overflow-y-auto ${isFullscreen ? 'p-0' : 'p-4 md:p-8'}`}>
          <div className={`bg-white dark:bg-slate-900 flex flex-col flex-1 min-h-0 ${isFullscreen ? 'w-full rounded-none border-0' : 'rounded-2xl w-full max-w-5xl mx-auto shadow-2xl border border-slate-200 dark:border-slate-800'}`}>
             <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-200 dark:border-slate-800">
               <div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                   {previewTheory.topic}
                 </h3>
                 <span className="text-sm text-slate-500">{previewTheory.discipline} {previewTheory.subtopic ? `• ${previewTheory.subtopic}` : ''}</span>
               </div>
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => setIsFullscreen(!isFullscreen)}
                   className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                   title={isFullscreen ? "Minimizar" : "Tela Cheia"}
                 >
                   {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                 </button>
                 <button
                   onClick={() => {
                     setPreviewTheory(null);
                     setIsFullscreen(false);
                   }}
                   className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                 >
                   <X size={24} />
                 </button>
               </div>
             </div>
             <div className="p-4 md:p-6 flex-1 overflow-y-auto flex flex-col">
               {previewTheory.content.html && (
                  <iframe
                    srcDoc={previewTheory.content.html}
                    className={`w-full border-0 bg-white flex-1 ${isFullscreen ? 'h-full rounded-none' : 'h-[70vh] rounded-xl'}`}
                    title="Teoria HTML"
                    sandbox="allow-scripts allow-same-origin"
                  />
               )}
               {previewTheory.content.link && (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                     <ExternalLink size={48} className="text-blue-500 mb-4" />
                     <h3 className="text-xl font-bold mb-2">Conteúdo Externo</h3>
                     <a href={previewTheory.content.link} target="_blank" rel="noreferrer" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition">
                        {previewTheory.content.linkDescription || 'Acessar Conteúdo'}
                     </a>
                  </div>
               )}
               {previewTheory.content.text && (
                  <div className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                     {previewTheory.content.text}
                  </div>
               )}
               {previewTheory.content.images && previewTheory.content.images.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {previewTheory.content.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-full h-auto rounded-xl shadow-md border border-slate-200 dark:border-slate-800" />
                     ))}
                  </div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
