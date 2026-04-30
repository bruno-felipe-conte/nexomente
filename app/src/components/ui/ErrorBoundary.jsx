import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("── NEXOMENTE CRITICAL ERROR ──");
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-nx-void flex items-center justify-center p-6 text-nx-bright font-ui">
          <div className="max-w-xl w-full nx-panel p-10 border-nx-error/30 bg-nx-error/5 space-y-8 text-center">
            <div className="w-20 h-20 bg-nx-error/20 rounded-full flex items-center justify-center mx-auto text-nx-error animate-pulse">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-nx-2xl font-display font-black tracking-tight">Falha na Rede Neural</h1>
              <p className="text-nx-dim text-nx-md">Detectamos um erro crítico que impediu a renderização deste componente.</p>
            </div>

            {this.state.error && (
              <div className="bg-nx-void/50 border border-nx-error/20 rounded-nx-md p-4 text-left overflow-auto max-h-40">
                <p className="text-nx-error font-mono text-xs font-bold uppercase mb-2">Detalhes do Erro:</p>
                <code className="text-nx-bright/70 text-[10px] whitespace-pre-wrap font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-nx-primary text-white rounded-full font-mono font-bold text-xs hover:scale-105 transition-all shadow-lg"
              >
                <RotateCcw size={16} /> Reiniciar Sistema
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-nx-surface border border-nx-border text-nx-bright rounded-full font-mono font-bold text-xs hover:bg-nx-void transition-all"
              >
                <Home size={16} /> Ir para Home
              </button>
            </div>

            <p className="text-[10px] font-mono text-nx-subtle uppercase tracking-widest pt-4 opacity-50">
              NexoMente Stability Protocol v1.0
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};

export default ErrorBoundary;
