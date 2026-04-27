import React from 'react';
import PropTypes from 'prop-types';

export default function Badge({ 
  children, 
  variant = 'brand',
  type = 'pill', // 'pill' or 'count'
  className = '' 
}) {
  const variants = {
    brand: "bg-accent-main/10 text-accent-main border-accent-main/20 shadow-[0_0_8px_rgba(124,109,250,0.15)]",
    notas: "bg-color-notas/10 text-color-notas border-color-notas/20",
    estudo: "bg-color-estudo/10 text-color-estudo border-color-estudo/20",
    flashcards: "bg-color-flashcards/10 text-color-flashcards border-color-flashcards/20",
    success: "bg-color-success/10 text-color-success border-color-success/20",
    warning: "bg-color-warning/10 text-color-warning border-color-warning/20",
    error: "bg-color-error/10 text-color-error border-color-error/20",
    gray: "bg-surface-raised text-text-lo border-white/5"
  };

  const types = {
    pill: "px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full",
    count: "px-2 h-5 flex items-center justify-center text-[10px] font-black rounded-full font-mono shadow-inner"
  };

  return (
    <span className={`inline-flex items-center border ${types[type]} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['brand', 'notas', 'estudo', 'flashcards', 'success', 'warning', 'error', 'gray']),
  type: PropTypes.oneOf(['pill', 'count']),
  className: PropTypes.string,
};
