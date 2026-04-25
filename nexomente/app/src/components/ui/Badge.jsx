import React from 'react';
import PropTypes from 'prop-types';

export default function Badge({ 
  children, 
  variant = 'brand',
  type = 'pill', // 'pill' or 'count'
  className = '' 
}) {
  const variants = {
    brand: "bg-[color-mix(in_srgb,var(--color-brand)_15%,transparent)] text-accent-main border border-accent-main/20",
    notas: "bg-[color-mix(in_srgb,var(--color-notas)_15%,transparent)] text-[#4D9EFF] border border-[#4D9EFF]/20",
    estudo: "bg-[color-mix(in_srgb,var(--color-estudo)_15%,transparent)] text-[#2DD4BF] border border-[#2DD4BF]/20",
    flashcards: "bg-[color-mix(in_srgb,var(--color-flashcards)_15%,transparent)] text-[#A78BFA] border border-[#A78BFA]/20",
    success: "bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-success border border-success/20",
    warning: "bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] text-warning border border-warning/20",
    error: "bg-[color-mix(in_srgb,var(--color-error)_15%,transparent)] text-danger border border-danger/20",
    gray: "bg-bg-tertiary text-text-secondary border border-border-subtle"
  };

  const types = {
    pill: "px-2.5 py-0.5 text-xs font-medium rounded-full",
    count: "px-1.5 min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold rounded-full font-mono"
  };

  return (
    <span className={`inline-flex items-center ${types[type]} ${variants[variant]} ${className}`}>
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
