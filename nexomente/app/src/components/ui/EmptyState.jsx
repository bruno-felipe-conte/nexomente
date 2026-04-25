import PropTypes from 'prop-types';

/**
 * Componente EmptyState — exibido quando uma lista ou área não tem conteúdo.
 * Evita que o usuário veja telas vazias sem contexto ou ação clara.
 *
 * @param {React.ReactNode} icon - Ícone representativo
 * @param {string} title - Título curto e claro
 * @param {string} description - Explicação e orientação
 * @param {React.ReactNode} [action] - CTA opcional (botão de criação, etc.)
 */
function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[240px] p-8 text-center select-none">
      {icon && (
        <div className="text-text-secondary opacity-40 mb-4" style={{ fontSize: '3rem' }}>
          {icon}
        </div>
      )}
      <h3 className="text-text-primary font-semibold text-base mb-1">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm max-w-xs mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  action: PropTypes.node,
};

export default EmptyState;
