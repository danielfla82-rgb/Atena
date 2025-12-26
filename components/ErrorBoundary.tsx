import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="bg-red-500/10 p-4 rounded-full">
                <AlertTriangle size={48} className="text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Erro Crítico no Sistema</h1>
            <p className="text-slate-400 mb-6">
              O Projeto Atena encontrou um erro inesperado. O relatório foi gerado para análise técnica.
            </p>
            
            <div className="bg-slate-950 border border-slate-800 rounded p-4 mb-6 text-left overflow-auto max-h-32 custom-scrollbar">
              <code className="text-xs text-red-400 font-mono">
                {this.state.error && this.state.error.toString()}
              </code>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={this.handleReload}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={18} /> Reiniciar App
              </button>
              <button 
                onClick={this.handleReset}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Home size={18} /> Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}