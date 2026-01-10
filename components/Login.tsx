import React, { useState } from 'react';
import { Loader2, Mail, Lock, UserPlus, LogIn, KeyRound, WifiOff, User, AlertTriangle, ExternalLink } from 'lucide-react';
import { Logo } from './Logo';
import { supabase } from './supabase';
import { useStore } from '../store';

interface Props {
  onLoginSuccess: () => void;
}

export const Login: React.FC<Props> = ({ onLoginSuccess }) => {
  const { enterGuestMode } = useStore();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{text: string, type: 'error' | 'success' | 'info'} | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            setMessage({ text: "Conta criada! Verifique seu email para confirmar.", type: 'success' });
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            onLoginSuccess();
        }
    } catch (error: any) {
        setMessage({ text: error.message, type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  const handleGuestAccess = () => {
      enterGuestMode();
      onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 z-0"></div>
      
      <div className="z-10 text-center max-w-2xl w-full p-8 flex flex-col items-center">
        
        <div className="flex justify-center mb-8 relative">
          <div className="relative group">
             <div className="absolute -inset-10 bg-gradient-to-r from-emerald-500/20 to-cyan-600/20 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>
             <Logo size="4xl" className="relative drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight uppercase">
          Projeto <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Atena</span>
        </h1>
        
        <p className="text-slate-400 mb-8 text-lg font-light tracking-wide">
          Plataforma de planejamento para concurseiros de elite
        </p>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm">
           
           <form onSubmit={handleAuth} className="space-y-4">
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-left">Email</label>
                   <div className="relative">
                       <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                       <input 
                           type="email" 
                           value={email}
                           onChange={e => setEmail(e.target.value)}
                           className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 text-white outline-none focus:border-emerald-500"
                           placeholder="seu@email.com"
                           required
                       />
                   </div>
               </div>
               
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-left">Senha</label>
                   <div className="relative">
                       <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                       <input 
                           type="password" 
                           value={password}
                           onChange={e => setPassword(e.target.value)}
                           className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 text-white outline-none focus:border-emerald-500"
                           placeholder="••••••••"
                           required
                           minLength={6}
                       />
                   </div>
               </div>

               {message && (
                   <div className={`text-xs p-3 rounded-lg text-left flex flex-col gap-1 
                       ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                         message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                         'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                       <span className="font-bold flex items-center gap-1">
                           {message.type === 'error' && <AlertTriangle size={12}/>}
                           {message.text}
                       </span>
                   </div>
               )}

               <button 
                 type="submit"
                 disabled={loading}
                 className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 mt-4"
               >
                 {loading && !message?.text.includes("Google") ? <Loader2 className="animate-spin" /> : isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                 {isSignUp ? "Criar Conta" : "Acessar Sistema"}
               </button>
           </form>

            <button 
                type="button"
                onClick={handleGuestAccess}
                disabled={loading}
                className="w-full bg-transparent border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all group mt-4"
            >
                <WifiOff size={18} className="group-hover:text-emerald-400 transition-colors" />
                <span>Modo Visitante</span>
            </button>
            <p className="text-[10px] text-slate-600 mt-2">Dados locais não são sincronizados com a nuvem.</p>

           <div className="mt-6 pt-4 border-t border-slate-800">
               <button 
                  onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                  className="text-sm text-slate-500 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2 w-full"
               >
                   <KeyRound size={14} />
                   {isSignUp ? "Já tenho conta" : "Criar nova conta"}
               </button>
           </div>
        </div>
      </div>
    </div>
  );
};