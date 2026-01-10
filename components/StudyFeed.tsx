import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { createAIClient } from '../utils/ai';
import { Type } from "@google/genai";
import { Heart, Share2, Bookmark, MoreHorizontal, Bot, Sparkles, BookOpen, Brain, Lightbulb, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface FeedPost {
    id: string;
    notebookId: string;
    discipline: string;
    topic: string;
    type: 'concept' | 'mnemonic' | 'trivia' | 'connection';
    content: string;
    headline: string;
    likes: number;
    isLiked: boolean;
    isSaved: boolean;
    timestamp: string;
}

export const StudyFeed: React.FC = () => {
    const { notebooks, config } = useStore();
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const observerTarget = useRef(null);

    // --- SANITIZATION HELPER ---
    const cleanText = (text: any): string => {
        if (!text) return "";
        if (typeof text !== 'string') return String(text);
        
        // Remove phantom characters that cause the "0000" box glitch
        // Specifically removing null bytes and non-printable control chars
        return text
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
            .trim();
    };

    const generateFeedPosts = async () => {
        if (notebooks.length === 0 || loading) return;
        setLoading(true);

        try {
            const ai = createAIClient();
            
            // Randomly select notebooks for variety
            const shuffled = [...notebooks].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 4).map(n => ({
                id: n.id,
                discipline: n.discipline,
                topic: n.name,
                // Passing existing notes helps the context
                context: n.notes ? n.notes.substring(0, 50) : ''
            }));

            const prompt = `
                Atue como um Criador de Conteúdo Educacional de Elite.
                Baseado nestes tópicos: ${JSON.stringify(selected)}.
                
                Gere 4 posts curtos e densos para revisão rápida.
                
                Tipos:
                - concept: Definição técnica precisa.
                - mnemonic: Macete de memorização.
                - trivia: Pegadinha de banca ou curiosidade.
                - connection: Link interdisciplinar.

                JSON Output Format (Strict Array):
                [{
                    "notebookId": "id do caderno",
                    "type": "concept", 
                    "headline": "Título curto (sem emojis)",
                    "content": "Explicação em markdown simples."
                }]
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                notebookId: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['concept', 'mnemonic', 'trivia', 'connection'] },
                                headline: { type: Type.STRING },
                                content: { type: Type.STRING }
                            },
                            required: ["notebookId", "type", "headline", "content"]
                        }
                    }
                }
            });

            const rawText = response.text || '[]';
            const parsedData = JSON.parse(rawText);
            
            const newPosts: FeedPost[] = parsedData
                .map((p: any) => {
                    // --- ROBUST FALLBACK MAPPING ---
                    const nb = notebooks.find(n => n.id === p.notebookId);
                    
                    const safeHeadline = cleanText(p.headline) || nb?.name || "Revisão Rápida";
                    
                    // Try to find content in various common hallucinated fields
                    const rawContent = p.content || p.explanation || p.text || p.description || p.body;
                    const safeContent = cleanText(rawContent);

                    // Filter out bad data immediately
                    if (!safeContent || safeContent.length < 5) return null;

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        notebookId: p.notebookId,
                        discipline: nb?.discipline || 'Geral',
                        topic: nb?.name || safeHeadline,
                        headline: safeHeadline,
                        type: p.type || 'concept',
                        content: safeContent,
                        likes: Math.floor(Math.random() * 50) + 10,
                        isLiked: false,
                        isSaved: false,
                        timestamp: 'Agora mesmo'
                    };
                })
                .filter((p: any) => p !== null); // Remove failed mappings

            setPosts(prev => [...prev, ...newPosts]);
            setPage(prev => prev + 1);

        } catch (error) {
            console.error("Erro ao gerar feed:", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial Load
    useEffect(() => {
        if (page === 0 && notebooks.length > 0) {
            generateFeedPosts();
        }
    }, [notebooks]);

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading) {
                    generateFeedPosts();
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) observer.unobserve(observerTarget.current);
        };
    }, [observerTarget, loading, notebooks]);

    const toggleLike = (id: string) => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p));
    };

    const toggleSave = (id: string) => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, isSaved: !p.isSaved } : p));
    };

    const getIconForType = (type: string) => {
        switch(type) {
            case 'mnemonic': return <Brain size={18} className="text-pink-500" />;
            case 'trivia': return <Lightbulb size={18} className="text-yellow-500" />;
            case 'connection': return <RefreshCw size={18} className="text-blue-500" />;
            default: return <BookOpen size={18} className="text-emerald-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch(type) {
            case 'mnemonic': return 'Mnemônico';
            case 'trivia': return 'Curiosidade';
            case 'connection': return 'Conexão';
            default: return 'Conceito';
        }
    };

    const renderMarkdown = (text: string) => {
        return text.split('\n').map((line, i) => {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return (
                <p key={i} className="mb-2 text-sm leading-relaxed text-slate-300 font-sans">
                    {parts.map((part, idx) => 
                        idx % 2 === 1 ? <strong key={idx} className="text-white font-bold">{part}</strong> : part
                    )}
                </p>
            );
        });
    };

    return (
        <div className="h-full flex flex-col items-center bg-slate-950 overflow-y-auto custom-scrollbar pt-6 pb-20">
            <div className="w-full max-w-md space-y-8 px-4">
                
                <div className="flex items-center justify-between mb-4 px-2">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-emerald-500" /> Feed de Estudo
                    </h1>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">IA Generativa</span>
                </div>

                {notebooks.length === 0 && (
                    <div className="text-center py-10 bg-slate-900 rounded-2xl border border-slate-800 p-6">
                        <p className="text-slate-400 mb-4">Adicione cadernos ao seu banco para a IA gerar conteúdo personalizado.</p>
                    </div>
                )}

                {posts.map((post) => (
                    <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Header */}
                        <div className="p-4 flex items-center justify-between border-b border-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shrink-0">
                                    <Bot size={16} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-1 truncate">
                                        Atena AI 
                                        <span className="text-[10px] text-slate-500 font-normal ml-1 truncate max-w-[150px]">• {post.discipline}</span>
                                    </h3>
                                    <p className="text-[10px] text-slate-400">{post.timestamp}</p>
                                </div>
                            </div>
                            <button className="text-slate-500 hover:text-white shrink-0"><MoreHorizontal size={20} /></button>
                        </div>

                        {/* Content Area */}
                        <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 min-h-[180px] flex flex-col justify-center relative group">
                            
                            {/* Visual Hint Background */}
                            <div className="absolute top-0 right-0 p-6 opacity-5 transition-opacity group-hover:opacity-10 pointer-events-none">
                                {getIconForType(post.type)}
                            </div>

                            <div className="mb-4 relative z-10">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-3
                                    ${post.type === 'mnemonic' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 
                                      post.type === 'trivia' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                      post.type === 'connection' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
                                `}>
                                    {getIconForType(post.type)} {getTypeLabel(post.type)}
                                </span>
                                <h2 className="text-lg md:text-xl font-bold text-white leading-tight mb-2 font-sans tracking-tight">
                                    {post.headline}
                                </h2>
                            </div>

                            <div className="text-base relative z-10">
                                {renderMarkdown(post.content)}
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="p-4 flex items-center justify-between bg-slate-900 border-t border-slate-800/50">
                            <div className="flex items-center gap-4">
                                <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5 group">
                                    <Heart size={24} className={`transition-all ${post.isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400 group-hover:text-white'}`} />
                                    <span className="text-sm font-bold text-slate-400">{post.likes}</span>
                                </button>
                                <button className="text-slate-400 hover:text-white transition-colors">
                                    <Share2 size={24} />
                                </button>
                            </div>
                            <button onClick={() => toggleSave(post.id)}>
                                <Bookmark size={24} className={`transition-all ${post.isSaved ? 'fill-emerald-500 text-emerald-500' : 'text-slate-400 hover:text-white'}`} />
                            </button>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-slate-500 animate-pulse">Atena está criando conteúdo...</p>
                    </div>
                )}

                <div ref={observerTarget} className="h-10"></div>
            </div>
        </div>
    );
};
