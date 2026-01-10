import React, { useState, useEffect, useRef, memo } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Type, Schema } from '@google/genai';
import { Heart, Share2, Bookmark, Bot, Sparkles, Upload, FileText, X, Layers, CheckCircle2, XCircle, HelpCircle, Play, FileSearch, AlertTriangle, Paperclip, Loader2, StopCircle, Zap, HardDrive, Cpu, Wifi } from 'lucide-react';
import { Weight } from '../types';
import { get, set } from 'idb-keyval';
// @ts-ignore
import * as pdfjsLibProxy from 'pdfjs-dist';

// --- PDF.js Configuration (Fixed) ---
// Handle ESM default export structure (pdfjsLib vs pdfjsLib.default)
const pdfjsLib = (pdfjsLibProxy as any).default || pdfjsLibProxy;

try {
    if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        // Use UNPKG for exact version matching and better CORS handling
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }
} catch (e) {
    console.error("PDF Worker init failed", e);
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
    content: string; // Used for non-quiz posts
    quiz?: QuizData; // Used for quiz posts
    headline: string;
    likes: number;
    isLiked: boolean;
    isSaved: boolean;
    timestamp: string;
    isFileContext?: boolean; // New flag to identify file-based posts
}

type FeedMode = 'general' | 'custom';

// --- SUB-COMPONENT: QUIZ CARD (Active Recall) ---
const QuizCard = memo(({ post, onInteraction }: { post: FeedPost, onInteraction: () => void }) => {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);

    if (!post.quiz) return null;

    const handleSelect = (index: number) => {
        if (isRevealed) return;
        setSelectedOption(index);
        setIsRevealed(true);
        onInteraction(); // Trigger any analytics or parent updates
    };

    return (
        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 mt-2">
            <h3 className="text-white font-bold text-lg mb-4 flex items-start gap-2">
                <HelpCircle className="text-purple-400 shrink-0 mt-1" size={20} />
                {post.quiz.question}
            </h3>
            
            <div className="space-y-2.5">
                {post.quiz.options.map((option, idx) => {
                    let btnClass = "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800";
                    let icon = <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex items-center justify-center text-[10px] font-bold">{["A","B","C","D"][idx]}</div>;

                    if (isRevealed) {
                        if (idx === post.quiz!.correctIndex) {
                            btnClass = "bg-emerald-900/30 border-emerald-500 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.2)]";
                            icon = <CheckCircle2 size={20} className="text-emerald-500" />;
                        } else if (idx === selectedOption) {
                            btnClass = "bg-red-900/30 border-red-500 text-red-100";
                            icon = <XCircle size={20} className="text-red-500" />;
                        } else {
                            btnClass = "bg-slate-900/50 border-slate-800 text-slate-500 opacity-50";
                        }
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleSelect(idx)}
                            disabled={isRevealed}
                            className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${btnClass}`}
                        >
                            {icon}
                            <span className="flex-1 text-sm font-medium">{option}</span>
                        </button>
                    );
                })}
            </div>

            {isRevealed && (
                <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Explicação</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{post.quiz.explanation}</p>
                </div>
            )}
        </div>
    );
});

// --- SUB-COMPONENT: FEED POST ITEM (Memoized for Performance) ---
const FeedPostItem = memo(({ post, toggleLike, toggleSave }: { post: FeedPost, toggleLike: (id: string) => void, toggleSave: (id: string) => void }) => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
            
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg shrink-0 ${post.type === 'quiz' ? 'bg-purple-600' : 'bg-gradient-to-tr from-emerald-500 to-cyan-500'}`}>
                        {post.type === 'quiz' ? <HelpCircle size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white flex items-center gap-1 truncate">
                            Atena AI <span className="text-[10px] text-slate-500 font-normal ml-1 truncate max-w-[150px]">• {post.discipline}</span>
                        </h3>
                        {/* Topic Display - Explicit if File */}
                        <p className="text-[10px] text-emerald-400 font-medium truncate flex items-center gap-1">
                            {post.isFileContext && <Paperclip size={10} />}
                            {post.topic}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {post.type === 'quiz' && <span className="text-[9px] bg-purple-900/30 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Quiz</span>}
                </div>
            </div>

            {/* Content */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 flex flex-col justify-center relative group">
                <div className="mb-2 relative z-10">
                    <h2 className="text-lg md:text-xl font-bold text-white leading-tight mb-2 font-sans tracking-tight">
                        {post.headline}
                    </h2>
                </div>

                {post.type === 'quiz' ? (
                    <QuizCard post={post} onInteraction={() => {}} />
                ) : (
                    <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                    </div>
                )}
            </div>

            {/* Action Bar */}
            <div className="p-4 flex items-center justify-between bg-slate-900 border-t border-slate-800/50">
                <div className="flex items-center gap-4">
                    <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5 group">
                        <Heart size={20} className={`transition-all ${post.isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400 group-hover:text-white'}`} />
                        <span className="text-xs font-bold text-slate-400">{post.likes}</span>
                    </button>
                    <button className="text-slate-400 hover:text-white transition-colors"><Share2 size={20} /></button>
                </div>
                <button onClick={() => toggleSave(post.id)}>
                    <Bookmark size={20} className={`transition-all ${post.isSaved ? 'fill-emerald-500 text-emerald-500' : 'text-slate-400 hover:text-white'}`} />
                </button>
            </div>
        </div>
    );
});

export const StudyFeed: React.FC = () => {
    const { notebooks } = useStore();
    const [mode, setMode] = useState<FeedMode>('general');
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState<'idle' | 'extracting' | 'uploading' | 'thinking'>('idle');
    const [loadingText, setLoadingText] = useState('Processando...');
    const [hasStarted, setHasStarted] = useState(false); 
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const observerTarget = useRef(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Custom Feed State
    const [customFile, setCustomFile] = useState<{ name: string, data: string, mimeType: string, size: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- SANITIZATION HELPER ---
    const cleanText = (text: any): string => {
        if (!text) return "";
        if (typeof text !== 'string') return String(text);
        return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
    };

    // --- JSON CLEANER HELPER (REVISED FOR ROBUSTNESS) ---
    const cleanJsonString = (text: string) => {
        if (!text) return '[]';
        
        // Find the outer most JSON array or object
        const firstBracket = text.indexOf('[');
        const firstBrace = text.indexOf('{');
        
        let startIndex = 0;
        let endIndex = text.length;

        // Try to find [ ... ] or { ... }
        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            startIndex = firstBracket;
            endIndex = text.lastIndexOf(']') + 1;
        } else if (firstBrace !== -1) {
            startIndex = firstBrace;
            endIndex = text.lastIndexOf('}') + 1;
        } else {
            return '[]'; // No JSON structure found
        }

        let candidate = text.substring(startIndex, endIndex);
        
        // Common repair: remove markdown markers if stuck
        candidate = candidate.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '');
        
        // Common repair: missing comma between objects `}{` -> `},{`
        candidate = candidate.replace(/}\s*{/g, '},{');

        return candidate.trim();
    };

    // --- PRIORITY SCORE HELPER ---
    const getWeightScore = (w: Weight) => {
        switch(w) {
            case Weight.MUITO_ALTO: return 4;
            case Weight.ALTO: return 3;
            case Weight.MEDIO: return 2;
            case Weight.BAIXO: return 1;
            default: return 1;
        }
    };

    // --- PDF TEXT EXTRACTION (ROBUST FALLBACK) ---
    const extractTextFromPDF = async (base64Data: string): Promise<string> => {
        try {
            if (!pdfjsLib) throw new Error("PDF Library not loaded");
            
            // Convert Base64 to binary manually to ensure compatibility
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Define extraction logic reusable for both attempts
            const runExtraction = async (params: any) => {
                const loadingTask = pdfjsLib.getDocument(params);
                const pdf = await loadingTask.promise;
                let fullText = '';
                const maxPages = Math.min(pdf.numPages, 15); // Limit pages for speed
                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                return fullText;
            };

            // Attempt 1: Standard Load (May fail if Worker CORS issue)
            try {
                return await runExtraction({ data: bytes });
            } catch (workerError) {
                console.warn("Worker extraction failed, trying main thread fallback...", workerError);
                // Attempt 2: Disable Worker (Forces main thread execution, slower UI but works)
                return await runExtraction({ data: bytes, disableWorker: true });
            }

        } catch (error) {
            console.error("PDF Extraction Failed Completely", error);
            throw new Error("Falha ao ler texto do PDF.");
        }
    };

    // --- FILE HANDLING ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // VALIDAÇÃO DE TAMANHO (30MB)
        if (file.size > 30 * 1024 * 1024) {
            setErrorMsg("O arquivo excede o limite máximo de 30MB.");
            return;
        }

        setLoading(false);
        setPosts([]);
        setHasStarted(false);
        setErrorMsg(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            
            setCustomFile({
                name: file.name,
                data: base64Data,
                mimeType: file.type,
                size: file.size
            });
        };
        reader.readAsDataURL(file);
    };

    const cancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setLoadingStage('idle');
        setLoadingText('Cancelado');
        setTimeout(() => setLoadingText(''), 1000);
    };

    const generateFeedPosts = async () => {
        if (loading) return;
        
        if (mode === 'general' && notebooks.length === 0) return;
        if (mode === 'custom' && !customFile) return;

        // Cancel previous if any
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setHasStarted(true);
        setErrorMsg(null);

        try {
            // CHECK CACHE FOR CUSTOM FILE (Simulated Local Storage Optimization)
            let cachedPosts: FeedPost[] | undefined;
            if (mode === 'custom' && customFile) {
                const fileHash = `feed_cache_${customFile.name}_${customFile.size}`;
                cachedPosts = await get(fileHash);
                if (cachedPosts && cachedPosts.length > 0) {
                    setPosts(cachedPosts);
                    setLoading(false);
                    return; // EXIT EARLY IF CACHED
                }
            }

            const ai = createAIClient();
            let prompt = '';
            let contentsPayload: any = '';
            let systemInstruction = '';

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
                                type: { type: Type.STRING },
                                headline: { type: Type.STRING },
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
                            },
                            required: ["headline", "content", "type"]
                        }
                    }
                }
            };

            const commonInstructions = `
                OUTPUT MUST BE VALID JSON. No text before or after.
                Format: { "items": [ ... ] }
            `;

            if (mode === 'general') {
                const rankedNotebooks = [...notebooks].sort((a, b) => {
                    const scoreA = getWeightScore(a.weight) * (100 - a.accuracy);
                    const scoreB = getWeightScore(b.weight) * (100 - b.accuracy);
                    return scoreB - scoreA;
                });

                const selected = rankedNotebooks.slice(0, 3).map(n => ({
                    id: n.id,
                    discipline: n.discipline,
                    topic: n.name,
                    context: n.notes ? n.notes.substring(0, 50) : '' 
                }));

                systemInstruction = "You are a specialized Tutor AI. Generate strictly valid JSON.";
                prompt = `Topics: ${JSON.stringify(selected)}. ${commonInstructions} Create 3 flashcards. Include 1 quiz.`;
                contentsPayload = prompt;
                
                setLoadingStage('thinking');
                setLoadingText('Gerando Conhecimento (Modo Texto - Rápido)...');

            } else {
                // OPTIMIZED PDF HANDLING FOR SPEED
                let textContext = '';
                let useTextExtraction = false;

                if (customFile!.mimeType === 'application/pdf') {
                    setLoadingStage('extracting');
                    setLoadingText('Otimizando: Extraindo texto localmente...');
                    try {
                        const extracted = await extractTextFromPDF(customFile!.data);
                        if (extracted && extracted.length > 50) {
                            textContext = extracted;
                            useTextExtraction = true;
                        }
                    } catch (err) {
                        console.warn("PDF Extraction failed, falling back to Vision", err);
                    }
                }

                systemInstruction = `
                    ROLE: High-Speed Data Extractor.
                    OBJECTIVE: Quickly identify key concepts.
                    CONSTRAINT: Return strictly valid JSON.
                `;
                
                prompt = `
                    TASK: FAST EXTRACTION.
                    1. Scan the document for 3 KEY CONCEPTS.
                    2. Generate 3 distinct flashcards/questions.
                    3. Keep content concise.
                    ${commonInstructions}
                `;
                
                if (useTextExtraction) {
                    // Send TEXT payload (Fast Upload)
                    setLoadingStage('thinking');
                    setLoadingText('IA Analisando Texto Extraído (Alta Velocidade)...');
                    contentsPayload = [
                        { text: prompt },
                        { text: `DOCUMENT TEXT:\n${textContext.substring(0, 30000)}` } // Limit context window
                    ];
                } else {
                    // Send BINARY payload (Slow Upload)
                    setLoadingStage('uploading');
                    setLoadingText('PDF Digitalizado (Imagem) detectado. Enviando arquivo completo...');
                    contentsPayload = {
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: customFile!.mimeType, data: customFile!.data } }
                        ]
                    };
                }
            }

            // INCREASED TIMEOUT TO 300s (5 Minutes)
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Tempo limite excedido (5 min). A conexão ou o upload demorou muito.")), 300000)
            );

            const aiCall = ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: contentsPayload,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                    systemInstruction: systemInstruction,
                    temperature: mode === 'custom' ? 0.1 : 0.7, // Lower temp for faster/direct answers
                    topK: mode === 'custom' ? 10 : 40, // Reduce search space for speed
                }
            });

            const response: any = await Promise.race([aiCall, timeoutPromise]);

            setLoadingStage('idle');
            const rawText = cleanJsonString(response.text || '{}');
            let parsedResponse: any = {};
            let newItems: any[] = [];

            try {
                parsedResponse = JSON.parse(rawText);
                if (Array.isArray(parsedResponse)) {
                    newItems = parsedResponse;
                } else if (parsedResponse.items) {
                    newItems = parsedResponse.items;
                }
            } catch (e) {
                console.error("JSON Parse Error:", e, "\nRaw Text:", rawText);
                throw new Error("Erro na formatação da resposta da IA. Tente novamente.");
            }
            
            const newPosts: FeedPost[] = newItems
                .map((p: any) => {
                    const nb = notebooks.find(n => n.id === p.notebookId);
                    const safeHeadline = cleanText(p.headline) || "Insight de Estudo";
                    
                    if (p.type === 'quiz') {
                        if (!p.quiz || !p.quiz.options || p.quiz.options.length < 2) return null;
                    } else {
                        if (!p.content || p.content.length < 5) return null;
                    }

                    let displayDiscipline = "Geral";
                    let displayTopic = "";

                    if (mode === 'custom') {
                        displayDiscipline = (p.discipline && p.discipline.length > 2) ? p.discipline : "Arquivo Analisado";
                        displayTopic = p.topic || customFile?.name || "Análise Documental";
                    } else {
                        displayDiscipline = nb?.discipline || p.discipline || "Geral";
                        displayTopic = nb?.name || safeHeadline;
                    }

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        notebookId: p.notebookId || 'temp',
                        discipline: displayDiscipline,
                        topic: displayTopic,
                        headline: safeHeadline,
                        type: p.type || 'concept',
                        content: cleanText(p.content),
                        quiz: p.quiz,
                        likes: Math.floor(Math.random() * 50) + 10,
                        isLiked: false,
                        isSaved: false,
                        timestamp: 'Agora mesmo',
                        isFileContext: mode === 'custom'
                    };
                })
                .filter((p: any) => p !== null);

            if (newPosts.length === 0) {
                throw new Error("A IA não conseguiu extrair conteúdo relevante.");
            }

            setPosts(prev => [...prev, ...newPosts]);

            // CACHE RESULT (LOCAL STORAGE OPTIMIZATION)
            if (mode === 'custom' && customFile) {
                const fileHash = `feed_cache_${customFile.name}_${customFile.size}`;
                await set(fileHash, newPosts);
            }

        } catch (error: any) {
            console.error("Erro feed:", error);
            setLoadingStage('idle');
            if (!controller.signal.aborted) {
                setErrorMsg(error.message || "Erro ao processar conteúdo.");
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    };

    // Reset on Mode Change
    useEffect(() => {
        setPosts([]);
        setHasStarted(false);
        setErrorMsg(null);
        setLoadingStage('idle');
        if (abortControllerRef.current) abortControllerRef.current.abort();
    }, [mode]);

    // Infinite Scroll (Active ONLY after start)
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && !errorMsg && hasStarted) {
                    generateFeedPosts();
                }
            },
            { threshold: 1.0 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
    }, [observerTarget, loading, mode, posts.length, hasStarted, errorMsg]);

    const toggleLike = React.useCallback((id: string) => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p));
    }, []);

    const toggleSave = React.useCallback((id: string) => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, isSaved: !p.isSaved } : p));
    }, []);

    const getStatusIcon = () => {
        switch (loadingStage) {
            case 'extracting': return <FileText className="text-emerald-500 animate-pulse" size={32} />;
            case 'uploading': return <Wifi className="text-amber-500 animate-pulse" size={32} />;
            case 'thinking': return <Cpu className="text-purple-500 animate-pulse" size={32} />;
            default: return <Loader2 className="text-emerald-500 animate-spin" size={32} />;
        }
    };

    return (
        <div className="h-full flex flex-col items-center bg-slate-950 overflow-y-auto custom-scrollbar pt-6 pb-20">
            <div className="w-full max-w-md space-y-6 px-4">
                
                {/* Header & Tabs */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="text-emerald-500" /> Feed de Estudo
                        </h1>
                        <span className="text-[10px] text-emerald-600 font-mono border border-emerald-900/30 px-2 py-1 rounded bg-emerald-900/10">v3.5 (Upload Feedback)</span>
                    </div>

                    <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex">
                        <button onClick={() => setMode('general')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'general' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'}`}>
                            <Layers size={14} /> Geral
                        </button>
                        <button onClick={() => setMode('custom')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'custom' ? 'bg-slate-800 text-emerald-400 shadow' : 'text-slate-500 hover:text-emerald-400'}`}>
                            <Upload size={14} /> Arquivo
                        </button>
                    </div>
                </div>

                {/* GENERAL EMPTY STATE (MANUAL TRIGGER) */}
                {mode === 'general' && notebooks.length > 0 && !hasStarted && (
                    <div className="flex flex-col items-center justify-center py-10 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 border-dashed animate-in fade-in zoom-in">
                        <Bot size={48} className="text-slate-700 mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Feed de Revisão Inteligente</h3>
                        <p className="text-slate-400 text-xs text-center max-w-xs mb-6 leading-relaxed">
                            A IA analisará seus cadernos para criar flashcards e quizzes personalizados, focando nas suas dificuldades atuais.
                        </p>
                        <button 
                            onClick={generateFeedPosts} 
                            disabled={loading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                        >
                            <Sparkles size={18} fill="currentColor" /> Gerar Feed Agora
                        </button>
                    </div>
                )}

                {/* GENERAL EMPTY (NO NOTEBOOKS) */}
                {mode === 'general' && notebooks.length === 0 && (
                    <div className="text-center py-10 bg-slate-900 rounded-2xl border border-slate-800 p-6">
                        <p className="text-slate-400">Adicione cadernos ao seu banco para começar.</p>
                    </div>
                )}

                {/* ERROR MESSAGE */}
                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                            <h3 className="text-red-400 font-bold text-sm">Erro de Processamento</h3>
                            <p className="text-red-300/80 text-xs mt-1">{errorMsg}</p>
                            <button onClick={() => { setErrorMsg(null); generateFeedPosts(); }} className="mt-2 text-xs font-bold text-red-400 hover:text-white underline">Tentar Novamente</button>
                        </div>
                    </div>
                )}

                {/* CUSTOM INPUT AREA (FILE ONLY) */}
                {mode === 'custom' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 space-y-4">
                        
                        {!customFile ? (
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center">
                                <Upload size={24} className="text-slate-500 mb-2"/>
                                <p className="text-xs text-slate-400">PDF ou Imagem (Máx 30MB)</p>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf, .txt, image/*" onChange={handleFileUpload} />
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileSearch size={16} className="text-emerald-500 flex-shrink-0" />
                                    <span className="text-xs text-slate-300 truncate max-w-[180px]">{customFile.name}</span>
                                </div>
                                <button onClick={() => { setCustomFile(null); setPosts([]); setHasStarted(false); setErrorMsg(null); }}><X size={14} className="text-slate-500 hover:text-white"/></button>
                            </div>
                        )}

                        {/* EXPLICIT ACTION BUTTON FOR CUSTOM FEED */}
                        {customFile && (!hasStarted || posts.length === 0) && !loading && (
                            <div className="animate-in fade-in zoom-in">
                                {customFile.size > 5 * 1024 * 1024 && (
                                    <div className="flex items-center gap-2 justify-center mb-3 bg-amber-500/10 text-amber-400 p-2 rounded text-[10px] border border-amber-500/20">
                                        <Zap size={12} /> Arquivo grande. Modo Turbo ativado.
                                    </div>
                                )}
                                <div className="flex items-center justify-center gap-2 mb-3">
                                    <HardDrive size={12} className="text-slate-500" />
                                    <span className="text-[9px] text-slate-500">Cache local ativado para este arquivo.</span>
                                </div>
                                <p className="text-[10px] text-center text-slate-500 mb-2">Arquivo carregado. Clique para extrair conteúdo.</p>
                                <button onClick={generateFeedPosts} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                                    <Play size={16} fill="currentColor" /> Analisar & Gerar Feed
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* POSTS LIST (MEMOIZED) */}
                {posts.map((post) => (
                    <FeedPostItem 
                        key={post.id} 
                        post={post} 
                        toggleLike={toggleLike} 
                        toggleSave={toggleSave} 
                    />
                ))}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-4 bg-slate-900/30 rounded-xl border border-slate-800/50 backdrop-blur-sm animate-in fade-in zoom-in">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
                            <div className="relative bg-slate-900 p-4 rounded-full border border-slate-700 shadow-xl">
                                {getStatusIcon()}
                            </div>
                        </div>
                        
                        <div className="text-center px-4">
                            <p className="text-xs font-bold text-white mb-1 animate-pulse">
                                {loadingText}
                            </p>
                            {loadingStage === 'uploading' && (
                                <p className="text-[10px] text-amber-400">
                                    Enviando arquivo bruto... Isso depende da sua internet.
                                </p>
                            )}
                            {loadingStage === 'extracting' && (
                                <p className="text-[10px] text-emerald-400">
                                    Lendo PDF no navegador para economizar dados...
                                </p>
                            )}
                        </div>

                        <button 
                            onClick={cancelGeneration}
                            className="mt-2 flex items-center gap-2 text-[10px] text-red-400 hover:text-red-300 bg-red-900/20 px-4 py-2 rounded-full border border-red-500/20 transition-all hover:bg-red-900/30"
                        >
                            <StopCircle size={12} /> Cancelar Operação
                        </button>
                    </div>
                )}

                <div ref={observerTarget} className="h-10"></div>
            </div>
        </div>
    );
};