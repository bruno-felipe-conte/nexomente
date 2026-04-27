import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { X, AlertTriangle } from 'lucide-react';

const Input = forwardRef(({
  label,
  icon: Icon,
  error,
  clearable = false,
  onClear,
  className = '',
  containerClassName = '',
  value,
  onChange,
  ...props
}, ref) => {
  const hasValue = value !== undefined && value !== null && value.toString().length > 0;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
      
      <div className="relative flex items-center group">
        {Icon && (
          <div className="absolute left-3 text-text-muted group-focus-within:text-accent-main transition-colors">
            <Icon size={18} />
          </div>
        )}
        
        <input
          ref={ref}
          value={value}
          onChange={onChange}
          className={`
            w-full bg-bg-tertiary border text-text-primary text-[15px] rounded-lg
            min-h-[44px] transition-all duration-150 outline-none
            placeholder:text-text-muted
            focus:border-accent-main focus:shadow-[0_0_0_2px_rgba(124,109,250,0.2)]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : 'pl-4'}
            ${clearable ? 'pr-10' : 'pr-4'}
            ${error ? 'border-danger focus:border-danger focus:shadow-[0_0_0_2px_rgba(239,68,68,0.2)] animate-pulse' : 'border-border-subtle'}
            ${className}
          `}
          {...props}
        />
        
        {clearable && hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
            aria-label="Limpar campo"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-danger text-sm mt-1 animate-in fade-in slide-in-from-top-1">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';
Input.propTypes = {
  label: PropTypes.string,
  icon: PropTypes.elementType,
  error: PropTypes.string,
  clearable: PropTypes.bool,
  onClear: PropTypes.func,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func,
};

export default Input;
