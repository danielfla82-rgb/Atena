
import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Loader2, WifiOff } from 'lucide-react';
import { Logo } from './Logo';

interface Props {
  onLoginSuccess: () => void;
}

export const Login: React.FC<Props> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Access aistudio via casting to avoid global type conflicts with existing AIStudio definitions
      const aiStudio = (window as any).aistudio;

      // Simulate/Check Google connection via AI Studio Key Check
      if (aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        if (!hasKey) {
          await aiStudio.openSelectKey();
          // Re-check after dialog closes
          const hasKeyAfter = await aiStudio.hasSelectedApiKey();
          if(hasKeyAfter) {
             onLoginSuccess();
          }
        } else {
          // Add a small delay for effect
          setTimeout(() => {
             onLoginSuccess();
          }, 800);
        }
      } else {
        // Fallback for dev environments without the extension
        console.warn("AI Studio object not found, bypassing check.");
        setTimeout(() => {
           onLoginSuccess();
        }, 800);
      }
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full z-0"></div>

      <div className="z-10 text-center max-w-2xl w-full p-8 flex flex-col items-center">
        
        {/* ÁREA DO LOGOTIPO - AUMENTADO PARA 4XL */}
        <div className="flex justify-center mb-8 relative">
          <div className="relative group">
             {/* Efeito de brilho atrás do logo */}
             <div className="absolute -inset-10 bg-gradient-to-r from-emerald-500/20 to-cyan-600/20 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>
             
             {/* Componente Logo Inteligente - Tamanho 4XL (Massivo) */}
             <Logo size="4xl" className="relative drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]" />
          </div>
        </div>
        
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight uppercase">
          Projeto <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Atena</span>
        </h1>
        
        {/* Subtítulo SaaS Atualizado */}
        <p className="text-slate-300 mb-12 text-xl font-light tracking-wide max-w-lg mx-auto leading-relaxed">
          Plataforma de Inteligência Tática para Aprovação em Alta Performance em concursos
        </p>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-4">
           <button 
             onClick={handleGoogleLogin}
             disabled={loading}
             className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
           >
             {loading ? (
               <Loader2 className="animate-spin" />
             ) : (
               <>
                 <svg className="w-5 h-5" viewBox="0 0 24 24">
                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                 </svg>
                 Entrar com Google
               </>
             )}
           </button>

           <button 
             onClick={onLoginSuccess}
             className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
           >
             <WifiOff size={18} />
             Conheça a plataforma
           </button>
        </div>
      </div>
    </div>
  );
};
