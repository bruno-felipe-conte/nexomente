import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * Tooltip — Componente de dica premium com delay customizável.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - O elemento que terá o tooltip
 * @param {string} props.text - O texto da dica
 * @param {number} props.delay - Tempo em ms antes de aparecer (padrão 2500ms)
 * @param {string} props.position - 'top', 'bottom', 'left', 'right'
 */
export default function Tooltip({ children, text, delay = 2500, position = 'top' }) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShow(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShow(false);
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  };

  const arrows = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-bg-tertiary',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-bg-tertiary',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-bg-tertiary',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-bg-tertiary',
  };

  return (
    <div 
      className="relative flex items-center justify-center w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-[100] px-3 py-1.5 bg-bg-tertiary border border-border-subtle rounded-lg shadow-2xl pointer-events-none whitespace-nowrap ${positions[position]}`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">
              {text}
            </span>
            <div className={`absolute w-0 h-0 border-4 border-transparent ${arrows[position]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

Tooltip.propTypes = {
  children: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
  delay: PropTypes.number,
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
};
