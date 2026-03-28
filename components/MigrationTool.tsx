import React, { useState } from 'react';
import { supabase } from './supabase';
import { Database, HardDrive, ArrowRight, CheckCircle2, AlertTriangle, Loader2, Play, CloudLightning } from 'lucide-react';

export const MigrationTool: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'migrating' | 'done'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errors, setErrors] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const base64ToBlob = async (base64: string): Promise<Blob> => {
      const res = await fetch(base64);
      return await res.blob();
  };

  const startMigration = async () => {
      setStatus('scanning');
      setLogs([]);
      setErrors([]);
      addLog("Iniciando varredura de cadernos...");

      try {
          // 1. Buscar todos os IDs para processar um por um (evita estourar memória)
          const { data: notebooks, error } = await supabase
              .from('notebooks')
              .select('id, name');

          if (error) throw error;
          
          if (!notebooks || notebooks.length === 0) {
              addLog("Nenhum caderno encontrado.");
              setStatus('done');
              return;
          }

          addLog(`Encontrados ${notebooks.length} cadernos. Iniciando análise de imagens...`);
          setStatus('migrating');
          setProgress({ current: 0, total: notebooks.length });

          let migratedCount = 0;

          for (let i = 0; i < notebooks.length; i++) {
              const nb = notebooks[i];
              setProgress({ current: i + 1, total: notebooks.length });
              
              // Buscar dados pesados apenas deste caderno
              const { data: fullNb, error: fetchError } = await supabase
                  .from('notebooks')
                  .select('images, image') // Pegar legado (image) e novo (images)
                  .eq('id', nb.id)
                  .single();

              if (fetchError) {
                  addLog(`❌ Erro ao ler caderno ${nb.name}: ${fetchError.message}`);
                  continue;
              }

              // Normalizar imagens
              let imagesToProcess: string[] = [];
              if (fullNb.images && Array.isArray(fullNb.images)) imagesToProcess = fullNb.images;
              else if (fullNb.image) imagesToProcess = [fullNb.image];

              if (imagesToProcess.length === 0) {
                  // addLog(`Ignorando ${nb.name}: Sem imagens.`);
                  continue;
              }

              // Verificar se precisa migrar (se começa com 'data:image')
              const needsMigration = imagesToProcess.some(img => img.startsWith('data:image'));

              if (!needsMigration) {
                  // addLog(`Ignorando ${nb.name}: Imagens já estão na nuvem.`);
                  continue;
              }

              addLog(`⚡ Migrando ${imagesToProcess.length} imagem(ns) de: ${nb.name}...`);

              const newUrls: string[] = [];

              for (let j = 0; j < imagesToProcess.length; j++) {
                  const imgStr = imagesToProcess[j];
                  
                  if (imgStr.startsWith('data:image')) {
                      try {
                          const blob = await base64ToBlob(imgStr);
                          const fileExt = imgStr.substring("data:image/".length, imgStr.indexOf(";base64"));
                          const fileName = `${nb.id}/${Date.now()}_${j}.${fileExt}`;
                          
                          // Upload para Storage
                          const { data: uploadData, error: uploadError } = await supabase.storage
                              .from('notebook-images')
                              .upload(fileName, blob, {
                                  contentType: blob.type,
                                  upsert: true
                              });

                          if (uploadError) throw uploadError;

                          // Get Public URL
                          const { data: publicUrlData } = supabase.storage
                              .from('notebook-images')
                              .getPublicUrl(fileName);

                          newUrls.push(publicUrlData.publicUrl);
                      } catch (err: any) {
                          addLog(`❌ Falha no upload da imagem ${j}: ${err.message}`);
                          // Manter a original em caso de erro para não perder dados
                          newUrls.push(imgStr); 
                      }
                  } else {
                      // Já é URL, mantém
                      newUrls.push(imgStr);
                  }
              }

              // Atualizar Banco de Dados
              // Removemos a coluna legada 'image' e movemos tudo para 'images'
              const { error: updateError } = await supabase
                  .from('notebooks')
                  .update({ 
                      images: newUrls,
                      image: null // Limpar coluna legada para economizar espaço
                  })
                  .eq('id', nb.id);

              if (updateError) {
                  addLog(`❌ Erro ao salvar caderno ${nb.name}: ${updateError.message}`);
              } else {
                  addLog(`✅ Sucesso: ${nb.name} atualizado.`);
                  migratedCount++;
              }
          }

          addLog(`🏁 Processo finalizado. ${migratedCount} cadernos migrados.`);
          setStatus('done');

      } catch (error: any) {
          addLog(`⛔ Erro Crítico: ${error.message}`);
          setStatus('done');
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CloudLightning className="text-cyan-500" /> Migrador de Storage
                </h2>
                {status !== 'migrating' && (
                    <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white">Fechar</button>
                )}
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                
                {status === 'idle' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-cyan-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/30">
                            <HardDrive size={40} className="text-cyan-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Otimização de Banco de Dados</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm mb-6">
                            Esta ferramenta moverá todas as imagens salvas internamente no banco (Base64) para o Supabase Storage.
                            <br/><br/>
                            <strong>Benefícios:</strong>
                            <ul className="text-left mt-2 space-y-1 list-disc pl-5 text-slate-600 dark:text-slate-300">
                                <li>Redução drástica do consumo de Egress (Dados).</li>
                                <li>Carregamento mais rápido do App.</li>
                                <li>Melhor performance em celulares.</li>
                            </ul>
                        </p>
                        
                        <div className="bg-amber-900/20 border border-amber-500/20 p-4 rounded-xl text-left mb-6">
                            <h4 className="text-amber-400 font-bold text-xs uppercase flex items-center gap-2 mb-2">
                                <AlertTriangle size={14}/> Pré-requisito
                            </h4>
                            <p className="text-amber-200 text-xs">
                                Certifique-se de ter criado o bucket público <strong>"notebook-images"</strong> no painel do Supabase antes de iniciar.
                            </p>
                        </div>

                        <button onClick={startMigration} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-900 dark:text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 flex items-center gap-2 mx-auto transition-all">
                            <Play size={20} /> Iniciar Migração
                        </button>
                    </div>
                )}

                {(status === 'scanning' || status === 'migrating' || status === 'done') && (
                    <div className="space-y-4">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                            <span>Progresso</span>
                            <span>{progress.current} / {progress.total}</span>
                        </div>
                        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
                            <div 
                                className="h-full bg-cyan-500 transition-all duration-300 relative overflow-hidden"
                                style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs text-slate-600 dark:text-slate-300 space-y-1 custom-scrollbar">
                            {logs.length === 0 && <span className="text-slate-600 italic">Aguardando logs...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}>
                                    {log}
                                </div>
                            ))}
                            <div id="log-end"></div>
                        </div>

                        {status === 'done' && (
                            <div className="flex justify-center pt-4">
                                <button onClick={onClose} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center gap-2">
                                    <CheckCircle2 size={18} /> Concluir
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};