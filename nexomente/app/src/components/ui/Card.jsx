import React from 'react';
import PropTypes from 'prop-types';

export default function Card({
  children,
  interactive = false,
  className = '',
  onClick,
  ...props
}) {
  const interactiveStyles = interactive 
    ? "cursor-pointer transition-all duration-180 hover:-translate-y-0.5 hover:shadow-lg hover:border-accent-main/30" 
    : "";

  return (
    <div 
      className={`bg-bg-tertiary border border-border-subtle rounded-[18px] p-6 shadow-md ${interactiveStyles} ${className}`}
      onClick={interactive ? onClick : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  interactive: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};
