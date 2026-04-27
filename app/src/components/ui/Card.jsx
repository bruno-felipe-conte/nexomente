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
  const ref = useRef(null);

  // Valores de Movimento 3D
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Molas (Springs) para suavizar o tilt
  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 25 });

  // Rotação máxima: 6 graus (efeito sutil e muito premium)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-6deg", "6deg"]);

  const handleMouseMove = (e) => {
    if (!interactive || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Normaliza de -0.5 a 0.5 (onde 0 é o centro)
    x.set((mouseX / width) - 0.5);
    y.set((mouseY / height) - 0.5);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    // Retorna ao centro suavemente
    x.set(0);
    y.set(0);
  };

  const interactiveClasses = interactive 
    ? "cursor-pointer hover:border-accent-main/40 hover:shadow-glow-violet transition-colors duration-300"
    : "";

  if (interactive) {
    return (
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          transformPerspective: 1200,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        }}
        className={`bg-surface-card border border-border-subtle rounded-[18px] p-6 shadow-md relative ${interactiveClasses} ${className}`}
        onClick={onClick}
        {...props}
      >
        {/* Camada Parallax Interna (projeta o conteúdo para "fora" do card) */}
        <div style={{ transform: "translateZ(30px)" }} className="w-full h-full relative z-10">
          {children}
        </div>
        
        {/* Glow de fundo dinâmico opcional */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[18px] pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ transform: "translateZ(10px)" }}
        />
      </motion.div>
    );
  }

  // Fallback padrão se não for interativo
  return (
    <div 
      className={`bg-surface-card border border-border-subtle rounded-[18px] p-6 shadow-md ${className}`}
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
