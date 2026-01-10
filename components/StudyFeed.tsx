import React, { useState, useEffect, useRef, memo } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Heart, Share2, Bookmark, Bot, Sparkles, Upload, FileText, X, Layers, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { Weight } from '../types';

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

export const StudyFeed: React.FC = () => {
    const { notebooks } = useStore();
    const [mode, setMode] = useState<FeedMode>('general');
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasStarted, setHasStarted] = useState(false); 
    const observerTarget = useRef(null);

    // Custom Feed State
    const [customFile, setCustomFile] = useState<{ name: string, data: string, mimeType: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- SANITIZATION HELPER ---
    const cleanText = (text: any): string => {
        if (!text) return "";
        if (typeof text !== 'string') return String(text);
        return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
    };

    // --- JSON CLEANER HELPER ---
    const cleanJsonString = (text: string) => {
        if (!text) return '[]';
        let cleaned = text.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
        return cleaned.trim();
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

    // --- FILE HANDLING ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            
            setCustomFile({
                name: file.name,
                data: base64Data,
                mimeType: file.type
            });
            setPosts([]); 
            setHasStarted(false); 
        };
        reader.readAsDataURL(file);
    };

    const generateFeedPosts = async () => {
        if (loading) return;
        
        // Validations
        if (mode === 'general' && notebooks.length === 0) return;
        if (mode === 'custom' && !customFile) return;

        setLoading(true);
        setHasStarted(true);

        try {
            const ai = createAIClient();
            let prompt = '';
            let contentsPayload: any = '';

            const commonJsonStructure = `
                Estrutura JSON Obrigatória:
                {
                    "items": [
                        {
                            "notebookId": "uuid-placeholder",
                            "discipline": "Disciplina Técnica",
                            "type": "quiz",
                            "headline": "Título do Card",
                            "content": "...",
                            "quiz": {
                                "question": "...",
                                "options": ["A", "B", "C", "D"],
                                "correctIndex": 0,
                                "explanation": "..."
                            }
                        }
                    ]
                }
            `;

            if (mode === 'general') {
                // --- MODO GERAL: USA CADERNOS DO USUÁRIO ---
                const rankedNotebooks = [...notebooks].sort((a, b) => {
                    const scoreA = getWeightScore(a.weight) * (100 - a.accuracy);
                    const scoreB = getWeightScore(b.weight) * (100 - b.accuracy);
                    return scoreB - scoreA;
                });

                const selected = rankedNotebooks.slice(0, 4).map(n => ({
                    id: n.id,
                    discipline: n.discipline,
                    topic: n.name,
                    context: n.notes ? n.notes.substring(0, 100) : ''
                }));

                prompt = `
                    Atue como Criador de Conteúdo Educacional.
                    Baseado nas dificuldades do aluno: ${JSON.stringify(selected)}.
                    ${commonJsonStructure}
                    Gere 4 items. Pelo menos 1 DEVE ser do tipo 'quiz'.
                `;
                contentsPayload = prompt;

            } else {
                // --- MODO CUSTOMIZADO (ARQUIVO) ---
                prompt = `
                    Analise o documento anexo. Extraia os pontos mais complexos.
                    Identifique a disciplina principal do documento.
                    ${commonJsonStructure}
                    Gere 4 items focados EXCLUSIVAMENTE no conteúdo deste arquivo.
                `;
                contentsPayload = {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: customFile!.mimeType, data: customFile!.data } }
                    ]
                };
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: contentsPayload,
                config: {
                    responseMimeType: 'application/json'
                }
            });

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
                console.error("JSON Parse Error:", e);
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

                    // No modo Custom, "discipline" vem da IA ou nome do arquivo
                    let displayDiscipline = "Geral";
                    if (mode === 'custom') {
                        displayDiscipline = p.discipline || customFile?.name || 'Arquivo';
                    } else {
                        displayDiscipline = nb?.discipline || p.discipline || "Geral";
                    }

                    const topicDisplay = (mode === 'custom') 
                        ? (p.discipline ? "Análise de Documento" : customFile?.name || "Arquivo Externo")
                        : nb?.name || safeHeadline;

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        notebookId: p.notebookId || 'temp',
                        discipline: displayDiscipline,
                        topic: topicDisplay,
                        headline: safeHeadline,
                        type: p.type || 'concept',
                        content: cleanText(p.content),
                        quiz: p.quiz,
                        likes: Math.floor(Math.random() * 50) + 10,
                        isLiked: false,
                        isSaved: false,
                        timestamp: 'Agora mesmo'
                    };
                })
                .filter((p: any) => p !== null);

            setPosts(prev => [...prev, ...newPosts]);

        } catch (error) {
            console.error("Erro feed:", error);
            alert("Erro ao gerar. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    // Reset on Mode Change
    useEffect(() => {
        setPosts([]);
        setHasStarted(false);
        if (mode === 'general' && notebooks.length > 0) {
            generateFeedPosts();
        }
    }, [mode]);

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading) {
                    if (mode === 'general') {
                        generateFeedPosts();
                    } else if (mode === 'custom' && hasStarted && posts.length > 0) {
                        generateFeedPosts();
                    }
                }
            },
            { threshold: 1.0 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
    }, [observerTarget, loading, mode, posts.length, hasStarted]);

    const toggleLike = (id: string) => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p));
    };

    const toggleSave = (id: string) => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, isSaved: !p.isSaved } : p));
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
                        <span className="text-[10px] text-emerald-600 font-mono border border-emerald-900/30 px-2 py-1 rounded bg-emerald-900/10">v2.1</span>
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

                {/* GENERAL EMPTY */}
                {mode === 'general' && notebooks.length === 0 && (
                    <div className="text-center py-10 bg-slate-900 rounded-2xl border border-slate-800 p-6">
                        <p className="text-slate-400">Adicione cadernos ao seu banco para começar.</p>
                    </div>
                )}

                {/* CUSTOM INPUT AREA (FILE ONLY) */}
                {mode === 'custom' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 space-y-4">
                        
                        {!customFile ? (
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center">
                                <Upload size={24} className="text-slate-500 mb-2"/>
                                <p className="text-xs text-slate-400">PDF ou Imagem (Máx 5MB)</p>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf, .txt, image/*" onChange={handleFileUpload} />
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-xs text-slate-300 truncate max-w-[200px]">{customFile.name}</span>
                                <button onClick={() => { setCustomFile(null); setPosts([]); setHasStarted(false); }}><X size={14} className="text-slate-500 hover:text-white"/></button>
                            </div>
                        )}

                        {/* SHOW BUTTON */}
                        {customFile && (!hasStarted || posts.length === 0) && !loading && (
                            <button onClick={generateFeedPosts} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 animate-in fade-in zoom-in">
                                <Sparkles size={16} /> Gerar Feed Inteligente
                            </button>
                        )}
                    </div>
                )}

                {/* POSTS LIST */}
                {posts.map((post) => (
                    <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
                        
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
                                    {/* Topic Display */}
                                    <p className="text-[10px] text-emerald-400 font-medium truncate">{post.topic}</p>
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
                ))}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-slate-500 animate-pulse text-center">
                            Gerando conteúdo...
                        </p>
                    </div>
                )}

                <div ref={observerTarget} className="h-10"></div>
            </div>
        </div>
    );
};