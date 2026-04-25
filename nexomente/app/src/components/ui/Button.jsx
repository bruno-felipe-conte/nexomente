import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-main";
  
  const variants = {
    primary: "bg-accent-main text-white hover:bg-[#6355E6] shadow-md",
    secondary: "bg-bg-tertiary border border-border-subtle text-text-primary hover:bg-border-subtle hover:text-white",
    ghost: "bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary",
    danger: "bg-danger text-white hover:bg-red-600 shadow-md",
    'icon-only': "p-2 bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary rounded-md"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm min-h-[36px]",
    md: "px-4 py-2 text-[15px] min-h-[44px]",
    lg: "px-6 py-3 text-base min-h-[52px]",
    none: "" // for icon-only
  };

  const activeSize = variant === 'icon-only' ? sizes.none : sizes[size];
  const activeDisabled = disabled || isLoading ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${activeSize} ${activeDisabled} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger', 'icon-only']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'none']),
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
