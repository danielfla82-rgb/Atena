import React, { useState } from 'react';
import { supabase } from './supabase';
import { useStore } from '../store';
import { Logo } from './Logo';
import { Loader2, LogIn, Lock, Mail, AlertTriangle } from 'lucide-react';

interface Props {
  onLoginSuccess: () => void;
}

export const Login: React.FC<Props> = ({ onLoginSuccess }) => {
  const { enterGuestMode } = useStore();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Verifique seu email para confirmar o cadastro!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error(error);
      let msg = error.message || 'Erro na autenticação';
      if (msg.includes('Invalid login credentials')) msg = 'Email ou senha incorretos.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
      setLoading(true);
      await enterGuestMode();
      setLoading(false);
      onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        
        <div className="mb-8 animate-in fade-in zoom-in duration-700">
            <Logo size="4xl" />
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight uppercase drop-shadow-2xl">
          Projeto <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Atena</span>
        </h1>
        
        <p className="text-slate-400 mb-8 text-lg font-light tracking-wide">
          Plataforma de planejamento para concurseiros
        </p>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm">
            
            {errorMsg && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs text-left font-bold">
                    <AlertTriangle size={14} className="shrink-0" />
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
                <div className="relative group">
                    <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                        type="email" 
                        required
                        placeholder="Email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
                    />
                </div>
                
                <div className="relative group">
                    <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                        type="password" 
                        required
                        placeholder="Senha" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                    {isSignUp ? 'Criar Conta' : 'Entrar'}
                </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="hover:text-emerald-400 transition-colors">
                    {isSignUp ? 'Já tem conta? Entrar' : 'Criar conta gratuita'}
                </button>
                <span className="text-slate-700">|</span>
                <button type="button" onClick={handleGuestLogin} className="hover:text-white transition-colors">
                    Modo Visitante
                </button>
            </div>
        </div>
        
        <p className="mt-8 text-xs text-slate-600 font-mono">v10.0.0 (Stable)</p>
      </div>
    </div>
  );
};