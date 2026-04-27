import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';

/**
 * InlineError — para erros de fetch/API que não quebram o React tree.
 * Use em conjunto com ErrorBoundary (que captura erros de render).
 *
 * @param {string} message - Descrição curta do erro
 * @param {Function} [onRetry] - Callback para tentar novamente
 */
export default function InlineError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[160px] select-none">
      <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-3">
        <AlertTriangle size={20} className="text-danger" />
      </div>
      <p className="text-text-primary font-medium text-sm mb-1">Algo deu errado</p>
      <p className="text-text-muted text-xs mb-4 max-w-[200px]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-medium rounded-xl bg-bg-tertiary
                     text-text-primary hover:bg-border-subtle transition-colors duration-150"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

InlineError.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
};
