
import React, { useState } from 'react';
import { Loader2, Mail, Lock, UserPlus, LogIn, KeyRound, WifiOff, User } from 'lucide-react';
import { Logo } from './Logo';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';

interface Props {
  onLoginSuccess: () => void;
}

// Simple Google Icon SVG for clean UI
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.769 -21.864 51.959 -21.864 51.129 C -21.864 50.299 -21.734 49.489 -21.484 48.729 L -21.484 45.639 L -25.464 45.639 C -26.284 47.269 -26.754 49.129 -26.754 51.129 C -26.754 53.129 -26.284 54.989 -25.464 56.619 L -21.484 53.529 Z" />
      <path fill="#EA4335" d="M -14.754 43.769 C -12.984 43.769 -11.404 44.379 -10.154 45.579 L -6.734 42.159 C -8.804 40.229 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.769 -14.754 43.769 Z" />
    </g>
  </svg>
);

export const Login: React.FC<Props> = ({ onLoginSuccess }) => {
  const { enterGuestMode } = useStore();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);

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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    } catch (error: any) {
        setMessage({ text: "Erro ao conectar com Google: " + error.message, type: 'error' });
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
          Sincronização de Inteligência Tática na Nuvem
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
                   <div className={`text-xs p-3 rounded-lg text-left ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                       {message.text}
                   </div>
               )}

               <button 
                 type="submit"
                 disabled={loading}
                 className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 mt-4"
               >
                 {loading ? <Loader2 className="animate-spin" /> : isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                 {isSignUp ? "Criar Conta" : "Acessar Sistema"}
               </button>
           </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900/90 px-2 text-slate-500 font-bold">Ou continue com</span>
                </div>
            </div>

            <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-3 transition-colors border border-slate-700 mb-4"
            >
                <GoogleIcon />
                <span>Google</span>
            </button>

            <button 
                type="button"
                onClick={handleGuestAccess}
                disabled={loading}
                className="w-full bg-transparent border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all group"
            >
                <WifiOff size={18} className="group-hover:text-emerald-400 transition-colors" />
                <span>Modo Visitante (Offline)</span>
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
