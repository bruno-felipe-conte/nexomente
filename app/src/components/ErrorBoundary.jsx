import { Component } from 'react';
import * as Sentry from '@sentry/react';
import PropTypes from 'prop-types';
import { AlertTriangle, RotateCcw, Home, Terminal } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`── [ErrorBoundary:${this.props.context || 'App'}] CRITICAL ERROR ──`);
    console.error("Error:", error);
    console.error("Stack:", errorInfo.componentStack);
    
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, {
        tags: { context: this.props.context || 'App' },
        extra: { componentStack: errorInfo.componentStack }
      });
    }
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-nx-bright font-ui w-full h-full">
          <div className="max-w-xl w-full nx-panel p-10 border-nx-error/30 bg-nx-error/5 space-y-8 text-center shadow-glow-error">
            <div className="w-20 h-20 bg-nx-error/20 rounded-full flex items-center justify-center mx-auto text-nx-error animate-pulse">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-nx-2xl font-display font-black tracking-tight uppercase">Falha na Matriz</h2>
              <p className="text-nx-dim text-nx-md">
                Ocorreu um erro crítico em <span className="text-nx-error font-mono font-bold">&quot;{this.props.context || 'App'}&quot;</span>.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-nx-void/80 border border-nx-error/20 rounded-nx-md p-6 text-left overflow-hidden group">
                <div className="flex items-center gap-2 mb-3 text-nx-error opacity-70">
                  <Terminal size={14} />
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest">Stack Trace Diagnostic</p>
                </div>
                <div className="overflow-auto max-h-40 custom-scrollbar">
                  <code className="text-nx-bright/80 text-[10px] whitespace-pre-wrap font-mono leading-relaxed">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </code>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-nx-primary text-white rounded-nx-sm font-mono font-bold text-xs hover:scale-105 transition-all shadow-lg"
              >
                <RotateCcw size={16} /> Restaurar Módulo
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-nx-surface border border-nx-border text-nx-bright rounded-nx-sm font-mono font-bold text-xs hover:bg-nx-void transition-all"
              >
                <Home size={16} /> Recarregar App
              </button>
            </div>

            <p className="text-[9px] font-mono text-nx-subtle uppercase tracking-[0.3em] pt-4 opacity-50">
              NexoMente Stability Protocol v1.1
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  context: PropTypes.string,
  children: PropTypes.node,
};

export default ErrorBoundary;
