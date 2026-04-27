import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center h-full min-h-[240px] p-8 text-center select-none"
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="text-text-secondary opacity-30 mb-5"
          style={{ fontSize: '3.5rem' }}
        >
          {icon}
        </motion.div>
      )}
      <h3 className="text-text-primary font-semibold text-base mb-1">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm max-w-xs mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  action: PropTypes.node,
};

export default EmptyState;
