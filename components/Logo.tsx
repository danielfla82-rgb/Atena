
import React, { useState } from 'react';
import { LOGO_URL } from '../constants';
import { Shield, BookOpen, Feather } from 'lucide-react';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Logo: React.FC<Props> = ({ className = "", size = 'md' }) => {
  const [error, setError] = useState(false);

  // Map tamanhos para classes Tailwind
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-20 h-20",
    xl: "w-32 h-32",
    '2xl': "w-48 h-auto max-h-48",
    '3xl': "w-64 h-64",
    '4xl': "w-full max-w-md h-auto" // Novo tamanho massivo para login/banner
  };

  // Verificações de segurança para links que não são imagens diretas
  const isInvalidUrl = !LOGO_URL || 
                      LOGO_URL.includes('gemini.google.com/share') ||
                      (LOGO_URL.includes('postimg.cc') && !LOGO_URL.includes('i.postimg.cc'));

  // Ícone de Fallback (Símbolo de Atena: Escudo + Sabedoria)
  if (error || isInvalidUrl) {
    return (
      <div className={`relative flex items-center justify-center bg-gradient-to-br from-green-900 to-slate-900 rounded-xl border border-green-500/30 text-green-500 shadow-lg overflow-hidden group ${sizeClasses[size]} ${className}`}>
        {/* Fundo sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-500/10 to-transparent"></div>
        
        {/* Ícone Composto */}
        <Shield className="w-[70%] h-[70%] text-green-600 absolute" strokeWidth={1.5} />
        <Feather className="w-[40%] h-[40%] text-green-100 z-10 drop-shadow-md" strokeWidth={2} />
      </div>
    );
  }

  return (
    <img 
      src={LOGO_URL} 
      alt="ATENA CONCURSOS Logo" 
      className={`${sizeClasses[size]} object-contain drop-shadow-2xl transition-transform hover:scale-105 ${className}`}
      onError={() => setError(true)}
    />
  );
};
