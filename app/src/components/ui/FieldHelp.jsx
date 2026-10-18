import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

/**
 * FieldHelp — Mini círculo com interrogação (?) que exibe explicação didática e exemplo prático no hover.
 *
 * @param {Object} props
 * @param {string} props.title - Nome legível do campo/parâmetro
 * @param {string} props.description - Explicação clara e objetiva do que é o campo
 * @param {string} props.example - Exemplo prático de como o parâmetro atua na prática
 * @param {string} [props.recommendation] - Valor ou recomendação padrão ideal
 * @param {string} [props.position='top'] - 'top' | 'bottom'
 * @param {string} [props.align='left'] - 'left' | 'center' | 'right'
 */
export default function FieldHelp({
  title,
  description,
  example,
  recommendation,
  position = 'top',
  align = 'left',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  };

  // Posicionamento vertical
  const posVertical = position === 'top' ? 'bottom-full mb-2.5' : 'top-full mt-2.5';

  // Alinhamento horizontal do card em relação ao mini círculo
  const posHorizontal = {
    left: 'left-0 sm:-left-3',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0 sm:-right-3',
  }[align] || 'left-0';

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {/* Mini círculo com interrogação no centro */}
      <button
        type="button"
        aria-label={`Ajuda sobre ${title}`}
        className="w-4 h-4 rounded-full bg-nx-surface hover:bg-nx-overlay border border-nx-border hover:border-nx-primary/80 text-nx-subtle hover:text-nx-primary flex items-center justify-center transition-colors cursor-help select-none shrink-0"
      >
        <span className="text-[10px] font-mono font-bold leading-none -translate-y-[0.5px]">?</span>
      </button>

      {/* Popover flutuante no Hover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: position === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-[120] w-72 sm:w-84 p-3.5 rounded-xl bg-nx-overlay/95 backdrop-blur-md border border-nx-border shadow-[0_12px_36px_rgba(0,0,0,0.65)] pointer-events-none text-left space-y-2.5 ${posVertical} ${posHorizontal}`}
          >
            {/* Header: Título e Badge de Recomendação */}
            <div className="flex items-center justify-between gap-2 border-b border-nx-border/60 pb-2">
              <span className="text-[12px] font-bold text-nx-bright flex items-center gap-1.5 truncate">
                <HelpCircle size={13} className="text-nx-primary shrink-0" />
                {title}
              </span>
              {recommendation && (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-nx-primary/20 text-nx-primary border border-nx-primary/30 shrink-0">
                  Ideal: {recommendation}
                </span>
              )}
            </div>

            {/* O que é / Descrição */}
            <p className="text-[11.5px] text-nx-text leading-relaxed">
              {description}
            </p>

            {/* Exemplo Prático */}
            {example && (
              <div className="p-2.5 rounded-lg bg-nx-surface/90 border border-nx-border/50 space-y-1">
                <div className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-nx-secondary flex items-center gap-1">
                  <span>💡 Exemplo Prático</span>
                </div>
                <p className="text-[11px] text-nx-dim leading-snug">
                  {example}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

FieldHelp.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  example: PropTypes.string,
  recommendation: PropTypes.string,
  position: PropTypes.oneOf(['top', 'bottom']),
  align: PropTypes.oneOf(['left', 'center', 'right']),
};
