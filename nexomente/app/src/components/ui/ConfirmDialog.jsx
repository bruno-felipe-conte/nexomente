import PropTypes from 'prop-types';

/**
 * Componente ConfirmDialog — diálogo de confirmação para ações destrutivas.
 * O botão de cancelar é o foco padrão para evitar exclusão acidental com Enter.
 *
 * @param {boolean} open - Se o dialog está visível
 * @param {string} title - Título da ação
 * @param {string} description - Descrição das consequências
 * @param {string} [confirmLabel='Confirmar'] - Label do botão de confirmação
 * @param {'default'|'destructive'} [confirmVariant='destructive'] - Variante do botão
 * @param {function} onConfirm - Callback quando o usuário confirma
 * @param {function} onCancel - Callback quando o usuário cancela
 */
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onCancel?.();
  };

  const confirmStyles =
    confirmVariant === 'destructive'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-accent-main hover:opacity-80 text-white';

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-bg-secondary border border-bg-tertiary rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h2 id="confirm-dialog-title" className="text-text-primary font-semibold text-lg mb-2">
          {title}
        </h2>
        {description && (
          <p id="confirm-dialog-desc" className="text-text-secondary text-sm mb-6">
            {description}
          </p>
        )}
        <div className="flex gap-3 justify-end">
          {/* autoFocus no cancelar — evita exclusão acidental com Enter */}
          <button
            autoFocus
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-text-primary bg-bg-tertiary hover:bg-bg-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${confirmStyles}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.string,
  description: PropTypes.string,
  confirmLabel: PropTypes.string,
  confirmVariant: PropTypes.string,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
};

export default ConfirmDialog;
