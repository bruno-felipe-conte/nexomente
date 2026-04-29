import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function Card({
  children,
  interactive = false,
  className = '',
  onClick,
  ...props
}) {
  return (
    <div 
      className={`
        nx-card p-6 transition-all duration-nx-fast
        ${interactive ? 'cursor-pointer hover:border-nx-primary/40 active:scale-[0.98]' : ''}
        ${className}
      `}
      onClick={onClick}
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
