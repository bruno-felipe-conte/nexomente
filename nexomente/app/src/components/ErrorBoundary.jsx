import { Component } from 'react';
import * as Sentry from '@sentry/react';

/**
 * Componente ErrorBoundary para capturar erros de renderização React.
 * Evita que um erro em um componente filho quebre toda a aplicação.
 *
 * @example
 * <ErrorBoundary context="Notas">
 *   <MinhaFuncionalidade />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log estruturado — integrado com Sentry na Fase 8
    console.error(`[ErrorBoundary:${this.props.context || 'App'}]`, error, errorInfo);
    
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
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-text-primary text-lg font-semibold mb-2">
            Algo deu errado
          </h2>
          <p className="text-text-secondary text-sm mb-4 max-w-sm">
            {this.props.context
              ? `Ocorreu um erro em "${this.props.context}". `
              : ''}
            Tente novamente ou recarregue a página.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <details className="text-left text-xs text-text-secondary bg-bg-secondary p-3 rounded mb-4 max-w-md w-full">
              <summary className="cursor-pointer font-mono mb-1">Detalhes do erro (dev)</summary>
              <pre className="overflow-auto whitespace-pre-wrap">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-accent-main text-white rounded hover:opacity-80 transition-opacity text-sm"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
