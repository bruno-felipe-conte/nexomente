import React from 'react';
import PropTypes from 'prop-types';

export default function Badge({ 
  children, 
  variant = 'primary',
  type = 'pill', // 'pill' or 'count'
  className = '' 
}) {
  const variants = {
    primary: "bg-nx-primary/10 text-nx-primary border-nx-primary/20",
    secondary: "bg-nx-secondary/10 text-nx-secondary border-nx-secondary/20",
    accent: "bg-nx-accent/10 text-nx-accent border-nx-accent/20",
    success: "bg-nx-success/10 text-nx-success border-nx-success/20",
    warning: "bg-nx-warning/10 text-nx-warning border-nx-warning/20",
    error: "bg-nx-error/10 text-nx-error border-nx-error/20",
    gray: "bg-nx-depth text-nx-dim border-nx-border"
  };

  const types = {
    pill: "px-3 py-0.5 text-nx-xs font-mono font-bold uppercase tracking-widest rounded-nx-full",
    count: "px-2 h-5 flex items-center justify-center text-nx-xs font-mono font-black rounded-nx-full"
  };

  return (
    <span className={`inline-flex items-center border ${types[type]} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'accent', 'success', 'warning', 'error', 'gray']),
  type: PropTypes.oneOf(['pill', 'count']),
  className: PropTypes.string,
};
