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
  const base = "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-nx-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-nx-primary select-none";

  const variants = {
    primary:   "text-white font-semibold",
    secondary: "bg-nx-surface border border-nx-border text-nx-text hover:border-nx-primary/40 hover:text-nx-bright hover:bg-nx-overlay",
    ghost:     "bg-transparent text-nx-dim hover:bg-nx-surface hover:text-nx-bright",
    danger:    "bg-nx-error text-white hover:opacity-90 shadow-md",
    'icon-only': "p-2 bg-transparent text-nx-dim hover:bg-nx-surface hover:text-nx-bright rounded-nx-sm",
  };

  const sizes = {
    sm:   "px-3 py-1.5 text-[12px] min-h-[32px] gap-1.5",
    md:   "px-4 py-2 text-[13px] min-h-[40px] gap-2",
    lg:   "px-6 py-3 text-[14px] min-h-[48px] gap-2",
    none: "",
  };

  const activeSize = variant === 'icon-only' ? sizes.none : (sizes[size] ?? sizes.md);
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`${base} ${variants[variant]} ${activeSize} ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'} ${className}`}
      disabled={isDisabled}
      style={variant === 'primary' ? {
        background: 'linear-gradient(135deg, #7C6FFA 0%, #22D3EE 100%)',
        boxShadow: isDisabled ? 'none' : '0 0 20px rgba(124,111,250,0.35)',
      } : undefined}
      onMouseEnter={e => {
        if (variant === 'primary' && !isDisabled) {
          e.currentTarget.style.boxShadow = '0 0 28px rgba(124,111,250,0.55)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        if (variant === 'primary' && !isDisabled) {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(124,111,250,0.35)';
          e.currentTarget.style.transform = '';
        }
      }}
      onMouseDown={e => {
        if (variant === 'primary' && !isDisabled) {
          e.currentTarget.style.transform = 'scale(0.97)';
        }
      }}
      onMouseUp={e => {
        if (variant === 'primary' && !isDisabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
