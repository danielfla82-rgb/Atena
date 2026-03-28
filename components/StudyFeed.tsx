import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Type, Schema } from '@google/genai';
import { Heart, Share2, Bookmark, Bot, Sparkles, Upload, FileText, X, Layers, CheckCircle2, XCircle, HelpCircle, Play, FileSearch, AlertTriangle, Paperclip, Loader2, StopCircle, Zap, HardDrive, Cpu, Wifi, Filter, Book, RefreshCw, History, ArrowRight } from 'lucide-react';
import { Weight } from '../types';
import { get, set } from 'idb-keyval';
// @ts-expect-error - no types available
import * as pdfjsLibProxy from 'pdfjs-dist';

// --- PDF.js Configuration ---
const pdfjsLib = (pdfjsLibProxy as any).default || pdfjsLibProxy;
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// --- TYPES ---
interface QuizData {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

interface FeedPost {
    id: string;
    notebookId: string;
    discipline: string;
    topic: string;
    type: 'concept' | 'mnemonic' | 'trivia' | 'connection' | 'quiz';
    content: string;
    quiz?: QuizData;
    headline: string;
    likes: number;
    isLiked: boolean;
    isSaved: boolean;
    timestamp: string;
    isFileContext?: boolean;
}

type FeedMode = 'general' | 'custom';

// --- SUB-COMPONENT: QUIZ CARD ---
const QuizCard = memo(({ post }: { post: FeedPost }) => {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);

    if (!post.quiz) return null;

    return (
        <div className="bg-slate-100 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-300 dark:border-slate-700/50 mt-2">
            <h3 className="text-slate-900 dark:text-white font-bold text-base mb-4 flex items-start gap-2">
                <HelpCircle className="text-purple-400 shrink-0 mt-1" size={20} />
                {post.quiz.question}
            </h3>
            
            <div className="space-y-2">
                {post.quiz.options.map((option, idx) => {
                    let btnClass = "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800";
                    if (isRevealed) {
                        if (idx === post.quiz!.correctIndex) btnClass = "bg-green-900/30 border-green-500 text-green-100 shadow-[0_0_10px_rgba(16,185,129,0.2)]";
                        else if (idx === selectedOption) btnClass = "bg-red-900/30 border-red-500 text-red-100";
                        else btnClass = "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500 opacity-50";
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => { if(!isRevealed) { setSelectedOption(idx); setIsRevealed(true); } }}
                            className={`w-full p-3 rounded-lg border text-left transition-all text-xs font-medium flex items-center gap-3 ${btnClass}`}
                        >
                            <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0">{["A","B","C","D"][idx]}</div>
                            {option}
                        </button>
                    );
                })}
            </div>
            {isRevealed && (
                <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
                    {post.quiz.explanation}
                </div>
            )}
        </div>
    );
});

// --- SUB-COMPONENT: FEED POST ITEM ---
const FeedPostItem = memo(({ post, toggleLike, toggleSave }: { post: FeedPost, toggleLike: (id: string) => void, toggleSave: (id: string) => void }) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${post.type === 'quiz' ? 'bg-purple-600' : 'bg-green-600'}`}>
                        {post.type === 'quiz' ? <HelpCircle size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">{post.discipline}</h3>
                        <p className="text-[10px] text-green-400 font-medium truncate flex items-center gap-1">
                            {post.isFileContext && <Paperclip size={12} />}
                            {post.topic}
                        </p>
                    </div>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">{post.timestamp}</div>
            </div>

            <div className="p-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-3 tracking-tight">{post.headline}</h2>
                {post.type === 'quiz' ? (
                    <QuizCard post={post} />
                ) : (
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</div>
                )}
            </div>

            <div className="p-3 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800/50">
                <div className="flex items-center gap-4">
                    <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1 group">
                        <Heart size={20} className={`${post.isLiked ? 'fill-red-500 text-red-500' : 'text-slate-500 group-hover:text-slate-900 dark:text-white'}`} />
                        <span className="text-[10px] font-bold text-slate-500">{post.likes}</span>
                    </button>
                    <button className="text-slate-500 hover:text-slate-900 dark:text-white transition-colors"><Share2 size={20} /></button>
                </div>
                <button onClick={() => toggleSave(post.id)}>
                    <Bookmark size={20} className={`${post.isSaved ? 'fill-green-500 text-green-500' : 'text-slate-500 group-hover:text-slate-900 dark:text-white'}`} />
                </button>
            </div>
        </div>
    );
});

export const StudyFeed: React.FC = () => {
    const { notebooks } = useStore();
    const [mode, setMode] = useState<FeedMode>('general');
    const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [hasStarted, setHasStarted] = useState(false); 
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [extractedTextCache, setExtractedTextCache] = useState<string | null>(null);
    const [textCursor, setTextCursor] = useState(0); // Cursor for chunking
    
    // Rastreador de tópicos para evitar repetição
    const displayedTopicsRef = useRef<Set<string>>(new Set());
    
    const observerTarget = useRef(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [customFile, setCustomFile] = useState<{ name: string, data: string, mimeType: string } | null>(null);

    // Helpers
    const disciplinesList = useMemo(() => Array.from(new Set(notebooks.map(n => n.discipline))).sort(), [notebooks]);

    const cleanJsonString = (text: string) => {
        try {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}') + 1;
            if (start === -1 || end === -1) return '{}';
            return text.substring(start, end).trim();
        } catch { return '{}'; }
    };

    const extractTextFromPDF = async (base64Data: string): Promise<string> => {
        if (extractedTextCache) return extractedTextCache;
        try {
            const bytes = new Uint8Array(window.atob(base64Data).split("").map(c => c.charCodeAt(0)));
            const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
            let fullText = '';
            // Increased page limit for larger docs, but we still cache it
            const maxPages = Math.min(pdf.numPages, 50); 
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
                // Safety break if too massive for initial load
                if (fullText.length > 500000) break; 
            }
            setExtractedTextCache(fullText);
            return fullText;
        } catch (e) { return ""; }
    };

    const generateFeedPosts = async (isInitial = false) => {
        if (loading) return;
        if (mode === 'general' && notebooks.length === 0) return;
        if (mode === 'custom' && !customFile) return;

        setLoading(true);
        setHasStarted(true);
        setErrorMsg(null);
        setLoadingText(isInitial ? 'Iniciando Feed...' : 'Carregando mais...');

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const ai = createAIClient();
            let contentsPayload: any = '';
            
            const responseSchema: Schema = {
                type: Type.OBJECT,
                properties: {
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                notebookId: { type: Type.STRING },
                                discipline: { type: Type.STRING },
                                topic: { type: Type.STRING },
                                headline: { type: Type.STRING },
                                type: { type: Type.STRING },
                                content: { type: Type.STRING },
                                quiz: {
                                    type: Type.OBJECT,
                                    properties: {
                                        question: { type: Type.STRING },
                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        correctIndex: { type: Type.INTEGER },
                                        explanation: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const promptBase = `
                MISSÃO: Gerar exatamente 4 itens de estudo (3 insights baseados em anotações + 1 quiz desafiador).
                REGRAS CRÍTICAS: 
                - NUNCA repita temas ou conteúdos já abordados: [${Array.from(displayedTopicsRef.current).join(', ')}].
                - Seja específico: use as anotações do usuário como fonte primária de verdade.
                - Idioma: Português Brasileiro.
                - Formato: Retorne APENAS o JSON { "items": [...] }.
            `;

            if (mode === 'general') {
                const available = selectedDiscipline ? notebooks.filter(n => n.discipline === selectedDiscipline) : notebooks;
                
                // Filtrar cadernos que ainda não foram exibidos para garantir variedade
                let candidates = available.filter(n => !displayedTopicsRef.current.has(n.name));
                if (candidates.length === 0) candidates = available; // Reset se tudo já foi visto

                // Pegar cadernos aleatórios com suas anotações reais
                const context = candidates
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 4)
                    .map(n => ({ 
                        id: n.id,
                        topic: n.name, 
                        discipline: n.discipline, 
                        notes: n.notes?.substring(0, 1000) || "Sem anotações específicas."
                    }));

                contentsPayload = `${promptBase} 
                REFERÊNCIA DO ALUNO (USE ESTE CONTEÚDO): ${JSON.stringify(context)}`;
                
            } else {
                let text = '';
                
                if (customFile!.mimeType === 'application/pdf') {
                    setLoadingText('Extraindo PDF...');
                    text = await extractTextFromPDF(customFile!.data);
                } else if (customFile!.mimeType === 'text/plain') {
                    // NEW: TEXT FILE HANDLING
                    setLoadingText('Lendo arquivo de texto...');
                    try {
                        const binaryString = window.atob(customFile!.data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        text = new TextDecoder().decode(bytes);
                        // Update cache to prevent re-decoding
                        setExtractedTextCache(text);
                    } catch (e) {
                        console.error("Erro ao decodificar TXT", e);
                        throw new Error("Formato de texto inválido.");
                    }
                }

                if (text.length > 200) {
                    // CHUNKING LOGIC
                    const CHUNK_SIZE = 30000;
                    // If isInitial, reset cursor. Else use existing cursor.
                    const currentCursor = isInitial ? 0 : textCursor;
                    const nextCursor = currentCursor + CHUNK_SIZE;
                    
                    const chunk = text.substring(currentCursor, nextCursor);
                    const blockNumber = Math.floor(currentCursor / CHUNK_SIZE) + 1;
                    const totalBlocks = Math.ceil(text.length / CHUNK_SIZE);

                    if (!chunk) {
                        // End of document
                        setLoading(false);
                        return; 
                    }

                    setLoadingText(`Processando bloco ${blockNumber}/${totalBlocks}...`);
                    contentsPayload = [{ text: `${promptBase} Analise APENAS esta parte do documento (Parte ${blockNumber}): ${chunk}` }];
                    
                    // Update cursor for next run
                    setTextCursor(nextCursor >= text.length ? 0 : nextCursor); 

                } else {
                    setLoadingText('IA processando imagem (Vision)...');
                    contentsPayload = { parts: [{ text: promptBase }, { inlineData: { mimeType: customFile!.mimeType, data: customFile!.data } }] };
                }
            }

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 60000));
            
            const aiPromise = ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: contentsPayload,
                config: { 
                    responseMimeType: 'application/json', 
                    responseSchema, 
                    temperature: 0.7,
                    systemInstruction: "Você é um Tutor de Elite. Transforme o conteúdo cru em flashcards de alto impacto e quizzes."
                }
            });

            const response: any = await Promise.race([aiPromise, timeoutPromise]);
            const parsed = JSON.parse(cleanJsonString(response.text || '{}'));
            const newItems = parsed.items || [];

            if (newItems.length === 0) throw new Error("A IA não encontrou tópicos relevantes neste trecho.");

            const newPosts: FeedPost[] = newItems.map((p: any) => {
                if (p.topic) displayedTopicsRef.current.add(p.topic);
                
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    notebookId: p.notebookId || 'temp',
                    discipline: p.discipline || (mode === 'custom' ? "Arquivo" : "Estudo"),
                    topic: p.topic || "Novo Tópico",
                    headline: p.headline || "Insight Estratégico",
                    type: p.type || (p.quiz ? 'quiz' : 'concept'),
                    content: p.content || "",
                    quiz: p.quiz,
                    likes: Math.floor(Math.random() * 50) + 10,
                    isLiked: false,
                    isSaved: false,
                    timestamp: 'Agora',
                    isFileContext: mode === 'custom'
                };
            });

            setPosts(prev => [...prev, ...newPosts]);
        } catch (error: any) {
            if (!controller.signal.aborted) {
                console.error("Study Feed Error:", error);
                setErrorMsg(error.message || "Falha ao carregar o feed.");
            }
        } finally {
            setLoading(false);
            setLoadingText('');
        }
    };

    // Auto-scroll logic
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !loading && hasStarted && !errorMsg) {
                generateFeedPosts(false);
            }
        }, { threshold: 0.2 });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [loading, hasStarted, errorMsg, textCursor]); // Add textCursor dependency

    // Reset when switching modes
    useEffect(() => {
        setPosts([]);
        setHasStarted(false);
        setErrorMsg(null);
        setExtractedTextCache(null);
        setTextCursor(0);
        displayedTopicsRef.current.clear(); 
        if (abortControllerRef.current) abortControllerRef.current.abort();
    }, [mode, selectedDiscipline]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            setCustomFile({ name: file.name, data: base64, mimeType: file.type });
            setPosts([]);
            setHasStarted(false);
            setTextCursor(0);
            setExtractedTextCache(null);
            displayedTopicsRef.current.clear();
        };
        reader.readAsDataURL(file);
    };

    // Retry specific chunk
    const handleRetry = () => {
        setErrorMsg(null);
        generateFeedPosts(false);
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar pt-6 pb-24 px-4">
            <div className="max-w-md mx-auto space-y-6">
                
                {/* Mode Selector */}
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
                    <button onClick={() => setMode('general')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'general' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-900 dark:text-white'}`}>
                        <Layers size={16} /> Geral
                    </button>
                    <button onClick={() => setMode('custom')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'custom' ? 'bg-slate-100 dark:bg-slate-800 text-green-400 shadow' : 'text-slate-500 hover:text-green-400'}`}>
                        <Upload size={16} /> Arquivo
                    </button>
                </div>

                {/* Filters */}
                {mode === 'general' && disciplinesList.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                        <button onClick={() => setSelectedDiscipline(null)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all whitespace-nowrap ${!selectedDiscipline ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-900/20' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}>Todas</button>
                        {disciplinesList.map(d => (
                            <button key={d} onClick={() => setSelectedDiscipline(d)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all whitespace-nowrap ${selectedDiscipline === d ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-900/20' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}>{d}</button>
                        ))}
                    </div>
                )}

                {/* File Upload Area */}
                {mode === 'custom' && !customFile && (
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-green-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-white dark:bg-slate-900/30 group">
                        <Upload size={36} className="text-slate-600 group-hover:text-green-500 mb-2" />
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Enviar PDF, TXT ou Imagem</p>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,image/*" onChange={handleFileUpload} />
                    </div>
                )}

                {customFile && mode === 'custom' && !hasStarted && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="text-green-500 shrink-0" size={24} />
                            <span className="text-xs text-slate-600 dark:text-slate-300 truncate font-bold">{customFile.name}</span>
                        </div>
                        <button onClick={() => setCustomFile(null)} className="text-slate-500 hover:text-slate-900 dark:text-white"><X size={18}/></button>
                    </div>
                )}

                {/* Start Button */}
                {!hasStarted && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl text-center space-y-4 shadow-2xl">
                        <Bot size={52} className="mx-auto text-green-500" />
                        <h3 className="text-slate-900 dark:text-white font-bold">Tutor de Elite Pronto</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Vou cruzar suas anotações e cadernos para gerar insights exclusivos e desafios de memorização.</p>
                        <button 
                            onClick={() => generateFeedPosts(true)}
                            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-green-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Sparkles size={24} /> Iniciar Estudo Ativo
                        </button>
                    </div>
                )}

                {/* Error Box */}
                {errorMsg && (
                    <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex flex-col gap-3 animate-in fade-in">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="text-red-500" size={20} />
                            <p className="text-xs text-red-200 font-medium">{errorMsg}</p>
                        </div>
                        <button onClick={handleRetry} className="p-2 bg-red-500 text-slate-900 dark:text-white rounded-lg self-end flex items-center gap-2 text-xs font-bold px-4">
                            <RefreshCw size={16}/> Tentar Próximo Bloco
                        </button>
                    </div>
                )}

                {/* Posts List */}
                <div className="space-y-6">
                    {posts.map(post => (
                        <FeedPostItem 
                            key={post.id} 
                            post={post} 
                            toggleLike={(id) => setPosts(prev => prev.map(p => p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p))} 
                            toggleSave={(id) => setPosts(prev => prev.map(p => p.id === id ? { ...p, isSaved: !p.isSaved } : p))} 
                        />
                    ))}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-10 gap-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse"></div>
                            <Loader2 className="text-green-500 animate-spin relative" size={36} />
                        </div>
                        <div className="text-center px-6">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 animate-pulse">{loadingText}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Analisando conteúdo...</p>
                        </div>
                    </div>
                )}

                {hasStarted && !loading && !errorMsg && (
                    <div ref={observerTarget} className="h-20 flex items-center justify-center text-slate-600">
                        <ArrowRight className="animate-pulse" size={24} />
                    </div>
                )}
            </div>
        </div>
    );
};